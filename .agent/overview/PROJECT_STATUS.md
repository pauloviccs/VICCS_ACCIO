# Project Overview

## Project Name
VICCS Accio — Hogwarts Legacy RP Server

## Description
Servidor de Roleplay MMO-RPG ambientado no universo de Hogwarts Legacy,
construído sobre o framework Arcane MP (MafiaHub). O projeto transforma
Hogwarts Legacy em uma experiência multiplayer persistente com mecânicas
customizadas que ultrapassam o jogo original.

## Tech Stack
- **Framework:** Arcane MP (MafiaHub Framework, C++)
- **Server Runtime:** Node.js (serverScripts)
- **Client Runtime:** V8 Sandboxed (clientScripts)
- **UI:** CEF (Chromium Embedded Framework) — HTML/CSS/JS
- **Banco Gameplay:** MySQL / MariaDB (via hmp-mysql)
- **Backend Plataforma:** Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Website:** A definir (Next.js ou Astro + TypeScript)
- **Networking:** MafiaNet (UDP), porta 27015

## Fase Atual
**Fase 0 — Biblioteca de Contexto** ✅ COMPLETA

## Folder Structure
```
VICCS_Accio_HL_Server/
├── .agent/                          # Cérebro do projeto (Cortex)
│   ├── context/                     # Arquitetura, stack, schema
│   │   ├── architecture.md
│   │   ├── stack.md
│   │   └── database_schema.md
│   ├── guidelines/                  # Padrões obrigatórios
│   │   ├── code_style.md
│   │   ├── ui_ux.md
│   │   └── resource_conventions.md
│   ├── skills/                      # Skills de desenvolvimento
│   │   ├── create-resource.md
│   │   ├── create-ui-panel.md
│   │   ├── inter-resource-communication.md
│   │   ├── spell-system.md
│   │   ├── database-persistence.md
│   │   ├── npc-beast-system.md
│   │   ├── economy-system.md
│   │   ├── quest-system.md
│   │   ├── academic-progression.md
│   │   ├── crafting-system.md
│   │   ├── world-management.md
│   │   ├── admin-anticheat.md
│   │   └── social-roleplay.md
│   ├── global-rules/                # Regras inegociáveis
│   │   └── rules.md
│   ├── implementation-plans/        # Planos por fase
│   │   └── master-plan.md
│   ├── memory/                      # Estado atual
│   │   ├── active_task.md
│   │   ├── todos.md
│   │   └── changelog.md
│   ├── overview/                    # Este arquivo
│   │   └── PROJECT_STATUS.md
│   └── assets/                      # Assets de referência
├── server/                          # (Fase 1) Server Arcane MP
├── supabase/                        # (Fase 1) Projeto Supabase
└── website/                         # (Fase 5) Website público
```

## Key Features Planejadas
- Sistema de magias expandido com magias customizadas
- Progressão acadêmica com aulas e matérias
- Economia completa (Galeões/Sicles/Knuts)
- Sistema de quests dinâmico e configurável
- NPCs com IA, schedules e diálogos
- Criaturas mágicas expandidas (captura, vivário)
- Crafting: poções, herbologia, encantamentos
- Habitações de jogadores
- Chat roleplay com alcance e emotes
- Sistema admin com anti-cheat server-side
- Tudo 100% config-driven e modular

## Próximos Passos
Iniciar **Fase 1 — Setup do Servidor e Infraestrutura**

