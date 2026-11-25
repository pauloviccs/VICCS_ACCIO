# Schema de Banco de Dados — VICCS Accio HL Server

> [!NOTE]
> Este documento será expandido conforme os resources forem desenvolvidos.
> A base inicial herda o schema do HMP Foundations (MySQL/MariaDB).

## Bancos de Dados

### 1. MySQL/MariaDB (Jogo — via hmp-mysql)

Usado pelos resources do servidor para persistir dados de gameplay.

#### Tabelas Core (HMP Foundations)

```sql
-- Accounts e identidade
accounts (id, discord_id, created_at, last_login, banned, ban_reason)
characters (id, account_id, first_name, last_name, house, appearance_data, created_at)
character_positions (character_id, world, x, y, z, rotation)

-- Inventário
inventories (id, character_id, slot, item_id, quantity, metadata)

-- Economia
wallets (character_id, galleons, sickles, knuts)
transactions (id, from_character, to_character, amount, type, timestamp)

-- Casas
house_points (house, points, season)
house_cup_log (id, house, points_change, reason, awarded_by, timestamp)
```

#### Tabelas VICCS Custom (A criar)

```sql
-- Sistema de Magia
spells_learned (character_id, spell_id, mastery_level, learned_at)
spell_cooldowns (character_id, spell_id, available_at)

-- Progressão Acadêmica
academic_progress (character_id, subject_id, level, xp, grade)
class_attendance (id, character_id, class_id, attended_at, performance)

-- Missões
quest_progress (character_id, quest_id, stage, started_at, data)
quest_completions (id, character_id, quest_id, completed_at, rewards_given)

-- Crafting
recipes_known (character_id, recipe_id, discovered_at)
crafting_log (id, character_id, recipe_id, success, crafted_at)

-- Habitações
player_housing (id, character_id, location_id, furniture_data, unlocked_at)

-- Social
relationships (id, character_a, character_b, type, level, created_at)
owl_mail (id, from_character, to_character, subject, body, sent_at, read)

-- Beasts
beast_collection (id, character_id, beast_type, name, bonding_level, captured_at)
vivarium_state (character_id, vivarium_id, layout_data)
```

### 2. Supabase PostgreSQL (Plataforma — ACCIO_Rp)

> **Projeto Oficial:** `ACCIO_Rp` (ID/Ref: `siwjyavftankitbdagzo`)  
> **Organização:** `VICCS` (`viccssupabase0@gmail.com`)  
> **Região:** `sa-east-1` (São Paulo, Brasil) | **PostgreSQL:** 17.12

Usado pela plataforma web para pré-registro de pioneiros, admissão ministerial, gerenciamento de permissões RBAC, sincronização em tempo real e armazenamento de documentos em PDF.

#### Tabelas de Produção Ativas

```sql
-- 1. Candidaturas de Whitelist & Criação de Personagem
CREATE TABLE public.character_applications (
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
    blood_status TEXT NOT NULL,       -- 'pure-blood', 'half-blood', 'muggle-born'
    preferred_house TEXT NOT NULL,    -- 'gryffindor', 'slytherin', 'ravenclaw', 'hufflepuff'
    wand_wood TEXT NOT NULL,
    wand_core TEXT NOT NULL,          -- Pena de Fênix, Fibra de Coração de Dragão, etc.
    wand_length TEXT NOT NULL,        -- Ex: 11 polegadas
    wand_flexibility TEXT NOT NULL,   -- Flexível, Firme, Rígida, etc.
    wand_handle TEXT NOT NULL,        -- 11 famílias canônicas de Hogwarts Legacy
    patronus TEXT,
    character_backstory TEXT NOT NULL,-- Mínimo 3.000 palavras
    word_count INTEGER NOT NULL DEFAULT 0,
    rp_experience TEXT,
    rules_accepted BOOLEAN NOT NULL DEFAULT true,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected' (e 'revision_requested' previsto no frontend)
    reviewer_notes TEXT,
    reviewed_by TEXT,
    pdf_url TEXT                      -- Link público do pergaminho em PDF
);

-- Índices ativos:
-- idx_character_applications_discord_id (discord_id)
-- idx_character_applications_status (status)
-- idx_character_applications_created_at (created_at DESC)

-- 2. Configurações Globais & Realtime (Cronômetro Apple, Fases)
CREATE TABLE public.accio_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
-- Chaves padrão: 'countdown_timer' (target_date, days, hours, minutes, seconds)

-- 3. Controle de Acesso Baseado em Cargos (RBAC)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    discord_id TEXT NOT NULL UNIQUE,
    discord_username TEXT NOT NULL,
    discord_avatar TEXT,
    role TEXT NOT NULL DEFAULT 'user', -- 'user', 'student', 'mod', 'admin', 'super_admin'
    assigned_by TEXT DEFAULT 'Sistema'
);
```

#### Storage Buckets (Supabase Storage)

* **`character_sheets`** (Público, limite de 10 MB, tipos permitidos: `application/pdf`): Armazena as fichas de matrícula geradas em PDF estilo pergaminho envelhecido, permitindo download tanto pelos alunos quanto pela moderação.

#### Segurança (RLS) & Publicações Realtime

* **RLS Ativo:** Políticas configuradas para leitura pública de contadores e submissão segura de candidaturas.
* **Publicação `supabase_realtime`:** Ativa para `accio_settings`, `user_roles` e `character_applications`, garantindo atualização instantânea via WebSockets para todos os clientes conectados quando um admin ajusta o cronômetro ou altera um status.

## Convenções

- **Nomes de tabelas**: snake_case, plural
- **PKs**: `id` (INT AUTO_INCREMENT ou UUID)
- **FKs**: `{entidade}_id` referenciando a PK da tabela
- **Timestamps**: `created_at`, `updated_at` com DEFAULT CURRENT_TIMESTAMP
- **Soft deletes**: campo `deleted_at` NULLABLE quando necessário
- **JSON data**: tipo TEXT com JSON serializado para dados flexíveis (appearance, furniture, layout)

