-- Migration number: 0002 	 2026-07-11
-- comic（maretol-comic 相当）のテーブル群
-- 設計: cms_design.md「1. D1 テーブル定義（DDL）」参照

CREATE TABLE bande_dessinee_tags (
  id           TEXT PRIMARY KEY,
  tag_name     TEXT NOT NULL,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  published_at TEXT,
  revised_at   TEXT
);

CREATE TABLE bande_dessinee_series (
  id           TEXT PRIMARY KEY,
  series_name  TEXT NOT NULL,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  published_at TEXT,
  revised_at   TEXT
);

CREATE TABLE bande_dessinees (
  id                 TEXT PRIMARY KEY,
  title_name         TEXT NOT NULL,
  publish_date       TEXT,
  publish_event      TEXT,
  contents_url       TEXT NOT NULL,
  -- 前後の巻への参照。未作成のIDを先に入れられるよう FK 制約は付けない
  next_id            TEXT,
  previous_id        TEXT,
  tag_id             TEXT NOT NULL REFERENCES bande_dessinee_tags(id),
  series_id          TEXT REFERENCES bande_dessinee_series(id),
  cover              TEXT,
  back_cover         TEXT,
  format             TEXT NOT NULL,  -- JSON配列 例: '["png"]'
  filename           TEXT NOT NULL,
  first_page         INTEGER NOT NULL,
  last_page          INTEGER NOT NULL,
  first_left_right   TEXT NOT NULL,  -- JSON配列 例: '["left"]'
  description        TEXT NOT NULL DEFAULT '',
  description_format TEXT NOT NULL DEFAULT 'markdown' CHECK (description_format IN ('html', 'markdown')),
  status             TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('PUBLISH', 'DRAFT', 'CLOSED')),
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL,
  published_at       TEXT,
  revised_at         TEXT
);

CREATE INDEX idx_bande_dessinees_list ON bande_dessinees (status, published_at DESC);
