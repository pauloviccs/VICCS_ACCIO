# Project Overview

## Project Name
VICCS Accio — Hogwarts Legacy Roleplay (ArcaneMP)

## Description
Servidor de Roleplay MMO-RPG ambientado no universo de Hogwarts Legacy nos anos 2000 (logo após a Batalha de Hogwarts, sob a diretoria de Aurelian Vale Diggory), operando localmente sobre o framework **ArcaneMP `1.15.1`** (`Framework 44.1.1`) com **HMP Foundations `v0.12.0`**, 4 resources autorais **VICCS** da Fase 2 (`viccs-core`, `viccs-ui`, `viccs-characters`, `viccs-sorting`) e banco **MariaDB** (`hogwartsmp`), integrado à plataforma web de pré-registro em **React 19 + Vite 6 + TypeScript** (`website/`) conectada ao **Supabase (`ACCIO_Rp`)** e ao **Discord**.

## Tech Stack
- Languages: JavaScript (Node.js server, V8 client e WebViews CEF), TypeScript (`~5.7.2` no `website/`), HTML5, CSS3, SQL (PostgreSQL / MariaDB), PowerShell / Batch
- Frameworks: ArcaneMP `1.15.1` (`b8ce055`, MafiaHub Framework `44.1.1`, `ArcaneMPServer.exe`, `libnode.dll`), HMP Foundations `v0.12.0` (30 módulos `hmp-*`), Ecossistema VICCS (`viccs-core`, `viccs-ui`, `viccs-characters`, `viccs-sorting`), React 19, Vite 6, Tailwind CSS v4, Three.js
- Tools: `Accio_Server_Manager.bat` (`server-manager.ps1` / `start-server.ps1`), `node --test` (`31` testes unitários/DOM/VM em `viccs-*/test/service.test.js`), `node --check`, `tsc --noEmit` / Vite CLI, Git / GitHub (`VICCS_ACCIO.git` + subtree `accio_rp_website.git`)
- Services: XAMPP **MariaDB `10.4.32`** (`127.0.0.1:3306`, schema `hogwartsmp` com 37 tabelas HMP + 5 tabelas `viccs_*`), **Supabase Cloud** (`ACCIO_Rp`, ref `siwjyavftankitbdagzo`, PostgreSQL 17, Auth Discord OAuth2, Storage `character_sheets`, Realtime, `server_join_tickets` / `server_link_codes` + RPC `issue_server_link_code()`), **Discord API** (OAuth2 + Webhooks)

## Folder Structure
```text
VICCS_Accio_HL_Server/
├── .agent/                               # Cortex do Projeto (Contexto, Memória, Diretrizes, Planos e Skills)
│   ├── assets/                           # Referências de UI, emblemas, IDV_Logo, PSD e websites_ref
│   ├── context/                          # architecture.md, stack.md, database_schema.md, arcanemp-scripting-foundations.md
│   ├── global-rules/                     # rules.md
│   ├── guidelines/                       # code_style.md, resource_conventions.md, ui_ux.md
│   ├── implementation-plans/             # master-plan.md, phase-2-core-resources-plan.md, hogwarts-letter-and-clean-discord-plan.md, website-preregistration-plan.md
│   ├── memory/                           # active_task.md, changelog.md, todos.md
│   ├── overview/                         # PROJECT_STATUS.md
│   └── skills/                           # 19 skills permanentes (SOPs ArcaneMP, GDD, Sorting Hat, UI/Motion e Varinhas)
├── client/                               # (Local / .gitignore) Launcher, DLL e logs do cliente ArcaneMP 1.15.1
├── scripts/
│   └── migration_accio_rp.sql            # Script DDL/DML oficial do Supabase ACCIO_Rp (tabelas, RLS, Realtime, RPC)
├── server/                               # Servidor dedicado ArcaneMP 1.15.1 + 34 resources JS ativos
│   ├── .agent/                           # GDD, especificação do Chapéu Seletor, regras imersivas e logs locais
│   ├── .packages/                        # Pacotes compilados .fwpak/.chunks gerados no boot
│   ├── data/                             # 31 arquivos JSON (27 hmp-*.json + 4 viccs-*.example.json)
│   ├── logs/                             # Logs de execução (hogwarts-mp.log)
│   ├── resources/
│   │   ├── hmp-*                         # 30 resources HMP Foundations v0.12.0 (traduzidos PT-BR + WebViews unificadas)
│   │   ├── viccs-core/                   # Fundação, EraGate, audit, ticketBridge, safeImport, ecosystemBridge e Book snapshot
│   │   ├── viccs-ui/                     # Tokens CSS, ornaments.js, Olho Mágico (Alt), Livro do Jogador (Esc), Pergaminho, Fade e Audio Guard
│   │   ├── viccs-characters/             # Perfis, 11 varinhas, vínculo anti-spoofing, vestes Unaffiliated/Casa e Ficha/Varinha CEF
│   │   └── viccs-sorting/                # Teleporte ao Salão Principal (FT_HW_GreatHall) e Chapéu Seletor Fail-Proof
│   ├── Accio_Server_Manager.bat          # Painel interativo amigável com ferramentas Super Admin
│   ├── ArcaneMPServer.exe                # Executável dedicado Windows
│   ├── server-manager.ps1 / start-server.ps1 / server.json / server.example.json / README.md
├── supabase/                             # (Reservado) Apenas .gitkeep no momento
├── website/                              # Plataforma Web de Pré-Registro e Admissão (React 19 + Vite 6 + Three.js)
│   ├── .agent/assets/                    # Referências visuais de varinhas e amostra de ficha PDF
│   ├── public/                           # assets/ (emblemas, logohigh_4x.jpg), audio/ (6 MP3s), wands/ (83 .webp + 11 cutouts PNG)
│   └── src/                              # 15 componentes React em components/, lib/ (supabase, audio, pdf, webhook) e index.css
├── .gitignore
└── README.md
```

## Current Features Implemented
1. **Servidor Local ArcaneMP `1.15.1` + 34 Resources JS (`server/` + `client/`):**
   - Operacional em `0.0.0.0:27016` (`download-url: ""` em `server/server.json`) com `30` módulos `hmp-*` + `4` módulos `viccs-*`, banco `hogwartsmp` (MariaDB `10.4.32`) e painel `Accio_Server_Manager.bat`.
2. **Ecossistema VICCS — Fase 2 (`viccs-core`, `viccs-ui`, `viccs-characters`, `viccs-sorting`):**
   - **`viccs-core`:** Config em camadas, `EraGate` (anos 2000), `viccs_audit`, `ticketBridge` (`ACCIO-*`), **Ponte Universal (`ecosystemBridge.js`)**, `getPlayerBookSnapshot`, `summarizeRobesInventory` e serviço `'reapply-robes'`.
   - **`viccs-ui`:** Kit visual compartilhado (`tokens.css`, `ornaments.js` com `injectFrameCorners` + alias `attachCorners`), Pergaminho diegético, cortina Fade, trava anti-loop Wwise (`resolveAudioCue` + `stopPlayerAudio`), **Olho Mágico (`Alt` / `lalt` / `ralt`)** com handler `(physicalKey, state)` não-bloqueante + debounce e revalidação server-side, e **Livro do Jogador (`Esc`)** com pré-aquecimento das WebViews no `worldReady`, supressão do menu nativo (`Game.setPauseMenuEnabled(false)`) e escape seguro em `F10`.
   - **`viccs-characters`:** Perfis (`robes_house` / `robes_applied` em migration v3), 11 famílias de varinhas, ponte Supabase (`first_name`/`last_name` + sync `sorted_*`), modal de vínculo seguro com escape, uniforme automático inicial de ingressante sem Casa (`Unaffiliated`: `Outfit_001_Basic` + `Back_001_Basic` via `inventory.patch` `give` + `player.gear.equip` com `variation`), reaplicação não-destrutiva das vestes da Casa e resolução online via `PlayerManager.getById`.
   - **`viccs-sorting`:** Motor *Fail-Proof* em `viccs_sorting_sessions` (12 dilemas, Hatstall `< 1.6`, pausa/retomada sem reroll), teleporte automático de alunos não atribuídos para o Salão Principal (`FT_HW_GreatHall` via `player.fastTravel` + `playerFastTravelComplete`, ou `coordinates` configuráveis) antes da abertura automática do Chapéu Seletor e cascata para a Ficha/Varinha.
3. **Unificação Visual ArcaneMP e Localização PT-BR:**
   - 7 WebViews CEF dos módulos `hmp-*` estilizadas com `viccs-ui/ui/tokens.css` e `ornaments.js` + textos e catálogos de `server/data/` traduzidos para PT-BR.
4. **Plataforma Web de Pré-Registro (`website/`):**
   - Carta 3D, estandartes Three.js, formulário em 4 etapas, 11 cabos de varinha, ficha PDF, cronômetro Realtime, OAuth2 Discord, Webhook, `AdminPanelModal` e Código de Embarque `ACCIO-*` (`TicketModal.tsx`).

## Work in Progress / Known Gaps
- **Validação Final Ao Vivo no Cliente Gráfico (`127.0.0.1:27016`):**
  - Bateria automatizada local validou sintaxe (`node --check`), JSONs e `31/31` testes em `node --test` (incluindo simulações VM/DOM de `book/app.js`, atalhos `Alt`/`Esc`, uniforme `Unaffiliated` + `gear.equip` e fluxo `FT_HW_GreatHall` → Chapéu Seletor). Falta confirmar visualmente no cliente real do jogo após reiniciar o servidor.
- **Ativação Opcional da Ponte Supabase Local:**
  - `server/data/viccs-core.json` e `server/data/viccs-characters.json` ainda não foram criados a partir dos `.example.json` (ponte em modo local offline por padrão).
- **Fases 3 a 6 (Planejadas):**
  - Módulos de gameplay (`viccs-houses` expandido, `viccs-spells`, `viccs-inventory`, `viccs-economy`, `viccs-combat`, `viccs-classes`, `viccs-quests`), mundo/social (`viccs-world`, `viccs-npc`, `viccs-beasts`, `viccs-housing`, `viccs-crafting`, `viccs-social`), administração (`viccs-admin`), Edge Function segura para Webhook Discord (`supabase/` apenas com `.gitkeep`), atualização de banco e exposição pública com `server-token` / `package-secret`.

## Next Steps
1. Reiniciar o servidor ArcaneMP e validar ao vivo em `127.0.0.1:27016` com o personagem `ONE TWO` (ou novo personagem): uniforme inicial de Hogwarts, teleporte ao Salão Principal (`FT_HW_GreatHall`), abertura automática do Chapéu Seletor, ficha de varinha, `Alt` (Olho Mágico) e `Esc` (Livro do Jogador).
2. Caso `FT_HW_GreatHall` posicione fora do centro desejado do Salão Principal, ajustar `ceremonyLocation.coordinates` em `viccs-sorting` (`config/default.json` ou `server/data/viccs-sorting.json`).
3. Avançar para o planejamento e implementação da **Fase 3** (`viccs-houses` e `viccs-spells`) integrados ao Livro do Jogador e ao Olho Mágico.
