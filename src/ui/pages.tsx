import type { DraftRow } from "../worker";
import { product } from "../config/product";
import { Layout } from "./layout";

const focusLabels = {
  character: "人物の伝わり方",
  clarity: "わかりやすさ",
  emotion: "感情の動き",
  flow: "読み進めやすさ",
} as const;

const reactionOptions = [
  { icon: "●", kind: "hooked", label: "惹かれた" },
  { icon: "?", kind: "lost", label: "迷った" },
  { icon: "!", kind: "surprised", label: "驚いた" },
  { icon: "♥", kind: "favorite", label: "好き" },
] as const;

export function HomePage() {
  return (
    <Layout scripts={["/builder.js"]}>
      <section class="builder-shell" id="builder">
        <header class="product-heading">
          <div>
            <p class="eyebrow">PRIVATE READING TRACE</p>
            <h1>{product.headline}</h1>
          </div>
          <p>原稿を限定URLで渡すと、読者は段落ごとに反応を残せます。感想は作者だけに届きます。</p>
        </header>

        <div class="builder-workspace">
          <form class="builder-panel" data-builder>
            <div class="panel-heading">
              <div>
                <p class="step-label">原稿を置く</p>
                <h2>読んでほしい場面</h2>
              </div>
              <span class="privacy-chip">登録不要</span>
            </div>

            <div class="field-row">
              <label class="field">
                <span>作品・場面の名前</span>
                <input
                  autocomplete="off"
                  data-preview-title
                  maxlength={80}
                  name="title"
                  placeholder="例：波止場の灯り・冒頭"
                  required
                />
              </label>
              <label class="field compact">
                <span>
                  作者名 <small>任意</small>
                </span>
                <input autocomplete="off" maxlength={40} name="penName" placeholder="例：青井" />
              </label>
            </div>

            <label class="field">
              <span>
                読む前のひとこと <small>任意</small>
              </span>
              <input
                autocomplete="off"
                maxlength={160}
                name="note"
                placeholder="例：初見で読みにくい場所を教えてください"
              />
            </label>

            <label class="field manuscript-field">
              <span>
                原稿 <small>100〜6,000字・空行で段落を分けます</small>
              </span>
              <textarea
                data-preview-content
                maxlength={6000}
                minlength={100}
                name="content"
                placeholder={
                  "潮の匂いが残る駅で、澪は一枚の切符を握っていた。\n\n最終列車はもう行ったはずなのに、遠くからレールの震える音が近づいてくる。"
                }
                required
                rows={11}
              ></textarea>
              <span class="character-count" data-character-count>
                0 / 6,000
              </span>
            </label>

            <fieldset class="focus-field">
              <legend>とくに見てほしいこと</legend>
              <div class="focus-grid">
                <label>
                  <input defaultChecked name="focus" type="radio" value="flow" />
                  <span>
                    <i class="focus-symbol flow-symbol" aria-hidden="true"></i>
                    読み進めやすさ
                  </span>
                </label>
                <label>
                  <input name="focus" type="radio" value="emotion" />
                  <span>
                    <i class="focus-symbol emotion-symbol" aria-hidden="true"></i>
                    感情の動き
                  </span>
                </label>
                <label>
                  <input name="focus" type="radio" value="clarity" />
                  <span>
                    <i class="focus-symbol clarity-symbol" aria-hidden="true"></i>
                    わかりやすさ
                  </span>
                </label>
                <label>
                  <input name="focus" type="radio" value="character" />
                  <span>
                    <i class="focus-symbol character-symbol" aria-hidden="true"></i>
                    人物の伝わり方
                  </span>
                </label>
              </div>
            </fieldset>

            <div class="field-row ending-row">
              <label class="field">
                <span>
                  最後に聞きたいこと <small>任意</small>
                </span>
                <input
                  autocomplete="off"
                  maxlength={120}
                  name="question"
                  placeholder="例：主人公の目的は伝わりましたか？"
                />
              </label>
              <label class="field compact">
                <span>公開期間</span>
                <select name="expiryDays">
                  <option value="7">7日</option>
                  <option selected value="14">
                    14日
                  </option>
                  <option value="30">30日</option>
                </select>
              </label>
            </div>

            <label class="honeypot" aria-hidden="true">
              Website
              <input autocomplete="off" name="website" tabindex={-1} />
            </label>
            <p class="form-error" data-form-error role="alert"></p>
            <button class="button primary" type="submit">
              <span>読み跡をつくる</span>
              <span aria-hidden="true">→</span>
            </button>
            <p class="boundary-note">
              URLを知る人だけが読めます。検索には出ません。管理リンクは再発行できません。
            </p>
          </form>

          <section class="trace-preview" aria-label="読者画面の見本">
            <div class="preview-toolbar">
              <span>READER VIEW</span>
              <div class="reader-dots" aria-label="読者3人の見本">
                <i></i>
                <i></i>
                <i></i>
              </div>
            </div>
            <article class="preview-paper">
              <header>
                <span>冒頭・第1稿</span>
                <h2 data-paper-title>波止場の灯り</h2>
                <p>作者から届いた、まだ公開前の場面。</p>
              </header>
              <div class="preview-reading">
                <div class="trace-line" aria-hidden="true"></div>
                <div class="sample-paragraph hooked">
                  <p data-paper-paragraph="0">潮の匂いが残る駅で、澪は一枚の切符を握っていた。</p>
                  <span>● 惹かれた 3</span>
                </div>
                <div class="sample-paragraph">
                  <p data-paper-paragraph="1">
                    最終列車は行ったはずなのに、遠くからレールの震える音が近づいてくる。
                  </p>
                  <span class="surprise">! 驚いた 2</span>
                </div>
                <div class="sample-paragraph lost">
                  <p data-paper-paragraph="2">ポケットの時計は、十二時を指したまま動かなかった。</p>
                  <span>? 迷った 1</span>
                </div>
                <div class="sample-paragraph favorite">
                  <p data-paper-paragraph="3">暗闇の向こうで、誰かが澪の名前を呼んだ。</p>
                  <span>♥ 好き 4</span>
                </div>
              </div>
              <footer>
                {reactionOptions.map((option) => (
                  <span class={`legend-${option.kind}`}>
                    {option.icon} {option.label}
                  </span>
                ))}
              </footer>
            </article>
            <div class="preview-result">
              <span class="mini-label">作者にだけ見える</span>
              <div class="result-row">
                <div class="mini-curve" aria-hidden="true">
                  <i></i>
                  <i></i>
                  <i></i>
                  <i></i>
                </div>
                <p>
                  読者が立ち止まった段落と、
                  <br />
                  言葉になった感想を一緒に確認。
                </p>
              </div>
            </div>
          </section>
        </div>
      </section>

      <section class="boundary-strip" aria-label="読み跡の三つの特徴">
        <div>
          <span class="boundary-icon paper-icon" aria-hidden="true"></span>
          <p>
            <strong>段落に反応</strong>
            読みながら一拍で残せる
          </p>
        </div>
        <div>
          <span class="boundary-icon lock-icon" aria-hidden="true"></span>
          <p>
            <strong>限定URL</strong>
            原稿も感想も一覧に出さない
          </p>
        </div>
        <div>
          <span class="boundary-icon map-icon" aria-hidden="true"></span>
          <p>
            <strong>作者の地図</strong>
            反応が集まる場所を見渡せる
          </p>
        </div>
      </section>
    </Layout>
  );
}

export function ReaderPage({ draft, paragraphs }: { draft: DraftRow; paragraphs: string[] }) {
  return (
    <Layout
      description="限定共有された原稿へ、段落ごとの反応と読後メモを返します。"
      noIndex
      scripts={["/reader.js"]}
      title={`「${draft.title}」を読む | ${product.name}`}
    >
      <section class="reader-shell" data-draft-id={draft.id}>
        <header class="reader-intro">
          <div>
            <p class="eyebrow">SHARED MANUSCRIPT</p>
            <h1>{draft.title}</h1>
            {draft.pen_name ? <p class="byline">書いた人：{draft.pen_name}</p> : null}
          </div>
          <div class="reader-request">
            <span>{focusLabels[draft.focus]}</span>
            <p>{draft.note || "気持ちが動いた場所に、読み跡を残してください。"}</p>
          </div>
        </header>

        <div class="reader-layout">
          <article class="manuscript">
            <div class="manuscript-edge" aria-hidden="true">
              <i></i>
            </div>
            {paragraphs.map((paragraph, index) => (
              <section class="reading-block" data-paragraph={index}>
                <span class="paragraph-number">{String(index + 1).padStart(2, "0")}</span>
                <p>{paragraph}</p>
                <div class="reaction-row" aria-label={`${index + 1}段落目への反応`}>
                  {reactionOptions.map((option) => (
                    <button
                      aria-label={`${index + 1}段落目に「${option.label}」を残す`}
                      data-index={index}
                      data-kind={option.kind}
                      type="button"
                    >
                      <span aria-hidden="true">{option.icon}</span>
                      {option.label}
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </article>

          <aside class="reaction-guide">
            <p class="mini-label">TAP AS YOU READ</p>
            <h2>感じた場所に、ひとつ。</h2>
            <div class="reaction-key">
              {reactionOptions.map((option) => (
                <span class={`key-${option.kind}`}>
                  <i>{option.icon}</i>
                  {option.label}
                </span>
              ))}
            </div>
            <p>反応は何度でも変えられます。ほかの読者には見えません。</p>
          </aside>
        </div>

        <section class="feedback-panel">
          <div class="feedback-heading">
            <div>
              <p class="eyebrow">AFTER READING</p>
              <h2>読み終えた今の温度</h2>
            </div>
            <p>名前や連絡先は不要です。作者だけに届きます。</p>
          </div>
          <form data-feedback-form>
            <fieldset>
              <legend>読後に近いもの</legend>
              <div class="aftertaste-grid">
                <label>
                  <input defaultChecked name="aftertaste" type="radio" value="more" />
                  <span>続きを読みたい</span>
                </label>
                <label>
                  <input name="aftertaste" type="radio" value="stayed" />
                  <span>余韻が残った</span>
                </label>
                <label>
                  <input name="aftertaste" type="radio" value="clear" />
                  <span>すっと読めた</span>
                </label>
                <label>
                  <input name="aftertaste" type="radio" value="confused" />
                  <span>少し迷った</span>
                </label>
              </div>
            </fieldset>
            <div class="feedback-grid">
              <label class="field">
                <span>よかったところ</span>
                <textarea
                  maxlength={400}
                  name="goodText"
                  placeholder="心に残った描写や人物など"
                  rows={4}
                ></textarea>
              </label>
              <label class="field">
                <span>引っかかったところ</span>
                <textarea
                  maxlength={400}
                  name="stuckText"
                  placeholder="わかりにくかった点や気になった流れ"
                  rows={4}
                ></textarea>
              </label>
            </div>
            {draft.question ? (
              <label class="field author-question">
                <span>作者から：{draft.question}</span>
                <textarea maxlength={400} name="answerText" rows={3}></textarea>
              </label>
            ) : null}
            <label class="honeypot" aria-hidden="true">
              Website
              <input autocomplete="off" name="website" tabindex={-1} />
            </label>
            <p class="form-error" data-feedback-message role="status"></p>
            <button class="button primary" type="submit">
              作者へ届ける
            </button>
          </form>
        </section>

        <div class="report-row">
          <button data-report type="button">
            個人情報・無断転載などを報告
          </button>
        </div>
        <dialog class="report-dialog" data-report-dialog>
          <form data-report-form>
            <header>
              <p class="mini-label">REPORT</p>
              <h2>報告する理由</h2>
              <p>3人の異なる読者から報告されると、この原稿は自動で非表示になります。</p>
            </header>
            <div class="report-options">
              <label>
                <input defaultChecked name="reason" type="radio" value="personal" />
                <span>個人情報が含まれている</span>
              </label>
              <label>
                <input name="reason" type="radio" value="copyright" />
                <span>無断転載・権利侵害の疑い</span>
              </label>
              <label>
                <input name="reason" type="radio" value="unsafe" />
                <span>危険・不適切な内容</span>
              </label>
            </div>
            <p data-report-message role="status"></p>
            <div class="dialog-actions">
              <button class="button secondary" data-report-cancel type="button">
                戻る
              </button>
              <button class="button primary" type="submit">
                報告する
              </button>
            </div>
          </form>
        </dialog>
      </section>
    </Layout>
  );
}

export function ManagePage({ draftId }: { draftId: string }) {
  return (
    <Layout noIndex scripts={["/owner.js"]} title={`読み跡の管理 | ${product.name}`}>
      <section class="owner-shell" data-draft-id={draftId}>
        <div class="owner-loading" data-owner-loading>
          <div class="loading-trace" aria-hidden="true">
            <i></i>
            <i></i>
            <i></i>
          </div>
          <p>読者の足あとをひらいています。</p>
        </div>

        <div class="owner-content" data-owner-content hidden>
          <header class="owner-header">
            <div>
              <p class="eyebrow">AUTHOR VIEW</p>
              <h1 data-owner-title></h1>
              <p data-owner-meta></p>
            </div>
            <div class="owner-actions">
              <button class="button secondary" data-share type="button">
                共有URLをコピー
              </button>
              <a class="button primary" data-reader-link href="#">
                読者画面を見る
              </a>
            </div>
          </header>

          <section class="owner-summary" aria-label="集まった読み跡">
            <div>
              <span data-reader-count>0</span>
              <p>反応した読者</p>
            </div>
            <div>
              <span data-reaction-count>0</span>
              <p>段落の反応</p>
            </div>
            <div>
              <span data-feedback-count>0</span>
              <p>読後メモ</p>
            </div>
          </section>

          <section class="trace-map-panel">
            <header>
              <div>
                <p class="mini-label">READING TRACE</p>
                <h2>原稿の上の読み跡</h2>
              </div>
              <div class="compact-legend">
                {reactionOptions.map((option) => (
                  <span class={`legend-${option.kind}`}>{option.icon}</span>
                ))}
              </div>
            </header>
            <div class="trace-map" data-trace-map></div>
          </section>

          <section class="feedback-list-panel">
            <header>
              <p class="mini-label">PRIVATE NOTES</p>
              <h2>読後に届いた言葉</h2>
            </header>
            <div class="feedback-list" data-feedback-list></div>
          </section>

          <section class="owner-settings">
            <div>
              <p class="mini-label">SHARING</p>
              <h2>公開を止める・削除する</h2>
              <p data-expiry></p>
            </div>
            <div>
              <button class="button secondary" data-toggle-status type="button">
                受付を止める
              </button>
              <button class="danger-button" data-delete type="button">
                原稿と読み跡を削除
              </button>
            </div>
          </section>
        </div>

        <section class="owner-error" data-owner-error hidden>
          <p class="eyebrow">MANAGEMENT LINK</p>
          <h1>管理リンクを確認できません。</h1>
          <p>URLの「#」より後ろまで含めて開いてください。管理キーは再発行できません。</p>
          <a class="button secondary" href="/">
            新しい読み跡をつくる
          </a>
        </section>
      </section>
    </Layout>
  );
}

export function GuidePage() {
  return (
    <Layout title={`使い方 | ${product.name}`}>
      <article class="guide-page">
        <header>
          <p class="eyebrow">HOW IT FLOWS</p>
          <h1>原稿から、読者の反応地図まで。</h1>
          <p>公開掲示板ではなく、信頼できる相手へ渡す小さな読書室です。</p>
        </header>
        <ol class="guide-flow">
          <li>
            <span>01</span>
            <div>
              <h2>場面を置く</h2>
              <p>
                100〜6,000字の原稿と、見てほしい観点を入力します。空行が反応できる段落になります。
              </p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <h2>限定URLを渡す</h2>
              <p>
                読者は登録なしで開けます。URLを知る人だけが読め、作品一覧や検索結果には出ません。
              </p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <h2>読み跡を見る</h2>
              <p>段落別の反応と読後メモを作者画面に集約します。ほかの読者の回答は表示しません。</p>
            </div>
          </li>
        </ol>
        <section class="guide-boundary">
          <h2>置く前に知っておくこと</h2>
          <ul>
            <li>
              限定URLは暗号化や秘密保持契約ではありません。URLを受け取った人は本文を読めます。
            </li>
            <li>氏名、住所、連絡先、契約上公開できない原稿は入力しないでください。</li>
            <li>管理URLは作者だけで保管してください。紛失しても再発行できません。</li>
            <li>公開を止めるか完全削除できます。期限後は受付を止め、35日以内に削除します。</li>
          </ul>
        </section>
      </article>
    </Layout>
  );
}

export function PrivacyPage() {
  return (
    <Layout title={`プライバシー | ${product.name}`}>
      <article class="prose">
        <p class="eyebrow">PRIVACY</p>
        <h1>原稿と感想を、必要な期間だけ預かります。</h1>
        <section>
          <h2>保存するもの</h2>
          <p>
            作者が入力した作品名、作者名、説明、原稿、質問、公開期限を保存します。読者からは段落への反応、
            読後の選択、感想を保存します。氏名、メール、電話番号は求めません。
          </p>
        </section>
        <section>
          <h2>公開されるもの</h2>
          <p>
            限定URLを知る人には作品名、作者名、説明、原稿、質問が表示されます。読者の反応と感想は作者だけが
            管理リンクで確認でき、ほかの読者には表示されません。
          </p>
        </section>
        <section>
          <h2>匿名の利用識別子</h2>
          <p>
            不正利用防止と利用状況の集計のため、ブラウザ内にランダムな匿名IDを保存します。Cookie、広告用ID、
            端末の連絡先、正確な位置情報は使いません。
          </p>
        </section>
        <section>
          <h2>保持と削除</h2>
          <p>
            作者は管理画面から原稿、反応、感想をまとめて直ちに削除できます。期限後は受付を停止し、原稿と
            読み跡を35日以内に削除します。匿名の集計イベントも35日以内に削除します。
          </p>
        </section>
        <section>
          <h2>限定URLの範囲</h2>
          <p>
            原稿ページは検索対象外ですが、URLを知る人の閲覧や転送を技術的に完全には防げません。秘密情報、
            個人情報、第三者の著作物、契約上公開できない文章は入力しないでください。
          </p>
        </section>
      </article>
    </Layout>
  );
}

export function NotFoundPage() {
  return (
    <Layout noIndex title={`ページが見つかりません | ${product.name}`}>
      <section class="not-found">
        <div class="lost-trace" aria-hidden="true">
          <i></i>
          <i></i>
          <i></i>
        </div>
        <p class="eyebrow">NO TRACE HERE</p>
        <h1>ページが見つかりません。</h1>
        <p>公開が終了したか、URLが違う可能性があります。</p>
        <a class="button secondary" href="/">
          読み跡へ戻る
        </a>
      </section>
    </Layout>
  );
}
