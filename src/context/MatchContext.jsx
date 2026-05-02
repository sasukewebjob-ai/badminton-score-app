import React, { createContext, useContext, useReducer, useCallback } from 'react';
import {
  createGameState,
  processRally,
  undoLastPoint,
  checkMatchWinner,
  isDoubles,
} from '../utils/badmintonLogic';

// ============================================================
// 試合状態管理
// ============================================================

const MatchContext = createContext(null);

const STORAGE_KEY = 'badminton_history';
const SETTINGS_KEY = 'badminton_settings';

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
  } catch {
    return {};
  }
}

function saveToHistory(match) {
  const history = loadHistory();
  const idx = history.findIndex((m) => m.id === match.id);
  if (idx >= 0) {
    history[idx] = match;
  } else {
    history.unshift(match);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 50)));
}

// ============================================================
// リデューサー
// ============================================================

function matchReducer(state, action) {
  switch (action.type) {
    case 'START_MATCH': {
      const { matchInfo, firstServer, firstServerPlayer, firstReceiverPlayer } = action.payload;
      const firstGame = createGameState(firstServer, firstServerPlayer, firstReceiverPlayer);
      const newMatch = {
        id: Date.now().toString(),
        matchInfo,
        games: [firstGame],
        currentGameIndex: 0,
        matchWinner: null,
        status: 'in_progress',
        startTime: new Date().toISOString(),
        endTime: null,
      };
      return { currentMatch: newMatch };
    }

    case 'ADD_POINT': {
      const match = state.currentMatch;
      if (!match || match.status !== 'in_progress') return state;

      const { scorer, settings = {} } = action.payload;
      const { matchInfo, games, currentGameIndex } = match;

      const currentGame = games[currentGameIndex];
      const updatedGame = processRally(currentGame, scorer, matchInfo.type, settings);

      const newGames = games.map((g, i) => (i === currentGameIndex ? updatedGame : g));

      let newStatus = 'in_progress';
      let matchWinner = null;
      let endTime = null;

      if (updatedGame.winner) {
        matchWinner = checkMatchWinner(newGames, settings);
        if (matchWinner) {
          newStatus = 'finished';
          endTime = new Date().toISOString();
        } else {
          newStatus = 'game_over';
        }
      }

      const updatedMatch = {
        ...match,
        games: newGames,
        matchWinner,
        status: newStatus,
        endTime,
      };

      if (matchWinner || updatedGame.winner) {
        saveToHistory(updatedMatch);
      }

      return { currentMatch: updatedMatch };
    }

    case 'UNDO_POINT': {
      const match = state.currentMatch;
      if (!match) return state;

      const { games, currentGameIndex, matchInfo } = match;
      const currentGame = games[currentGameIndex];
      const settings = action.payload?.settings || {};

      if (currentGame.rallies.length === 0) {
        if (currentGameIndex === 0) return state;
        return {
          currentMatch: {
            ...match,
            games: games.slice(0, currentGameIndex),
            currentGameIndex: currentGameIndex - 1,
            status: 'game_over',
            matchWinner: null,
          },
        };
      }

      const undoneGame = undoLastPoint(currentGame, matchInfo.type, settings);
      const newGames = games.map((g, i) => (i === currentGameIndex ? undoneGame : g));

      return {
        currentMatch: {
          ...match,
          games: newGames,
          matchWinner: null,
          status: 'in_progress',
        },
      };
    }

    case 'NEXT_GAME': {
      const match = state.currentMatch;
      if (!match || match.status !== 'game_over') return state;

      const { firstServer, firstServerPlayer, firstReceiverPlayer } = action.payload;
      const newGame = createGameState(firstServer, firstServerPlayer || null, firstReceiverPlayer || null);
      const newMatch = {
        ...match,
        games: [...match.games, newGame],
        currentGameIndex: match.currentGameIndex + 1,
        status: 'in_progress',
      };
      return { currentMatch: newMatch };
    }

    case 'CORRECT_SERVER': {
      const match = state.currentMatch;
      if (!match || match.status !== 'in_progress') return state;
      const { newServer, newServerPlayer } = action.payload;
      const { games, currentGameIndex } = match;
      const correctedGame = {
        ...games[currentGameIndex],
        server: newServer,
        serverPlayer: newServerPlayer,
      };
      const newGames = games.map((g, i) => (i === currentGameIndex ? correctedGame : g));
      return { currentMatch: { ...match, games: newGames } };
    }

    case 'ADD_SERVICE_ERROR': {
      const match = state.currentMatch;
      if (!match || match.status !== 'in_progress') return state;
      const { games, currentGameIndex } = match;
      const currentGame = games[currentGameIndex];
      const error = {
        scoreA: currentGame.scoreA,
        scoreB: currentGame.scoreB,
        server: currentGame.server,
        serverPlayer: currentGame.serverPlayer,
        timestamp: new Date().toISOString(),
      };
      const updatedGame = {
        ...currentGame,
        serviceErrors: [...(currentGame.serviceErrors || []), error],
      };
      const newGames = games.map((g, i) => (i === currentGameIndex ? updatedGame : g));
      return { currentMatch: { ...match, games: newGames } };
    }

    case 'FORFEIT': {
      const match = state.currentMatch;
      if (!match) return state;
      const { forfeitTeam } = action.payload;
      const matchWinner = forfeitTeam === 'A' ? 'B' : 'A';
      const updatedMatch = {
        ...match,
        matchWinner,
        status: 'finished',
        endTime: new Date().toISOString(),
        forfeit: forfeitTeam,
      };
      saveToHistory(updatedMatch);
      return { currentMatch: updatedMatch };
    }

    case 'LOAD_MATCH': {
      return { currentMatch: { ...action.payload, status: 'finished' } };
    }

    case 'CLEAR_MATCH': {
      return { currentMatch: null };
    }

    default:
      return state;
  }
}

// ============================================================
// プロバイダー
// ============================================================

export function MatchProvider({ children }) {
  const [state, dispatch] = useReducer(matchReducer, { currentMatch: null });

  const startMatch = useCallback((matchInfo, firstServer, firstServerPlayer = null, firstReceiverPlayer = null) => {
    dispatch({ type: 'START_MATCH', payload: { matchInfo, firstServer, firstServerPlayer, firstReceiverPlayer } });
  }, []);

  const addPoint = useCallback((scorer) => {
    const settings = loadSettings();
    dispatch({ type: 'ADD_POINT', payload: { scorer, settings } });
  }, []);

  const undoPoint = useCallback(() => {
    const settings = loadSettings();
    dispatch({ type: 'UNDO_POINT', payload: { settings } });
  }, []);

  const nextGame = useCallback((firstServer, firstServerPlayer = null, firstReceiverPlayer = null) => {
    dispatch({ type: 'NEXT_GAME', payload: { firstServer, firstServerPlayer, firstReceiverPlayer } });
  }, []);

  const correctServer = useCallback((newServer, newServerPlayer) => {
    dispatch({ type: 'CORRECT_SERVER', payload: { newServer, newServerPlayer } });
  }, []);

  const addServiceError = useCallback(() => {
    dispatch({ type: 'ADD_SERVICE_ERROR' });
  }, []);

  const forfeit = useCallback((forfeitTeam) => {
    dispatch({ type: 'FORFEIT', payload: { forfeitTeam } });
  }, []);

  const loadMatch = useCallback((match) => {
    dispatch({ type: 'LOAD_MATCH', payload: match });
  }, []);

  const clearMatch = useCallback(() => {
    dispatch({ type: 'CLEAR_MATCH' });
  }, []);

  const getHistory = useCallback(() => loadHistory(), []);

  const deleteHistory = useCallback((id) => {
    const history = loadHistory().filter((m) => m.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }, []);

  const saveMatchNow = useCallback(() => {
    if (state.currentMatch) {
      saveToHistory(state.currentMatch);
    }
  }, [state.currentMatch]);

  return (
    <MatchContext.Provider
      value={{
        match: state.currentMatch,
        startMatch,
        addPoint,
        undoPoint,
        nextGame,
        loadMatch,
        clearMatch,
        correctServer,
        addServiceError,
        forfeit,
        getHistory,
        deleteHistory,
        saveMatchNow,
      }}
    >
      {children}
    </MatchContext.Provider>
  );
}

export function useMatch() {
  const ctx = useContext(MatchContext);
  if (!ctx) throw new Error('useMatch must be used inside MatchProvider');
  return ctx;
}
