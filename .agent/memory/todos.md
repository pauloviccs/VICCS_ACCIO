# TODO List — VICCS Accio HL Server

## Fase 0 — Biblioteca de Contexto & Governança ✅
- [x] Criar `.agent/context/architecture.md`
- [x] Criar `.agent/context/stack.md`
- [x] Criar `.agent/context/database_schema.md`
- [x] Criar `.agent/guidelines/code_style.md`
- [x] Criar `.agent/guidelines/ui_ux.md`
- [x] Criar `.agent/guidelines/resource_conventions.md`
- [x] Criar skills de desenvolvimento (`wand-asset-artisan.md` + SOPs Arcane MP)
- [x] Criar planos de implementação
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
- [ ] Conectar banco de gameplay com o pipeline de contas aprovadas no Supabase
- [ ] Endurecer políticas RLS do Supabase e atualizar banco para MySQL 8.x / MariaDB 10.6+ antes da abertura pública em larga escala

## Fase 2 — Core Resources ⏳
- [ ] Desenvolver `viccs-core` (identidade, permissões, API compartilhada)
- [ ] Desenvolver `viccs-ui` (componentes visuais padrão CEF "Wizarding Elegance")
- [ ] Desenvolver `viccs-characters` (sincronização de aparência e varinhas do site para o jogo)
- [ ] Configurar sistema de eventos cross-resource (`viccs:{resource}:{acao}`)

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
