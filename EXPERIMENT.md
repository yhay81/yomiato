# Experiment

## User and job

- Target user: 公開前の小説、Web小説、脚本、エッセイの一場面を信頼できる読者に見せ、具体的な反応を知りたい日本語の書き手
- Job to be done: 原稿を安全に限定共有し、どの段落で心が動いたかと読後の改善材料を集め、改稿判断に使う
- Current workaround: Google Docs、PDF、DM、匿名メッセージ箱、投稿サイトの感想欄、口頭の感想を別々に使う

## Hypothesis

登録不要の限定読書ページで段落別リアクションと構造化された読後メモを一緒に集められれば、書き手は「感想をください」だけの場合より具体的な改稿材料を得られ、同じ仕組みを次の原稿でも使う。

## Method

- Recruitment channel: Tool Shelfと検索流入。投稿者への個別連絡や無断のSNS投稿は行わない
- Participants: 実原稿の作者5人以上、招待された実読者15人以上
- Duration: 2026-07-29から2026-08-28
- Comparison: 原稿作成、共有、読者閲覧、段落反応、読後メモ、作者確認、別日再訪

## Decision

- Success signal: 実原稿5件、作者5人、共有3件、実読者15人、段落反応を残す読者8人、読後メモ5件、作者確認3人、別日再利用1人
- Failure signal: 実原稿2件未満、または読後メモが0件
- Stop signal: 個人情報・無断転載・危険な内容の報告が作成数の10%を超える、または限定URLと削除境界を安全に運用できない
- Deadline: 2026-08-28
- Maximum build time: 2日
- Maximum monthly infrastructure cost: 5 USD

## Guardrails

- 原稿や感想を公開一覧、検索、SNSへ自動掲載しない。
- 氏名、連絡先を必須にせず、IPアドレスをアプリDBへ保存しない。
- 256-bit管理鍵はURLフラグメントで渡し、D1にはSHA-256ハッシュだけを保存する。
- 3つの異なる匿名セッションからの通報で原稿を非表示にする。
- 実利用と自動QAを分け、成功条件を途中で都合よく変更しない。
