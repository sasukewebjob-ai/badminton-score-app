import React, { useState } from 'react';
import { useMatch } from '../context/MatchContext';
import { isDoubles, MATCH_TYPES } from '../utils/badmintonLogic';
import './MatchSetup.css';

const today = new Date().toISOString().slice(0, 10);

export default function MatchSetup({ goTo }) {
  const { startMatch, clearMatch } = useMatch();

  const [form, setForm] = useState({
    matchNumber: '',
    type: 'MD',
    courtNumber: '',
    date: today,
    referee: '',
    serviceJudge: '',
    teamAName: '',
    teamAPlayer1: '',
    teamAPlayer2: '',
    teamBName: '',
    teamBPlayer1: '',
    teamBPlayer2: '',
  });

  const [step, setStep] = useState('info'); // 'info' | 'serve'
  const [servingPlayer, setServingPlayer] = useState(null);   // 'A1'|'A2'|'B1'|'B2'
  const [receivingPlayer, setReceivingPlayer] = useState(null); // 'A1'|'A2'|'B1'|'B2'

  const doubles = isDoubles(form.type);

  // servingPlayer から firstServer を自動導出
  const firstServer = servingPlayer ? servingPlayer[0] : null; // 'A' | 'B'

  function set(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function goToServe() {
    if (!form.teamAPlayer1 || !form.teamBPlayer1) {
      alert('選手名（選手1）を入力してください');
      return;
    }
    if (doubles && (!form.teamAPlayer2 || !form.teamBPlayer2)) {
      alert('ダブルスは選手2の名前も入力してください');
      return;
    }
    // S/R選手選択ステップへ（シングルス・ダブルス共通）
    setServingPlayer(null);
    setReceivingPlayer(null);
    setStep('serve');
  }

  function handleServingPlayerChange(player) {
    const newTeam = player[0];
    const currentTeam = servingPlayer ? servingPlayer[0] : null;
    setServingPlayer(player);
    // チームが変わったらレシーバーをリセット
    if (newTeam !== currentTeam) {
      setReceivingPlayer(null);
    }
  }

  function doStart() {
    clearMatch();
    const matchInfo = {
      matchNumber: form.matchNumber,
      type: form.type,
      courtNumber: form.courtNumber,
      date: form.date,
      referee: form.referee,
      serviceJudge: form.serviceJudge,
      teamA: {
        name: form.teamAName.trim() || 'チームA',
        player1: form.teamAPlayer1,
        player2: form.teamAPlayer2,
      },
      teamB: {
        name: form.teamBName.trim() || 'チームB',
        player1: form.teamBPlayer1,
        player2: form.teamBPlayer2,
      },
    };
    startMatch(matchInfo, firstServer, doubles ? servingPlayer : null, doubles ? receivingPlayer : null);
    goTo('scoring');
  }

  // ダブルス: 対戦相手チームのプレーヤーリスト（S選択後にR選択用）
  const receivingTeamPlayers = firstServer === 'A'
    ? [{ key: 'B1', name: form.teamBPlayer1 }, { key: 'B2', name: form.teamBPlayer2 }]
    : firstServer === 'B'
    ? [{ key: 'A1', name: form.teamAPlayer1 }, { key: 'A2', name: form.teamAPlayer2 }]
    : [];

  const canStart = doubles
    ? servingPlayer && receivingPlayer
    : servingPlayer !== null;

  return (
    <div className="setup-page page">
      <div className="topbar">
        <button className="topbar-btn" onClick={() => goTo('home')}>← 戻る</button>
        <span className="topbar-title">試合設定</span>
        <div style={{ width: 60 }} />
      </div>

      <div className="setup-content">
        {/* ステップインジケーター */}
        <div className="setup-steps">
          <div className={`setup-step ${step === 'info' ? 'active' : 'done'}`}>
            <span className="step-num">1</span>
            <span className="step-label">基本情報</span>
          </div>
          <div className="setup-step-line" />
          <div className={`setup-step ${step === 'serve' ? 'active' : ''}`}>
            <span className="step-num">2</span>
            <span className="step-label">S/R選手</span>
          </div>
        </div>

        {/* ステップ1: 試合情報・選手情報 */}
        {step === 'info' && (
          <div className="setup-form">
            <div className="card">
              <p className="section-header">試合情報</p>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">試合番号</label>
                  <input className="form-input" value={form.matchNumber} onChange={e => set('matchNumber', e.target.value)} placeholder="例: 315" />
                </div>
                <div className="form-group">
                  <label className="form-label">種目</label>
                  <select className="form-select" value={form.type} onChange={e => set('type', e.target.value)}>
                    <option value="MS">MS（男子シングルス）</option>
                    <option value="WS">WS（女子シングルス）</option>
                    <option value="MD">MD（男子ダブルス）</option>
                    <option value="WD">WD（女子ダブルス）</option>
                    <option value="XD">XD（混合ダブルス）</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">コート番号</label>
                  <input className="form-input" value={form.courtNumber} onChange={e => set('courtNumber', e.target.value)} placeholder="例: 2" />
                </div>
                <div className="form-group">
                  <label className="form-label">日付</label>
                  <input className="form-input" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">主審 <span className="form-label-optional">（任意）</span></label>
                  <input className="form-input" value={form.referee} onChange={e => set('referee', e.target.value)} placeholder="未記入のままでも開始できます" />
                </div>
                <div className="form-group">
                  <label className="form-label">サービスジャッジ <span className="form-label-optional">（任意）</span></label>
                  <input className="form-input" value={form.serviceJudge} onChange={e => set('serviceJudge', e.target.value)} placeholder="未記入のままでも開始できます" />
                </div>
              </div>
            </div>

            <div className="setup-teams">
              {/* チームA */}
              <div className="card setup-team-card team-a-card">
                <p className="section-header">チームA（左側）</p>
                <div className="form-group">
                  <label className="form-label">チーム名 / 所属 <span className="form-label-optional">（任意）</span></label>
                  <input className="form-input" value={form.teamAName} onChange={e => set('teamAName', e.target.value)} placeholder="未記入なら「チームA」になります" />
                </div>
                <div className="form-group">
                  <label className="form-label">選手1{doubles ? '（上段）' : ''}</label>
                  <input className="form-input" value={form.teamAPlayer1} onChange={e => set('teamAPlayer1', e.target.value)} placeholder="氏名" />
                </div>
                {doubles && (
                  <div className="form-group">
                    <label className="form-label">選手2（下段）</label>
                    <input className="form-input" value={form.teamAPlayer2} onChange={e => set('teamAPlayer2', e.target.value)} placeholder="氏名" />
                  </div>
                )}
              </div>

              <div className="setup-vs">VS</div>

              {/* チームB */}
              <div className="card setup-team-card team-b-card">
                <p className="section-header">チームB（右側）</p>
                <div className="form-group">
                  <label className="form-label">チーム名 / 所属 <span className="form-label-optional">（任意）</span></label>
                  <input className="form-input" value={form.teamBName} onChange={e => set('teamBName', e.target.value)} placeholder="未記入なら「チームB」になります" />
                </div>
                <div className="form-group">
                  <label className="form-label">選手1{doubles ? '（上段）' : ''}</label>
                  <input className="form-input" value={form.teamBPlayer1} onChange={e => set('teamBPlayer1', e.target.value)} placeholder="氏名" />
                </div>
                {doubles && (
                  <div className="form-group">
                    <label className="form-label">選手2（下段）</label>
                    <input className="form-input" value={form.teamBPlayer2} onChange={e => set('teamBPlayer2', e.target.value)} placeholder="氏名" />
                  </div>
                )}
              </div>
            </div>

            <button className="btn-primary" onClick={goToServe}>
              次へ → S/R選手選択
            </button>
          </div>
        )}

        {/* ステップ2: S/R選手選択（シングルス・ダブルス共通） */}
        {step === 'serve' && (
          <div className="toss-section">
            <div className="card">
              <h3 className="toss-title">
                {doubles ? 'S / R 選手を選択' : 'サービス権を選択'}
              </h3>
              <p className="toss-desc">
                {doubles
                  ? 'ファーストサービス（S）の選手を選んでください。対戦相手のレシーブ（R）選手も選択します。'
                  : '第1ゲームのサービスを行う選手を選択してください。'}
              </p>

              {/* ダブルス: S選手（全4選手から選択） */}
              {doubles && (
                <>
                  <div className="serve-select-section">
                    <div className="serve-select-label serve-label-s">S（ファーストサービス）選手</div>
                    <div className="toss-teams">
                      {[
                        { key: 'A1', name: form.teamAPlayer1, teamName: form.teamAName },
                        { key: 'A2', name: form.teamAPlayer2, teamName: form.teamAName },
                        { key: 'B1', name: form.teamBPlayer1, teamName: form.teamBName },
                        { key: 'B2', name: form.teamBPlayer2, teamName: form.teamBName },
                      ].map(({ key, name, teamName }) => (
                        <button
                          key={key}
                          className={`toss-btn ${key[0] === 'A' ? 'toss-btn-a' : 'toss-btn-b'} ${servingPlayer === key ? 'selected' : ''}`}
                          onClick={() => handleServingPlayerChange(key)}
                        >
                          <div className="toss-team-name">{name}</div>
                          <div className="toss-team-sub">{teamName}</div>
                          <div className="toss-badge">S</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* R選手（S選択後に表示・対戦相手チームから） */}
                  {servingPlayer && (
                    <div className="serve-select-section" style={{ marginTop: 16 }}>
                      <div className="serve-select-label serve-label-r">
                        R（ファーストレシーブ）選手
                        （{firstServer === 'A' ? form.teamBName : form.teamAName}）
                      </div>
                      <div className="toss-teams">
                        {receivingTeamPlayers.map(({ key, name }) => (
                          <button
                            key={key}
                            className={`toss-btn ${key[0] === 'A' ? 'toss-btn-a' : 'toss-btn-b'} ${receivingPlayer === key ? 'selected' : ''}`}
                            onClick={() => setReceivingPlayer(key)}
                          >
                            <div className="toss-team-name">{name}</div>
                            <div className="toss-badge">R</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* シングルス: サービス権（どちらの選手が先行サービス） */}
              {!doubles && (
                <div className="toss-teams">
                  <button
                    className={`toss-btn toss-btn-a ${servingPlayer === 'A1' ? 'selected' : ''}`}
                    onClick={() => setServingPlayer('A1')}
                  >
                    <div className="toss-team-name">{form.teamAPlayer1}</div>
                    <div className="toss-team-sub">{form.teamAName}</div>
                    <div className="toss-badge">サービス</div>
                  </button>
                  <button
                    className={`toss-btn toss-btn-b ${servingPlayer === 'B1' ? 'selected' : ''}`}
                    onClick={() => setServingPlayer('B1')}
                  >
                    <div className="toss-team-name">{form.teamBPlayer1}</div>
                    <div className="toss-team-sub">{form.teamBName}</div>
                    <div className="toss-badge">サービス</div>
                  </button>
                </div>
              )}

              {canStart && (
                <button className="btn-primary" style={{ marginTop: 20 }} onClick={doStart}>
                  試合開始 🏸
                </button>
              )}
            </div>

            <button className="btn-secondary" onClick={() => setStep('info')}>
              ← 戻る
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
