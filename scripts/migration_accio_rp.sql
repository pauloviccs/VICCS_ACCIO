-- ========================================================
-- ACCIO ROLEPLAY (ARCANE MP) — DATABASE MIGRATION SCRIPT
-- Projeto: ACCIO_Rp (Ref: siwjyavftankitbdagzo)
-- ========================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TABELA character_applications
CREATE TABLE IF NOT EXISTS public.character_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    discord_id TEXT NOT NULL,
    discord_username TEXT NOT NULL,
    discord_avatar TEXT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    birth_date TEXT NOT NULL,
    birth_place TEXT NOT NULL,
    blood_status TEXT NOT NULL,
    preferred_house TEXT NOT NULL,
    wand_wood TEXT NOT NULL,
    wand_core TEXT NOT NULL,
    wand_length TEXT NOT NULL,
    wand_flexibility TEXT NOT NULL,
    wand_handle TEXT NOT NULL,
    patronus TEXT,
    character_backstory TEXT NOT NULL,
    word_count INTEGER NOT NULL DEFAULT 0,
    rp_experience TEXT,
    rules_accepted BOOLEAN NOT NULL DEFAULT true,
    status TEXT NOT NULL DEFAULT 'pending',
    reviewer_notes TEXT,
    reviewed_by TEXT,
    pdf_url TEXT
);

-- Colunas de sincronia bidirecional Jogo <-> Site (Fase 2) & Dormitório
ALTER TABLE public.character_applications ADD COLUMN IF NOT EXISTS dormitory TEXT NOT NULL DEFAULT 'wizard';
ALTER TABLE public.character_applications ADD COLUMN IF NOT EXISTS sorted_house TEXT;
ALTER TABLE public.character_applications ADD COLUMN IF NOT EXISTS secondary_house TEXT;
ALTER TABLE public.character_applications ADD COLUMN IF NOT EXISTS is_hatstall BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.character_applications ADD COLUMN IF NOT EXISTS sorted_at TIMESTAMPTZ;
ALTER TABLE public.character_applications ADD COLUMN IF NOT EXISTS game_character_id BIGINT;

CREATE INDEX IF NOT EXISTS idx_character_applications_discord_id ON public.character_applications(discord_id);
CREATE INDEX IF NOT EXISTS idx_character_applications_status ON public.character_applications(status);
CREATE INDEX IF NOT EXISTS idx_character_applications_created_at ON public.character_applications(created_at DESC);

-- 3. TABELA accio_settings (Cronômetro Apple, Fases & Configs em Realtime)
CREATE TABLE IF NOT EXISTS public.accio_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

INSERT INTO public.accio_settings (key, value, updated_at)
VALUES (
    'countdown_timer',
    '{"target_date": "2027-01-21T23:59:59.000Z", "days": 60, "hours": 0, "minutes": 0, "seconds": 0, "updated_by": "Ministério da Magia"}'::jsonb,
    now()
)
ON CONFLICT (key) DO NOTHING;

-- 4. TABELA user_roles (RBAC: user, student, mod, admin, super_admin)
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    discord_id TEXT NOT NULL UNIQUE,
    discord_username TEXT NOT NULL,
    discord_avatar TEXT,
    role TEXT NOT NULL DEFAULT 'user',
    assigned_by TEXT DEFAULT 'Sistema'
);

CREATE INDEX IF NOT EXISTS idx_user_roles_discord_id ON public.user_roles(discord_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- Super admin padrão PauloViccs
INSERT INTO public.user_roles (discord_id, discord_username, role, assigned_by)
VALUES 
    ('1466833236213891085', 'pauloviccs', 'super_admin', 'Fundador'),
    ('149567984597466064', 'pauloviccs', 'super_admin', 'Fundador')
ON CONFLICT (discord_id) DO UPDATE SET role = 'super_admin';

-- 5. STORAGE BUCKET PARA FICHAS EM PDF
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'character_sheets',
    'character_sheets',
    true,
    10485760,
    ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 6. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.character_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accio_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read applications" ON public.character_applications;
CREATE POLICY "Public read applications" ON public.character_applications FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert applications" ON public.character_applications;
CREATE POLICY "Public insert applications" ON public.character_applications FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public update applications" ON public.character_applications;
CREATE POLICY "Public update applications" ON public.character_applications FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public read settings" ON public.accio_settings;
CREATE POLICY "Public read settings" ON public.accio_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public upsert settings" ON public.accio_settings;
CREATE POLICY "Public upsert settings" ON public.accio_settings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public read user_roles" ON public.user_roles;
CREATE POLICY "Public read user_roles" ON public.user_roles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert user_roles" ON public.user_roles;
CREATE POLICY "Public insert user_roles" ON public.user_roles FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public update user_roles" ON public.user_roles;
CREATE POLICY "Public update user_roles" ON public.user_roles FOR UPDATE USING (true) WITH CHECK (true);

-- 7. STORAGE POLICIES
DROP POLICY IF EXISTS "Public read character_sheets" ON storage.objects;
CREATE POLICY "Public read character_sheets" ON storage.objects FOR SELECT USING (bucket_id = 'character_sheets');

DROP POLICY IF EXISTS "Public upload character_sheets" ON storage.objects;
CREATE POLICY "Public upload character_sheets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'character_sheets');

DROP POLICY IF EXISTS "Public update character_sheets" ON storage.objects;
CREATE POLICY "Public update character_sheets" ON storage.objects FOR UPDATE USING (bucket_id = 'character_sheets');

-- 8. REALTME PUBLICATION
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'accio_settings'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.accio_settings;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'user_roles'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.user_roles;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'character_applications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.character_applications;
    END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════
-- 9. PONTE SEGURA JOGO <-> SITE (ANTI-SPOOFING TICKETS & CÓDIGOS)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.server_join_tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    token_hash TEXT NOT NULL UNIQUE,
    discord_id TEXT NOT NULL,
    application_id UUID REFERENCES public.character_applications(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_server_join_tickets_discord_id
    ON public.server_join_tickets (discord_id);

CREATE INDEX IF NOT EXISTS idx_server_join_tickets_expires_at
    ON public.server_join_tickets (expires_at);

CREATE TABLE IF NOT EXISTS public.server_link_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    discord_id TEXT NOT NULL,
    application_id UUID REFERENCES public.character_applications(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_server_link_codes_discord_id
    ON public.server_link_codes (discord_id);

ALTER TABLE public.server_join_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.server_link_codes ENABLE ROW LEVEL SECURITY;

-- Nota: Nenhuma política SELECT/INSERT/UPDATE para anon ou authenticated.
-- Apenas a service_role do servidor consulta/consome tickets e códigos.

-- Remover assinatura antiga sem parâmetros para evitar ambiguidade RPC no PostgREST
DROP FUNCTION IF EXISTS public.issue_server_link_code();

-- RPC autenticada para gerar código único de vínculo/criação por ficha (ex.: ACCIO-A1B2C3D4)
CREATE OR REPLACE FUNCTION public.issue_server_link_code(p_application_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_uid UUID;
    v_discord_id TEXT;
    v_app_id UUID;
    v_app_status TEXT;
    v_char_name TEXT;
    v_house TEXT;
    v_dormitory TEXT;
    v_game_char_id BIGINT;
    v_code TEXT;
    v_expires_at TIMESTAMPTZ;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Sessão Discord não autenticada no site.' USING ERRCODE = '42501';
    END IF;

    SELECT COALESCE(
        (
            SELECT NULLIF(i.provider_id, '')
            FROM auth.identities i
            WHERE i.user_id = v_uid AND i.provider = 'discord'
            LIMIT 1
        ),
        NULLIF(u.raw_user_meta_data->>'provider_id', ''),
        NULLIF(u.raw_user_meta_data->>'sub', '')
    )
    INTO v_discord_id
    FROM auth.users u
    WHERE u.id = v_uid;

    IF v_discord_id IS NULL THEN
        RAISE EXCEPTION 'Nenhuma conta Discord vinculada foi encontrada na sessão.' USING ERRCODE = '42501';
    END IF;

    IF p_application_id IS NOT NULL THEN
        SELECT id, status, trim(first_name || ' ' || last_name), preferred_house, dormitory, game_character_id
        INTO v_app_id, v_app_status, v_char_name, v_house, v_dormitory, v_game_char_id
        FROM public.character_applications
        WHERE id = p_application_id
          AND discord_id = v_discord_id
        LIMIT 1;
    ELSE
        SELECT id, status, trim(first_name || ' ' || last_name), preferred_house, dormitory, game_character_id
        INTO v_app_id, v_app_status, v_char_name, v_house, v_dormitory, v_game_char_id
        FROM public.character_applications
        WHERE discord_id = v_discord_id
        ORDER BY
            (CASE WHEN game_character_id IS NULL THEN 0 ELSE 1 END),
            (CASE WHEN status = 'approved' THEN 0 ELSE 1 END),
            created_at DESC
        LIMIT 1;
    END IF;

    IF v_app_id IS NULL THEN
        RAISE EXCEPTION 'Nenhuma ficha correspondente a este Discord foi encontrada.' USING ERRCODE = 'P0002';
    END IF;

    IF v_game_char_id IS NOT NULL THEN
        RAISE EXCEPTION 'Esta ficha já está vinculada a um personagem criado no jogo (#%). Crie uma nova ficha no portal para outro personagem.', v_game_char_id USING ERRCODE = '23505';
    END IF;

    UPDATE public.server_link_codes
    SET used_at = NOW()
    WHERE discord_id = v_discord_id
      AND application_id = v_app_id
      AND used_at IS NULL;

    v_code := 'ACCIO-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    v_expires_at := NOW() + INTERVAL '30 minutes';

    INSERT INTO public.server_link_codes (code, discord_id, application_id, expires_at)
    VALUES (v_code, v_discord_id, v_app_id, v_expires_at);

    RETURN jsonb_build_object(
        'code', v_code,
        'expires_at', v_expires_at,
        'application_id', v_app_id,
        'application_status', v_app_status,
        'character_name', v_char_name,
        'preferred_house', v_house,
        'dormitory', v_dormitory
    );
END;
$$;

REVOKE ALL ON FUNCTION public.issue_server_link_code(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.issue_server_link_code(UUID) TO authenticated;
