import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  app,
  type Bindings,
  type DraftRow,
  type FeedbackRow,
  splitParagraphs,
} from "../src/worker";

const sessionId = "7c0dbe70-8c47-4fc0-aa62-52427133c612";
const draftId = "a".repeat(32);
const ownerToken = "1".repeat(64);
const sameOrigin = { "content-type": "application/json", "sec-fetch-site": "same-origin" };

type State = {
  dailyCount?: number;
  draft?: DraftRow | null;
  feedback?: FeedbackRow[];
  reactionDailyCount?: number;
  reactions?: Array<{ count: number; kind: string; paragraph_index: number }>;
  readerCount?: number;
  reportCount?: number;
};

const hash = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

const defaultDraft = async (status: DraftRow["status"] = "active"): Promise<DraftRow> => ({
  created_at: Math.floor(Date.now() / 1000),
  creator_session_id: sessionId,
  expires_at: Math.floor(Date.now() / 1000) + 14 * 86_400,
  focus: "flow",
  id: draftId,
  note: "初見で読みにくい場所を教えてください",
  owner_token_hash: await hash(ownerToken),
  paragraphs_json: JSON.stringify([
    "潮の匂いが残る駅で、澪は一枚の切符を握っていた。",
    "最終列車は行ったはずなのに、レールの震える音が近づいてくる。",
  ]),
  pen_name: "青井",
  question: "主人公の目的は伝わりましたか？",
  status,
  title: "波止場の灯り",
  updated_at: Math.floor(Date.now() / 1000),
});

const makeBindings = (state: State = {}) => {
  const calls: Array<{ arguments: unknown[]; sql: string }> = [];
  const batch = vi.fn(async () => []);
  const prepare = vi.fn((sql: string) => {
    const call = { arguments: [] as unknown[], sql };
    calls.push(call);
    const statement = {
      all: vi.fn(async () => {
        if (sql.includes("GROUP BY paragraph_index")) {
          return { results: state.reactions ?? [] };
        }
        if (sql.includes("FROM feedback")) {
          return { results: state.feedback ?? [] };
        }
        return { results: [] };
      }),
      bind: vi.fn((...arguments_: unknown[]) => {
        call.arguments = arguments_;
        return statement;
      }),
      first: vi.fn(async () => {
        if (sql.includes("COUNT(*) AS count FROM drafts")) {
          return { count: state.dailyCount ?? 0 };
        }
        if (sql.includes("name = 'reaction_left'")) {
          return { count: state.reactionDailyCount ?? 0 };
        }
        if (sql.includes("COUNT(*) AS count FROM reports")) {
          return { count: state.reportCount ?? 1 };
        }
        if (sql.includes("COUNT(DISTINCT reader_session_id)")) {
          return { count: state.readerCount ?? 0 };
        }
        if (sql.includes("SELECT * FROM drafts")) return state.draft ?? null;
        return null;
      }),
      run: vi.fn(async () => ({ success: true })),
    };
    return statement;
  });
  return {
    batch,
    bindings: {
      ASSETS: { fetch: () => Promise.resolve(new Response("not used")) },
      DB: { batch, prepare },
    } as unknown as Bindings,
    calls,
  };
};

const validBody = () => ({
  content:
    "潮の匂いが残る駅で、澪は一枚の切符を握っていた。誰にも見せなかった、帰らないための切符だった。\n\n最終列車はもう行ったはずなのに、遠くからレールの震える音が近づいてくる。時計は十二時を指したまま動かなかった。",
  expiryDays: 14,
  focus: "flow",
  note: "初見で読みにくい場所を教えてください",
  penName: "青井",
  question: "主人公の目的は伝わりましたか？",
  sessionId,
  title: "波止場の灯り",
  website: "",
});

describe("読み跡 worker", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("renders the product builder and visual reaction map without meta experiment copy", async () => {
    const response = await app.request("/", undefined, makeBindings().bindings);
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-security-policy")).toContain("default-src 'self'");
    expect(html).toContain('lang="ja"');
    expect(html).toContain('class="preview-paper"');
    expect(html).toContain("読み跡をつくる");
    expect(html).toContain("感想は作者だけに届きます");
    expect(html).not.toContain('class="hero"');
    expect(html).not.toContain("成功条件");
  });

  it("splits blank-line paragraphs and makes a readable path from one long block", () => {
    expect(splitParagraphs("一段落。\n\n二段落。")).toEqual(["一段落。", "二段落。"]);
    const long = Array.from(
      { length: 80 },
      (_, index) => `${index}番目の出来事が静かに起こりました。`,
    ).join("");
    expect(splitParagraphs(long).length).toBeGreaterThan(1);
    expect(splitParagraphs(long).length).toBeLessThanOrEqual(40);
  });

  it("creates an expiring private draft and returns the owner token only in the fragment", async () => {
    const { batch, bindings, calls } = makeBindings();
    const response = await app.request(
      "/api/drafts",
      { body: JSON.stringify(validBody()), headers: sameOrigin, method: "POST" },
      bindings,
    );
    const result = await response.json<{ manageUrl: string; shareUrl: string }>();

    expect(response.status).toBe(201);
    expect(result.manageUrl).toMatch(/^\/manage\/[0-9a-f]{32}#[0-9a-f]{64}$/);
    expect(result.shareUrl).toMatch(/^\/d\/[0-9a-f]{32}$/);
    expect(batch).toHaveBeenCalledTimes(1);
    const insert = calls.find((call) => call.sql.includes("INSERT INTO drafts"));
    expect(insert?.arguments).toContain("波止場の灯り");
    expect(insert?.arguments).toContain("青井");
    expect(JSON.stringify(insert?.arguments)).not.toContain(ownerToken);
  });

  it("rejects cross-site, short, honeypot, and daily-excess creation", async () => {
    const crossSite = await app.request(
      "/api/drafts",
      {
        body: JSON.stringify(validBody()),
        headers: { "content-type": "application/json", "sec-fetch-site": "cross-site" },
        method: "POST",
      },
      makeBindings().bindings,
    );
    expect(crossSite.status).toBe(403);

    const short = await app.request(
      "/api/drafts",
      {
        body: JSON.stringify({ ...validBody(), content: "短すぎます。" }),
        headers: sameOrigin,
        method: "POST",
      },
      makeBindings().bindings,
    );
    expect(short.status).toBe(400);

    const bot = await app.request(
      "/api/drafts",
      {
        body: JSON.stringify({ ...validBody(), website: "https://spam.example" }),
        headers: sameOrigin,
        method: "POST",
      },
      makeBindings().bindings,
    );
    expect(bot.status).toBe(400);

    const limited = await app.request(
      "/api/drafts",
      { body: JSON.stringify(validBody()), headers: sameOrigin, method: "POST" },
      makeBindings({ dailyCount: 3 }).bindings,
    );
    expect(limited.status).toBe(429);
  });

  it("renders only active drafts with noindex and escaped manuscript text", async () => {
    const draft = await defaultDraft();
    draft.paragraphs_json = JSON.stringify(["<script>alert('x')</script>", "安全な二段落目。"]);
    const response = await app.request(
      `/d/${draftId}`,
      undefined,
      makeBindings({ draft }).bindings,
    );
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("x-robots-tag")).toContain("noindex");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>alert");
    expect(html).toContain('src="/reader.js"');

    const closed = await defaultDraft("closed");
    const hidden = await app.request(
      `/d/${draftId}`,
      undefined,
      makeBindings({ draft: closed }).bindings,
    );
    expect(hidden.status).toBe(404);
  });

  it("returns aggregated traces and private feedback only to the fragment-key owner", async () => {
    const draft = await defaultDraft();
    const feedback: FeedbackRow = {
      aftertaste: "more",
      answer_text: "伝わりました",
      created_at: Math.floor(Date.now() / 1000),
      good_text: "駅の匂いが好きです",
      id: "b".repeat(32),
      stuck_text: "",
    };
    const bindings = makeBindings({
      draft,
      feedback: [feedback],
      reactions: [{ count: 2, kind: "hooked", paragraph_index: 0 }],
      readerCount: 2,
    }).bindings;

    const forbidden = await app.request(`/api/drafts/${draftId}/manage`, undefined, bindings);
    expect(forbidden.status).toBe(403);

    const response = await app.request(
      `/api/drafts/${draftId}/manage`,
      { headers: { "x-owner-token": ownerToken } },
      bindings,
    );
    const text = await response.text();
    expect(response.status).toBe(200);
    expect(text).toContain("駅の匂いが好きです");
    expect(text).toContain('"readerCount":2');
    expect(text).not.toContain("reader_session_id");
    expect(text).not.toContain("owner_token_hash");
    expect(text).not.toContain(sessionId);
  });

  it("stores one reaction per reader and validates the paragraph boundary", async () => {
    const draft = await defaultDraft();
    const valid = makeBindings({ draft });
    const response = await app.request(
      `/api/drafts/${draftId}/reactions`,
      {
        body: JSON.stringify({ index: 1, kind: "favorite", sessionId }),
        headers: sameOrigin,
        method: "POST",
      },
      valid.bindings,
    );
    expect(response.status).toBe(204);
    expect(valid.batch).toHaveBeenCalledTimes(1);
    expect(valid.calls.some((call) => call.sql.includes("ON CONFLICT"))).toBe(true);

    const invalid = await app.request(
      `/api/drafts/${draftId}/reactions`,
      {
        body: JSON.stringify({ index: 99, kind: "favorite", sessionId }),
        headers: sameOrigin,
        method: "POST",
      },
      makeBindings({ draft }).bindings,
    );
    expect(invalid.status).toBe(400);
  });

  it("accepts structured private feedback and rejects an empty response", async () => {
    const draft = await defaultDraft();
    const valid = makeBindings({ draft });
    const response = await app.request(
      `/api/drafts/${draftId}/feedback`,
      {
        body: JSON.stringify({
          aftertaste: "more",
          answerText: "伝わりました",
          goodText: "駅の描写が好きです",
          sessionId,
          stuckText: "",
          website: "",
        }),
        headers: sameOrigin,
        method: "POST",
      },
      valid.bindings,
    );
    expect(response.status).toBe(201);
    expect(valid.batch).toHaveBeenCalledTimes(1);

    const empty = await app.request(
      `/api/drafts/${draftId}/feedback`,
      {
        body: JSON.stringify({
          aftertaste: "more",
          answerText: "",
          goodText: "",
          sessionId,
          stuckText: "",
          website: "",
        }),
        headers: sameOrigin,
        method: "POST",
      },
      makeBindings({ draft }).bindings,
    );
    expect(empty.status).toBe(400);
  });

  it("lets only the owner close, reopen, and delete a draft", async () => {
    const draft = await defaultDraft();
    const valid = makeBindings({ draft });
    const closed = await app.request(
      `/api/drafts/${draftId}/status`,
      {
        body: JSON.stringify({ status: "closed" }),
        headers: { ...sameOrigin, "x-owner-token": ownerToken },
        method: "PATCH",
      },
      valid.bindings,
    );
    expect(closed.status).toBe(200);
    expect(valid.calls.some((call) => call.sql.includes("UPDATE drafts SET status"))).toBe(true);

    const invalid = await app.request(
      `/api/drafts/${draftId}`,
      {
        headers: { "sec-fetch-site": "same-origin", "x-owner-token": "2".repeat(64) },
        method: "DELETE",
      },
      makeBindings({ draft }).bindings,
    );
    expect(invalid.status).toBe(403);

    const deletion = makeBindings({ draft });
    const removed = await app.request(
      `/api/drafts/${draftId}`,
      {
        headers: { "sec-fetch-site": "same-origin", "x-owner-token": ownerToken },
        method: "DELETE",
      },
      deletion.bindings,
    );
    expect(removed.status).toBe(204);
    expect(deletion.calls.some((call) => call.sql.includes("DELETE FROM drafts"))).toBe(true);
  });

  it("hides a draft after three distinct anonymous reports", async () => {
    const draft = await defaultDraft();
    const { bindings, calls } = makeBindings({ draft, reportCount: 3 });
    const response = await app.request(
      `/api/drafts/${draftId}/report`,
      {
        body: JSON.stringify({ reason: "copyright", sessionId }),
        headers: sameOrigin,
        method: "POST",
      },
      bindings,
    );
    const result = await response.json<{ hidden: boolean }>();
    expect(response.status).toBe(200);
    expect(result.hidden).toBe(true);
    expect(calls.some((call) => call.sql.includes("status = 'hidden'"))).toBe(true);
  });

  it("documents link visibility, private feedback, anonymous ids, and deletion", async () => {
    const response = await app.request("/privacy", undefined, makeBindings().bindings);
    const html = await response.text();
    expect(response.status).toBe(200);
    expect(html).toContain("作者だけ");
    expect(html).toContain("管理リンクで確認");
    expect(html).toContain("ランダムな匿名ID");
    expect(html).toContain("期限後は受付を停止");
    expect(html).toContain("35日以内");
  });

  it("serves HTML for missing pages, JSON for missing APIs, and a safe health response", async () => {
    const bindings = makeBindings().bindings;
    const page = await app.request("/missing", undefined, bindings);
    const api = await app.request("/api/missing", undefined, bindings);
    const health = await app.request("/healthz", undefined, bindings);
    expect(page.status).toBe(404);
    expect(await page.text()).toContain("ページが見つかりません");
    expect(api.status).toBe(404);
    expect(await api.json()).toEqual(expect.objectContaining({ error: "not_found" }));
    expect(await health.json()).toEqual(
      expect.objectContaining({ healthy: true, service: "yomiato" }),
    );
  });
});
