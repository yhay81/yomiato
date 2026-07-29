PRAGMA foreign_keys = ON;

CREATE TABLE drafts (
  id TEXT PRIMARY KEY NOT NULL,
  owner_token_hash TEXT NOT NULL,
  creator_session_id TEXT NOT NULL,
  title TEXT NOT NULL,
  pen_name TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  paragraphs_json TEXT NOT NULL,
  focus TEXT NOT NULL CHECK (focus IN ('flow', 'emotion', 'clarity', 'character')),
  question TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('active', 'closed', 'hidden')),
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX drafts_creator_day_idx ON drafts (creator_session_id, created_at);
CREATE INDEX drafts_expiry_idx ON drafts (status, expires_at);

CREATE TABLE reactions (
  draft_id TEXT NOT NULL,
  reader_session_id TEXT NOT NULL,
  paragraph_index INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('hooked', 'lost', 'surprised', 'favorite')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (draft_id, reader_session_id, paragraph_index),
  FOREIGN KEY (draft_id) REFERENCES drafts (id) ON DELETE CASCADE
);

CREATE INDEX reactions_draft_idx ON reactions (draft_id, paragraph_index);

CREATE TABLE feedback (
  id TEXT PRIMARY KEY NOT NULL,
  draft_id TEXT NOT NULL,
  reader_session_id TEXT NOT NULL,
  aftertaste TEXT NOT NULL CHECK (aftertaste IN ('more', 'stayed', 'clear', 'confused')),
  good_text TEXT NOT NULL DEFAULT '',
  stuck_text TEXT NOT NULL DEFAULT '',
  answer_text TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (draft_id, reader_session_id),
  FOREIGN KEY (draft_id) REFERENCES drafts (id) ON DELETE CASCADE
);

CREATE INDEX feedback_draft_idx ON feedback (draft_id, created_at DESC);

CREATE TABLE reports (
  draft_id TEXT NOT NULL,
  reporter_session_id TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('personal', 'copyright', 'unsafe')),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (draft_id, reporter_session_id),
  FOREIGN KEY (draft_id) REFERENCES drafts (id) ON DELETE CASCADE
);

CREATE TABLE product_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  name TEXT NOT NULL,
  draft_id TEXT NOT NULL DEFAULT '',
  occurred_on TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX product_events_day_idx ON product_events (occurred_on, name);
CREATE INDEX product_events_session_idx ON product_events (session_id, created_at);
