import React from 'react';
import { useMatch } from '../context/MatchContext';
import InstallPrompt from '../components/InstallPrompt';
import './Home.css';

export default function Home({ goTo }) {
  const { match } = useMatch();

  return (
    <div className="home-page page">
      <div className="home-hero">
        <div className="home-shuttlecock">🏸</div>
        <h1 className="home-title">バドミントン<br />スコアシート</h1>
        <p className="home-sub">試合のスコアを記録・管理</p>
      </div>

      <div className="home-content">
        <InstallPrompt />

        {match && match.status !== 'finished' && (
          <div className="home-ongoing-card card">
            <div className="home-ongoing-label">試合進行中</div>
            <div className="home-ongoing-info">
              <span className="home-ongoing-teams">
                {match.matchInfo.teamA.name} vs {match.matchInfo.teamB.name}
              </span>
              <span className="home-ongoing-type">{match.matchInfo.type}</span>
            </div>
            <button className="btn-primary" onClick={() => goTo('scoring')}>
              試合に戻る
            </button>
          </div>
        )}

        <div className="home-buttons">
          <button className="home-btn-new btn-primary" onClick={() => goTo('setup')}>
            <span className="home-btn-icon">＋</span>
            新しい試合を開始
          </button>

          <button className="home-btn-history btn-secondary" onClick={() => goTo('history')}>
            <span className="home-btn-icon">📋</span>
            試合履歴
          </button>

          <button className="home-btn-settings btn-secondary" onClick={() => goTo('settings')}>
            <span className="home-btn-icon">⚙️</span>
            設定
          </button>
        </div>

        <div className="home-howto card">
          <p className="section-header">使い方</p>
          <ol className="home-howto-list">
            <li>「新しい試合を開始」をタップ</li>
            <li>チーム名・選手名・種目を入力</li>
            <li>コイントスで先攻を決定</li>
            <li>得点チームの画面をタップ</li>
            <li>試合終了後に履歴・PDFで保存</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
