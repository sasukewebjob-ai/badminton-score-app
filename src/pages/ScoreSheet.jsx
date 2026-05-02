import { useState, useRef, useEffect } from 'react';
import { useMatch } from '../context/MatchContext';
import { isDoubles, generateScoreSheetRows, getGameWins } from '../utils/badmintonLogic';
import { exportAsImage, exportAsPDF } from '../utils/exportUtils';
import './ScoreSheet.css';

// ピンチズーム対応スクロールエリア
function PinchZoomScroll({ children }) {
  const containerRef = useRef(null);
  const paperRef = useRef(null);
  const zoomRef = useRef(1);
  const lastDistRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const getDistance = (t) =>
      Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

    const onTouchStart = (e) => {
      if (e.touches.length === 2) {
        lastDistRef.current = getDistance(e.touches);
      }
    };

    const onTouchMove = (e) => {
      if (e.touches.length === 2 && lastDistRef.current != null) {
        e.preventDefault();
        const dist = getDistance(e.touches);
        const ratio = dist / lastDistRef.current;
        zoomRef.current = Math.min(Math.max(zoomRef.current * ratio, 0.4), 4);
        if (paperRef.current) {
          paperRef.current.style.zoom = zoomRef.current;
        }
        lastDistRef.current = dist;
      }
    };

    const onTouchEnd = () => {
      lastDistRef.current = null;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  return (
    <div ref={containerRef} className="sheet-scroll">
      <div ref={paperRef} id="score-sheet-export" className="sheet-paper">
        {children}
      </div>
    </div>
  );
}

// 全ゲームを横に並べた統合スコア表
function UnifiedScoreTable({ games, matchInfo, editMode, editedScores, onEditScore }) {
  const doubles = isDoubles(matchInfo.type);

  const playerRows = doubles
    ? [
        { key: 'A1', label: matchInfo.teamA.player1, team: 'A', teamName: matchInfo.teamA.name },
        { key: 'A2', label: matchInfo.teamA.player2, team: 'A', teamName: matchInfo.teamA.name },
        { key: 'B1', label: matchInfo.teamB.player1, team: 'B', teamName: matchInfo.teamB.name },
        { key: 'B2', label: matchInfo.teamB.player2, team: 'B', teamName: matchInfo.teamB.name },
      ]
    : [
        { key: 'A1', label: matchInfo.teamA.player1, team: 'A', teamName: matchInfo.teamA.name },
        { key: 'B1', label: matchInfo.teamB.player1, team: 'B', teamName: matchInfo.teamB.name },
      ];

  // ゲームごとのスコア行データ
  const allGameRows = games.map(game => generateScoreSheetRows(game));

  // ゲームごとの勝敗・丸印情報を計算
  const gameInfos = games.map(game => {
    const lastRally = game.rallies.length > 0 ? game.rallies[game.rallies.length - 1] : null;
    const winningScoreRow = lastRally
      ? (lastRally.isServiceBreak ? lastRally.nextServerPlayer : lastRally.serverPlayer)
      : null;

    const losingTeam = game.winner === 'A' ? 'B' : 'A';
    let losingScoreRow = null;
    if (game.winner && game.rallies.length > 0) {
      for (let i = game.rallies.length - 1; i >= 0; i--) {
        const r = game.rallies[i];
        const scoringPlayer = r.isServiceBreak ? r.nextServerPlayer : r.serverPlayer;
        if (scoringPlayer && scoringPlayer[0] === losingTeam) {
          losingScoreRow = scoringPlayer;
          break;
        }
      }
    }
    return {
      winningScoreRow,
      losingScoreRow,
      losingFinalScore: game.winner === 'A' ? game.scoreB : game.scoreA,
    };
  });

  return (
    <div className="unified-scroll">
      <table className="unified-table">
        {/* ゲーム番号ヘッダー行 */}
        <thead>
          <tr>
            <th className="unified-name-header">選手名</th>
            {games.map((game, gi) => {
              const firstKey = playerRows[0].key;
              const cols = (allGameRows[gi][firstKey] || []).length;
              return (
                <th
                  key={gi}
                  colSpan={cols}
                  className={`unified-game-header ${gi < games.length - 1 ? 'game-header-sep' : ''}`}
                >
                  第{gi + 1}ゲーム
                  {game.winner && (
                    <span className="unified-game-result">
                      　{game.scoreA}:{game.scoreB}
                    </span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {playerRows.map(({ key, label, team, teamName }) => {
            return (
              <tr key={key} className={team === 'A' ? 'gb-row-a' : 'gb-row-b'}>
                {/* 選手名セル（左固定） */}
                <td className="unified-name-cell">
                  <span className="gb-player-name">{label}</span>
                  <span className="gb-team-name">（{teamName}）</span>
                  {/* 第1ゲームのS/Rバッジのみ表示 */}
                  {games[0] && key === games[0].firstServerPlayer && (
                    <span className="gb-badge gb-badge-s">S</span>
                  )}
                  {games[0] && key === games[0].firstReceiverPlayer && (
                    <span className="gb-badge gb-badge-r">R</span>
                  )}
                </td>

                {/* 各ゲームのスコアセル */}
                {games.map((game, gi) => {
                  const entries = allGameRows[gi][key] || [];
                  const { winningScoreRow, losingScoreRow, losingFinalScore } = gameInfos[gi];
                  const isLastGame = gi === games.length - 1;

                  let lastNonEmptyIndex = -1;
                  for (let i = entries.length - 1; i >= 0; i--) {
                    if (!entries[i].isEmpty) { lastNonEmptyIndex = i; break; }
                  }

                  return entries.map((entry, i) => {
                    const isWinningScore =
                      game.winner &&
                      key === winningScoreRow &&
                      i === lastNonEmptyIndex &&
                      !entry.isEmpty;

                    const isLastCell = i === entries.length - 1;
                    const isLosingScore =
                      !editMode &&
                      game.winner &&
                      key === losingScoreRow &&
                      isLastCell &&
                      entry.isEmpty;

                    const editedVal = editedScores?.[gi]?.[key]?.[i];
                    const displayScore = editedVal !== undefined ? editedVal : entry.score;

                    // ゲーム区切り: 各ゲームの最後のセルに右ボーダー
                    const isGameEnd = isLastCell && !isLastGame;

                    return (
                      <td
                        key={`${gi}-${i}`}
                        className={[
                          'sheet-cell',
                          entry.isEmpty && !editMode && !isLosingScore ? 'cell-empty' : '',
                          entry.isServiceBreak ? 'cell-so' : '',
                          (isWinningScore || isLosingScore) && !editMode ? 'cell-winner' : '',
                          entry.isInit ? 'cell-init' : '',
                          editMode && !entry.isEmpty ? 'cell-editable' : '',
                          isGameEnd ? 'cell-game-sep' : '',
                        ].filter(Boolean).join(' ')}
                      >
                        {editMode && !entry.isEmpty ? (
                          <input
                            className="cell-edit-input"
                            type="number"
                            value={displayScore ?? ''}
                            onChange={e =>
                              onEditScore &&
                              onEditScore(gi, key, i, e.target.value === '' ? null : Number(e.target.value))
                            }
                          />
                        ) : isLosingScore ? (
                          <span className="winner-circle">{losingFinalScore}</span>
                        ) : !entry.isEmpty ? (
                          isWinningScore ? (
                            <span className="winner-circle">{displayScore}</span>
                          ) : (
                            displayScore
                          )
                        ) : null}
                        {!editMode && !entry.isEmpty && entry.isServiceBreak && (
                          <span className="so-mark">↑</span>
                        )}
                      </td>
                    );
                  });
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================
// A4横向きエクスポート用シート（オフスクリーン非表示）
// ============================================================
function A4ExportSheet({ matchInfo, games, winsA, winsB, startTime, endTime, matchWinner }) {
  const doubles = isDoubles(matchInfo.type);
  const playerKeys = doubles ? ['A1', 'A2', 'B1', 'B2'] : ['A1', 'B1'];

  const getPlayerName = (key) => {
    const team = key[0] === 'A' ? matchInfo.teamA : matchInfo.teamB;
    return key[1] === '1' ? team.player1 : (team.player2 || '');
  };

  // 3ゲーム分（未プレーはnull）
  const exportGames = [games[0] || null, games[1] || null, games[2] || null];
  const allGameRows = exportGames.map(game => game ? generateScoreSheetRows(game) : {});

  const gameInfos = exportGames.map(game => {
    if (!game) return { winningScoreRow: null, losingScoreRow: null, losingFinalScore: 0 };
    const lastRally = game.rallies.length > 0 ? game.rallies[game.rallies.length - 1] : null;
    const winningScoreRow = lastRally
      ? (lastRally.isServiceBreak ? lastRally.nextServerPlayer : lastRally.serverPlayer)
      : null;
    const losingTeam = game.winner === 'A' ? 'B' : 'A';
    let losingScoreRow = null;
    if (game.winner) {
      for (let i = game.rallies.length - 1; i >= 0; i--) {
        const r = game.rallies[i];
        const sp = r.isServiceBreak ? r.nextServerPlayer : r.serverPlayer;
        if (sp && sp[0] === losingTeam) { losingScoreRow = sp; break; }
      }
    }
    return { winningScoreRow, losingScoreRow, losingFinalScore: game.winner === 'A' ? game.scoreB : game.scoreA };
  });

  const fmt = (iso) => iso ? new Date(iso).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : '—';
  const fmtDate = (s) => s ? new Date(s).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';

  const BORDER = '1px solid #333';
  const CELL_W = 22;
  const NAME_W = 80;
  const GNUM_W = 20;
  const ROW_H = doubles ? 49 : 95;

  const circle = (score) => (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 18, height: 18, border: '1.5px solid #1a8a1a', borderRadius: '50%',
      fontSize: 9, fontWeight: 800, color: '#1a8a1a',
    }}>{score}</span>
  );

  return (
    <div id="a4-export-target" style={{
      width: 1122, height: 793, background: '#fff',
      fontFamily: "'MS Gothic', 'Hiragino Sans', sans-serif",
      fontSize: 10, padding: '12px 14px', boxSizing: 'border-box',
      overflow: 'hidden', color: '#111',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* タイトル */}
      <div style={{ textAlign: 'center', fontSize: 13, letterSpacing: 6, fontWeight: 'bold', marginBottom: 3, flexShrink: 0 }}>
        ス　コ　ア　シ　ー　ト
      </div>

      {/* 日付・時刻・役員 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, marginBottom: 3, flexShrink: 0 }}>
        <span>日付: {fmtDate(matchInfo.date)}</span>
        <span>開始: {fmt(startTime)}　終了: {fmt(endTime)}</span>
        <span>主審: {matchInfo.referee || '——'}　SJ: {matchInfo.serviceJudge || '——'}</span>
      </div>

      {/* 試合情報ヘッダー */}
      <table style={{ width: '100%', borderCollapse: 'collapse', border: BORDER, marginBottom: 3, flexShrink: 0 }}>
        <tbody>
          <tr>
            <td rowSpan={3} style={{ border: BORDER, width: 60, textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold', fontSize: 11 }}>
              {matchInfo.type}
            </td>
            <td rowSpan={3} style={{ border: BORDER, width: 55, textAlign: 'center', verticalAlign: 'middle', fontSize: 14, fontWeight: 'bold' }}>
              {matchInfo.matchNumber || '—'}
            </td>
            <td style={{ border: BORDER, padding: '2px 6px', fontSize: 11, fontWeight: 600 }}>{matchInfo.teamA.player1}</td>
            <td style={{ border: BORDER, width: 80, textAlign: 'center', fontSize: 11 }}>
              {exportGames[0] ? `${exportGames[0].scoreA} : ${exportGames[0].scoreB}` : ''}
            </td>
            <td style={{ border: BORDER, padding: '2px 6px', fontSize: 11, fontWeight: 600 }}>{matchInfo.teamB.player1}</td>
            <td rowSpan={3} style={{ border: BORDER, width: 40, textAlign: 'center', verticalAlign: 'middle', fontSize: 9 }}>
              {matchInfo.courtNumber ? `コート\n${matchInfo.courtNumber}` : ''}
            </td>
          </tr>
          <tr>
            <td style={{ border: BORDER, padding: '2px 6px', fontSize: 11, fontWeight: 600 }}>
              {doubles ? matchInfo.teamA.player2 : matchInfo.teamA.name}
            </td>
            <td style={{ border: BORDER, textAlign: 'center', fontSize: 11 }}>
              {exportGames[1] ? `${exportGames[1].scoreA} : ${exportGames[1].scoreB}` : ''}
            </td>
            <td style={{ border: BORDER, padding: '2px 6px', fontSize: 11, fontWeight: 600 }}>
              {doubles ? matchInfo.teamB.player2 : matchInfo.teamB.name}
            </td>
          </tr>
          <tr>
            <td style={{ border: BORDER, padding: '2px 4px', fontSize: 10, color: '#555' }}>
              {doubles ? matchInfo.teamA.name : ''}
            </td>
            <td style={{ border: BORDER, textAlign: 'center', fontSize: 14, fontWeight: 'bold' }}>
              {winsA} — {winsB}
            </td>
            <td style={{ border: BORDER, padding: '2px 4px', fontSize: 10, color: '#555' }}>
              {doubles ? matchInfo.teamB.name : ''}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ゲームブロック×3 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, overflow: 'hidden', minHeight: 0 }}>
        {exportGames.map((game, gi) => {
          const rows = allGameRows[gi];
          const { winningScoreRow, losingScoreRow, losingFinalScore } = gameInfos[gi];

          return (
            <div key={gi} style={{ flex: 1, display: 'flex', border: BORDER, overflow: 'hidden' }}>
              {/* ゲーム番号 */}
              <div style={{
                width: GNUM_W, minWidth: GNUM_W, borderRight: BORDER,
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', fontSize: 11, fontWeight: 'bold', gap: 2,
              }}>
                <span>{gi + 1}</span>
                {game?.winner && (
                  <span style={{ fontSize: 8, fontWeight: 400 }}>{game.scoreA}:{game.scoreB}</span>
                )}
              </div>

              {/* 選手スコア行 */}
              <div style={{ flex: 1, overflow: 'hidden' }}>
                {!game ? (
                  // 未プレー：空行
                  <table style={{ borderCollapse: 'collapse', height: '100%' }}>
                    <tbody>
                      {playerKeys.map(key => (
                        <tr key={key} style={{ height: ROW_H }}>
                          <td style={{ width: NAME_W, minWidth: NAME_W, border: BORDER, padding: '2px 4px', fontSize: 10, fontWeight: 600 }}>
                            {getPlayerName(key)}
                          </td>
                          {Array.from({ length: 32 }).map((_, i) => (
                            <td key={i} style={{ width: CELL_W, minWidth: CELL_W, border: '1px solid #ccc' }} />
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table style={{ borderCollapse: 'collapse', height: '100%' }}>
                    <tbody>
                      {playerKeys.map(key => {
                        const entries = rows[key] || [];
                        const isS = key === game.firstServerPlayer;
                        const isR = key === game.firstReceiverPlayer;
                        const team = key[0];

                        let lastNonEmptyIndex = -1;
                        for (let i = entries.length - 1; i >= 0; i--) {
                          if (!entries[i].isEmpty) { lastNonEmptyIndex = i; break; }
                        }

                        return (
                          <tr key={key} style={{ height: ROW_H, background: team === 'A' ? '#f8faff' : '#fff8f8' }}>
                            <td style={{
                              width: NAME_W, minWidth: NAME_W, border: BORDER,
                              padding: '2px 4px', fontSize: 10, fontWeight: 600,
                              verticalAlign: 'middle', whiteSpace: 'nowrap', overflow: 'hidden',
                            }}>
                              {getPlayerName(key)}
                              {isS && <span style={{ marginLeft: 2, fontSize: 8, background: '#1a3a5c', color: '#fff', borderRadius: 2, padding: '0 2px' }}>S</span>}
                              {isR && <span style={{ marginLeft: 2, fontSize: 8, background: '#c0392b', color: '#fff', borderRadius: 2, padding: '0 2px' }}>R</span>}
                            </td>
                            {entries.map((entry, i) => {
                              const isWinningScore = game.winner && key === winningScoreRow && i === lastNonEmptyIndex && !entry.isEmpty;
                              const isLastCell = i === entries.length - 1;
                              const isLosingScore = game.winner && key === losingScoreRow && isLastCell && entry.isEmpty;
                              return (
                                <td key={i} style={{
                                  width: CELL_W, minWidth: CELL_W,
                                  border: entry.isServiceBreak ? '1px solid #e67e22' : '1px solid #ccc',
                                  textAlign: 'center', verticalAlign: 'middle',
                                  fontSize: 9, fontWeight: 600, padding: 0, position: 'relative',
                                  background: (isWinningScore || isLosingScore) ? '#eafaf0' : entry.isServiceBreak ? '#fff9e6' : 'transparent',
                                }}>
                                  {isLosingScore ? circle(losingFinalScore)
                                    : !entry.isEmpty ? (isWinningScore ? circle(entry.score) : entry.score)
                                    : null}
                                  {!entry.isEmpty && entry.isServiceBreak && (
                                    <span style={{ position: 'absolute', top: 0, right: 1, fontSize: 7, color: '#e67e22' }}>↑</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* サイン欄 */}
      {(() => {
        const doubles = isDoubles(matchInfo.type);
        const winnerTeam = matchWinner === 'A' ? matchInfo.teamA : matchWinner === 'B' ? matchInfo.teamB : null;
        const winnerNames = winnerTeam
          ? (doubles && winnerTeam.player2
              ? `${winnerTeam.player1}・${winnerTeam.player2}`
              : winnerTeam.player1)
          : '—';
        const refereeName = matchInfo.referee || '—';
        const BORDER = '1px solid #333';
        return (
          <div style={{ display: 'flex', marginTop: 4, border: BORDER, flexShrink: 0 }}>
            <div style={{ flex: 1, borderRight: BORDER, padding: '3px 8px' }}>
              <div style={{ fontSize: 8, color: '#555', marginBottom: 2 }}>主審承認</div>
              <div style={{ fontSize: 10, fontWeight: 600 }}>{refereeName}</div>
              <div style={{ borderTop: '1px solid #999', marginTop: 6 }} />
            </div>
            <div style={{ flex: 2, padding: '3px 8px' }}>
              <div style={{ fontSize: 8, color: '#555', marginBottom: 2 }}>勝者承認</div>
              <div style={{ fontSize: 10, fontWeight: 600 }}>{winnerNames}</div>
              <div style={{ borderTop: '1px solid #999', marginTop: 6 }} />
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default function ScoreSheet({ goTo, prevPage = 'home' }) {
  const { match, saveMatchNow } = useMatch();
  const [exporting, setExporting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedScores, setEditedScores] = useState({});
  const [saveFlash, setSaveFlash] = useState(false);

  function handleEditScore(gameIndex, playerKey, cellIndex, value) {
    setEditedScores(prev => ({
      ...prev,
      [gameIndex]: {
        ...prev[gameIndex],
        [playerKey]: {
          ...(prev[gameIndex]?.[playerKey] || {}),
          [cellIndex]: value,
        },
      },
    }));
  }

  const displayMatch = match;

  if (!displayMatch) {
    return (
      <div className="sheet-page page">
        <div className="topbar">
          <button className="topbar-btn" onClick={() => goTo('home')}>← 戻る</button>
          <span className="topbar-title">スコアシート</span>
        </div>
        <div style={{ padding: 24, textAlign: 'center', color: '#888' }}>
          試合データがありません
        </div>
      </div>
    );
  }

  const { matchInfo, games, startTime, endTime } = displayMatch;
  const { winsA, winsB } = getGameWins(games);

  function formatTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  }

  function formatDate(str) {
    if (!str) return '—';
    const d = new Date(str);
    return d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  async function handleExportImage() {
    setExporting(true);
    await exportAsImage('a4-export-target', `scoresheet_${matchInfo.matchNumber || Date.now()}`);
    setExporting(false);
  }

  async function handleExportPDF() {
    setExporting(true);
    await exportAsPDF('a4-export-target', `scoresheet_${matchInfo.matchNumber || Date.now()}`);
    setExporting(false);
  }

  const backPage = prevPage || 'home';
  const displayGames = games.slice(0, 3);

  function handleSaveProgress() {
    saveMatchNow();
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 2000);
  }

  return (
    <div className="sheet-page page">
      {/* トップバー */}
      <div className="topbar">
        <button className="topbar-btn" onClick={() => goTo(backPage)}>
          {backPage === 'scoring' ? '← 試合へ' : '← 戻る'}
        </button>
        <span className="topbar-title">スコアシート</span>
        <div style={{ width: 60 }} />
      </div>

      {/* A4エクスポート用シート（オフスクリーン・非表示） */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0, pointerEvents: 'none' }}>
        <A4ExportSheet
          matchInfo={matchInfo}
          games={displayGames}
          winsA={winsA}
          winsB={winsB}
          startTime={startTime}
          endTime={endTime}
          matchWinner={displayMatch.matchWinner}
        />
      </div>

      {/* メインエリア: スコアシート + サイドボタン */}
      <div className="sheet-main">
        {/* ピンチズーム対応スクロールエリア */}
        <PinchZoomScroll>
          {/* タイトル（コンパクト） */}
          <div className="sheet-title-row sheet-title-row-compact">
            <h2 className="sheet-title sheet-title-compact">スコアシート</h2>
          </div>

          {/* ヘッダー情報（コンパクト） */}
          <div className="sheet-header sheet-header-compact">
          <div className="sheet-header-left">
            <div className="sheet-info-row">
              <span className="sheet-info-label">試合番号</span>
              <span className="sheet-info-value">{matchInfo.matchNumber || '—'}</span>
            </div>
            <div className="sheet-info-row">
              <span className="sheet-info-label">種　　目</span>
              <span className="sheet-info-value">{matchInfo.type}</span>
            </div>
            <div className="sheet-info-row">
              <span className="sheet-info-label">コート番号</span>
              <span className="sheet-info-value">{matchInfo.courtNumber || '—'}</span>
            </div>
            <div className="sheet-info-row">
              <span className="sheet-info-label">日　　付</span>
              <span className="sheet-info-value">{formatDate(matchInfo.date)}</span>
            </div>
          </div>

          {/* 対戦カード中央 */}
          <div className="sheet-matchup">
            <div className="sheet-team-box team-box-a">
              <div className="sheet-team-label">{matchInfo.teamA.name}</div>
              <div className="sheet-team-player">{matchInfo.teamA.player1}</div>
              {matchInfo.teamA.player2 && <div className="sheet-team-player">{matchInfo.teamA.player2}</div>}
            </div>
            <div className="sheet-score-summary">
              {displayGames.map((g, i) => (
                <div key={i} className="sheet-game-score">
                  <span className={g.winner === 'A' ? 'score-win' : ''}>{g.scoreA}</span>
                  <span className="score-colon">:</span>
                  <span className={g.winner === 'B' ? 'score-win' : ''}>{g.scoreB}</span>
                </div>
              ))}
              <div className="sheet-wins-total">
                <span className={winsA > winsB ? 'score-win' : ''}>{winsA}</span>
                <span>—</span>
                <span className={winsB > winsA ? 'score-win' : ''}>{winsB}</span>
              </div>
            </div>
            <div className="sheet-team-box team-box-b">
              <div className="sheet-team-label">{matchInfo.teamB.name}</div>
              <div className="sheet-team-player">{matchInfo.teamB.player1}</div>
              {matchInfo.teamB.player2 && <div className="sheet-team-player">{matchInfo.teamB.player2}</div>}
            </div>
          </div>

          <div className="sheet-header-right">
            <div className="sheet-info-row">
              <span className="sheet-info-label">主　　審</span>
              <span className="sheet-info-value">{matchInfo.referee || '—'}</span>
            </div>
            <div className="sheet-info-row">
              <span className="sheet-info-label">サービスジャッジ</span>
              <span className="sheet-info-value">{matchInfo.serviceJudge || '—'}</span>
            </div>
            <div className="sheet-info-row">
              <span className="sheet-info-label">開始時刻</span>
              <span className="sheet-info-value">{formatTime(startTime)}</span>
            </div>
            <div className="sheet-info-row">
              <span className="sheet-info-label">終了時刻</span>
              <span className="sheet-info-value">{formatTime(endTime)}</span>
            </div>
          </div>
        </div>

          {/* 全ゲーム統合横並びスコア表 */}
          <UnifiedScoreTable
            games={displayGames}
            matchInfo={matchInfo}
            editMode={editMode}
            editedScores={editedScores}
            onEditScore={handleEditScore}
          />
        </PinchZoomScroll>

        {/* サイドボタンパネル */}
        <div className="sheet-side-panel">
          <button
            className={`side-btn ${editMode ? 'side-btn-active' : ''}`}
            onClick={() => setEditMode(v => !v)}
          >
            {editMode ? '✓\n完了' : '✏️\n修正'}
          </button>
          {backPage === 'scoring' && displayMatch.status === 'in_progress' ? (
            <button
              className={`side-btn ${saveFlash ? 'side-btn-saved' : 'side-btn-save'}`}
              onClick={handleSaveProgress}
              disabled={saveFlash}
            >
              {saveFlash ? '✓\n保存済' : '💾\n途中\n保存'}
            </button>
          ) : (
            <>
              <button className="side-btn" onClick={handleExportImage} disabled={exporting}>
                {exporting ? '…' : '📷\n画像'}
              </button>
              <button className="side-btn" onClick={handleExportPDF} disabled={exporting}>
                {exporting ? '…' : '📄\nPDF'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
