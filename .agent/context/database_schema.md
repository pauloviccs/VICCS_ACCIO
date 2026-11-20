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

### 2. Supabase PostgreSQL (Plataforma)

Usado pelo website, painel admin web, e serviços externos.

```sql
-- Perfis públicos (ligados ao Supabase Auth)
profiles (id, user_id, display_name, avatar_url, linked_account_id)

-- Logs e analytics
server_logs (id, event_type, actor, details, timestamp)
player_sessions (id, account_id, connected_at, disconnected_at, duration)

-- Conteúdo do Website
news_posts (id, title, content, author_id, published_at, featured)
server_rules (id, category, content, version, updated_at)

-- Aplicações de Whitelist (se aplicável)
whitelist_applications (id, user_id, character_name, backstory, status, reviewed_by)
```

## Convenções

- **Nomes de tabelas**: snake_case, plural
- **PKs**: `id` (INT AUTO_INCREMENT ou UUID)
- **FKs**: `{entidade}_id` referenciando a PK da tabela
- **Timestamps**: `created_at`, `updated_at` com DEFAULT CURRENT_TIMESTAMP
- **Soft deletes**: campo `deleted_at` NULLABLE quando necessário
- **JSON data**: tipo TEXT com JSON serializado para dados flexíveis (appearance, furniture, layout)

