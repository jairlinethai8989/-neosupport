-- ============================================================
-- Knowledge Base Table
-- Stores manuals, FAQs, and common solutions for the AI to reference.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.knowledge_base (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title       VARCHAR(255) NOT NULL,
    content     TEXT NOT NULL,
    category    VARCHAR(100), -- e.g., 'Network', 'Hardware', 'Software'
    tags        TEXT[],       -- for searching
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable extension for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Basic search index
CREATE INDEX IF NOT EXISTS idx_kb_tags ON public.knowledge_base USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_kb_search ON public.knowledge_base USING GIN (title gin_trgm_ops, content gin_trgm_ops);

COMMENT ON TABLE  public.knowledge_base IS 'Stores manual and common fixes for AI reference.';

-- Seed some example data if empty
INSERT INTO public.knowledge_base (title, content, category, tags)
VALUES 
('วิธีรีเซ็ตเครื่องพิมพ์หัวเข็ม', '1. ปิดเครื่องพิมพ์\n2. กดปุ่ม Font + Pitch ค้างไว้แล้วเปิดเครื่อง\n3. รอจนมีเสียงบี๊บแล้วปล่อย', 'Hardware', ARRAY['เครื่องพิมพ์', 'printer', 'reset']),
('เข้าใช้งานระบบไม่ได้ (Password Incorrect)', 'หากผู้ใช้งานลืมรหัสผ่าน ให้เจ้าหน้าที่ IT ทำการ Reset รหัสผ่านผ่านเมนู Admin > User Management', 'Software', ARRAY['login', 'password', 'ลืมรหัสผ่าน'])
ON CONFLICT DO NOTHING;
