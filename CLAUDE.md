# バドミントンスコア管理アプリ

## プロジェクト概要
スマホでタップしてバドミントンの試合スコアを記録し、
スコアシートを自動生成するReactアプリ。
PWA対応済み（Android・iPhone両方でホーム画面にインストール可能）。
将来的にGoogleスプレッドシート連携・大会集計機能を追加予定。

## 技術スタック
- React（useState, useReducer, useContext, useCallback, useEffect, useRef）
- ルーティング：page stateで管理（React Routerは不使用）
- データ保存：localStorage（キー: `badminton_history`, `badminton_settings`）
- スタイル：各ページごとのCSSファイル
- ビルド：Vite
- Android APK：Capacitor（webDir: dist）
- PWA：vite-plugin-pwa（Service Worker・オフライン対応）
- エクスポート：html2canvas + jsPDF

## ファイル構成
- `App.jsx` — ページ遷移の司令塔（goTo関数・prevPage管理）
- `pages/Home.jsx` — ホーム画面（InstallPromptバナー組込み）
- `pages/MatchSetup.jsx` — 試合設定（info → serve の2ステップ、コイントス画面は廃止済み）
- `pages/Scoring.jsx` — リアルタイムスコアリング（審判機能含む、画面スリープ防止）
- `pages/ScoreSheet.jsx` — スコアシート表示・画像/PDF出力
- `pages/History.jsx` — 試合履歴一覧
- `pages/Settings.jsx` — 得点ルール・ゲーム数設定
- `components/InstallPrompt.jsx` — ホーム画面追加案内バナー（プラットフォーム別UI）
- `context/MatchContext.jsx` — 試合状態管理（useReducer）
- `context/SettingsContext.jsx` — 設定管理（localStorage永続化）
- `utils/badmintonLogic.js` — ルール計算ロジック
- `utils/exportUtils.js` — 画像・PDF出力ユーティリティ
- `utils/platform.js` — プラットフォーム検知（iOS Safari / iOS Other / Android / Desktop / standalone）
- `utils/useInstallPrompt.js` — A2HSバナー表示制御フック
- `utils/useWakeLock.js` — 画面スリープ防止フック
- `scripts/generate-icons.mjs` — PWAアイコン生成スクリプト（jimp使用）

## バドミントンルール実装
- 勝利点数：7〜50点（設定可能、デフォルト21点）
- デュース：勝利点-1から2点差必要（設定でOFF可能）
- 最大得点：設定可能（デフォルト30点）
- マッチ形式：1G / 2G / 3G（設定可能、デフォルト3G）
- 2Gマッチ1-1時：得失点差で決定、同点なら引き分け（`matchWinner === 'draw'`）
- ダブルスのサービスシークエンス：スコアの偶奇でサービスコート決定
- チェンジエンド：ゲーム終了時（120秒タイマー）、第3ゲーム中間点（`Math.ceil(gameTarget/2)`）

## データ構造（重要・変更禁止）
```
match {
  id, matchInfo, games[], currentGameIndex,
  matchWinner, status, startTime, endTime, forfeit
}
game {
  firstServer, firstServerPlayer, firstReceiverPlayer,
  server, serverPlayer, scoreA, scoreB,
  aRightCourt, bRightCourt, rallies[], winner, serviceErrors[]
}
rally {
  scorer, scoreA, scoreB, server, serverPlayer,
  nextServer, nextServerPlayer, isServiceBreak
}
```
- `localStorage`キー名 `badminton_history` / `badminton_settings` / `badminton_install_dismissed_until` / `badminton_panel_swapped` は変更禁止

## MatchContext アクション一覧
| アクション | 説明 |
|---|---|
| START_MATCH | 試合開始 |
| ADD_POINT | ポイント追加（settings渡し） |
| UNDO_POINT | 直前ポイント取消（全ラリーリプレイ） |
| NEXT_GAME | 次ゲーム開始（S/R選手引き継ぎ） |
| CORRECT_SERVER | サービス修正（スコア変更なし） |
| ADD_SERVICE_ERROR | サービスシークエンスエラー記録 |
| FORFEIT | 棄権（W.O.）処理 |
| LOAD_MATCH | 履歴から試合読み込み |
| CLEAR_MATCH | 試合クリア |

## Scoring.jsx の主要機能
- スコアパネルタップでポイント追加
- 取り消しボタン（赤・目立つ）→ 確認モーダル
- 🔧 サービス修正モーダル（サーバー変更・エラー記録）
- 🔄 レットモーダル（スコア変更なし）
- サービスコート表示（右/左コート）
- スコア読み上げ順バー（サーブ側スコアを先表示）
- 試合終了 → W.O.オプションあり
- ゲーム終了画面：チェンジエンドバナー＋120秒タイマー
- 第3ゲーム中間点：チェンジエンド確認オーバーレイ
- 試合終了：勝者承諾 → 主審承諾フロー

## ScoreSheet / エクスポート
- モバイル対応のピンチズーム表示
- A4エクスポートシート：主審・勝者サイン欄付き
- `captureElement()` でオフスクリーン要素を正確にキャプチャ（モバイルバグ修正済み）
- prevPage追跡でスコアリング←→シート間の戻るボタンが正常動作

## ナビゲーション（App.jsx）
- `page` state でページ切り替え
- `prevPage` state で前のページを追跡
- `goTo(p)` で遷移（prevPageを自動更新）
- ScoreSheetに `prevPage` を渡して戻り先を制御

## Settings
- gameTarget（7〜50）、deuceEnabled、maxScore、matchGames（1/2/3）
- SettingsContextでlocalStorage永続化
- MatchContext内でも `loadSettings()` を使用（ADD_POINT, UNDO_POINT時）

## PWAホスティング
- `npm run build` → `dist/` フォルダ生成
- Netlifyにdistをドラッグ＆ドロップでデプロイ
- HTTPS必須（Service Worker要件）
- iPhoneはSafari → 共有 → ホーム画面に追加

## 作業ルール
- badmintonLogic.jsのロジックを変更する場合は必ず影響範囲を確認
- localStorageのキー名は変更禁止
- MatchContextのgame/rally構造は変更禁止
- 変更後は必ず `npm run build` でエラーがないか確認

## 今後追加予定の機能
1. Netlifyデプロイ・URL公開
2. Googleスプレッドシート連携（試合結果の自動書き込み）
3. 大会結果自動集計システム
