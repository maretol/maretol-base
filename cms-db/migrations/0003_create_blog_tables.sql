-- Migration number: 0003 	 2026-07-11
-- blog（maretol-blog 相当）のテーブル群
-- 設計: cms_design.md「1. D1 テーブル定義（DDL）」参照
-- 設計からの追加: blog_categories.sort_order（microCMSの手動並び順をタグ一覧APIで再現するため）

CREATE TABLE blog_contents (
  id             TEXT PRIMARY KEY,
  title          TEXT NOT NULL,
  content        TEXT NOT NULL,
  content_format TEXT NOT NULL DEFAULT 'markdown' CHECK (content_format IN ('html', 'markdown')),
  ogp_image      TEXT,
  sns_text       TEXT,
  is_secret      INTEGER NOT NULL DEFAULT 0,
  secret_code    TEXT,
  status         TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('PUBLISH', 'DRAFT', 'CLOSED')),
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL,
  published_at   TEXT,
  revised_at     TEXT
);

-- 一覧クエリ（status='PUBLISH' AND is_secret=0 ORDER BY published_at DESC）用
CREATE INDEX idx_blog_contents_list ON blog_contents (status, is_secret, published_at DESC);

CREATE TABLE blog_categories (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  -- タグ一覧APIの表示順（microCMSの手動並び順をインポート時の順序で保持する）
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  published_at TEXT,
  revised_at   TEXT
);

-- 記事⇔カテゴリの多対多。position は記事内での表示順
CREATE TABLE blog_content_categories (
  content_id  TEXT NOT NULL REFERENCES blog_contents(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL REFERENCES blog_categories(id) ON DELETE CASCADE,
  position    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (content_id, category_id)
);

CREATE INDEX idx_bcc_category ON blog_content_categories (category_id);

CREATE TABLE blog_info (
  id               TEXT PRIMARY KEY,
  page_pathname    TEXT NOT NULL UNIQUE,
  title            TEXT,
  main_text        TEXT NOT NULL,
  main_text_format TEXT NOT NULL DEFAULT 'markdown' CHECK (main_text_format IN ('html', 'markdown')),
  status           TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('PUBLISH', 'DRAFT', 'CLOSED')),
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL,
  published_at     TEXT,
  revised_at       TEXT
);

-- サイドバー等の静的文言。項目追加をマイグレーションなしにするため key-value で持つ
-- microCMS の static オブジェクトの全キー（タイムスタンプ含む）を行として保存し、
-- cms-data-fetcher が行を集約して staticAPIResult 形状に組み立てる
CREATE TABLE blog_static (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
