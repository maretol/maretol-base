-- Migration number: 0004 	 2026-07-19
-- novel（小説）のテーブル群
-- comic（0002）から画像系カラム（back_cover/format/filename/first_page/last_page/first_left_right）を除いた構成
-- 本文テキストは contents_url が指す外部プレーンテキストファイルとして配信する（R2は別ツールで管理）

CREATE TABLE novel_tags (
  id           TEXT PRIMARY KEY,
  tag_name     TEXT NOT NULL,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  published_at TEXT,
  revised_at   TEXT
);

CREATE TABLE novel_series (
  id           TEXT PRIMARY KEY,
  series_name  TEXT NOT NULL,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  published_at TEXT,
  revised_at   TEXT
);

CREATE TABLE novels (
  id                 TEXT PRIMARY KEY,
  title_name         TEXT NOT NULL,
  publish_date       TEXT,
  publish_event      TEXT,
  contents_url       TEXT NOT NULL,
  -- 前後の巻への参照。未作成のIDを先に入れられるよう FK 制約は付けない
  next_id            TEXT,
  previous_id        TEXT,
  tag_id             TEXT NOT NULL REFERENCES novel_tags(id),
  series_id          TEXT REFERENCES novel_series(id),
  -- OGP 用の任意表紙。無ければ既定 OGP にフォールバックする
  cover              TEXT,
  description        TEXT NOT NULL DEFAULT '',
  description_format TEXT NOT NULL DEFAULT 'markdown' CHECK (description_format IN ('html', 'markdown')),
  status             TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('PUBLISH', 'DRAFT', 'CLOSED')),
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL,
  published_at       TEXT,
  revised_at         TEXT
);

CREATE INDEX idx_novels_list ON novels (status, published_at DESC);
