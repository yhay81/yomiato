import { Hono } from "hono";
import { requestId } from "hono/request-id";

import { securityHeaders } from "./middleware/security";
import { GuidePage, HomePage, ManagePage, NotFoundPage, PrivacyPage, ReaderPage } from "./ui/pages";

export type Bindings = {
  ASSETS: Fetcher;
  DB: D1Database;
};

export type DraftRow = {
  created_at: number;
  creator_session_id: string;
  expires_at: number;
  focus: "flow" | "emotion" | "clarity" | "character";
  id: string;
  note: string;
  owner_token_hash: string;
  paragraphs_json: string;
  pen_name: string;
  question: string;
  status: "active" | "closed" | "hidden";
  title: string;
  updated_at: number;
};

export type FeedbackRow = {
  aftertaste: "more" | "stayed" | "clear" | "confused";
  answer_text: string;
  created_at: number;
  good_text: string;
  id: string;
  stuck_text: string;
};

type ReactionCountRow = {
  count: number;
  kind: "hooked" | "lost" | "surprised" | "favorite";
  paragraph_index: number;
};

const app = new Hono<{ Bindings: Bindings }>();
const idPattern = /^[0-9a-f]{32}$/;
const ownerTokenPattern = /^[0-9a-f]{64}$/;
const sessionIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const focuses = new Set(["flow", "emotion", "clarity", "character"]);
const reactionKinds = new Set(["hooked", "lost", "surprised", "favorite"]);
const aftertastes = new Set(["more", "stayed", "clear", "confused"]);
const eventNames = new Set([
  "visited",
  "draft_created",
  "draft_viewed",
  "reaction_left",
  "feedback_submitted",
  "owner_checked",
  "draft_shared",
  "draft_closed",
  "returned",
]);
const daySeconds = 86_400;

app.use("*", requestId());
app.use("*", securityHeaders);

const nowSeconds = () => Math.floor(Date.now() / 1000);

const randomHex = (bytes: number) => {
  const values = crypto.getRandomValues(new Uint8Array(bytes));
  return [...values].map((value) => value.toString(16).padStart(2, "0")).join("");
};

const sha256 = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

const constantTimeEqual = (left: string, right: string) => {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
};

const normalize = (value: unknown, maximum: number) =>
  typeof value === "string" ? value.normalize("NFKC").trim().slice(0, maximum) : "";

export const splitParagraphs = (value: string) => {
  const normalized = value.replaceAll("\r\n", "\n").replaceAll("\r", "\n").trim();
  const blocks = normalized
    .split(/\n\s*\n+/)
    .map((block) => block.replace(/\n+/g, "\n").trim())
    .filter(Boolean);

  if (blocks.length > 1 || normalized.length <= 420) return blocks.slice(0, 40);

  const sentences = normalized.match(/[^。！？\n]+[。！？]?/g) ?? [normalized];
  const paragraphs: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if (current && current.length + sentence.length > 280) {
      paragraphs.push(current.trim());
      current = "";
    }
    current += sentence;
  }
  if (current.trim()) paragraphs.push(current.trim());
  return paragraphs.slice(0, 40);
};

const parseParagraphs = (row: DraftRow) => {
  try {
    const parsed = JSON.parse(row.paragraphs_json);
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string").slice(0, 40)
      : [];
  } catch {
    return [];
  }
};

const isSameOriginMutation = (request: Request) => {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite) return fetchSite === "same-origin";
  const origin = request.headers.get("origin");
  return origin === new URL(request.url).origin;
};

const isJsonRequest = (request: Request) =>
  request.headers.get("content-type")?.toLowerCase().startsWith("application/json") ?? false;

const noStore = async (response: Response | Promise<Response>) => {
  const resolved = await response;
  resolved.headers.set("Cache-Control", "no-store, private");
  resolved.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return resolved;
};

const publicDraft = (row: DraftRow | null) =>
  row && row.status === "active" && row.expires_at > nowSeconds() ? row : null;

const ownerDraft = async (db: D1Database, id: string, token: string) => {
  if (!idPattern.test(id) || !ownerTokenPattern.test(token)) return null;
  const row = await db.prepare("SELECT * FROM drafts WHERE id = ?").bind(id).first<DraftRow>();
  if (!row) return null;
  const suppliedHash = await sha256(token);
  return constantTimeEqual(row.owner_token_hash, suppliedHash) ? row : null;
};

const recordEventStatement = (db: D1Database, sessionId: string, name: string, draftId = "") =>
  db
    .prepare(
      "INSERT INTO product_events (session_id, name, draft_id, occurred_on, created_at) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(sessionId, name, draftId, new Date().toISOString().slice(0, 10), nowSeconds());

app.get("/", (c) => c.html(<HomePage />));
app.get("/guide", (c) => c.html(<GuidePage />));
app.get("/privacy", (c) => c.html(<PrivacyPage />));
app.get("/manage/:id", (c) => {
  if (!idPattern.test(c.req.param("id"))) return c.html(<NotFoundPage />, 404);
  return noStore(c.html(<ManagePage draftId={c.req.param("id")} />));
});

app.get("/d/:id", async (c) => {
  const id = c.req.param("id");
  if (!idPattern.test(id)) return noStore(c.html(<NotFoundPage />, 404));
  const row = await c.env.DB.prepare("SELECT * FROM drafts WHERE id = ?")
    .bind(id)
    .first<DraftRow>();
  const draft = publicDraft(row);
  if (!draft) return noStore(c.html(<NotFoundPage />, 404));
  const paragraphs = parseParagraphs(draft);
  if (paragraphs.length === 0) return noStore(c.html(<NotFoundPage />, 404));
  return noStore(c.html(<ReaderPage draft={draft} paragraphs={paragraphs} />));
});

app.post("/api/drafts", async (c) => {
  if (!isSameOriginMutation(c.req.raw)) return c.json({ error: "forbidden" }, 403);
  if (!isJsonRequest(c.req.raw)) return c.json({ error: "unsupported_media_type" }, 415);
  const length = Number(c.req.header("content-length") ?? 0);
  if (length > 20_000) return c.json({ error: "payload_too_large" }, 413);

  const body = await c.req.json<{
    content?: string;
    expiryDays?: number;
    focus?: string;
    note?: string;
    penName?: string;
    question?: string;
    sessionId?: string;
    title?: string;
    website?: string;
  }>();
  if (normalize(body.website, 100)) return c.json({ error: "invalid" }, 400);

  const sessionId = normalize(body.sessionId, 36);
  const title = normalize(body.title, 80);
  const penName = normalize(body.penName, 40);
  const note = normalize(body.note, 160);
  const content = normalize(body.content, 6000);
  const question = normalize(body.question, 120);
  const focus = normalize(body.focus, 20);
  const expiryDays = Number(body.expiryDays);
  const paragraphs = splitParagraphs(content);

  if (
    !sessionIdPattern.test(sessionId) ||
    title.length < 1 ||
    content.length < 100 ||
    paragraphs.length < 1 ||
    !focuses.has(focus) ||
    ![7, 14, 30].includes(expiryDays)
  ) {
    return c.json({ error: "invalid_draft" }, 400);
  }

  const since = nowSeconds() - daySeconds;
  const daily = await c.env.DB.prepare(
    "SELECT COUNT(*) AS count FROM drafts WHERE creator_session_id = ? AND created_at >= ?",
  )
    .bind(sessionId, since)
    .first<{ count: number }>();
  if ((daily?.count ?? 0) >= 3) return c.json({ error: "rate_limited" }, 429);

  const id = randomHex(16);
  const ownerToken = randomHex(32);
  const createdAt = nowSeconds();
  const expiresAt = createdAt + expiryDays * daySeconds;
  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO drafts (
          id, owner_token_hash, creator_session_id, title, pen_name, note,
          paragraphs_json, focus, question, status, expires_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
    ).bind(
      id,
      await sha256(ownerToken),
      sessionId,
      title,
      penName,
      note,
      JSON.stringify(paragraphs),
      focus,
      question,
      expiresAt,
      createdAt,
      createdAt,
    ),
    recordEventStatement(c.env.DB, sessionId, "draft_created", id),
  ]);

  return c.json(
    {
      id,
      manageUrl: `/manage/${id}#${ownerToken}`,
      shareUrl: `/d/${id}`,
    },
    201,
  );
});

app.get("/api/drafts/:id/manage", async (c) => {
  const id = c.req.param("id");
  const token = c.req.header("x-owner-token") ?? "";
  const draft = await ownerDraft(c.env.DB, id, token);
  if (!draft) return noStore(c.json({ error: "forbidden" }, 403));

  const [reactionResult, feedbackResult, readerResult] = await Promise.all([
    c.env.DB.prepare(
      "SELECT paragraph_index, kind, COUNT(*) AS count FROM reactions WHERE draft_id = ? GROUP BY paragraph_index, kind ORDER BY paragraph_index",
    )
      .bind(id)
      .all<ReactionCountRow>(),
    c.env.DB.prepare(
      "SELECT id, aftertaste, good_text, stuck_text, answer_text, created_at FROM feedback WHERE draft_id = ? ORDER BY created_at DESC LIMIT 100",
    )
      .bind(id)
      .all<FeedbackRow>(),
    c.env.DB.prepare(
      `SELECT COUNT(DISTINCT reader_session_id) AS count
         FROM (
           SELECT reader_session_id FROM reactions WHERE draft_id = ?
           UNION ALL
           SELECT reader_session_id FROM feedback WHERE draft_id = ?
         )`,
    )
      .bind(id, id)
      .first<{ count: number }>(),
  ]);

  return noStore(
    c.json({
      draft: {
        createdAt: draft.created_at,
        expiresAt: draft.expires_at,
        focus: draft.focus,
        note: draft.note,
        paragraphs: parseParagraphs(draft),
        penName: draft.pen_name,
        question: draft.question,
        status: draft.status,
        title: draft.title,
      },
      feedback: feedbackResult.results ?? [],
      readerCount: readerResult?.count ?? 0,
      reactions: reactionResult.results ?? [],
    }),
  );
});

app.post("/api/drafts/:id/reactions", async (c) => {
  if (!isSameOriginMutation(c.req.raw)) return c.json({ error: "forbidden" }, 403);
  if (!isJsonRequest(c.req.raw)) return c.json({ error: "unsupported_media_type" }, 415);
  const id = c.req.param("id");
  if (!idPattern.test(id)) return c.json({ error: "not_found" }, 404);
  const body = await c.req.json<{
    index?: number;
    kind?: string | null;
    sessionId?: string;
  }>();
  const sessionId = normalize(body.sessionId, 36);
  const index = Number(body.index);
  const kind = body.kind === null ? null : normalize(body.kind, 20);

  const row = await c.env.DB.prepare("SELECT * FROM drafts WHERE id = ?")
    .bind(id)
    .first<DraftRow>();
  const draft = publicDraft(row);
  const paragraphCount = draft ? parseParagraphs(draft).length : 0;
  if (
    !draft ||
    !sessionIdPattern.test(sessionId) ||
    !Number.isInteger(index) ||
    index < 0 ||
    index >= paragraphCount ||
    (kind !== null && !reactionKinds.has(kind))
  ) {
    return c.json({ error: "invalid_reaction" }, 400);
  }

  if (kind === null) {
    await c.env.DB.prepare(
      "DELETE FROM reactions WHERE draft_id = ? AND reader_session_id = ? AND paragraph_index = ?",
    )
      .bind(id, sessionId, index)
      .run();
    return c.body(null, 204);
  }

  const daily = await c.env.DB.prepare(
    "SELECT COUNT(*) AS count FROM product_events WHERE session_id = ? AND name = 'reaction_left' AND created_at >= ?",
  )
    .bind(sessionId, nowSeconds() - daySeconds)
    .first<{ count: number }>();
  if ((daily?.count ?? 0) >= 80) return c.json({ error: "rate_limited" }, 429);

  const timestamp = nowSeconds();
  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO reactions (
          draft_id, reader_session_id, paragraph_index, kind, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT (draft_id, reader_session_id, paragraph_index)
        DO UPDATE SET kind = excluded.kind, updated_at = excluded.updated_at`,
    ).bind(id, sessionId, index, kind, timestamp, timestamp),
    recordEventStatement(c.env.DB, sessionId, "reaction_left", id),
  ]);
  return c.body(null, 204);
});

app.post("/api/drafts/:id/feedback", async (c) => {
  if (!isSameOriginMutation(c.req.raw)) return c.json({ error: "forbidden" }, 403);
  if (!isJsonRequest(c.req.raw)) return c.json({ error: "unsupported_media_type" }, 415);
  const id = c.req.param("id");
  if (!idPattern.test(id)) return c.json({ error: "not_found" }, 404);
  const body = await c.req.json<{
    aftertaste?: string;
    answerText?: string;
    goodText?: string;
    sessionId?: string;
    stuckText?: string;
    website?: string;
  }>();
  if (normalize(body.website, 100)) return c.json({ error: "invalid" }, 400);

  const sessionId = normalize(body.sessionId, 36);
  const aftertaste = normalize(body.aftertaste, 20);
  const goodText = normalize(body.goodText, 400);
  const stuckText = normalize(body.stuckText, 400);
  const answerText = normalize(body.answerText, 400);
  const row = await c.env.DB.prepare("SELECT * FROM drafts WHERE id = ?")
    .bind(id)
    .first<DraftRow>();

  if (
    !publicDraft(row) ||
    !sessionIdPattern.test(sessionId) ||
    !aftertastes.has(aftertaste) ||
    (!goodText && !stuckText && !answerText)
  ) {
    return c.json({ error: "invalid_feedback" }, 400);
  }

  const timestamp = nowSeconds();
  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO feedback (
          id, draft_id, reader_session_id, aftertaste, good_text, stuck_text,
          answer_text, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (draft_id, reader_session_id)
        DO UPDATE SET
          aftertaste = excluded.aftertaste,
          good_text = excluded.good_text,
          stuck_text = excluded.stuck_text,
          answer_text = excluded.answer_text,
          updated_at = excluded.updated_at`,
    ).bind(
      randomHex(16),
      id,
      sessionId,
      aftertaste,
      goodText,
      stuckText,
      answerText,
      timestamp,
      timestamp,
    ),
    recordEventStatement(c.env.DB, sessionId, "feedback_submitted", id),
  ]);
  return c.json({ accepted: true }, 201);
});

app.post("/api/drafts/:id/report", async (c) => {
  if (!isSameOriginMutation(c.req.raw)) return c.json({ error: "forbidden" }, 403);
  if (!isJsonRequest(c.req.raw)) return c.json({ error: "unsupported_media_type" }, 415);
  const id = c.req.param("id");
  const body = await c.req.json<{ reason?: string; sessionId?: string }>();
  const sessionId = normalize(body.sessionId, 36);
  const reason = normalize(body.reason, 20);
  if (
    !idPattern.test(id) ||
    !sessionIdPattern.test(sessionId) ||
    !["personal", "copyright", "unsafe"].includes(reason)
  ) {
    return c.json({ error: "invalid_report" }, 400);
  }
  const row = await c.env.DB.prepare("SELECT * FROM drafts WHERE id = ?")
    .bind(id)
    .first<DraftRow>();
  if (!publicDraft(row)) return c.json({ error: "not_found" }, 404);

  await c.env.DB.prepare(
    "INSERT OR IGNORE INTO reports (draft_id, reporter_session_id, reason, created_at) VALUES (?, ?, ?, ?)",
  )
    .bind(id, sessionId, reason, nowSeconds())
    .run();
  const count = await c.env.DB.prepare("SELECT COUNT(*) AS count FROM reports WHERE draft_id = ?")
    .bind(id)
    .first<{ count: number }>();
  const hidden = (count?.count ?? 0) >= 3;
  if (hidden) {
    await c.env.DB.prepare("UPDATE drafts SET status = 'hidden', updated_at = ? WHERE id = ?")
      .bind(nowSeconds(), id)
      .run();
  }
  return c.json({ hidden });
});

app.patch("/api/drafts/:id/status", async (c) => {
  if (!isSameOriginMutation(c.req.raw)) return c.json({ error: "forbidden" }, 403);
  if (!isJsonRequest(c.req.raw)) return c.json({ error: "unsupported_media_type" }, 415);
  const id = c.req.param("id");
  const token = c.req.header("x-owner-token") ?? "";
  const draft = await ownerDraft(c.env.DB, id, token);
  if (!draft) return c.json({ error: "forbidden" }, 403);
  const body = await c.req.json<{ status?: string }>();
  const status = normalize(body.status, 10);
  if (!["active", "closed"].includes(status)) return c.json({ error: "invalid_status" }, 400);
  if (draft.status === "hidden" || (status === "active" && draft.expires_at <= nowSeconds())) {
    return c.json({ error: "unavailable" }, 409);
  }
  await c.env.DB.prepare("UPDATE drafts SET status = ?, updated_at = ? WHERE id = ?")
    .bind(status, nowSeconds(), id)
    .run();
  return c.json({ status });
});

app.delete("/api/drafts/:id", async (c) => {
  if (!isSameOriginMutation(c.req.raw)) return c.json({ error: "forbidden" }, 403);
  const id = c.req.param("id");
  const token = c.req.header("x-owner-token") ?? "";
  const draft = await ownerDraft(c.env.DB, id, token);
  if (!draft) return c.json({ error: "forbidden" }, 403);
  await c.env.DB.prepare("DELETE FROM drafts WHERE id = ?").bind(id).run();
  return c.body(null, 204);
});

app.post("/api/events", async (c) => {
  if (!isSameOriginMutation(c.req.raw)) return c.json({ error: "forbidden" }, 403);
  if (!isJsonRequest(c.req.raw)) return c.json({ error: "unsupported_media_type" }, 415);
  const body = await c.req.json<{ draftId?: string; name?: string; sessionId?: string }>();
  const sessionId = normalize(body.sessionId, 36);
  const name = normalize(body.name, 40);
  const draftId = normalize(body.draftId, 32);
  if (
    !sessionIdPattern.test(sessionId) ||
    !eventNames.has(name) ||
    (draftId && !idPattern.test(draftId))
  ) {
    return c.json({ error: "invalid_event" }, 400);
  }
  await recordEventStatement(c.env.DB, sessionId, name, draftId).run();
  return c.body(null, 204);
});

app.get("/healthz", (c) =>
  c.json({
    healthy: true,
    service: "yomiato",
    time: new Date().toISOString(),
  }),
);

app.notFound((c) =>
  c.req.path.startsWith("/api/")
    ? c.json({ error: "not_found", requestId: c.get("requestId") }, 404)
    : c.html(<NotFoundPage />, 404),
);

app.onError((error, c) => {
  console.error(
    JSON.stringify({
      event: "request_failed",
      message: error.message,
      requestId: c.get("requestId"),
    }),
  );
  return c.json({ error: "internal_error", requestId: c.get("requestId") }, 500);
});

const scheduled: ExportedHandlerScheduledHandler<Bindings> = async (_controller, env) => {
  const now = nowSeconds();
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE drafts SET status = 'closed', updated_at = ? WHERE status = 'active' AND expires_at <= ?",
    ).bind(now, now),
    env.DB.prepare("DELETE FROM drafts WHERE expires_at < ?").bind(now - 35 * daySeconds),
    env.DB.prepare("DELETE FROM product_events WHERE created_at < ?").bind(now - 35 * daySeconds),
  ]);
};

export { app };
export default { fetch: app.fetch, scheduled };
