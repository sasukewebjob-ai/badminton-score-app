import { useState, useEffect, useCallback, useRef } from 'react';
import { getPlatform } from './platform';

const DISMISS_KEY = 'badminton_install_dismissed_until';
const DISMISS_DAYS = 30;
const ANDROID_FALLBACK_DELAY = 1500; // beforeinstallpromptを待つ時間

export function useInstallPrompt() {
  const [platform, setPlatform] = useState('desktop');
  const [visible, setVisible] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const deferredPromptRef = useRef(null);

  useEffect(() => {
    const p = getPlatform();
    setPlatform(p);

    // standaloneモードでは表示しない
    if (p === 'standalone') return;

    // dismiss期間内
    let dismissedUntil = 0;
    try {
      dismissedUntil = parseInt(localStorage.getItem(DISMISS_KEY) || '0', 10) || 0;
    } catch (_) {
      dismissedUntil = 0;
    }
    if (dismissedUntil > Date.now()) return;

    let fallbackTimer = null;

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      deferredPromptRef.current = e;
      setCanInstall(true);
      setVisible(true);
      if (fallbackTimer) {
        clearTimeout(fallbackTimer);
        fallbackTimer = null;
      }
    };

    const handleInstalled = () => {
      setVisible(false);
      setCanInstall(false);
      deferredPromptRef.current = null;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);

    // プラットフォーム別の表示制御
    if (p === 'ios-safari' || p === 'ios-other') {
      // iOSはbeforeinstallpromptが来ないので即表示
      setVisible(true);
    } else if (p === 'android') {
      // beforeinstallpromptが来ない場合に備えて、遅延表示
      fallbackTimer = setTimeout(() => {
        setVisible(true);
      }, ANDROID_FALLBACK_DELAY);
    }
    // desktop は beforeinstallprompt が来た場合だけ表示

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, []);

  const install = useCallback(async () => {
    const dp = deferredPromptRef.current;
    if (!dp) return;
    try {
      dp.prompt();
      await dp.userChoice;
    } catch (_) {
      // ignore
    }
    deferredPromptRef.current = null;
    setCanInstall(false);
    setVisible(false);
  }, []);

  const dismiss = useCallback(() => {
    const until = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000;
    try {
      localStorage.setItem(DISMISS_KEY, String(until));
    } catch (_) {
      // ignore (Private mode等)
    }
    setVisible(false);
  }, []);

  return { visible, platform, canInstall, install, dismiss };
}
