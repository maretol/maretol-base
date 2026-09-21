-- Migration number: 0005 	 2026-09-21
-- 0004 は未マージの novel（PR #1174）が使用しているため 0005 とする
-- admin 一覧（ORDER BY created_at DESC, id DESC + LIMIT/OFFSET）用のインデックス
-- 既存の idx_*_list は公開側（status + published_at）向けで、admin の並び順には効かないため追加する

CREATE INDEX idx_ateliers_admin_list ON ateliers (created_at DESC, id DESC);
CREATE INDEX idx_bande_dessinees_admin_list ON bande_dessinees (created_at DESC, id DESC);
CREATE INDEX idx_blog_contents_admin_list ON blog_contents (created_at DESC, id DESC);
