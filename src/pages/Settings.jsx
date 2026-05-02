import React from 'react';
import { useSettings, DEFAULT_SETTINGS } from '../context/SettingsContext';
import './Settings.css';

export default function Settings({ goTo }) {
  const { settings, updateSettings } = useSettings();

  function handleGameTarget(e) {
    const val = parseInt(e.target.value, 10);
    if (isNaN(val)) return;
    const gt = Math.max(7, Math.min(50, val));
    // maxScoreがgameTargetを下回らないよう調整
    const ms = Math.max(gt + 1, settings.maxScore);
    updateSettings({ gameTarget: gt, maxScore: ms });
  }

  function handleMaxScore(e) {
    const val = parseInt(e.target.value, 10);
    if (isNaN(val)) return;
    const ms = Math.max(settings.gameTarget + 1, Math.min(99, val));
    updateSettings({ maxScore: ms });
  }

  function handleDeuceToggle() {
    updateSettings({ deuceEnabled: !settings.deuceEnabled });
  }

  function handleReset() {
    updateSettings({ ...DEFAULT_SETTINGS });
  }

  return (
    <div className="settings-page page">
      <div className="topbar">
        <button className="topbar-btn" onClick={() => goTo('home')}>← 戻る</button>
        <span className="topbar-title">設定</span>
        <div style={{ width: 60 }} />
      </div>

      <div className="settings-content">

        {/* 得点設定 */}
        <div className="settings-section card">
          <p className="section-header">得点ルール</p>

          {/* 何点マッチ */}
          <div className="settings-row">
            <div className="settings-row-info">
              <div className="settings-label">1ゲームの勝利点数</div>
              <div className="settings-desc">この点数を先取したチームが1ゲーム獲得（7〜50点）</div>
            </div>
            <div className="settings-number-wrap">
              <button
                className="settings-num-btn"
                onClick={() => updateSettings({ gameTarget: Math.max(7, settings.gameTarget - 1) })}
              >－</button>
              <span className="settings-num-value">{settings.gameTarget}</span>
              <button
                className="settings-num-btn"
                onClick={() => updateSettings({ gameTarget: Math.min(50, settings.gameTarget + 1) })}
              >＋</button>
            </div>
          </div>

          {/* デュースあり/なし */}
          <div className="settings-row">
            <div className="settings-row-info">
              <div className="settings-label">デュースあり</div>
              <div className="settings-desc">
                {settings.deuceEnabled
                  ? `${settings.gameTarget - 1}-${settings.gameTarget - 1} でデュース開始`
                  : `${settings.gameTarget}点で即勝利（2点差不要）`}
              </div>
            </div>
            <button
              className={`settings-toggle ${settings.deuceEnabled ? 'toggle-on' : 'toggle-off'}`}
              onClick={handleDeuceToggle}
            >
              {settings.deuceEnabled ? 'あり' : 'なし'}
            </button>
          </div>

          {/* デュース最大点 */}
          {settings.deuceEnabled && (
            <div className="settings-row">
              <div className="settings-row-info">
                <div className="settings-label">デュース時の最大得点</div>
                <div className="settings-desc">
                  この得点に達した時点で2点差なくても勝利<br />
                  （正式ルール: {settings.gameTarget}点マッチは最大{settings.gameTarget + 9}点）
                </div>
              </div>
              <div className="settings-number-wrap">
                <button
                  className="settings-num-btn"
                  onClick={() => updateSettings({ maxScore: Math.max(settings.gameTarget + 1, settings.maxScore - 1) })}
                >－</button>
                <span className="settings-num-value">{settings.maxScore}</span>
                <button
                  className="settings-num-btn"
                  onClick={() => updateSettings({ maxScore: Math.min(99, settings.maxScore + 1) })}
                >＋</button>
              </div>
            </div>
          )}
        </div>

        {/* 何ゲームマッチ */}
        <div className="settings-section card">
          <p className="section-header">ゲーム数</p>
          <div className="settings-row">
            <div className="settings-row-info">
              <div className="settings-label">何ゲームマッチ</div>
              <div className="settings-desc">
                {settings.matchGames === 1 && '1ゲームのみ。1ゲーム取ったほうが勝ち'}
                {settings.matchGames === 2 && '先に2ゲーム取ったほうが勝ち（最大3ゲーム）'}
                {(settings.matchGames === 3 || !settings.matchGames) && '先に2ゲーム取ったほうが勝ち（最大3ゲーム）'}
              </div>
            </div>
            <div className="settings-toggle-group">
              {[1, 2, 3].map(n => (
                <button
                  key={n}
                  className={`settings-toggle-option ${(settings.matchGames ?? 3) === n ? 'toggle-option-active' : ''}`}
                  onClick={() => updateSettings({ matchGames: n })}
                >
                  {n}G
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 現在の設定まとめ */}
        <div className="settings-summary card">
          <p className="section-header">現在の設定まとめ</p>
          <div className="summary-row">
            <span className="summary-label">勝利点数</span>
            <span className="summary-value">{settings.gameTarget}点マッチ</span>
          </div>
          <div className="summary-row">
            <span className="summary-label">デュース</span>
            <span className="summary-value">
              {settings.deuceEnabled
                ? `あり（最大 ${settings.maxScore}点）`
                : 'なし'}
            </span>
          </div>
          <div className="summary-row">
            <span className="summary-label">ゲーム数</span>
            <span className="summary-value">{settings.matchGames ?? 3}ゲームマッチ</span>
          </div>
        </div>

        {/* リセット */}
        <button className="settings-reset-btn btn-secondary" onClick={handleReset}>
          デフォルトに戻す（21点・デュースあり・最大30点）
        </button>

      </div>
    </div>
  );
}
