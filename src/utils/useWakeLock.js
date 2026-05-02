import { useEffect, useRef } from 'react';
import { supportsWakeLock } from './platform';

// 画面スリープ防止フック
// - feature detection で未対応ブラウザはサイレントno-op
// - visibilitychange で再取得
// - アンマウント時に解放
export function useWakeLock(enabled = true) {
  const sentinelRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;
    if (!supportsWakeLock()) return;

    let cancelled = false;

    const acquire = async () => {
      if (cancelled) return;
      try {
        const sentinel = await navigator.wakeLock.request('screen');
        if (cancelled) {
          try { await sentinel.release(); } catch (_) {}
          return;
        }
        sentinelRef.current = sentinel;
        sentinel.addEventListener('release', () => {
          sentinelRef.current = null;
        });
      } catch (_) {
        // permission拒否、batterySaver等。サイレントフェイル。
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && sentinelRef.current === null) {
        acquire();
      }
    };

    acquire();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      const s = sentinelRef.current;
      sentinelRef.current = null;
      if (s) {
        try { s.release().catch(() => {}); } catch (_) {}
      }
    };
  }, [enabled]);
}
