import React, { createContext, useContext, useState } from 'react';

const SETTINGS_KEY = 'badminton_settings';

export const DEFAULT_SETTINGS = {
  gameTarget: 21,    // 何点で1ゲーム取得
  maxScore: 30,      // デュース時の最大得点
  deuceEnabled: true, // デュースあり/なし
  matchGames: 3,     // 何ゲームマッチ (1/2/3)
};

function loadSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY)) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(loadSettings);

  function updateSettings(patch) {
    const updated = { ...settings, ...patch };
    setSettings(updated);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  }

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be inside SettingsProvider');
  return ctx;
}
