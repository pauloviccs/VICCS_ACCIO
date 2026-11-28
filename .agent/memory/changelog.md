# Changelog — VICCS Accio HL Server

## [0.3.4] — 2026-11-27

### Sincronização Completa de Overview, Memória & Schema
- **Cortex `.agent/` & `README.md`:**
  - Consolidado o estado pós-checkpoint `v.0.1.a` (`eb29533`) em `.agent/overview/PROJECT_STATUS.md`, `.agent/memory/active_task.md`, `.agent/memory/todos.md` e `README.md`.
  - Integrada a migração v3 de `viccs_character_profiles` (`robes_house`, `robes_applied`) diretamente na listagem de tabelas de `.agent/context/database_schema.md`.
  - **Verificação:** `31/31` testes em `node --test`, `33/33` arquivos `.js` (`viccs-*`) no `node --check`, `39/39` JSONs válidos e `npx tsc --noEmit` aprovado em `website/`.

---

## [0.3.3] — 2026-11-27

### Correções de Runtime ao Vivo (Fase 2): `Alt`, `Esc`, Salão Principal e Vestes Iniciais
- **`viccs-ui` (`client/main.js`, `ui/book/app.js`, `ui/ornaments.js`, `server/main.js`):**
  - Corrigido o handler de atalho do Olho Mágico (`Alt`) para ler `(physicalKey, state)` emitidos por `hmp-lib` (em vez de `event.state`), registrando `alt`, `lalt` e `ralt` com janela anti-duplicação (`80ms`).
  - Corrigido `Uncaught TypeError` em `ui/book/app.js` substituindo `ViccsOrnaments.attachCorners(panel)` por `ViccsOrnaments.injectFrameCorners(panel)` (com alias em `ornaments.js`), pré-aquecimento das views no `worldReady` e watchdog anti-travamento em `openBookOverlay`.
  - Substituído `PlayerManager.byId` por `resolveOnlinePlayer` usando `PlayerManager.getById`.
- **`viccs-characters` (`config/default.json`, `server/service.js`, `server/handlers.js`):**
  - Habilitado uniforme escolar neutro automático (`applyUnaffiliatedOnJoin: true`) com `Outfit_001_Basic` e `Back_001_Basic` antes da Seleção (`Unaffiliated`), atualizando automaticamente para as cores da Casa após o veredito sem sobrescrever roupas personalizadas já equipadas.
  - Separado `op: 'give'` (`player.inventory.patch`) de `op: 'equip'` (`player.gear.equip` com `variation`), evitando `Unknown inventory patch operation` no host nativo, e corrigido `PlayerManager.byId` → `PlayerManager.getById`.
- **`viccs-sorting` (`config/default.json`, `server/handlers.js`) & `viccs-core` (`server/service.js`):**
  - Adicionada configuração `ceremonyLocation` (`fastTravelId: "FT_HW_GreatHall"`, suporte opcional a `coordinates`, `timeoutMs: 12000`, `settleMs: 450`, `alreadyThereRadiusCm: 3000`).
  - Corrigido `PlayerManager.byId` → `PlayerManager.getById` no evento `viccs:characters:onboardingReady` e implementado transporte automático ao Salão Principal (`player.setFastTravelUnlocked` + `player.fastTravel('FT_HW_GreatHall')` + `playerFastTravelComplete`) com cortina de fade antes de abrir o Chapéu Seletor.
  - Atualizado `summarizeRobesInventory` para exibir o status do uniforme neutro equipado no Livro do Jogador.
- **Verificação:** `node --check` em todos os `.js`, validação JSON e `31/31` testes em `node --test` aprovados (incluindo testes VM/DOM de `book/app.js`, atalhos `lalt`/`alt`/`escape`, uniforme `unaffiliated` + `gear.equip` e fluxo `onboardingReady` → `FT_HW_GreatHall` → Sorting Hat).

---

## [0.3.2] — 2026-11-27

### Regras de Imersão, Controles (`Alt` vs `Esc`), Vestes & Recuperação
- **Governança (Fases 2–6):** Regras de `server/.agent/scripting/regras-de-implementacao-experiencia-imersiva-accio.md` integradas em `.agent/global-rules/rules.md`, `.agent/guidelines/ui_ux.md`, `.agent/guidelines/resource_conventions.md`, `.agent/skills/create-ui-panel.md`, `phase-2-core-resources-plan.md` e `master-plan.md`.
- **`viccs-core`:** Implementado `getPlayerBookSnapshot`, `summarizeRobesInventory`, enriquecimento real de `inventory` em `getPlayerContext`, e `openService` para `'book'` e `'reapply-robes'`.
- **`viccs-ui`:**
  - Refatorado `Alt` (**Olho Mágico**) em `ui/eye/*` + `client/main.js` + `server/main.js` como retícula central pura de mundo (não bloqueia câmera/controles, não abre menu geral de sistemas, revalida `available`/`unavailable`/`blocked` no servidor, extensível por `eye.registerTargetProvider`).
  - Criado `Esc` (**Livro do Jogador**) em `ui/book/*` substituindo o Field Guide nativo via `Game.setPauseMenuEnabled(false)`, preservando acesso seguro às configurações do jogo (`F10`), atualizando por eventos reais e extensível por `book.registerPageProvider`.
- **`viccs-characters` & `viccs-sorting`:** Corrigido `pushCreatorPrefill` (`first_name`/`last_name`), adicionada migração v3 (`robes_house`, `robes_applied`) e `planHouseRobePatch` não-destrutivo (`Outfit_001_Basic` / `Back_001_Basic` + botão **"Reaplicar Vestes da Casa"** no Livro), pausa/retomada sem reroll no Chapéu Seletor e saída segura no vínculo.
- **Verificação:** `27/27` testes unitários (`viccs-core`: 9, `viccs-ui`: 8, `viccs-characters`: 5, `viccs-sorting`: 5), `node --check` em todos os `.js` dos 4 resources e validação de `13` arquivos JSON.

---

## [0.3.1] — 2026-11-27

### Ponte Anti-Spoofing Site ↔ Jogo, Áudio One-Shot & Fluxo Seamless da Fase 2
- **Ponte Segura Direct Connect & Sincronia Bidirecional (`scripts/migration_accio_rp.sql`, `website/`, `viccs-core`, `viccs-characters`):**
  - Adicionadas colunas `sorted_house`, `secondary_house`, `is_hatstall`, `sorted_at` e `game_character_id` em `public.character_applications` (e tipagem em `website/src/types.ts`) para registrar o veredito oficial do Chapéu Seletor de volta no portal web.
  - Criadas as tabelas server-only `public.server_join_tickets` e `public.server_link_codes` (RLS sem políticas `anon`/`authenticated`) e a RPC `public.issue_server_link_code()` emitindo códigos únicos `ACCIO-*` (validade de 10 minutos).
  - Atualizado `website/src/components/TicketModal.tsx` e `website/src/lib/supabase.ts` (`issueServerLinkCode`) com emissão e cópia do Código de Embarque In-Game.
  - Implementado resgate seguro em `viccs-core/server/ticketBridge.js`, modal CEF `viccs-characters/ui/link/index.html`, proteção anti-duplicidade `idx_viccs_profiles_app_unique` + colunas `full_name`, `character_backstory`, `intro_completed` (`viccs-characters/server/database.js` v2) e bloqueio de reaproveitamento de ficha entre personagens (`isApplicationClaimedElsewhere`).
- **Correção Anti-Loop de Áudio (`viccs-ui`):**
  - Adicionado `resolveAudioCue()` com `SUSTAIN_LOOP_BLACKLIST` (`accio`, `accio_cast` → `stinger`), limite de duração (`maxCueDurationSeconds: 3`) e encerramento do handle prévio (`stopPlayerAudio`) antes de novos cues Wwise.
- **Cascata Automática Pós-Spawn (`viccs-characters` + `viccs-sorting` + `viccs-ui`):**
  - Encadeamento automático sem comandos: `hmp:spawn:complete` → `viccs:characters:onboardingReady` → `Fade` → `viccs-sorting` → `viccs:sorting:closed` → `Fade` → Ficha Ministerial (`wand` tab) → aviso de boas-vindas com o Olho Mágico (`[ALT]`).
- **Verificação:** `19/19` testes unitários passando em `node --test server/resources/viccs-*/test/service.test.js` e `npx tsc --noEmit` aprovado sem erros em `website/`.

---

## [0.3.0] — 2026-11-26

### Fase 2 — Core Resources VICCS, Ponte Universal, Visual ArcaneMP & Localização PT-BR
- **4 Resources Autorais VICCS Implementados (`server/resources/viccs-*` + `server/data/viccs-*.example.json`):**
  - **`viccs-core`:** Config em camadas (`config/default.json` + override em `data/`), `EraGate`, `Registry`, `safeImport`, auditoria (`viccs_audit` + `viccs_era_state`), `ticketBridge`, event bus (`server/events.js`) e **Ponte Universal do Ecossistema** (`server/ecosystemBridge.js`).
  - **`viccs-ui`:** Sistema visual compartilhado em CEF (`ui/tokens.css`, `ui/ornaments.js`, emblemas das 4 Casas, 11 cutouts e 11 sketches de varinhas, fontes locais `Cinzel` e `Spectral`), componentes Pergaminho (`ui/parchment/`), Fade (`ui/fade/`), Olho Mágico via tecla `Alt` (`ui/eye/`) e broadcast reativo `viccs:theme:changed`.
  - **`viccs-characters`:** Gestão de perfis (`viccs_character_profiles`), varinhas (`viccs_character_wands`), bridge com Supabase (`server/supabaseBridge.js`), tela de vínculo (`ui/link/index.html`) e envio de pré-preenchimento para o criador nativo (`hmp-creator:prefill`).
  - **`viccs-sorting`:** Motor *Fail-Proof* do Chapéu Seletor (`viccs_sorting_sessions`, 12 dilemas, Fisher-Yates, limiar de Hatstall `< 1.6`, trava contra troca de personagem durante a cerimônia via `hmp:character:may-switch` e atribuição em `hmp-houses`).
- **Ponte Universal do Ecossistema (`viccs-core/server/ecosystemBridge.js`):**
  - Integração modular e lazy (`getApi`) entre todos os **30 módulos `hmp-*`** e **4 módulos `viccs-*`** sem warnings de dependência ausente, com `getPlayerContext(player)`, `openService(player, target)`, espelhamento `hmp:*` → `viccs:ecosystem:*` e encaminhamento opcional para `hmp-webhooks`.
  - Expansão do Olho Mágico (`viccs-ui/server/service.js` e `main.js`) para oferecer atalhos contextuais sem comandos (`banking`, `jobs`, `business`, `beasts`, `link`, `duel-accept`).
- **Unificação Visual das 7 WebViews HMP & Correção do Criador:**
  - Aplicados tokens `viccs-ui/ui/tokens.css`, cantos SVG `ViccsOrnaments.injectFrameCorners`, botões chanfrados `--bevel` e escuta de `viccs:theme` em `hmp-ui/dist/index.html`, `hmp-spawn/dist/index.html`, `hmp-characters/dist/index.html`, `hmp-characters/dist/creator.html` + `creator.js`, `hmp-inventory/dist/index.html`, `hmp-emotes/dist/menu.html` (removida dependência externa Google Fonts) e `hmp-business/dist/index.html`.
  - Corrigido erro de sintaxe residual em `hmp-characters/dist/creator.js` próximo ao handler de `hmp-creator:snapshot`.
- **Tradução Completa para Português Brasileiro (PT-BR):**
  - Localizados UIs, notificações, menus contextuais, alertas, interações `[F]` e respostas de chat nos módulos `hmp-characters`, `hmp-spawn`, `hmp-interact`, `hmp-doors`, `hmp-audio`, `hmp-blips`, `hmp-worldstate`, `hmp-lib`, `hmp-inventory`, `hmp-banking`, `hmp-shops`, `hmp-beasts`, `hmp-duels`, `hmp-houses`, `hmp-jobs`, `hmp-emotes`, `hmp-activities`, `hmp-pvp`, `hmp-spells`, `hmp-progression`, `hmp-loot`, `hmp-npcs`, `hmp-business`, `hmp-admin` e `hmp-webhooks`.
  - Localizados catálogos e mensagens visíveis em `server/data/` (`hmp-core.json`, `hmp-inventory.json`, `hmp-shops.json`, `hmp-business.json`, `hmp-spells.json`, mantendo `hmp-characters.json` e `hmp-spawn.json` em PT-BR).
- **Verificação:** `31/31` JSONs válidos, `89/89` arquivos JS aprovados no `node --check`, `19/19` testes unitários passando em `node --test` e boot real de `ArcaneMPServer.exe` com `34/34` resources JS iniciados e zero erros.

---

## [0.2.1] — 2026-11-26

### Arquitetura ArcaneMP, Ecossistema & Novas Skills (`.agent/`)
- **Mapeamento Real do Runtime ArcaneMP `1.15.1` + HMP Foundations `v0.12.0`:**
  - Criado `.agent/context/arcanemp-scripting-foundations.md` documentando todos os 30 resources `hmp-*`, suas prioridades (`-1000` a `-250`), exports reais e primitivas (`Imports.get`, `Exports.register`, `MySQL.migrate`, `Events.onClient`, `Events.emitServer`, `Hmp.config`, `Hmp.input`, `Hmp.rateLimit`, `Spells.define`).
  - Atualizados `.agent/global-rules/rules.md`, `.agent/guidelines/resource_conventions.md`, `.agent/skills/create-resource.md` e `.agent/skills/inter-resource-communication.md` com contrato universal do ecossistema, `status()` obrigatório, `safeImport` com degradação graciosa e configs com override em `server/data/viccs-*.json`.
- **Novas Skills Extraídas do GDD (`hogwarts-rp-gdd.md`) & Spec do Chapéu Seletor (`especifica_o_t_cnica_sistema_chap_u_seletor.md`):**
  - `.agent/skills/sorting-hat-system.md` — Motor *Fail-Proof* do Chapéu Seletor (`HouseKey`, pesos anti-gaming, Fisher-Yates, detecção de Hatstall `< 1.6`, persistência anti-reroll e cascata `viccs:sorting:completed`).
  - `.agent/skills/diegetic-immersion-and-adapter.md` — Separação `service.js` puro vs adapter, imersão diegética sem UI de videogame e escada de fidelidade L0 → L1 → L2.
  - `.agent/skills/canon-era-and-calendar.md` — Política de cânone Tiers A–F, `EraGate` configurável (reconciliado com era anos 2000 do servidor) e relógio escolar `viccs-clock`.
  - `.agent/skills/pottermore-gameplay-loops.md` — Loops em 3 escalas, sinergias obrigatórias, `viccs-housecup`, `viccs-moments`, `viccs-discipline`, `viccs-collectibles`, `viccs-prophet`, `viccs-director` e DoD unificado.
  - `.agent/skills/visual-consistency-and-magic-motion.md` — Consistência visual unificada (`website/src/index.css` + `ArcaneOrnaments.tsx` + ArcaneMP + HL native assets via `hmp-inventory`, `hmp-characters`, `hmp-audio`) e coreografia de animações mágicas suaves (`--ease-arcane`, `title-glint`, `[data-house-theme]`).
  - Atualizados `.agent/guidelines/ui_ux.md`, `.agent/skills/create-ui-panel.md` (bridge real ArcaneMP `Web.createView` / `Web.emit` / `callEvent` + template visual espelhado do `website/`) e `.agent/global-rules/rules.md`.
- Sincronizado `.agent/overview/PROJECT_STATUS.md`, `README.md` e `.agent/implementation-plans/master-plan.md`.

---

## [0.2.0] — 2026-11-25

### Servidor ArcaneMP (`server/` + `client/`)
- **Base do Servidor Instalada e Aberta Localmente:**
  - Extraídos os binários oficiais **ArcaneMP `1.15.1`** (`b8ce055`, Framework `44.1.1`) em `server/` (`ArcaneMPServer.exe`, `crashpad_handler.exe`, `libnode.dll`) e em `client/` (`ArcaneMPLauncher.exe`).
  - Instalado pacote oficial **HMP Foundations `v0.12.0`** com todos os 30 resources `hmp-*` em `server/resources/` e 26 configurações em `server/data/` (+ `hmp-mysql.example.json`).
  - Reparadas tabelas de sistema Aria corrompidas no XAMPP local (`mysql.db`, `mysql.procs_priv`), criado usuário dedicado `hogwartsmp` e gravadas credenciais em `server/data/hmp-mysql.json`.
  - Validada criação automática das 37 tabelas e 17 migrations em `hogwartsmp`.
  - Resolvido conflito de download de `.fwpak` causado pelo `AppleMobileDeviceProcess.exe` na porta `127.0.0.1:27015`: alterada a porta do servidor para **`27016`** (UDP+TCP) em `server/server.json` e adicionada checagem automática de conflito de porta.
  - Criado painel gerenciador **`server/Accio_Server_Manager.bat`** (`server/server-manager.ps1`) com menu amigável, boot com Super Admin (`HMP_ADMIN_BOOTSTRAP_SECRET`), gestão de contas/cargos `admin`, backups `mysqldump`, editor de `server.json` e filtro de logs.
  - Atualizado `.gitignore` para proteger binários, pacotes `hmp-*`, `.packages/`, `backups/`, `.admin-secret.local`, `server.json`, `data/*.json` e `client/`.

### Plataforma Web (`website/` -> `accio_rp_website.git`)
- Atualizada lore para os anos 2000 (Diretor Aurelian Vale Diggory), corrigida renderização de avatar do Discord no header, removido isotipo da navbar, ajustado padding das camadas `.frame` e aplicada imagem hero full-bleed (`logohigh_4x.jpg`) com profundidade sutil ao movimento do ponteiro.
- Integrados os emblemas oficiais das quatro Casas (`public/assets/emblemas/*.png`) nos componentes da UI e no `CastleBanners3D.tsx` em proporção 1:1 sem distorção, com recorte real em alfa na cauda em V e textura de relevo têxtil (`bumpMap`).
- Subtree `website/` sincronizado com `https://github.com/pauloviccs/accio_rp_website.git` (commit `94e26d8`).

---

## [0.1.1] — 2026-11-25

### Documentação & Sincronização
- **Auditoria e Sincronização Completa do Cortex `.agent/` e READMEs:**
  - Atualizado `.agent/overview/PROJECT_STATUS.md` com a árvore real de arquivos do projeto (todos os 14 componentes de `website/src/components/`, `website/public/audio/` com 6 faixas MP3, `website/public/wands/` com 83 `.webp` + 11 cutouts `.png`, `website/src/types.ts` e remoção de dependências não instaladas como `DOMPurify`).
  - Atualizados `.agent/context/architecture.md` e `.agent/context/stack.md` substituindo referências antigas de "Next.js/Astro" pela stack real em produção (`React 19 + Vite 6 + TypeScript + Tailwind CSS v4 + Three.js + jsPDF + html2canvas`).
  - Atualizado `.agent/context/database_schema.md` para documentar os índices SQL ativos de `character_applications` e alinhar os estados de aplicação (`pending`, `approved`, `rejected`, `revision_requested`).
  - Atualizado `.agent/implementation-plans/master-plan.md` marcando a entrega antecipada da Plataforma Web de Pré-Registro e Painel Admin Web.
  - Reescrito `website/README.md` e atualizado `README.md` na raiz com instruções, schema e arquitetura reais.

---

## [0.1.0] — 2026-11-23

### Adicionado
- **Plataforma Web de Pré-Registro Completa (`website/`):**
  - Aplicação construída com React 19, Vite 6, TypeScript e Tailwind CSS v4.
  - Animação da Carta de Convocação de Hogwarts em 3D com selo de cera lacrado.
  - Autenticação OAuth2 via Discord conectada ao fluxo de emissão do bilhete de pioneiro.
  - Estandartes 3D das quatro Casas em Three.js com simulação física de vento em tecido e iluminação de tochas medievais.
  - Motor universal de temas dinâmicos das Quatro Casas com transição suave, adaptando fundos, letterings, partículas e botões.
  - Criação de personagem no padrão de console de Hogwarts Legacy com 11 famílias de cabos de varinhas recortadas em PNG transparente (remoção de arrasto nativo de mouse).
  - Pedestal cinematográfico com alternador entre `3D Macro` e `Guia de Campo` (pergaminho do século XIX).
  - Seletores canônicos de dormitórios (`Bruxo/Wizard` vs `Bruxa/Witch`), linhagens arcanas e núcleos de Garrick Ollivanders.
  - Gerador de pergaminho oficial de matrícula em PDF estilizado (`jsPDF` + `html2canvas`) e upload automático para o Supabase Storage (`character_sheets`).
  - Cronômetro Apple Timer responsivo com roleta inspirada no iOS para controle do prazo de pré-registro (61 dias em `constants.ts` / até `2027-01-21`) com suporte a Realtime WebSockets.
  - Reprodutor de trilha sonora orquestral (`MusicPlayerWidget`) com 6 faixas MP3 e efeitos sonoros procedurais via Web Audio API (`soundManager`).
  - Painel Administrativo Ministerial (`AdminPanelModal`) com revisão de candidaturas e gestão de cargos RBAC.
  - Disparo de notificações diagramadas via Webhook Ministerial no Discord a cada novo registro.
  - Skill permanente documentada: `wand-asset-artisan.md` cobrindo a taxonomia das 11 famílias de varinhas de HL.

### Corrigido & Migrado
- **Migração do Banco de Dados Supabase Oficial (`ACCIO_Rp`):**
  - Corrigido o apontamento para o projeto oficial `ACCIO_Rp` (`siwjyavftankitbdagzo`) da organização `VICCS`.
  - Criadas e ativadas as tabelas `character_applications`, `accio_settings` e `user_roles` via `scripts/migration_accio_rp.sql`.
  - Configurado o bucket de armazenamento público `character_sheets` para PDFs com limite de 10 MB.
  - Implementadas políticas de Row Level Security (RLS) e publicações no `supabase_realtime`.
  - PauloViccs configurado com cargo `super_admin` no RBAC.

---

## [0.0.1] — 2026-11-20

### Adicionado
- Estrutura inicial da pasta `.agent` (Cortex do projeto)
- `context/architecture.md` — Arquitetura completa do servidor
- `context/stack.md` — Stack tecnológico detalhado
- `context/database_schema.md` — Schema de banco de dados inicial
- `guidelines/code_style.md` — Guia de estilo de código completo
- `guidelines/ui_ux.md` — Diretrizes visuais "Wizarding Elegance"
- `guidelines/resource_conventions.md` — Padrões para criação de resources
- Skills de desenvolvimento para Arcane MP
- Planos de implementação por fase
- `memory/` — Sistema de memória e tracking
- `overview/PROJECT_STATUS.md` — Status do projeto
