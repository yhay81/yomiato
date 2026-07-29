# Metrics

D1には匿名セッションID、操作名、対象原稿ID、日付、作成時刻だけを35日保持します。原稿本文や感想を集計出力へ含めません。

## Events

- `visited`
- `draft_created`
- `draft_shared`
- `draft_viewed`
- `reaction_left`
- `feedback_submitted`
- `owner_checked`
- `draft_closed`
- `returned`

## Funnel

1. 訪問
2. 原稿ページ作成
3. 限定URL共有
4. 読者閲覧
5. 段落反応
6. 読後メモ送信
7. 作者確認
8. 別日再訪

`npm run metrics`でproduction集計をJSON出力します。自動確認セッションは実利用者として数えません。
