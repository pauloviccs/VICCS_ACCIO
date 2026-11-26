# Project Overview

## Project Name
VICCS Accio — Hogwarts Legacy Roleplay (ArcaneMP)

## Description
Servidor de Roleplay MMO-RPG ambientado no universo de Hogwarts Legacy nos anos 2000 (logo após a Batalha de Hogwarts, sob a diretoria de Aurelian Vale Diggory), operando localmente sobre o framework **ArcaneMP `1.15.1`** (`Framework 44.1.1`) com **HMP Foundations `v0.12.0`** e banco **MariaDB** (`hogwartsmp`), integrado a uma plataforma web de pré-registro de pioneiros em **React 19 + Vite 6 + TypeScript** (`website/`) conectada ao **Supabase (`ACCIO_Rp`)** e ao **Discord**.

## Tech Stack
- **Game Server Runtime (`server/`):**
  - Engine: ArcaneMP `1.15.1` (`b8ce055`, MafiaHub Framework `44.1.1`, `ArcaneMPServer.exe`, Node.js embarcado `libnode.dll`)
  - Resource Pack Base: HMP Foundations `v0.12.0` (30 módulos `hmp-*` em `server/resources/` + 26 configs em `server/data/`)
  - Ferramentas de Gestão: `Accio_Server_Manager.bat` + `server-manager.ps1` (painel Super Admin TUI), `start-server.ps1`
  - Client Local (`client/`): `ArcaneMPLauncher.exe`, `ArcaneMPClient.dll`, CEF, MafiaHubUpdater
- **Website (`website/`):**
  - Languages: TypeScript (`~5.7.2`), HTML5, CSS3
  - Frameworks & Libraries: React 19, Vite 6 (`@vitejs/plugin-react`), Tailwind CSS v4 (`@tailwindcss/vite`), `lucide-react`, `clsx`, `tailwind-merge`
  - 3D & Visuais: Three.js (`three`, `@types/three`), `canvas-confetti`, Canvas 2D (`ParticleCanvas`)
  - PDF & Áudio: `jspdf`, `html2canvas`, Web Audio API (`soundManager`) + `HTMLAudioElement` (`musicPlayer` com 6 faixas MP3)
- **Databases & Services:**
  - Gameplay DB (Local Dev): XAMPP **MariaDB `10.4.32`** (`127.0.0.1:3306`, database `hogwartsmp`, 37 tabelas + 17 migrations `hmp_schema_migrations` gerenciadas por `hmp-mysql`; produção recomendada em MySQL 8.x ou MariaDB 10.6+)
  - Plataforma Web & Auth: **Supabase Cloud** (`ACCIO_Rp`, ref `siwjyavftankitbdagzo`, `sa-east-1`, PostgreSQL 17, OAuth2 Discord, Storage bucket `character_sheets`, Realtime)
  - Discord API: OAuth2 Provider + Rich Embeds Webhook ministerial
- **Tools:** Git / GitHub (`VICCS_ACCIO.git` + subtree `accio_rp_website.git`), PowerShell, Python/OpenCV (recorte de varinhas)

## Folder Structure
```text
VICCS_Accio_HL_Server/
├── .agent/                               # Cortex do Projeto (Contexto, Memória, Diretrizes e Skills)
│   ├── assets/                           # Referências de UI, emblemas originais, IDV_Logo, PSD e referências web
│   ├── context/                          # architecture.md, stack.md, database_schema.md
│   ├── global-rules/                     # rules.md
│   ├── guidelines/                       # code_style.md, resource_conventions.md, ui_ux.md
│   ├── implementation-plans/             # hogwarts-letter-and-clean-discord-plan.md, master-plan.md, website-preregistration-plan.md
│   ├── memory/                           # active_task.md, changelog.md, todos.md
│   ├── overview/                         # PROJECT_STATUS.md
│   └── skills/                           # 14 SOPs ArcaneMP + wand-asset-artisan.md
├── client/                               # (Ignorado no Git) Cliente local ArcaneMP 1.15.1 (ArcaneMPLauncher.exe)
├── scripts/
│   └── migration_accio_rp.sql            # Script DDL/DML oficial do Supabase ACCIO_Rp
├── server/                               # Servidor dedicado ArcaneMP 1.15.1 + HMP Foundations v0.12.0
│   ├── data/                             # 26 configs hmp-*.json (ignorados no Git) + hmp-mysql.example.json
│   ├── logs/                             # Logs de execução (hogwarts-mp.log)
│   ├── resources/                        # 30 resources hmp-* do HMP Foundations v0.12.0 (ignorados no Git)
│   ├── Accio_Server_Manager.bat          # Painel interativo amigável com ferramentas Super Admin
│   ├── ArcaneMPServer.exe                # Executável dedicado Windows (ignorado no Git)
│   ├── README.md                         # Guia de operação local e abertura pública
│   ├── server-manager.ps1                # Lógica TUI do painel Super Admin, DB, logs, backup e server.json
│   ├── server.example.json               # Modelo versionado de configuração
│   ├── server.json                       # Configuração local ativa (porta 27016 UDP/TCP, maxplayers 32)
│   └── start-server.ps1                  # Launcher CLI com pre-flight de executável, porta e MySQL
├── supabase/                             # (Reservado) Configurações locais Supabase CLI
├── website/                              # Plataforma Web de Pré-Registro e Admissão (React 19 + Vite 6)
│   ├── public/
│   │   ├── assets/                       # accio-roleplay-identidade.svg, logohigh.jpg, logohigh_4x.jpg + emblemas/*.png
│   │   ├── audio/                        # 6 faixas MP3 orquestrais
│   │   └── wands/                        # 83 .webp + cutouts/ com 11 PNGs transparentes
│   └── src/
│       ├── components/                   # 15 componentes (AdminPanelModal, AppleTimerModal, ArcaneOrnaments, CastleBanners3D, EnchantedSubmissionModal, Features, Footer, Hero, HogwartsLetterModal, MusicPlayerWidget, Navbar, ParticleCanvas, TicketModal, ValidationModal, WhitelistFormModal)
│       ├── lib/                          # audio.ts, constants.ts, discordWebhook.ts, pdfGenerator.ts, supabase.ts
│       ├── App.tsx / index.css / main.tsx / types.ts
├── .gitignore
└── README.md
```

## Current Features Implemented
1. **Servidor ArcaneMP 1.15.1 & HMP Foundations v0.12.0 Operacional (`server/` + `client/`):**
   - Servidor local testado e aberto com conexão funcional via `ArcaneMPLauncher.exe` em `127.0.0.1:27016` (porta ajustada para `27016` UDP/TCP para evitar conflito local com `AppleMobileDeviceProcess.exe` em `127.0.0.1:27015`).
   - Banco `hogwartsmp` configurado no MariaDB local (usuário dedicado `hogwartsmp` em `server/data/hmp-mysql.json`) com todas as **37 tabelas** e **17 migrations** criadas automaticamente pelo Foundations.
   - Todos os **30 resources** `hmp-*` ativos (contas, personagens, casas, inventário com 1.848 definições nativas, spawn, economia/bancos, lojas, feitiços, duelos, bestas, NPCs, Hogwarts Express, admin e webhooks).
   - Painel gerenciador `server/Accio_Server_Manager.bat` com inicialização normal, inicialização com `HMP_ADMIN_BOOTSTRAP_SECRET` (`/admin`), auto-restart, abertura do launcher, gestão do MySQL XAMPP, promoção de cargos `admin` (grades 1–3), backups via `mysqldump`, editor de `server.json`, inspeção de logs e detecção prévia de conflito de porta.
2. **Plataforma Web de Pré-Registro (`website/`, sincronizada com `accio_rp_website.git`):**
   - Motor dinâmico de temas das 4 Casas (`[data-house-theme]`), identidade visual ArcaneMP com ornamentos chanfrados (`ArcaneOrnaments`) e fundo hero full-bleed (`logohigh_4x.jpg`) com efeito de profundidade por ponteiro.
   - Estandartes 3D em Three.js (`CastleBanners3D`) usando os emblemas oficiais em PNG (`public/assets/emblemas/*.png`) em proporção 1:1 sem distorção, recorte real em alfa na cauda em V e relevo têxtil (`bumpMap`).
   - Carta de Hogwarts 3D ambientada nos anos 2000 (Diretor Aurelian Vale Diggory), criação de personagem em 4 etapas (`WhitelistFormModal`) com 11 famílias de cabos em PNG transparente, gerador de ficha PDF (`jsPDF` + `html2canvas`), trilha sonora MP3 + SFX, cronômetro Realtime (`AppleTimerModal`), autenticação Discord OAuth2, Webhook Discord e Painel Admin Ministerial (`AdminPanelModal`).

## Work in Progress / Known Gaps
- **Resources Customizados VICCS (Fase 2+):** pasta `server/resources/` contém apenas os 30 módulos base `hmp-*`; os resources autorais (`viccs-core`, `viccs-ui`, `viccs-characters`, `viccs-spells`, etc.) ainda serão desenvolvidos.
- **Ponte Supabase ↔ Gameplay:** sincronização automática das fichas aprovadas em `public.character_applications` (Supabase) para `hogwartsmp` (MySQL/MariaDB) ainda não implementada.
- **Segurança & Infraestrutura antes da abertura pública:**
  - Atualizar banco de produção para **MySQL 8.x** ou **MariaDB 10.6+** (ambiente dev atual usa XAMPP MariaDB `10.4.32`).
  - Definir `server-token` (MafiaHub) e `package-secret` em `server/server.json`, além de liberar porta do servidor em UDP e TCP no firewall/roteador.
  - Endurecer políticas RLS do Supabase e mover a URL do Discord Webhook (`website/src/lib/constants.ts`) para Edge Function / variável server-side.
  - Pasta `supabase/` ainda contém apenas `.gitkeep`.

## Next Steps
1. Iniciar a **Fase 2**: criar os primeiros resources autorais `viccs-core`, `viccs-ui` e `viccs-characters` seguindo `.agent/guidelines/resource_conventions.md`.
2. Implementar a integração entre fichas aprovadas no Supabase (`ACCIO_Rp`) e criação/vínculo de personagens no servidor ArcaneMP.
3. Preparar banco MySQL 8.x / MariaDB 10.6+ dedicado, `server-token` e liberação de rede para abertura pública de testes.
