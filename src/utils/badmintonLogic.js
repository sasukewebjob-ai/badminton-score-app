// ============================================================
// バドミントン スコアロジック
// ============================================================

export const GAME_TARGET = 21;
export const DEUCE_AT = 20;
export const MAX_SCORE = 30;
export const MATCH_TYPES = ['MS', 'WS', 'MD', 'WD', 'XD'];

export function isDoubles(matchType) {
  return matchType === 'MD' || matchType === 'WD' || matchType === 'XD';
}

// ゲームの勝者を確認: 'A' | 'B' | null
// settings: { gameTarget, maxScore, deuceEnabled }
export function checkGameWinner(scoreA, scoreB, settings = {}) {
  const gameTarget = settings.gameTarget ?? GAME_TARGET;
  const maxScore = settings.maxScore ?? MAX_SCORE;
  const deuceEnabled = settings.deuceEnabled ?? true;

  if (deuceEnabled) {
    if (scoreA >= gameTarget && scoreA - scoreB >= 2) return 'A';
    if (scoreB >= gameTarget && scoreB - scoreA >= 2) return 'B';
    if (scoreA >= maxScore) return 'A';
    if (scoreB >= maxScore) return 'B';
  } else {
    // デュースなし: gameTarget点で即勝利
    if (scoreA >= gameTarget) return 'A';
    if (scoreB >= gameTarget) return 'B';
  }
  return null;
}

// マッチの勝者を確認: 'A' | 'B' | 'draw' | null
// settings.matchGames: 1=1ゲームマッチ, 2=2ゲームマッチ, 3=3ゲームマッチ（デフォルト）
export function checkMatchWinner(games, settings = {}) {
  const matchGames = settings.matchGames ?? 3;
  const gamesNeeded = matchGames === 1 ? 1 : 2;

  let winsA = 0, winsB = 0;
  for (const g of games) {
    if (g.winner === 'A') winsA++;
    if (g.winner === 'B') winsB++;
  }
  if (winsA >= gamesNeeded) return 'A';
  if (winsB >= gamesNeeded) return 'B';

  // 2ゲームマッチで1-1の場合：得失点差で判定
  if (matchGames === 2 && winsA === 1 && winsB === 1) {
    const totalA = games.reduce((sum, g) => sum + (g.scoreA || 0), 0);
    const totalB = games.reduce((sum, g) => sum + (g.scoreB || 0), 0);
    if (totalA > totalB) return 'A';
    if (totalB > totalA) return 'B';
    return 'draw';
  }

  return null;
}

// ゲームの勝利数を返す
export function getGameWins(games) {
  let winsA = 0, winsB = 0;
  for (const g of games) {
    if (g.winner === 'A') winsA++;
    if (g.winner === 'B') winsB++;
  }
  return { winsA, winsB };
}

// ゲーム初期状態を作成
export function createGameState(firstServer, firstServerPlayer = null, firstReceiverPlayer = null) {
  const defaultServerPlayer = firstServer === 'A' ? 'A1' : 'B1';
  const defaultReceiverPlayer = firstServer === 'A' ? 'B1' : 'A1';

  const sPlayer = firstServerPlayer || defaultServerPlayer;
  const rPlayer = firstReceiverPlayer || defaultReceiverPlayer;

  const aRightCourt = firstServer === 'A' ? sPlayer : rPlayer;
  const bRightCourt = firstServer === 'B' ? sPlayer : rPlayer;

  return {
    firstServer,
    firstServerPlayer: sPlayer,
    firstReceiverPlayer: rPlayer,
    server: firstServer,
    serverPlayer: sPlayer,
    scoreA: 0,
    scoreB: 0,
    aRightCourt,
    bRightCourt,
    rallies: [],
    winner: null,
  };
}

// ラリーを処理し新しいゲーム状態を返す
// settings: { gameTarget, maxScore, deuceEnabled }
export function processRally(gameState, scorer, matchType, settings = {}) {
  const doubles = isDoubles(matchType);
  const { server, serverPlayer, scoreA, scoreB, aRightCourt, bRightCourt } = gameState;

  const newScoreA = scorer === 'A' ? scoreA + 1 : scoreA;
  const newScoreB = scorer === 'B' ? scoreB + 1 : scoreB;

  let newServer, newServerPlayer;
  let newARight = aRightCourt;
  let newBRight = bRightCourt;

  if (!doubles) {
    newServer = scorer;
    newServerPlayer = scorer === 'A' ? 'A1' : 'B1';
  } else {
    if (scorer === 'A') {
      if (server === 'A') {
        newARight = aRightCourt === 'A1' ? 'A2' : 'A1';
      }
      const aLeft = newARight === 'A1' ? 'A2' : 'A1';
      newServerPlayer = newScoreA % 2 === 0 ? newARight : aLeft;
      newServer = 'A';
    } else {
      if (server === 'B') {
        newBRight = bRightCourt === 'B1' ? 'B2' : 'B1';
      }
      const bLeft = newBRight === 'B1' ? 'B2' : 'B1';
      newServerPlayer = newScoreB % 2 === 0 ? newBRight : bLeft;
      newServer = 'B';
    }
  }

  const rally = {
    scorer,
    scoreA: newScoreA,
    scoreB: newScoreB,
    server,
    serverPlayer,
    nextServer: newServer,
    nextServerPlayer: newServerPlayer,
    isServiceBreak: scorer !== server,
  };

  const winner = checkGameWinner(newScoreA, newScoreB, settings);

  return {
    ...gameState,
    server: newServer,
    serverPlayer: newServerPlayer,
    scoreA: newScoreA,
    scoreB: newScoreB,
    aRightCourt: newARight,
    bRightCourt: newBRight,
    rallies: [...gameState.rallies, rally],
    winner,
  };
}

// 最後のポイントを取り消す（全ラリーをリプレイ）
export function undoLastPoint(gameState, matchType, settings = {}) {
  if (gameState.rallies.length === 0) return gameState;

  const newRallies = gameState.rallies.slice(0, -1);

  let state = createGameState(gameState.firstServer, gameState.firstServerPlayer, gameState.firstReceiverPlayer);

  for (const rally of newRallies) {
    state = processRally(state, rally.scorer, matchType, settings);
  }

  return {
    ...state,
    firstServer: gameState.firstServer,
    firstServerPlayer: gameState.firstServerPlayer,
    firstReceiverPlayer: gameState.firstReceiverPlayer,
    rallies: newRallies,
    winner: null,
  };
}

// スコアシート表示用データを生成
export function generateScoreSheetRows(game) {
  const rows = {
    A1: [],
    A2: [],
    B1: [],
    B2: [],
  };

  const { firstServer, firstServerPlayer, firstReceiverPlayer: initReceiverPlayer } = game;

  for (const key of ['A1', 'A2', 'B1', 'B2']) {
    const isServerOrReceiver = key === firstServerPlayer || key === initReceiverPlayer;
    rows[key].push({
      score: isServerOrReceiver ? 0 : null,
      isServiceBreak: false,
      isInit: true,
      isEmpty: !isServerOrReceiver,
    });
  }

  for (const rally of game.rallies) {
    const { scorer, serverPlayer, scoreA, scoreB, isServiceBreak, nextServerPlayer } = rally;
    const score = scorer === 'A' ? scoreA : scoreB;
    const scoringRow = isServiceBreak ? nextServerPlayer : serverPlayer;

    for (const key of ['A1', 'A2', 'B1', 'B2']) {
      if (key === scoringRow) {
        rows[key].push({ score, isServiceBreak, isInit: false, isEmpty: false });
      } else {
        rows[key].push({ score: null, isServiceBreak: false, isInit: false, isEmpty: true });
      }
    }
  }

  return rows;
}

// サービスコートを返す: 'right' | 'left'
// serverScore: サービスチームの現在スコア
export function getServiceCourt(serverScore) {
  return serverScore % 2 === 0 ? 'right' : 'left';
}

// ゲームポイント / マッチポイント チェック
// settings: { gameTarget, deuceEnabled }
export function getPointStatus(scoreA, scoreB, gamesWonA, gamesWonB, settings = {}) {
  const gameTarget = settings.gameTarget ?? GAME_TARGET;
  const deuceEnabled = settings.deuceEnabled ?? true;
  const deuceAt = gameTarget - 1;

  const isGamePoint = (s1, s2) => {
    if (deuceEnabled && s1 >= deuceAt && s2 >= deuceAt) return s1 >= s2;
    return s1 >= gameTarget - 1;
  };

  const aIsGamePoint = isGamePoint(scoreA, scoreB);
  const bIsGamePoint = isGamePoint(scoreB, scoreA);

  const aIsMatchPoint = aIsGamePoint && gamesWonA === 1;
  const bIsMatchPoint = bIsGamePoint && gamesWonB === 1;

  return { aIsGamePoint, bIsGamePoint, aIsMatchPoint, bIsMatchPoint };
}
