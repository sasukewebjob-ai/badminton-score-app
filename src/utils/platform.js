// プラットフォーム検知ユーティリティ
// すべてfeature detection優先、UAスニッフィングは最小限

export function isIOS() {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

export function isIOSSafari() {
  if (!isIOS()) return false;
  const ua = navigator.userAgent;
  // iOS上の他ブラウザを除外（Chrome/Firefox/Edge/Opera）
  return !/CriOS|FxiOS|EdgiOS|OPiOS|GSA/.test(ua);
}

export function isAndroid() {
  if (typeof navigator === 'undefined') return false;
  return /Android/.test(navigator.userAgent);
}

export function isStandalone() {
  if (typeof window === 'undefined') return false;
  // Android/Desktop: display-mode standalone
  if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }
  // iOS Safari独自プロパティ
  if (window.navigator.standalone === true) {
    return true;
  }
  return false;
}

// 'standalone' | 'ios-safari' | 'ios-other' | 'android' | 'desktop'
export function getPlatform() {
  if (isStandalone()) return 'standalone';
  if (isIOSSafari()) return 'ios-safari';
  if (isIOS()) return 'ios-other';
  if (isAndroid()) return 'android';
  return 'desktop';
}

export function supportsWakeLock() {
  return typeof navigator !== 'undefined' && 'wakeLock' in navigator;
}
