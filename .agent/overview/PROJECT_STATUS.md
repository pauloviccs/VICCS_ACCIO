# Project Overview

## Project Name
VICCS Accio — Hogwarts Legacy Roleplay (Arcane MP)

## Description
Servidor de Roleplay MMO-RPG ambientado no universo de Hogwarts Legacy nos anos 2000, desenvolvido sobre o framework Arcane MP (C++ / Node.js) em conjunto com uma plataforma web interativa de alta fidelidade para pré-registro de pioneiros, admissão ministerial, geração de fichas em pergaminho (PDF), personalização de varinhas canônicas (11 famílias) e gerenciamento de permissões e configurações em tempo real via Supabase.

## Tech Stack
- **Languages:** TypeScript, JavaScript (Node.js ES Modules / CJS), HTML5, CSS3, SQL (PostgreSQL 17), GLSL / Shaders
- **Frameworks & Libraries:**
  - Frontend: React 19, Vite 6, Tailwind CSS v4, Lucide React
  - 3D & Graphics: Three.js (WebGL, física de tecidos, iluminação de tochas medievais), Canvas 2D Heráldico
  - Animação & Transições: CSS Custom Properties GPU-accelerated (curvas de bezier 0.8s), Apple-style Spring Modals
  - PDF & Imersão: jsPDF, html2canvas, DOMPurify
  - Audio Engine: Web Audio API (sistema de trilha sonora adaptativa contínua com crossfade e sound-fx mágicos)
  - Game Engine (Servidor): Arcane MP Framework (MafiaHub C++ core, Node.js server scripts, CEF UI)
- **Tools:**
  - Python 3.13 (PIL/Pillow, OpenCV Headless para visão computacional e extração alfa de assets)
  - Git / GitHub (Subtree sync entre monorepo e website release)
  - Chrome DevTools MCP (Inspeção visual automatizada)
- **Services:**
  - Supabase Cloud (PostgreSQL 17.12, Supabase Auth OAuth Discord, Realtime WebSockets, Storage Buckets)
    - Projeto Oficial: `ACCIO_Rp` (Ref: `siwjyavftankitbdagzo`, Região: `sa-east-1`)
  - Discord API (OAuth2 Provider & Webhooks com Rich Embeds diagramados)

## Folder Structure
```text
VICCS_Accio_HL_Server/
├── .agent/                               # Cortex do Projeto (Contexto & Memória Permanente)
│   ├── assets/                           # Identidade visual, referências de UI de Hogwarts Legacy
│   │   ├── AccioRP_Referencias_Interface/ # Capturas de tela de menus, gear, HUD e criação de personagem
│   │   └── IDV_Logo/                     # Logotipos de alta resolução e monogramas heráldicos
│   ├── context/                          # Arquitetura, stack tecnológica e schemas de banco
│   │   ├── architecture.md               # Arquitetura modular Arcane MP + Supabase
│   │   ├── database_schema.md            # Schemas MySQL (gameplay) e Supabase (plataforma)
│   │   └── stack.md                      # Definição técnica detalhada de tecnologias
│   ├── global-rules/                     # Regras inegociáveis do desenvolvimento
│   │   └── rules.md
│   ├── guidelines/                       # Guias de estilo e convenções de código/UI
│   │   ├── code_style.md
│   │   ├── resource_conventions.md
│   │   └── ui_ux.md                      # Diretrizes visuais Wizarding Elegance & Glassmorphism
│   ├── implementation-plans/             # Planos de implementação executados e em roadmap
│   │   ├── hogwarts-letter-and-clean-discord-plan.md
│   │   ├── master-plan.md
│   │   └── website-preregistration-plan.md
│   ├── memory/                           # Estado volátil de trabalho e histórico
│   │   ├── active_task.md                # Tarefa em execução atual
│   │   ├── changelog.md                  # Registro cronológico de entregas
│   │   └── todos.md                      # Lista mestre de tarefas e fases
│   ├── overview/                         # Status e saúde do projeto
│   │   └── PROJECT_STATUS.md             # Este arquivo
│   └── skills/                           # Standard Operating Procedures (SOPs) dos sistemas
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
│       ├── wand-asset-artisan.md          # Especificação das 11 famílias de varinhas de HL
│       └── world-management.md
├── scripts/                              # Utilitários de automação e migrações SQL
│   └── migration_accio_rp.sql            # Script DDL/DML oficial do Supabase ACCIO_Rp
├── server/                               # (Fase 1) Core do Servidor Arcane MP
│   └── server.json (planejado)
├── supabase/                             # (Fase 1) Configurações locais Supabase CLI
└── website/                              # Plataforma Web de Pré-Registro e Admissão
    ├── public/                           # Assets estáticos, áudios e imagens
    │   ├── wands/                        # Assets de varinhas de Hogwarts Legacy
    │   │   ├── cutouts/                  # 11 cabos com canal alfa 100% transparente (PNG)
    │   │   └── [sketches/icons originais]
    │   ├── logohigh.jpg                  # Selo oficial de Hogwarts
    │   └── favicon.ico
    ├── src/
    │   ├── components/                   # Componentes React de alta fidelidade
    │   │   ├── AdminPanelModal.tsx       # Gestão ministerial, revisão de fichas e RBAC
    │   │   ├── AppleTimerModal.tsx       # Modal de cronômetro com roleta animada estilo Apple
    │   │   ├── CastleBanners3D.tsx       # Estandartes 3D das Quatro Casas em Three.js
    │   │   ├── EnchantedSubmissionModal.tsx # Transição mágica de envio de coruja
    │   │   ├── Hero.tsx                  # Hero com contador de vagas do Livro de Admissão
    │   │   ├── HogwartsLetterModal.tsx   # Carta de Hogwarts 3D com selo de cera
    │   │   ├── Navbar.tsx                # Barra de navegação com seletor dinâmico de casas
    │   │   ├── ParticleCanvas.tsx        # Brasas mágicas dinâmicas com cores da Casa ativa
    │   │   ├── TicketModal.tsx           # Bilhete do Expresso de Hogwarts autenticado
    │   │   ├── ValidationModal.tsx       # Modal de validação e confirmação de matrícula
    │   │   └── WhitelistFormModal.tsx    # Ficha de admissão estilo Hogwarts Legacy
    │   ├── lib/                          # Serviços de apoio e infraestrutura
    │   │   ├── audio.ts                  # Engine de áudio (trilhas contínuas e SFX)
    │   │   ├── constants.ts              # Catálogo canônico de varinhas e constantes
    │   │   ├── discordWebhook.ts         # Integração com webhook e Rich Embeds Discord
    │   │   ├── pdfGenerator.ts           # Gerador de pergaminho oficial em PDF com selo
    │   │   └── supabase.ts               # Cliente oficial Supabase, consultas e Realtime
    │   ├── types/
    │   │   └── index.ts                  # Tipagem unificada TypeScript
    │   ├── App.tsx                       # Componente raiz com orquestração de temas
    │   ├── index.css                     # Tokens CSS das 4 Casas e curvas de transição
    │   └── main.tsx
    ├── .env                              # Variáveis de ambiente com chaves de ACCIO_Rp
    ├── package.json
    ├── tailwind.config.js / vite.config.ts
    └── tsconfig.json
```

## Funcionalidades Atualmente Implementadas
1. **Motor Dinâmico de Temas das Quatro Casas (Universal Smooth Transition):**
   - Transição suave de 0.8s (`cubic-bezier(0.4, 0, 0.2, 1)`) via CSS Custom Properties.
   - 4 paletas fiéis: Grifinória (Escarlate & Ouro), Sonserina (Esmeralda & Prata), Corvinal (Safira & Bronze), Lufa-Lufa (Âmbar & Ônix).
   - Acionado interativamente pelos Estandartes 3D, Navbar e Ficha de Personagem, com persistência no `localStorage` (`accio_house_theme`).
2. **Criação de Personagem Padrão Hogwarts Legacy:**
   - 11 famílias de cabos de varinhas recortadas com OpenCV em canal alfa transparente (zero arrasto de mouse).
   - Pedestal de inspeção cinematográfico com visualização dupla: `3D Macro` e `Guia de Campo` (pergaminho).
   - Stepper em trilho de latão com 4 medalhões gravados (`Identidade`, `Varinha Ollivanders`, `Casa & Crônica`, `Matrícula Oficial`).
   - Seletor de dormitórios canônicos (`Bruxo / Wizard` vs `Bruxa / Witch`), linhagem mágica e os 3 Grandes Núcleos de Garrick Ollivanders.
   - Textarea de biografia com contador dinâmico e barra de progresso para a meta de 3.000 palavras.
3. **Gerador Oficial de Pergaminho em PDF:**
   - Emissão de documento com estilo de papel envelhecido, selo de Hogwarts, monograma heráldico da Casa e dados completos da varinha.
   - Upload automático para o Supabase Storage (`character_sheets`) e download instantâneo pelo usuário ou moderador.
4. **Infraestrutura Supabase em Produção (`ACCIO_Rp`):**
   - Projeto conectado: `siwjyavftankitbdagzo` na organização `VICCS`.
   - Tabelas criadas e ativas: `character_applications`, `accio_settings`, `user_roles`.
   - Bucket de armazenamento público: `character_sheets`.
   - Políticas RLS configuradas e canais de Realtime ativos.
   - RBAC implementado com PauloViccs configurado como `super_admin`.
5. **Integração Discord:**
   - Autenticação OAuth2 via Supabase Auth.
   - Notificação instantânea com Rich Embed diagramado no canal oficial via Webhook Ministerial.
6. **Estandartes 3D de Hogwarts & Sistema de Áudio:**
   - Renderização WebGL em Three.js das quatro flâmulas com física ondulatória de tecido e iluminação de tochas.
   - Trilha sonora contínua de Harry Potter com shuffle e efeitos sonoros táteis (botão mute global).
7. **Cronômetro Apple Responsivo:**
   - Modal com roleta deslizante inspirada no iOS para ajuste dos 60 dias de pré-registro com sincronização em tempo real para todos os visitantes.

## Trabalho em Andamento (WIP)
- Fase 1.3: Conexão direta entre as contas de pré-registro do Supabase e o banco relacional MySQL do servidor Arcane MP.
- Refinamento de telas de erro amigáveis para OAuth de navegadores mobile integrados ao Discord.

## Próximos Passos
1. Setup inicial do ambiente de execução do Arcane MP Server (`server/`).
2. Desenvolvimento do resource base `viccs-core` e conector de sincronização de whitelist com o Supabase.
