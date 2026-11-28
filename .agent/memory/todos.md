# TODO List — VICCS Accio HL Server

## Fase 0 — Biblioteca de Contexto & Governança ✅

- [x] Criar `.agent/context/architecture.md`
- [x] Criar `.agent/context/stack.md`
- [x] Criar `.agent/context/database_schema.md`
- [x] Criar `.agent/guidelines/code_style.md`
- [x] Criar `.agent/guidelines/ui_ux.md`
- [x] Criar `.agent/guidelines/resource_conventions.md`
- [x] Criar skills de desenvolvimento (`wand-asset-artisan.md` + SOPs Arcane MP + 4 skills do GDD/Chapéu Seletor + `visual-consistency-and-magic-motion.md`)
- [x] Atualizar `ui_ux.md` e `create-ui-panel.md` com o padrão visual `website/` + ArcaneMP + HL native assets (`Web.createView`/`callEvent`)
- [x] Mapear APIs reais dos 30 módulos HMP Foundations `v0.12.0` e regras de ecossistema em `.agent/context/arcanemp-scripting-foundations.md`
- [x] Criar planos de implementação (`master-plan.md` e `phase-2-core-resources-plan.md`)
- [x] Criar e sincronizar `.agent/overview/PROJECT_STATUS.md`

## Plataforma Web & Pré-Registro (Entregue Antecipadamente) ✅

- [x] Scaffolding do projeto web com Vite 6, React 19, TypeScript e Tailwind CSS v4 (`website/`)
- [x] Modal interativo da Carta de Hogwarts abrindo em perspectiva 3D na primeira visita (`HogwartsLetterModal`)
- [x] Autenticação OAuth2 via Discord associada ao pré-registro oficial
- [x] Estandartes 3D das Quatro Casas com WebGL Three.js e física de tecido (`CastleBanners3D`)
- [x] Criação de personagem em 4 etapas no padrão de Hogwarts Legacy (`WhitelistFormModal`)
- [x] 11 famílias canônicas de cabos de varinhas recortadas em PNG transparente (`public/wands/cutouts/`)
- [x] Pedestal cinematográfico de inspeção com modos `3D Macro` e `Guia de Campo`
- [x] Seletores canônicos de Garrick Ollivanders (madeira, núcleos, comprimento e flexibilidade)
- [x] Motor universal de cores e temas dinâmicos das 4 Casas (`data-house-theme`)
- [x] Cronômetro Apple responsivo com roleta animada sincronizado via Realtime (`AppleTimerModal`)
- [x] Engine de áudio com SFX procedurais (Web Audio API) e player MP3 de 6 faixas (`MusicPlayerWidget`)
- [x] Gerador de pergaminho oficial de admissão em PDF (`jsPDF` + `html2canvas`) e upload em `character_sheets`
- [x] Webhook Discord com Rich Embed diagramado formatado para cada nova submissão (`discordWebhook.ts`)
- [x] Migração oficial do banco de dados Supabase no projeto `ACCIO_Rp` (`siwjyavftankitbdagzo`) via `scripts/migration_accio_rp.sql`
- [x] Controle de acesso RBAC (`user`, `student`, `mod`, `admin`, `super_admin`) e Painel Ministerial (`AdminPanelModal`)
- [x] Auditoria e sincronização completa de documentação (`README.md`, `website/README.md`, `.agent/`)

## Fase 1 — Setup do Servidor Arcane MP ✅ (Ambiente Local Operacional)

- [x] Instalar Arcane MP Server (`1.15.1` / Framework `44.1.1`) no diretório `server/` e launcher em `client/`
- [x] Configurar `server.json` (porta `27016` UDP/TCP local para evitar conflito com Apple Devices em `27015`, `maxplayers: 32`)
- [x] Configurar banco MariaDB local (`hogwartsmp` via `hmp-mysql` + usuário dedicado)
- [x] Instalar HMP Foundations `v0.12.0` (30 resources `hmp-*`) e validar carregamento + migrations (37 tabelas)
- [x] Criar painel gerenciador `Accio_Server_Manager.bat` com opções de Super Admin, backup e logs
- [x] Testar inicialização local e conexão do cliente no servidor
- [ ] Configurar Supabase CLI local (`supabase/`) se necessário para edge functions/migrations
- [ ] Endurecer políticas RLS do Supabase e atualizar banco para MySQL 8.x / MariaDB 10.6+ antes da abertura pública em larga escala

## Fase 2 — Core Resources, Ponte Universal, Visual & PT-BR 🟡 (Implementado · Em Validação Ao Vivo)

- [x] Desenvolver `viccs-core` (identidade, `EraGate`, `ticketBridge`, auditoria, `safeImport` e eventos compartilhados)
- [x] Desenvolver `viccs-ui` (kit visual `tokens.css`, `ornaments.js`, Pergaminho, Fade, Olho Mágico `Alt`, Livro do Jogador `Esc` e sincronia de tema por casa)
- [x] Desenvolver `viccs-characters` (perfis, 11 famílias de varinhas, ponte Supabase e pré-preenchimento do criador)
- [x] Desenvolver `viccs-sorting` (motor do Chapéu Seletor com 12 dilemas, Hatstall `< 1.6`, persistência `viccs_sorting_sessions` e integração `hmp-houses`)
- [x] Construir Ponte Universal do Ecossistema (`viccs-core/server/ecosystemBridge.js`) conectando os 30 `hmp-*` e 4 `viccs-*`
- [x] Aplicar design system `viccs-ui` / ArcaneMP nas 7 WebViews CEF do `hmp-*` (`hmp-ui`, `hmp-spawn`, `hmp-characters`, `creator.js`, `hmp-inventory`, `hmp-emotes`, `hmp-business`)
- [x] Localizar 100% das interfaces, scripts `hmp-*` (`server.js` / `client.js`) e dados/catálogos de `server/data/` para PT-BR
- [x] Implementar trava anti-loop de áudio pós-Chapéu Seletor (`resolveAudioCue` one-shot + `stopPlayerAudio` em `viccs-ui`)
- [x] Implementar fluxo automático contínuo pós-spawn (`Fade` → `viccs-sorting` → `Fade` → Ficha/Varinha → Olho Mágico `Alt`)
- [x] Implementar ponte segura anti-spoofing Site ↔ Jogo (`server_join_tickets`, `server_link_codes`, RPC `issue_server_link_code`, `TicketModal.tsx`, `ticketBridge.js`, `idx_viccs_profiles_app_unique` e sync `sorted_*`)
- [ ] Configurar `server/data/viccs-core.json` e `server/data/viccs-characters.json` + garantir aplicação de `scripts/migration_accio_rp.sql` no `ACCIO_Rp`
- [ ] Validar em cliente gráfico ao vivo (áudio pós-Chapéu Seletor, vínculo `ACCIO-*`, pré-preenchimento do criador e todas as WebViews PT-BR)

## Fase 3 — Sistemas de Gameplay ⏳

- [ ] `viccs-spells` (magias customizadas, cooldowns e partículas)
- [ ] `viccs-inventory` (inventário com slots de varinha e cabos)
- [ ] `viccs-economy` (sistema econômico de Galeões, Sicles e Knuts)
- [ ] `viccs-combat` (PvP e PvE com duelos formais)
- [ ] `viccs-classes` (aulas acadêmicas, matérias e pontuação das Casas)
- [ ] `viccs-quests` (missões dinâmicas e chains)

## Fase 4 — Mundo e Imersão ⏳

- [ ] `viccs-world` (clima dinâmico, ciclo dia/noite, estações)
- [ ] `viccs-npc` (NPCs com inteligência, schedules e diálogos)
- [ ] `viccs-beasts` (criaturas mágicas e vivários)
- [ ] `viccs-housing` (acomodações comunais e casas de jogadores)
- [ ] `viccs-crafting` (herbologia e caldeirões de poções)
- [ ] `viccs-social` (chat RP por proximidade, emotes e correio coruja)

## Fase 5 — Administração e Integração Plataforma ⏳

- [ ] `viccs-admin` (painel in-game para moderação e anti-cheat server-side)
- [ ] Mover Webhook URL do Discord (`constants.ts`) para Supabase Edge Function / variável server-side segura

## Fase 6 — Polish e Launch ⏳

- [ ] Testes de carga e stress testing
- [ ] Balanceamento geral de feitiços e economia
- [ ] Beta fechado para pioneiros pré-registrados
- [ ] Lançamento público oficial

## Imersão, Controles & Fluxo Pós-Spawn Fase 2 (Concluído em 2026-11-27) ✅

- [x] Governança imersiva (`Alt` vs `Esc` e 6 perguntas) propagada para Fases 2 a 6 em `.agent/`
- [x] `viccs-core`: snapshot do Livro do Jogador, análise de vestes (`summarizeRobesInventory`) e serviços `'book'` / `'reapply-robes'`
- [x] `viccs-ui`: `Alt` Olho Mágico (`handler(physicalKey, state)`, `alt`/`lalt`/`ralt` com debounce e revalidação server-side)
- [x] `viccs-ui`: `Esc` Livro do Jogador (`injectFrameCorners` corrigido em `book/app.js`, pré-aquecimento no `worldReady`, `Game.setPauseMenuEnabled(false)` e bypass `F10`)
- [x] `viccs-characters`: `applyUnaffiliatedOnJoin` (`Outfit_001_Basic` + `Back_001_Basic` antes da Seleção), separação `inventory.patch` (`give`) + `gear.equip` (`variation`) e `PlayerManager.getById`
- [x] `viccs-sorting`: correção `PlayerManager.getById`, teleporte automático para o Salão Principal (`FT_HW_GreatHall` via `player.fastTravel` + fallback) e início automático do Chapéu Seletor pós-criação
- [x] Validação automatizada completa pós-edição (`31/31` testes `node --test`, `node --check` em todos os `.js` e JSONs válidos)
- [ ] Teste funcional in-game ao vivo no ArcaneMP local (`127.0.0.1:27016`)
- [ ] Fase 3 (`viccs-houses` — Sala Comunal, Quadro de Pontos e Eventos de Casa integrados ao `book.registerPageProvider` e `eye.registerTargetProvider`)
