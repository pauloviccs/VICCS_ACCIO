# Schema de Banco de Dados — VICCS Accio HL Server

> [!NOTE]
> Este documento será expandido conforme os resources forem desenvolvidos.
> A base inicial herda o schema do HMP Foundations (MySQL/MariaDB).

## Bancos de Dados

### 1. MySQL/MariaDB (Jogo — via `hmp-mysql` / Foundations v0.12.0)

Usado pelos resources do servidor para persistir dados de gameplay no schema `hogwartsmp` (`utf8mb4`).  
*(Ambiente local atual: XAMPP MariaDB `10.4.32` operando com todas as migrations; produção recomendada: MySQL `8.x` ou MariaDB `10.6+`.)*

#### Tabelas Ativas Criadas Automaticamente (37 tabelas, 17 migrations)

Gerenciadas por `hmp_schema_migrations` sem importação manual de DDL:
- **Core (`hmp-core`):** `hmp_accounts`, `hmp_account_identities`, `hmp_account_groups`, `hmp_account_metadata`, `hmp_characters`, `hmp_character_groups`, `hmp_character_metadata`
- **Casas (`hmp-houses`):** `hmp_house_memberships`, `hmp_house_membership_audit`, `hmp_house_standings`, `hmp_house_point_transactions`
- **Inventário & Bestas (`hmp-inventory`, `hmp-beasts`):** `hmp_inventory_items`, `hmp_inventory_containers`, `hmp_inventory_native`, `hmp_beast_bags`
- **Economia, Lojas, Empregos & Negócios (`hmp-banking`, `hmp-shops`, `hmp-jobs`, `hmp-business`):** `hmp_bank_accounts`, `hmp_bank_transactions`, `hmp_shop_stock`, `hmp_shop_transactions`, `hmp_job_employments`, `hmp_job_audit`, `hmp_business`, `hmp_business_shop`, `hmp_business_offer`, `hmp_business_audit`
- **Progressão, Mundo & Emotes (`hmp-progression`, `hmp-loot`, `hmp-worldstate`, `hmp-emotes`):** `hmp_progression_profiles`, `hmp_progression_talents`, `hmp_progression_rewards`, `hmp_progression_floo_flames`, `hmp_progression_field_guides`, `hmp_loot_takes`, `hmp_world_state`, `hmp_emote_aliases`
- **Administração (`hmp-admin`):** `hmp_admin_warnings`, `hmp_admin_bans`, `hmp_admin_audit`

#### Tabelas VICCS Fase 2 Ativas (5 tabelas via `MySQL.migrate`)

Criadas automaticamente pelos resources autorais no boot do servidor:
- **`viccs-core`:**
  - `viccs_audit` (`id`, `resource`, `action`, `actor_character_id`, `actor_name`, `target_character_id`, `reason`, `before_json`, `after_json`, `created_at`)
  - `viccs_era_state` (`id`, `era_id`, `academic_year`, `headmaster`, `term`, `updated_at`)
- **`viccs-characters`:**
  - `viccs_character_profiles` (`character_id` PK, `supabase_application_id` UNIQUE via `idx_viccs_profiles_app_unique`, `discord_id`, `full_name`, `birth_date`, `birth_place`, `blood_status`, `academic_year`, `patronus`, `character_backstory`, `house`, `secondary_house`, `hatstall`, `sorted_at`, `intro_completed`, `created_at`, `updated_at`)
  - `viccs_character_wands` (`character_id` PK, `wood`, `core`, `length`, `flexibility`, `handle_id`, `chosen_at`, `updated_at`)
- **`viccs-sorting`:**
  - `viccs_sorting_sessions` (`character_id` PK, `status`, `question_ids_json`, `option_tokens_json`, `current_index`, `scores_json`, `is_hatstall`, `primary_house`, `secondary_house`, `score_diff`, `started_at`, `completed_at`, `updated_at`)

#### Tabelas VICCS Custom (Fases 3–4 — A criar)

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
    pdf_url TEXT,                     -- Link público do pergaminho em PDF
    sorted_house TEXT,                -- Sincronizado pelo servidor após Chapéu Seletor
    secondary_house TEXT,
    is_hatstall BOOLEAN NOT NULL DEFAULT false,
    sorted_at TIMESTAMPTZ,
    game_character_id BIGINT
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

-- 4. Ponte Segura Jogo <-> Site (Anti-Spoofing Tickets & Códigos Direct Connect)
CREATE TABLE public.server_join_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash TEXT NOT NULL UNIQUE,
    discord_id TEXT NOT NULL,
    application_id UUID REFERENCES public.character_applications(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.server_link_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,        -- Ex.: ACCIO-A1B2C3D4
    discord_id TEXT NOT NULL,
    application_id UUID REFERENCES public.character_applications(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- RLS ativado sem políticas para anon/authenticated (acesso exclusivo via service_role).
-- RPC autenticada: public.issue_server_link_code() (SECURITY DEFINER, 10 min de validade).
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



### Migração v3 (`viccs-characters` -> MariaDB `viccs_character_profiles`)
- `robes_house VARCHAR(24) NULL`: última Casa sincronizada com as vestes escolares.
- `robes_applied TINYINT(1) NOT NULL DEFAULT 0`: indica se o uniforme escolar/vestes foi aplicado com sucesso no inventário nativo sem sobrescrever outros equipamentos manuais.
