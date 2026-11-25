# 🏰 VICCS Accio — Hogwarts Legacy Roleplay Server

> Servidor de Roleplay MMO-RPG ambientado no universo de Hogwarts Legacy nos anos 2000, projetado sobre o framework [Arcane MP](https://arcane.mp/), com plataforma web oficial de pré-registro, seleção canônica de varinhas e admissão ministerial integrada ao Supabase e ao Discord.

---

## ⚡ Visão Geral

O **VICCS Accio** une a futura infraestrutura multiplayer autoritativa do **Arcane MP (C++ / Node.js)** a uma plataforma web interativa em produção (`website/`) conectada ao **Supabase (`ACCIO_Rp`)** e ao **Discord** para convocação de pioneiros, criação de fichas com 3.000+ palavras, geração de pergaminhos em PDF e moderação ministerial em tempo real.

---

## 🌐 Plataforma Web de Pré-Registro & Admissão (`website/`)

A pasta [`website/`](website/) contém a aplicação oficial de pré-registro já implementada em **React 19 + Vite 6 + TypeScript + Tailwind CSS v4**:

* **Carta de Hogwarts 3D (`HogwartsLetterModal`):** Abertura tridimensional da carta de convocação com lacre de cera em relevo e partículas (`canvas-confetti`).
* **Criação de Personagem Padrão Hogwarts Legacy (`WhitelistFormModal`):**
  * Fluxo em 4 etapas com seletor de dormitórios (`Bruxo / Wizard` vs `Bruxa / Witch`), linhagens arcanas e validação dinâmica de crônica com mínimo de **3.000 palavras** + auto-save em `localStorage`.
  * Catálogo com **11 famílias de cabos de varinhas** em PNG transparente (`public/wands/cutouts/`) e alternância visual entre **`3D Macro`** e **`Guia de Campo`** (esboço em pergaminho).
  * Seletores canônicos de madeira, comprimento, flexibilidade e núcleos com lore de Garrick Ollivanders.
* **Motor Dinâmico de Temas das Quatro Casas:** Troca visual imediata via CSS Custom Properties (`[data-house-theme]`) para Grifinória, Sonserina, Corvinal e Lufa-Lufa, acionada pelos estandartes 3D, navbar ou ficha.
* **Estandartes 3D das Quatro Casas (`CastleBanners3D`):** Renderização WebGL em **Three.js** com simulação de tecido ao vento e iluminação de tochas.
* **Ficha de Matrícula em Pergaminho PDF (`pdfGenerator.ts`):** Renderização em A4 com `html2canvas` + `jsPDF`, download local e upload automático para o bucket `character_sheets` no Supabase Storage.
* **Trilha Sonora Orquestral & SFX (`audio.ts` + `MusicPlayerWidget`):** Reprodutor flutuante com 6 faixas MP3 em `public/audio/`, crossfade contextual, shuffle e efeitos sonoros procedurais via Web Audio API.
* **Cronômetro & Painel Ministerial (`AppleTimerModal` + `AdminPanelModal`):** Contagem regressiva de 61 dias (até `2027-01-21`) sincronizada via `supabase_realtime`, autenticação OAuth2 via Discord, webhook com Rich Embeds (`discordWebhook.ts`) e RBAC (`user`, `student`, `mod`, `admin`, `super_admin`).

---

## 🧙 Roadmap de Features do Servidor (Arcane MP — Fases 1 a 6)

| Sistema | Resource Planejado | Descrição |
| :--- | :--- | :--- |
| 🧱 **Fundação** | `viccs-core`, `viccs-ui`, `viccs-characters` | Identidade, permissões, UI "Wizarding Elegance" em CEF e sincronização de fichas do Supabase. |
| 🪄 **Magias & Combate** | `viccs-spells`, `viccs-combat` | Feitiços canônicos e originais, maestria gradual, cooldowns e duelos formais. |
| 📚 **Aulas & Casas** | `viccs-classes` | Progressão acadêmica, matérias, tarefas em sala e Taça das Casas. |
| 💰 **Economia & Itens** | `viccs-economy`, `viccs-inventory` | Galeões, Sicles e Knuts, inventário com slots de varinha e comércio seguro. |
| 📜 **Quests & Mundo** | `viccs-quests`, `viccs-world` | Missões ramificadas, clima dinâmico, estações e eventos mundiais. |
| 🤖 **NPCs & Criaturas** | `viccs-npc`, `viccs-beasts` | NPCs com rotinas e diálogos; resgate e cuidados de criaturas em vivários. |
| ⚗️ **Crafting & Habitação** | `viccs-crafting`, `viccs-housing` | Herbologia, caldeirões de poções, quartos comunais e propriedades. |
| 💬 **Social & Segurança** | `viccs-social`, `viccs-admin` | Voz de proximidade, emotes, correio coruja e auditoria anti-cheat server-side. |

---

## 🏗️ Arquitetura Técnica

```text
┌─────────────────────────────────────────────────────────────────┐
│                    VICCS ACCIO HL SERVER                        │
├──────────────────────────────┬──────────────────────────────────┤
│  Plataforma Web (Em Produção)│   Servidor de Jogo (Fase 1+)     │
│  React 19 + Vite 6 + TS      │   Arcane MP (C++ / Node.js)      │
│  Tailwind v4 + Three.js      │   V8 Sandboxed + CEF UI Panels   │
├──────────────────────────────┼──────────────────────────────────┤
│  Supabase Cloud (ACCIO_Rp)   │   MySQL / MariaDB (Planejado)    │
│  PostgreSQL + Auth + Storage │   Persistência Gameplay          │
│  + Realtime + Discord Webhook│   via hmp-mysql                  │
└──────────────────────────────┴──────────────────────────────────┘
```

---

## 📁 Estrutura de Diretórios

```text
VICCS_Accio_HL_Server/
├── .agent/              # Cortex do Projeto (Contexto, Memória, Diretrizes, Planos e Skills)
├── scripts/             # Scripts SQL oficiais (migration_accio_rp.sql)
├── server/              # (Fase 1 - Pendente) Servidor Arcane MP e resources viccs-*
├── supabase/            # (Fase 1 - Pendente) Configurações locais da CLI do Supabase
└── website/             # Plataforma Web de Pré-Registro e Admissão (React + Vite + Three.js)
```

---

## 📖 Documentação & Governança

Toda a documentação técnica, memória operacional, regras de arquitetura e procedimentos residem em [`.agent/`](.agent/) e [`website/README.md`](website/README.md):

* [Visão Geral & Status Atual](.agent/overview/PROJECT_STATUS.md)
* [Arquitetura do Servidor](.agent/context/architecture.md)
* [Stack Tecnológico](.agent/context/stack.md)
* [Schema de Banco de Dados](.agent/context/database_schema.md)
* [Script de Migração Supabase](scripts/migration_accio_rp.sql)
* [Guia de Estilo de Código](.agent/guidelines/code_style.md)
* [Diretrizes de UI/UX](.agent/guidelines/ui_ux.md)
* [Convenções de Resources](.agent/guidelines/resource_conventions.md)
* [Plano Mestre de Implementação](.agent/implementation-plans/master-plan.md)
* [Artesão de Varinhas (Skill)](.agent/skills/wand-asset-artisan.md)
* [Documentação do Website](website/README.md)

---

## 🔗 Repositórios & Referências

* **Monorepo do Servidor:** [https://github.com/pauloviccs/VICCS_ACCIO.git](https://github.com/pauloviccs/VICCS_ACCIO.git)
* **Framework:** [Arcane MP](https://arcane.mp/)

---

*VICCS Accio — Accio, Aventura!* 🪄
