import React, { useState, useEffect } from 'react';
import { useMatch } from '../context/MatchContext';
import { getGameWins } from '../utils/badmintonLogic';
import './History.css';

export default function History({ goTo }) {
  const { getHistory, loadMatch, deleteHistory } = useMatch();
  const [history, setHistory] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  function handleLoad(match) {
    loadMatch(match);
    goTo('sheet', match);
  }

  function handleDelete(id) {
    deleteHistory(id);
    setHistory(getHistory());
    setConfirmDelete(null);
  }

  function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function formatTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="history-page page">
      <div className="topbar">
        <button className="topbar-btn" onClick={() => goTo('home')}>← 戻る</button>
        <span className="topbar-title">試合履歴</span>
        <div style={{ width: 60 }} />
      </div>

      <div className="history-content">
        {history.length === 0 ? (
          <div className="history-empty">
            <div className="history-empty-icon">📋</div>
            <p>履歴がありません</p>
            <button className="btn-primary" style={{ maxWidth: 200, margin: '0 auto' }} onClick={() => goTo('setup')}>
              試合を開始する
            </button>
          </div>
        ) : (
          <div className="history-list">
            {history.map((match) => {
              const { winsA, winsB } = getGameWins(match.games);
              const winner = match.matchWinner;

              return (
                <div key={match.id} className="history-card card">
                  <div className="history-card-header">
                    <div className="history-meta">
                      <span className="history-type">{match.matchInfo.type}</span>
                      <span className="history-date">{formatDate(match.startTime)}</span>
                      {match.matchInfo.matchNumber && (
                        <span className="history-number">#{match.matchInfo.matchNumber}</span>
                      )}
                    </div>
                    <button
                      className="history-delete-btn"
                      onClick={() => setConfirmDelete(match.id)}
                    >
                      ✕
                    </button>
                  </div>

                  <div className="history-matchup">
                    <div className={`history-team ${winner === 'A' ? 'team-winner' : ''}`}>
                      <div className="history-team-name">{match.matchInfo.teamA.name}</div>
                      <div className="history-player">{match.matchInfo.teamA.player1}</div>
                      {match.matchInfo.teamA.player2 && (
                        <div className="history-player">{match.matchInfo.teamA.player2}</div>
                      )}
                    </div>

                    <div className="history-scores">
                      <div className="history-game-wins">
                        <span className={winner === 'A' ? 'wins-highlight' : ''}>{winsA}</span>
                        <span className="wins-sep">-</span>
                        <span className={winner === 'B' ? 'wins-highlight' : ''}>{winsB}</span>
                      </div>
                      {match.games.map((g, i) => (
                        <div key={i} className="history-game-score">
                          <span className={g.winner === 'A' ? 'score-bold' : ''}>{g.scoreA}</span>
                          <span>:</span>
                          <span className={g.winner === 'B' ? 'score-bold' : ''}>{g.scoreB}</span>
                        </div>
                      ))}
                    </div>

                    <div className={`history-team history-team-right ${winner === 'B' ? 'team-winner' : ''}`}>
                      <div className="history-team-name">{match.matchInfo.teamB.name}</div>
                      <div className="history-player">{match.matchInfo.teamB.player1}</div>
                      {match.matchInfo.teamB.player2 && (
                        <div className="history-player">{match.matchInfo.teamB.player2}</div>
                      )}
                    </div>
                  </div>

                  <button
                    className="history-view-btn btn-secondary"
                    onClick={() => handleLoad(match)}
                  >
                    📋 スコアシートを見る
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 削除確認モーダル */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal-card card" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">履歴を削除しますか？</h3>
            <p className="modal-desc">この操作は元に戻せません。</p>
            <div className="modal-btns">
              <button className="btn-danger" onClick={() => handleDelete(confirmDelete)}>
                削除する
              </button>
              <button className="btn-secondary" onClick={() => setConfirmDelete(null)}>
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
