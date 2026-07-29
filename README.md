# 読み跡

小説や文章の原稿を限定URLで共有し、読者から段落ごとの反応と非公開の読後メモを受け取る日本語Webサービスです。

- 本番: https://yomiato.yhay81.com
- 所有者: yhay81
- 公開範囲: 個人プロジェクトとして公開

## Product

作者は100〜6,000字の原稿、見てほしい観点、任意の質問を入力し、期限付きの読者URLを作ります。読者は登録せず、各段落へ「惹かれた」「迷った」「驚いた」「好き」のいずれかを残し、読後メモを送れます。回答は管理鍵を持つ作者だけが確認します。

作品一覧、公開プロフィール、検索可能な原稿、メール通知、決済はありません。原稿ページは`noindex`かつ`no-store`で、作者は受付停止と完全削除を行えます。

## Development

```powershell
npm ci
npx wrangler d1 migrations apply yomiato --local
npm run dev
npm run check
npm test
npm run build
```

本番移行と配信:

```powershell
npx wrangler d1 migrations apply yomiato --remote
npm run deploy
npm run indexnow
```

`npm run metrics`はproductionの匿名集計だけをJSON出力します。自動QAセッションは実利用者として扱いません。
