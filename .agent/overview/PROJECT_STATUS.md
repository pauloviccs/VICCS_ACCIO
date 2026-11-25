# Project Overview

## Project Name
VICCS Accio — Hogwarts Legacy Roleplay (Arcane MP)

## Description
Servidor de Roleplay MMO-RPG ambientado no universo de Hogwarts Legacy nos anos 2000, desenvolvido sobre o framework Arcane MP (C++ / Node.js) em conjunto com uma plataforma web interativa de pré-registro de pioneiros, admissão ministerial, geração de fichas em pergaminho (PDF), personalização de varinhas canônicas (11 famílias), estandartes 3D, trilha sonora orquestral contextual e gestão em tempo real via Supabase.

## Tech Stack
- **Languages:** TypeScript (~5.7.2), JavaScript (Node.js ES2022+ / CJS), HTML5, CSS3, SQL (PostgreSQL 17 / MySQL-MariaDB)
- **Frameworks & Libraries (Website):**
  - Frontend: React 19, Vite 6 (`@vitejs/plugin-react`), Tailwind CSS v4 (`@tailwindcss/vite`), `clsx`, `tailwind-merge`, `lucide-react`
  - 3D & Efeitos Visuais: Three.js (`three`, `@types/three`), `canvas-confetti`, Canvas 2D (`ParticleCanvas`)
  - PDF & Exportação: `jspdf`, `html2canvas`
  - Áudio: Web Audio API (SFX procedurais em `soundManager`) + `HTMLAudioElement` (`musicPlayer` com 6 faixas MP3 e crossfade contextual)
- **Game Engine (Servidor — Planejado/Fase 1):** Arcane MP Framework (MafiaHub C++ core, Node.js server scripts, V8 sandboxed client scripts, CEF UI)
- **Tools:**
  - Git / GitHub (`VICCS_ACCIO.git`)
  - Python / OpenCV (usado no pipeline de recorte transparente das 11 famílias de cabos de varinhas)
  - Supabase CLI (pasta `supabase/` reservada)
- **Services:**
  - Supabase Cloud (PostgreSQL 17, Supabase Auth OAuth2 Discord, Realtime WebSockets, Storage Bucket `character_sheets`)
    - Projeto Oficial: `ACCIO_Rp` (Ref: `siwjyavftankitbdagzo`, Região: `sa-east-1`)
  - Discord API (OAuth2 Provider & Webhook Ministerial com Rich Embeds)

## Folder Structure
```text
VICCS_Accio_HL_Server/
├── .agent/                               # Cortex do Projeto (Contexto, Memória, Diretrizes e SOPs)
│   ├── assets/                           # Identidade visual e referências de UI de Hogwarts Legacy
│   │   ├── AccioRP_Referencias_Interface/ # Capturas de menus, gear, HUD e criação de personagem
│   │   └── IDV_Logo/                     # Logotipos oficiais (SVG e JPG)
│   ├── context/                          # Arquitetura, stack tecnológica e schemas de banco
│   │   ├── architecture.md               # Arquitetura modular Arcane MP + Plataforma Web + Supabase
│   │   ├── database_schema.md            # Schemas MySQL (planejado) e Supabase (produção)
│   │   └── stack.md                      # Definição técnica das tecnologias do projeto
│   ├── global-rules/                     # Regras absolutas de desenvolvimento
│   │   └── rules.md
│   ├── guidelines/                       # Guias de estilo, UI/UX e convenções de resources
│   │   ├── code_style.md
│   │   ├── resource_conventions.md
│   │   └── ui_ux.md                      # Diretrizes visuais "Wizarding Elegance"
│   ├── implementation-plans/             # Planos de implementação executados e roadmap
│   │   ├── hogwarts-letter-and-clean-discord-plan.md
│   │   ├── master-plan.md
│   │   └── website-preregistration-plan.md
│   ├── memory/                           # Memória operacional e histórico
│   │   ├── active_task.md                # Estado da tarefa ativa e próximos passos
│   │   ├── changelog.md                  # Registro cronológico de entregas
│   │   └── todos.md                      # Checklist mestre de fases e tarefas
│   ├── overview/                         # Visão consolidada do projeto
│   │   └── PROJECT_STATUS.md             # Este arquivo
│   └── skills/                           # SOPs de desenvolvimento dos sistemas e assets
│       ├── academic-progression.md
│       ├── admin-anticheat.md
│       ├── crafting-system.md
│       ├── create-resource.md
│       ├── create-ui-panel.md
│       ├── database-persistence.md
│       ├── economy-system.md
│       ├── inter-resource-communication.md
│       ├── npc-beast-system.md
│       ├── quest-system.md
│       ├── social-roleplay.md
│       ├── spell-system.md
│       ├── wand-asset-artisan.md         # Especificação das 11 famílias de varinhas de HL
│       └── world-management.md
├── scripts/                              # Scripts utilitários e migrações SQL
│   └── migration_accio_rp.sql            # Script DDL/DML oficial do Supabase ACCIO_Rp
├── server/                               # (Fase 1 - Pendente) Servidor Arcane MP e resources
│   └── .gitkeep
├── supabase/                             # (Fase 1 - Pendente) Configurações locais Supabase CLI
│   └── .gitkeep
├── website/                              # Plataforma Web de Pré-Registro e Admissão (React + Vite)
│   ├── .agent/assets/references/wands/   # 83 assets originais de referência de cabos de varinhas
│   ├── public/                           # Assets estáticos servidos pelo Vite
│   │   ├── assets/                       # Identidade visual (accio-roleplay-identidade.svg, logohigh.jpg, logohigh_4x.jpg)
│   │   ├── audio/                        # 6 faixas MP3 orquestrais de trilha sonora
│   │   └── wands/                        # 83 arquivos .webp + pasta cutouts/ com 11 PNGs transparentes
│   ├── src/
│   │   ├── components/                   # 14 componentes React de UI e 3D
│   │   │   ├── AdminPanelModal.tsx       # Painel ministerial: revisão de fichas, RBAC e acesso ao timer
│   │   │   ├── AppleTimerModal.tsx       # Modal de cronômetro estilo iOS sincronizado via Realtime
│   │   │   ├── CastleBanners3D.tsx       # Estandartes 3D das 4 Casas em Three.js com física de tecido
│   │   │   ├── EnchantedSubmissionModal.tsx # Transição mágica pós-envio da ficha
│   │   │   ├── Features.tsx              # Seção de pilares e mecânicas do servidor
│   │   │   ├── Footer.tsx                # Rodapé institucional
│   │   │   ├── Hero.tsx                  # Seção principal com contador de vagas e cronômetro
│   │   │   ├── HogwartsLetterModal.tsx   # Carta de Hogwarts 3D com lacre de cera
│   │   │   ├── MusicPlayerWidget.tsx     # Player flutuante da trilha sonora (shuffle, volume, playlist)
│   │   │   ├── Navbar.tsx                # Barra superior com seletor de tema das Casas e acesso RBAC
│   │   │   ├── ParticleCanvas.tsx        # Partículas estelares dinâmicas em Canvas 2D
│   │   │   ├── TicketModal.tsx           # Bilhete de Embarque do Expresso de Hogwarts
│   │   │   ├── ValidationModal.tsx       # Modal de consulta/status da inscrição lavrada
│   │   │   └── WhitelistFormModal.tsx    # Ficha de criação estilo Hogwarts Legacy (3.000 palavras + PDF)
│   │   ├── lib/                          # Camada de serviços, áudio, PDF e integrações
│   │   │   ├── audio.ts                  # `soundManager` (Web Audio API) e `musicPlayer` (MP3 + crossfade)
│   │   │   ├── constants.ts              # Casas, varinhas (11 famílias), lore Ollivanders, prazos e webhook
│   │   │   ├── discordWebhook.ts         # Envio de Rich Embeds formatados para o Discord
│   │   │   ├── pdfGenerator.ts           # Geração de ficha em PDF (`jsPDF` + `html2canvas`) e upload Storage
│   │   │   └── supabase.ts               # Cliente Supabase, OAuth Discord, CRUD, RBAC e Realtime
│   │   ├── App.tsx                       # Orquestração de estado, auth, modais e tema dinâmico
│   │   ├── index.css                     # Tokens Tailwind v4 e variáveis CSS dos 4 temas das Casas
│   │   ├── main.tsx                      # Entry point React
│   │   ├── types.ts                      # Interfaces TypeScript compartilhadas
│   │   └── vite-env.d.ts
│   ├── .env                              # Variáveis de ambiente locais (não versionado)
│   ├── .env.example                      # Modelo de configuração do Supabase
│   ├── index.html
│   ├── package.json
│   ├── README.md
│   ├── tsconfig.app.json / tsconfig.json / tsconfig.node.json
│   └── vite.config.ts
├── .gitignore
└── README.md
```

## Current Features Implemented
1. **Motor Dinâmico de Temas das Quatro Casas:**
   - Transição visual via CSS Custom Properties (`[data-house-theme]`) para Grifinória, Sonserina, Corvinal e Lufa-Lufa.
   - Acionável pelos estandartes 3D (`CastleBanners3D`), `Navbar` ou formulário, com persistência em `localStorage` (`accio_house_theme`).
2. **Experiência de Convocação & Estandartes 3D:**
   - `HogwartsLetterModal`: carta tridimensional com quebra de lacre de cera e `canvas-confetti` exibida na primeira visita.
   - `CastleBanners3D`: renderização Three.js das flâmulas das quatro Casas com simulação de tecido ao vento e iluminação de tochas.
3. **Criação de Personagem & Oficina Ollivanders (`WhitelistFormModal`):**
   - Fluxo guiado em 4 etapas com seletor de dormitório (`Bruxo/Wizard` vs `Bruxa/Witch`), linhagem (`Sangue Puro`, `Mestiço`, `Nascido Trouxa`) e 11 famílias de cabos de varinhas recortadas em PNG transparente (`public/wands/cutouts/`).
   - Alternador visual entre `3D Macro` e `Guia de Campo` (sketch em pergaminho), mais os núcleos canônicos e lore de Garrick Ollivanders.
   - Validador de crônica com mínimo de 3.000 palavras (`MIN_WORDS_BACKSTORY = 3000`) e auto-save em `localStorage`.
4. **Gerador Oficial de Ficha em PDF (`pdfGenerator.ts`):**
   - Renderiza pergaminho ministerial A4 via `html2canvas` + `jsPDF`, faz download local e upload automático para o bucket `character_sheets` no Supabase Storage.
5. **Infraestrutura Supabase (`ACCIO_Rp` — `siwjyavftankitbdagzo`):**
   - Tabelas ativas via `scripts/migration_accio_rp.sql`: `character_applications`, `accio_settings` e `user_roles`.
   - Bucket público `character_sheets` (limite 10 MB, `application/pdf`), políticas RLS e publicação `supabase_realtime` para `accio_settings`, `user_roles` e `character_applications`.
   - RBAC (`user`, `student`, `mod`, `admin`, `super_admin`) com painel de moderação e aprovação em `AdminPanelModal.tsx`.
6. **Cronômetro em Tempo Real & Integração Discord:**
   - `AppleTimerModal`: ajuste administrativo da contagem regressiva (padrão de 61 dias em `constants.ts` / `TARGET_PHASE_END_DATE = 2027-01-21T23:59:59.000Z`) com sincronização via `supabase_realtime`.
   - Autenticação OAuth2 Discord via Supabase Auth e envio automático de Rich Embeds via `discordWebhook.ts`.
7. **Engine de Áudio (`audio.ts` + `MusicPlayerWidget.tsx`):**
   - Efeitos sonoros procedurais via Web Audio API (`soundManager`).
   - Player flutuante para 6 faixas MP3 em `public/audio/` com shuffle, controle de volume e crossfade contextual (`mystical`, `letter`, `creation`, `dungeon`, `express`, `triumph`).

## Work in Progress / Known Gaps
- `server/`: Contém apenas `.gitkeep`; o runtime Arcane MP, `server.json`, HMP Foundations e os resources `viccs-*` ainda não foram instalados/criados.
- `supabase/`: Contém apenas `.gitkeep`; migrations são gerenciadas atualmente pelo script SQL em `scripts/migration_accio_rp.sql`.
- Banco relacional MySQL/MariaDB de gameplay (`hmp-mysql`) e conector de sincronização com contas aprovadas no Supabase ainda pendentes (Fase 1).
- As políticas RLS atuais em `scripts/migration_accio_rp.sql` permitem leitura/escrita pública nas tabelas iniciais de pré-registro e devem ser endurecidas antes do ambiente final de produção do servidor.

## Next Steps
1. Iniciar a **Fase 1**: instalar e configurar o Arcane MP Server em `server/` (`server.json`, MafiaNet UDP porta 27015, HMP Foundations e `hmp-mysql`).
2. Desenvolver os resources base da **Fase 2** (`viccs-core`, `viccs-ui`, `viccs-characters`) integrando as fichas aprovadas do Supabase com o servidor de jogo.
