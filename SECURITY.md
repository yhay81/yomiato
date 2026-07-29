# Security

## Boundary

- Cloudflare Workers + Hono JSX + D1
- Cookie、ログイン、決済、ファイルアップロードなし
- 作成は1匿名セッション1日3件、段落反応は1日80回まで
- 原稿IDは128-bit、管理鍵は256-bit
- 管理鍵はURLフラグメントで渡し、D1にはSHA-256ハッシュだけを保存
- 管理鍵比較は定数時間
- mutationはsame-origin、Content-Type、本文サイズ、列挙値、文字数を検証
- Hono JSXのエスケープを使い、ユーザー生成HTMLを描画しない
- CSP、HSTS、COOP、CORP、Referrer-Policy、frame denialを有効化

## Content safety

- 原稿と管理画面は`noindex`、`noarchive`、`no-store`
- 原稿と感想を公開一覧へ載せない
- 読者の反応と自由記述は作者だけが確認する
- 異なる3匿名セッションの通報で自動非表示
- 管理URLから受付停止、期限内の再開、即時削除が可能
- 期限後35日以内に原稿と関連データを削除

## Known limits

- 限定URLを受け取った人による閲覧、転送、画面保存は防げない。
- 管理鍵を失うと再発行できない。
- 本サービスは暗号化された文書保管、秘密保持契約、著作権登録を提供しない。

## Reporting

脆弱性はGitHubのPrivate Vulnerability Reportingから報告してください。公開Issueへ管理URL、実在の原稿、感想、秘密情報を書かないでください。
