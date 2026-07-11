-- Migration number: 0001 	 2026-07-11
-- illust（maretol-illust 相当）のテーブル群
-- 設計: cms_design.md「1. D1 テーブル定義（DDL）」参照

CREATE TABLE atelier_tags (
  id           TEXT PRIMARY KEY,
  tag          TEXT NOT NULL,
  -- '作品' | 'キャラクター' 等。API上は string[] だが運用上単一値のため TEXT で持ち、配信時に配列に包む
  type         TEXT NOT NULL,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  published_at TEXT,
  revised_at   TEXT
);

CREATE TABLE ateliers (
  id                 TEXT PRIMARY KEY,
  title              TEXT NOT NULL,
  src                TEXT NOT NULL,
  object_position    TEXT NOT NULL DEFAULT 'center',
  description        TEXT,
  description_format TEXT NOT NULL DEFAULT 'markdown' CHECK (description_format IN ('html', 'markdown')),
  status             TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('PUBLISH', 'DRAFT', 'CLOSED')),
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL,
  published_at       TEXT,
  revised_at         TEXT
);

CREATE INDEX idx_ateliers_list ON ateliers (status, published_at DESC);

CREATE TABLE atelier_tag_relations (
  atelier_id TEXT NOT NULL REFERENCES ateliers(id) ON DELETE CASCADE,
  tag_id     TEXT NOT NULL REFERENCES atelier_tags(id) ON DELETE CASCADE,
  position   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (atelier_id, tag_id)
);
