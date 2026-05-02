import React, { useState, useEffect, useRef } from 'react';
import { useMatch } from '../context/MatchContext';
import { useSettings } from '../context/SettingsContext';
import { isDoubles, getGameWins, getPointStatus, getServiceCourt, getReceiverPlayer } from '../utils/badmintonLogic';
import { useWakeLock } from '../utils/useWakeLock';
import './Scoring.css';

export default function Scoring({ goTo }) {
  const { match, addPoint, undoPoint, nextGame, clearMatch, correctServer, addServiceError, forfeit } = useMatch();
  const { settings } = useSettings();

  // 試合中の画面スリープ防止
  useWakeLock(true);

  // --- モーダル・UI状態 ---
  const [showConfirmFinish, setShowConfirmFinish] = useState(false);
  const [showUndoConfirm, setShowUndoConfirm] = useState(false);
  const [showServiceCorrect, setShowServiceCorrect] = useState(false);
  const [showLetConfirm, setShowLetConfirm] = useState(false);
  const [showWO, setShowWO] = useState(false);
  const [lastPointFlash, setLastPointFlash] = useState(null);

  // --- 勝者・主審承諾フロー ---
  const [confirmPhase, setConfirmPhase] = useState('winner');
  const [confirmChecked, setConfirmChecked] = useState(false);

  // --- チェンジエンドオーバーレイ（第3ゲーム中間） ---
  const [showChangeEnd, setShowChangeEnd] = useState(false);
  const changeEndShownRef = useRef(-1);

  // --- ゲーム間インターバルタイマー ---
  const [intervalSeconds, setIntervalSeconds] = useState(0);
  const [intervalActive, setIntervalActive] = useState(false);
  const intervalStartedRef = useRef(-1);

  // ゲーム間インターバルタイマー
  useEffect(() => {
    if (!intervalActive || intervalSeconds <= 0) return;
    const id = setInterval(() => {
      setIntervalSeconds(prev => {
        if (prev <= 1) {
          setIntervalActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [intervalActive]);

  // マッチ状態変化の検知
  useEffect(() => {
    if (!match) return;
    const { status, currentGameIndex, games } = match;

    // ゲーム間インターバル開始
    if (status === 'game_over' && intervalStartedRef.current !== currentGameIndex) {
      intervalStartedRef.current = currentGameIndex;
      setIntervalSeconds(120);
      setIntervalActive(true);
    }

    // 第3ゲーム中間チェンジエンド（gameTargetの半分に達したとき）
    if (status === 'in_progress' && currentGameIndex >= 2) {
      const g = games[currentGameIndex];
      const midPoint = Math.ceil((settings.gameTarget ?? 21) / 2);
      if (g && (g.scoreA >= midPoint || g.scoreB >= midPoint) && changeEndShownRef.current !== currentGameIndex) {
        changeEndShownRef.current = currentGameIndex;
        setShowChangeEnd(true);
      }
    }
  }, [match]);

  if (!match) {
    return (
      <div className="scoring-page page">
        <div className="topbar">
          <button className="topbar-btn" onClick={() => goTo('home')}>← 戻る</button>
          <span className="topbar-title">スコアリング</span>
        </div>
        <div style={{ padding: 24, textAlign: 'center', color: '#888' }}>
          試合が設定されていません
          <br /><br />
          <button className="btn-primary" style={{ maxWidth: 200, margin: '0 auto' }} onClick={() => goTo('setup')}>
            試合を設定
          </button>
        </div>
      </div>
    );
  }

  const { matchInfo, games, currentGameIndex, status, matchWinner } = match;
  const doubles = isDoubles(matchInfo.type);
  const currentGame = games[currentGameIndex];
  const { winsA, winsB } = getGameWins(games);
  const { scoreA, scoreB, server, serverPlayer } = currentGame;

  function getPlayerName(key) {
    if (!key) return '';
    if (key === 'A1') return matchInfo.teamA.player1;
    if (key === 'A2') return matchInfo.teamA.player2;
    if (key === 'B1') return matchInfo.teamB.player1;
    if (key === 'B2') return matchInfo.teamB.player2;
    return '';
  }

  function handlePoint(scorer) {
    setLastPointFlash(scorer);
    setTimeout(() => setLastPointFlash(null), 300);
    addPoint(scorer);
  }

  function handleUndoRequest() {
    if (currentGame && currentGame.rallies.length === 0 && currentGameIndex === 0) return;
    setShowUndoConfirm(true);
  }

  function handleUndo() {
    undoPoint();
    setShowUndoConfirm(false);
  }

  // ——— ゲーム終了画面 ———
  if (status === 'game_over') {
    const gameWinner = currentGame.winner;
    const winnerName = gameWinner === 'A' ? matchInfo.teamA.name : matchInfo.teamB.name;

    function getDesignatedPlayer(team) {
      const game1 = games[0];
      if (!game1 || !game1.firstServerPlayer) return null;
      return game1.firstServer === team ? game1.firstServerPlayer : game1.firstReceiverPlayer;
    }

    const nextSPlayerKey = doubles ? getDesignatedPlayer(gameWinner) : null;
    const nextRTeam = gameWinner === 'A' ? 'B' : 'A';
    const nextRPlayerKey = doubles ? getDesignatedPlayer(nextRTeam) : null;

    function handleStartNextGame() {
      setIntervalActive(false);
      setIntervalSeconds(0);
      nextGame(gameWinner, nextSPlayerKey, nextRPlayerKey);
    }

    const intervalMin = Math.floor(intervalSeconds / 60);
    const intervalSec = String(intervalSeconds % 60).padStart(2, '0');

    return (
      <div className="scoring-page page">
        <div className="topbar">
          <button className="topbar-btn" onClick={() => goTo('sheet', 'current')}>📋 シート</button>
          <span className="topbar-title">ゲーム{currentGameIndex + 1} 終了</span>
          <div style={{ width: 60 }} />
        </div>
        <div className="game-over-screen">
          {/* チェンジエンドバナー */}
          <div className="change-end-banner">
            <span className="change-end-icon">⇄</span>
            <span className="change-end-text">チェンジエンド</span>
            {intervalActive ? (
              <span className="change-end-timer">{intervalMin}:{intervalSec}</span>
            ) : (
              <span className="change-end-done">✓ 準備OK</span>
            )}
          </div>

          <div className="game-over-result">
            <div className="game-over-winner">
              {winnerName} が勝利
              {doubles && (
                <div className="game-over-players">
                  {gameWinner === 'A'
                    ? `${matchInfo.teamA.player1} / ${matchInfo.teamA.player2}`
                    : `${matchInfo.teamB.player1} / ${matchInfo.teamB.player2}`}
                </div>
              )}
            </div>
            <div className="game-over-score">
              {currentGame.scoreA} - {currentGame.scoreB}
            </div>
            <div className="game-over-gamescore">
              ゲームスコア {winsA} - {winsB}
            </div>
          </div>

          <div className="card">
            <p className="section-header">第{currentGameIndex + 2}ゲーム</p>
            <div className="next-game-suggestion">
              第{currentGameIndex + 1}ゲームを取った <strong>{winnerName}</strong> のサービスで開始します
            </div>
            {doubles && nextSPlayerKey && (
              <div className="next-game-sr-info">
                <span className="badge-s-inline">S</span>
                {getPlayerName(nextSPlayerKey)}
                <span className="badge-r-inline">R</span>
                {getPlayerName(nextRPlayerKey)}
              </div>
            )}
            <button className="btn-primary" style={{ marginTop: 16 }} onClick={handleStartNextGame}>
              第{currentGameIndex + 2}ゲーム開始 🏸
            </button>
          </div>

          <button className="btn-secondary" onClick={() => goTo('sheet', 'current')}>
            スコアシートを見る
          </button>
        </div>
      </div>
    );
  }

  // ——— 試合終了画面 ———
  if (status === 'finished') {
    const isDraw = matchWinner === 'draw';
    const winnerTeam = matchWinner === 'A' ? matchInfo.teamA : matchWinner === 'B' ? matchInfo.teamB : null;

    function handleConfirmCheck() {
      if (confirmChecked) return;
      setConfirmChecked(true);
      setTimeout(() => {
        if (!isDraw && confirmPhase === 'winner') {
          setConfirmPhase('referee');
          setConfirmChecked(false);
        } else {
          clearMatch();
          goTo('home');
        }
      }, 700);
    }

    const isWinnerPhase = !isDraw && confirmPhase === 'winner';
    const totalA = games.reduce((sum, g) => sum + (g.scoreA || 0), 0);
    const totalB = games.reduce((sum, g) => sum + (g.scoreB || 0), 0);

    return (
      <div className="scoring-page page">
        <div className="topbar">
          <div style={{ width: 60 }} />
          <span className="topbar-title">試合結果承諾</span>
          <button className="topbar-btn" onClick={() => goTo('sheet', 'current')}>📋 シート</button>
        </div>
        <div className="confirm-screen">
          {match.forfeit && (
            <div className="wo-banner">
              ⚠ {match.forfeit === 'A' ? matchInfo.teamA.name : matchInfo.teamB.name} 棄権（W.O.）
            </div>
          )}
          <div className="confirm-result-card card">
            {isDraw ? (
              <>
                <div className="confirm-trophy">🤝</div>
                <div className="confirm-winner-name">引き分け</div>
                <div className="confirm-winner-sub" style={{ fontSize: 12, color: '#888' }}>
                  得失点差: {matchInfo.teamA.name} {totalA} — {totalB} {matchInfo.teamB.name}
                </div>
              </>
            ) : (
              <>
                <div className="confirm-trophy">🏆</div>
                <div className="confirm-winner-name">{winnerTeam.name}</div>
                {doubles && (
                  <div className="confirm-winner-players">
                    {winnerTeam.player1} / {winnerTeam.player2}
                  </div>
                )}
                <div className="confirm-winner-sub">が勝利</div>
              </>
            )}
            <div className="confirm-matchup">
              <div className="confirm-team">
                <div className="confirm-team-name">{matchInfo.teamA.name}</div>
                {doubles && <div className="confirm-team-players">{matchInfo.teamA.player1}<br />{matchInfo.teamA.player2}</div>}
                {!doubles && <div className="confirm-team-players">{matchInfo.teamA.player1}</div>}
              </div>
              <div className="confirm-scores">
                {games.map((g, i) => (
                  <div key={i} className="confirm-game-row">
                    <span className="confirm-game-label">G{i + 1}</span>
                    <span className={`confirm-game-score ${g.winner === 'A' ? 'cscore-win' : ''}`}>{g.scoreA}</span>
                    <span className="confirm-colon">—</span>
                    <span className={`confirm-game-score ${g.winner === 'B' ? 'cscore-win' : ''}`}>{g.scoreB}</span>
                  </div>
                ))}
                <div className="confirm-wins-row">
                  <span className={winsA > winsB ? 'cwins-win' : 'cwins'}>{winsA}</span>
                  <span className="confirm-colon">—</span>
                  <span className={winsB > winsA ? 'cwins-win' : 'cwins'}>{winsB}</span>
                </div>
              </div>
              <div className="confirm-team">
                <div className="confirm-team-name">{matchInfo.teamB.name}</div>
                {doubles && <div className="confirm-team-players">{matchInfo.teamB.player1}<br />{matchInfo.teamB.player2}</div>}
                {!doubles && <div className="confirm-team-players">{matchInfo.teamB.player1}</div>}
              </div>
            </div>
          </div>
          <div className="confirm-box card">
            <div className="confirm-phase-label">
              {isDraw ? '📋 主審による確認' : isWinnerPhase ? `✅ 勝者チーム（${winnerTeam.name}）による確認` : '📋 主審による確認'}
            </div>
            <p className="confirm-instruction">
              得点が正しいか必ず確認後<br />
              □ をタップして試合結果を承諾してください
            </p>
            <button
              className={`confirm-checkbox-btn ${confirmChecked ? 'checked' : ''}`}
              onClick={handleConfirmCheck}
              disabled={confirmChecked}
            >
              {confirmChecked ? '✅' : '□'}
            </button>
            <p className="confirm-sub-note">
              {isWinnerPhase ? 'タップ後、主審承諾画面に進みます' : 'タップ後、トップ画面へ戻ります'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ——— メインスコアリング画面 ———
  const { aIsGamePoint, bIsGamePoint, aIsMatchPoint, bIsMatchPoint } = getPointStatus(
    scoreA, scoreB, winsA, winsB, settings
  );
  const deuceAt = (settings.gameTarget ?? 21) - 1;
  const isDeuce = (settings.deuceEnabled ?? true) && scoreA >= deuceAt && scoreB >= deuceAt;

  const serverScore = server === 'A' ? scoreA : scoreB;
  const receiverScore = server === 'A' ? scoreB : scoreA;
  const serverTeamName = server === 'A' ? matchInfo.teamA.name : matchInfo.teamB.name;
  const serviceCourt = getServiceCourt(serverScore);
  const serviceCourtLabel = serviceCourt === 'right' ? '右' : '左';
  const receiverPlayer = doubles ? getReceiverPlayer(currentGame) : null;

  const canUndo = !(currentGame.rallies.length === 0 && currentGameIndex === 0);

  return (
    <div className="scoring-page page">
      {/* トップバー */}
      <div className="topbar">
        <button className="topbar-btn" onClick={() => goTo('home')}>🏠</button>
        <div className="topbar-game-info">
          <span className="topbar-game-label">第{currentGameIndex + 1}ゲーム</span>
          <span className="topbar-game-wins">{winsA} - {winsB}</span>
        </div>
        <button className="topbar-btn" onClick={() => goTo('sheet', 'current')}>📋</button>
      </div>

      {/* ステータスバー */}
      {(isDeuce || aIsMatchPoint || bIsMatchPoint || aIsGamePoint || bIsGamePoint) && (
        <div className={`status-bar ${aIsMatchPoint || bIsMatchPoint ? 'match-point' : 'game-point'}`}>
          {aIsMatchPoint && `マッチポイント: ${matchInfo.teamA.name}`}
          {bIsMatchPoint && `マッチポイント: ${matchInfo.teamB.name}`}
          {!aIsMatchPoint && !bIsMatchPoint && aIsGamePoint && `ゲームポイント: ${matchInfo.teamA.name}`}
          {!aIsMatchPoint && !bIsMatchPoint && bIsGamePoint && `ゲームポイント: ${matchInfo.teamB.name}`}
          {isDeuce && !aIsGamePoint && !bIsGamePoint && 'デュース'}
        </div>
      )}

      {/* メインスコアエリア */}
      <div className="score-area">
        {/* チームA */}
        <button
          className={`score-panel panel-a ${server === 'A' ? 'serving' : ''} ${lastPointFlash === 'A' ? 'flash' : ''}`}
          onClick={() => handlePoint('A')}
        >
          <div className="panel-team-info">
            <div className="panel-team-name">{matchInfo.teamA.name}</div>
            <div className="panel-players">
              <div className={`panel-player ${doubles && serverPlayer === 'A1' && server === 'A' ? 'serving-player' : ''} ${doubles && receiverPlayer === 'A1' ? 'receiving-player' : ''}`}>
                {matchInfo.teamA.player1}
                {doubles && serverPlayer === 'A1' && server === 'A' && <span className="serve-mark">🏸</span>}
                {doubles && receiverPlayer === 'A1' && <span className="receive-mark">🛡️</span>}
              </div>
              {doubles && (
                <div className={`panel-player ${serverPlayer === 'A2' && server === 'A' ? 'serving-player' : ''} ${receiverPlayer === 'A2' ? 'receiving-player' : ''}`}>
                  {matchInfo.teamA.player2}
                  {serverPlayer === 'A2' && server === 'A' && <span className="serve-mark">🏸</span>}
                  {receiverPlayer === 'A2' && <span className="receive-mark">🛡️</span>}
                </div>
              )}
            </div>
          </div>
          <div className="panel-score-wrap">
            {server === 'A' && (
              <div className="serve-indicator">
                サービス <span className="service-court-badge">{serviceCourtLabel}コート</span>
              </div>
            )}
            <div className="panel-score">{scoreA}</div>
          </div>
        </button>

        {/* 中央区切り */}
        <div className="score-divider">
          <div className="score-divider-line" />
          <div className="score-divider-dash">—</div>
          <div className="score-divider-line" />
        </div>

        {/* チームB */}
        <button
          className={`score-panel panel-b ${server === 'B' ? 'serving' : ''} ${lastPointFlash === 'B' ? 'flash' : ''}`}
          onClick={() => handlePoint('B')}
        >
          <div className="panel-score-wrap">
            {server === 'B' && (
              <div className="serve-indicator">
                サービス <span className="service-court-badge">{serviceCourtLabel}コート</span>
              </div>
            )}
            <div className="panel-score">{scoreB}</div>
          </div>
          <div className="panel-team-info panel-team-info-right">
            <div className="panel-team-name">{matchInfo.teamB.name}</div>
            <div className="panel-players">
              <div className={`panel-player ${doubles && serverPlayer === 'B1' && server === 'B' ? 'serving-player' : ''} ${doubles && receiverPlayer === 'B1' ? 'receiving-player' : ''}`}>
                {matchInfo.teamB.player1}
                {doubles && serverPlayer === 'B1' && server === 'B' && <span className="serve-mark">🏸</span>}
                {doubles && receiverPlayer === 'B1' && <span className="receive-mark">🛡️</span>}
              </div>
              {doubles && (
                <div className={`panel-player ${serverPlayer === 'B2' && server === 'B' ? 'serving-player' : ''} ${receiverPlayer === 'B2' ? 'receiving-player' : ''}`}>
                  {matchInfo.teamB.player2}
                  {serverPlayer === 'B2' && server === 'B' && <span className="serve-mark">🏸</span>}
                  {receiverPlayer === 'B2' && <span className="receive-mark">🛡️</span>}
                </div>
              )}
            </div>
          </div>
        </button>
      </div>

      {/* スコア読み上げバー（サーブ側スコアを先読み） */}
      <div className="score-announce-bar">
        <span className="score-announce-icon">📢</span>
        <span className="score-announce-text">{serverScore} — {receiverScore}</span>
        <span className="score-announce-sub">{serverTeamName} サーブ</span>
      </div>

      {/* サブアクションバー */}
      <div className="sub-action-bar">
        <button className="sub-action-btn" onClick={() => setShowServiceCorrect(true)}>
          🔧 サービス修正
        </button>
        <button className="sub-action-btn" onClick={() => setShowLetConfirm(true)}>
          🔄 レット
        </button>
      </div>

      {/* ボトムバー */}
      <div className="bottom-bar">
        <button
          className="undo-btn-prominent"
          onClick={handleUndoRequest}
          disabled={!canUndo}
        >
          ↩ 取り消し
        </button>
        <div className="rally-count">
          {currentGame.rallies.length}ラリー
        </div>
        <button className="sheet-btn" onClick={() => setShowConfirmFinish(true)}>
          試合終了
        </button>
      </div>

      {/* ====== チェンジエンド確認（第3ゲーム中間） ====== */}
      {showChangeEnd && (
        <div className="change-end-overlay">
          <div className="change-end-overlay-content">
            <div className="change-end-overlay-icon">⇄</div>
            <div className="change-end-overlay-title">チェンジエンド</div>
            <div className="change-end-overlay-sub">コートチェンジしますか？</div>
            <button
              className="change-end-overlay-btn"
              onClick={() => setShowChangeEnd(false)}
            >
              コートチェンジ完了 ✓
            </button>
          </div>
        </div>
      )}

      {/* ====== 取り消し確認モーダル ====== */}
      {showUndoConfirm && (
        <div className="modal-overlay" onClick={() => setShowUndoConfirm(false)}>
          <div className="modal-card card" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">直前のポイントを取り消しますか？</h3>
            <div className="modal-btns">
              <button className="btn-danger" onClick={handleUndo}>取り消す</button>
              <button className="btn-secondary" onClick={() => setShowUndoConfirm(false)}>キャンセル</button>
            </div>
          </div>
        </div>
      )}

      {/* ====== 試合終了確認モーダル ====== */}
      {showConfirmFinish && (
        <div className="modal-overlay" onClick={() => setShowConfirmFinish(false)}>
          <div className="modal-card card" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">試合を終了しますか？</h3>
            <p className="modal-desc">現在のスコア: {scoreA} - {scoreB}</p>
            <div className="modal-btns">
              <button className="btn-danger" onClick={() => { setShowConfirmFinish(false); goTo('sheet', 'current'); }}>
                終了してシートを見る
              </button>
              <button className="btn-warning" onClick={() => { setShowConfirmFinish(false); setShowWO(true); }}>
                ⚠ 棄権（W.O.）で終了
              </button>
              <button className="btn-secondary" onClick={() => setShowConfirmFinish(false)}>キャンセル</button>
            </div>
          </div>
        </div>
      )}

      {/* ====== W.O.（棄権）選択モーダル ====== */}
      {showWO && (
        <div className="modal-overlay" onClick={() => setShowWO(false)}>
          <div className="modal-card card" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">棄権チームを選択</h3>
            <p className="modal-desc">棄権（W.O.）するチームを選んでください</p>
            <div className="modal-btns">
              <button className="btn-warning" onClick={() => { forfeit('A'); setShowWO(false); }}>
                {matchInfo.teamA.name} が棄権
              </button>
              <button className="btn-warning" onClick={() => { forfeit('B'); setShowWO(false); }}>
                {matchInfo.teamB.name} が棄権
              </button>
              <button className="btn-secondary" onClick={() => setShowWO(false)}>キャンセル</button>
            </div>
          </div>
        </div>
      )}

      {/* ====== サービス修正モーダル ====== */}
      {showServiceCorrect && (
        <div className="modal-overlay" onClick={() => setShowServiceCorrect(false)}>
          <div className="modal-card card" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">🔧 サービス修正</h3>
            <p className="modal-desc">
              現在: <strong>
                {server === 'A' ? matchInfo.teamA.name : matchInfo.teamB.name}
                {doubles ? ` / ${getPlayerName(serverPlayer)}` : ''}
              </strong> がサービス
            </p>
            <div className="service-correct-teams">
              <div className="service-correct-team-col">
                <div className="service-correct-team-label team-a-label">{matchInfo.teamA.name}</div>
                <button
                  className={`service-correct-player-btn ${server === 'A' && (serverPlayer === 'A1' || !doubles) ? 'scp-current' : ''}`}
                  onClick={() => { correctServer('A', 'A1'); setShowServiceCorrect(false); }}
                >
                  {matchInfo.teamA.player1}
                  {server === 'A' && (serverPlayer === 'A1' || !doubles) && <span className="scp-check"> ✓</span>}
                </button>
                {doubles && (
                  <button
                    className={`service-correct-player-btn ${server === 'A' && serverPlayer === 'A2' ? 'scp-current' : ''}`}
                    onClick={() => { correctServer('A', 'A2'); setShowServiceCorrect(false); }}
                  >
                    {matchInfo.teamA.player2}
                    {server === 'A' && serverPlayer === 'A2' && <span className="scp-check"> ✓</span>}
                  </button>
                )}
              </div>
              <div className="service-correct-vs">vs</div>
              <div className="service-correct-team-col">
                <div className="service-correct-team-label team-b-label">{matchInfo.teamB.name}</div>
                <button
                  className={`service-correct-player-btn ${server === 'B' && (serverPlayer === 'B1' || !doubles) ? 'scp-current' : ''}`}
                  onClick={() => { correctServer('B', 'B1'); setShowServiceCorrect(false); }}
                >
                  {matchInfo.teamB.player1}
                  {server === 'B' && (serverPlayer === 'B1' || !doubles) && <span className="scp-check"> ✓</span>}
                </button>
                {doubles && (
                  <button
                    className={`service-correct-player-btn ${server === 'B' && serverPlayer === 'B2' ? 'scp-current' : ''}`}
                    onClick={() => { correctServer('B', 'B2'); setShowServiceCorrect(false); }}
                  >
                    {matchInfo.teamB.player2}
                    {server === 'B' && serverPlayer === 'B2' && <span className="scp-check"> ✓</span>}
                  </button>
                )}
              </div>
            </div>
            <div className="service-correct-footer">
              <button
                className="service-error-record-btn"
                onClick={() => { addServiceError(); setShowServiceCorrect(false); }}
              >
                ⚠ サービスシークエンスエラーを記録
              </button>
              <button className="btn-secondary" onClick={() => setShowServiceCorrect(false)}>キャンセル</button>
            </div>
          </div>
        </div>
      )}

      {/* ====== レット確認モーダル ====== */}
      {showLetConfirm && (
        <div className="modal-overlay" onClick={() => setShowLetConfirm(false)}>
          <div className="modal-card card" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">🔄 レット（やり直し）</h3>
            <p className="modal-desc">
              ラリーをやり直します。<br />スコアは変わりません。
            </p>
            <div className="modal-btns">
              <button className="btn-primary" onClick={() => setShowLetConfirm(false)}>
                確認 ✓ 再サービスへ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
