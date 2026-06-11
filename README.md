# バドミントン スコアシート

バドミントン試合のスコアをスマホでタップ記録し、スコアシートを自動生成するPWAアプリ。

## 👉 アプリはこちら

**https://sasukewebjob-ai.github.io/badminton-score-app/**

※ このページ（github.com）はソースコード置き場です。アプリは上のリンクから開いてください。
スマホはホーム画面に追加するとアプリとして使えます。

## 主な機能

- リアルタイムスコアリング（サービスコート表示・取り消し・レット・サービス修正）
- スコアシート表示・画像/PDF出力
- 試合履歴の保存（端末内localStorage）
- 得点ルール設定（勝利点数・デュース・ゲーム数）

## 開発

```bash
npm install
npm run dev          # 開発サーバー
npm run build:pages  # GitHub Pages用ビルド
npm run deploy       # gh-pagesへデプロイ
```
