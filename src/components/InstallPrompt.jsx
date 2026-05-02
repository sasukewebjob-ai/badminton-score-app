import React from 'react';
import { useInstallPrompt } from '../utils/useInstallPrompt';
import './InstallPrompt.css';

export default function InstallPrompt() {
  const { visible, platform, canInstall, install, dismiss } = useInstallPrompt();

  if (!visible) return null;

  return (
    <div className="install-prompt" role="dialog" aria-label="ホーム画面に追加">
      <button
        className="install-prompt__close"
        onClick={dismiss}
        aria-label="閉じる"
      >
        ×
      </button>

      <div className="install-prompt__body">
        {platform === 'ios-safari' && (
          <>
            <div className="install-prompt__title">
              <span className="install-prompt__icon">📱</span>
              ホーム画面に追加するとアプリのように使えます
            </div>
            <ol className="install-prompt__steps">
              <li>
                画面下の <span className="install-prompt__chip">共有 <span className="install-prompt__share-icon" aria-hidden>⬆︎</span></span> をタップ
              </li>
              <li>
                <span className="install-prompt__chip">「ホーム画面に追加」</span> を選択
              </li>
            </ol>
          </>
        )}

        {platform === 'ios-other' && (
          <>
            <div className="install-prompt__title">
              <span className="install-prompt__icon">📱</span>
              アプリとして使うには
            </div>
            <p className="install-prompt__desc">
              このページを <strong>Safari</strong> で開くと、ホーム画面にアプリとして追加できます。
            </p>
          </>
        )}

        {platform === 'android' && canInstall && (
          <>
            <div className="install-prompt__title">
              <span className="install-prompt__icon">📲</span>
              アプリとしてインストール
            </div>
            <p className="install-prompt__desc">
              ホーム画面から1タップで起動できます。
            </p>
            <button
              className="install-prompt__action"
              onClick={install}
            >
              インストール
            </button>
          </>
        )}

        {platform === 'android' && !canInstall && (
          <>
            <div className="install-prompt__title">
              <span className="install-prompt__icon">📲</span>
              アプリとして使う
            </div>
            <p className="install-prompt__desc">
              Chromeメニュー <span className="install-prompt__chip">⋮</span> から
              <span className="install-prompt__chip">「アプリをインストール」</span>
              でホーム画面に追加できます。
            </p>
          </>
        )}

        {platform === 'desktop' && canInstall && (
          <>
            <div className="install-prompt__title">
              <span className="install-prompt__icon">💻</span>
              アプリとしてインストール
            </div>
            <button
              className="install-prompt__action"
              onClick={install}
            >
              インストール
            </button>
          </>
        )}
      </div>
    </div>
  );
}
