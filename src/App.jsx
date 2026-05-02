import React, { useState } from 'react';
import Home from './pages/Home';
import MatchSetup from './pages/MatchSetup';
import Scoring from './pages/Scoring';
import ScoreSheet from './pages/ScoreSheet';
import History from './pages/History';
import Settings from './pages/Settings';
import { SettingsProvider } from './context/SettingsContext';

export default function App() {
  const [page, setPage] = useState('home');
  const [prevPage, setPrevPage] = useState('home');

  function goTo(p) {
    setPrevPage(page);
    setPage(p);
  }

  return (
    <SettingsProvider>
      {page === 'home' && <Home goTo={goTo} />}
      {page === 'setup' && <MatchSetup goTo={goTo} />}
      {page === 'scoring' && <Scoring goTo={goTo} />}
      {page === 'sheet' && <ScoreSheet goTo={goTo} prevPage={prevPage} />}
      {page === 'history' && <History goTo={goTo} />}
      {page === 'settings' && <Settings goTo={goTo} />}
    </SettingsProvider>
  );
}
