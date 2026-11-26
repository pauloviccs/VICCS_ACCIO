# 🏰 VICCS Accio — Hogwarts Legacy Roleplay Server

> Servidor de Roleplay MMO-RPG ambientado no universo de Hogwarts Legacy nos anos 2000 (pós-Batalha de Hogwarts, sob a diretoria de Aurelian Vale Diggory), rodando sobre o framework [ArcaneMP](https://arcane.mp/) (`1.15.1`) + **HMP Foundations (`v0.12.0`)**, integrado à plataforma web de pré-registro em **React + Supabase + Discord**.

---

## ⚡ Status Atual do Projeto

* **🌐 Plataforma Web (`website/`):** Em produção/sincronizada com [`accio_rp_website.git`](https://github.com/pauloviccs/accio_rp_website.git), conectada ao Supabase (`ACCIO_Rp`) e Discord OAuth2.
* **🧙 Servidor de Jogo (`server/`):** **Operacional localmente!** `ArcaneMPServer.exe` (`1.15.1` / Framework `44.1.1`) + 30 módulos do **HMP Foundations v0.12.0** conectados ao MariaDB local (`hogwartsmp`, 37 tabelas migradas) e gerenciados via **`Accio_Server_Manager.bat`**.

---

## 🖥️ Como Iniciar e Jogar Localmente (`server/` + `client/`)

1. Certifique-se de que o **XAMPP** está instalado e o **MySQL/MariaDB** pode subir na porta `3306` (o próprio gerenciador inicia automaticamente caso esteja desligado).
2. Abra o painel do servidor clicando em [`server/Accio_Server_Manager.bat`](server/Accio_Server_Manager.bat) *(terminal normal, sem precisar de Administrador)*:
   * **`[1]` Iniciar Servidor (Modo Padrão)** ou
   * **`[2]` Iniciar Servidor com SUPER ADMIN** *(gera/injeta a chave de `/admin` para liberar `noclip`, `ban`, `spells`, `inventory`, `groups`, `environment`, etc.)*.
   * Também inclui gestão de contas/cargos no banco, backup `mysqldump`, editor de `server.json`, inspeção de logs e checagem de conflito de porta.
3. Abra [`client/ArcaneMPLauncher.exe`](client/ArcaneMPLauncher.exe) (ou opção **`[4]`** no painel), acesse **Play → Direct Connect** e conecte em **`127.0.0.1:27016`**.
   > **Por que porta `27016` localmente?** No Windows, serviços como `AppleMobileDeviceProcess.exe` costumam ocupar `127.0.0.1:27015` e interceptar o download HTTP de pacotes do cliente; usar `27016` resolve o conflito. Veja mais detalhes em [`server/README.md`](server/README.md).

---

## 🌐 Plataforma Web de Pré-Registro & Admissão (`website/`)

A pasta [`website/`](website/) contém a aplicação oficial em **React 19 + Vite 6 + TypeScript + Tailwind CSS v4**:

* **Carta de Hogwarts 3D (`HogwartsLetterModal`):** Abertura tridimensional da carta de convocação ambientada nos anos 2000 (Diretor Aurelian Vale Diggory) com lacre de cera e partículas (`canvas-confetti`).
* **Estandartes 3D das Quatro Casas (`CastleBanners3D`):** Renderização WebGL em **Three.js** com simulação de tecido ao vento, mapa de relevo têxtil, recorte real em alfa na cauda em V e os emblemas oficiais das 4 Casas em proporção 1:1.
* **Criação de Personagem Padrão Hogwarts Legacy (`WhitelistFormModal`):**
  * Fluxo em 4 etapas com seletor de dormitórios (`Bruxo / Wizard` vs `Bruxa / Witch`), linhagens arcanas e validação de crônica com mínimo de **3.000 palavras** + auto-save em `localStorage`.
  * Catálogo com **11 famílias de cabos de varinhas** em PNG transparente (`public/wands/cutouts/`) e alternância visual entre **`3D Macro`** e **`Guia de Campo`**.
  * Seletores canônicos de madeira, comprimento, flexibilidade e núcleos com lore de Garrick Ollivanders.
* **Motor Dinâmico de Temas & Identidade ArcaneMP:** Troca visual via `[data-house-theme]`, ornamentos chanfrados (`ArcaneOrnaments`), emblemas oficiais em todos os cards/modais e imagem de fundo hero (`logohigh_4x.jpg`) em tela cheia com efeito sutil de profundidade por ponteiro.
* **Ficha em Pergaminho PDF (`pdfGenerator.ts`):** Renderização A4 via `html2canvas` + `jsPDF`, download local e upload automático para o bucket `character_sheets` no Supabase Storage.
* **Trilha Sonora Orquestral & SFX (`audio.ts` + `MusicPlayerWidget`):** Reprodutor com 6 faixas MP3 em `public/audio/`, crossfade contextual e SFX via Web Audio API.
* **Cronômetro & Painel Ministerial (`AppleTimerModal` + `AdminPanelModal`):** Contagem regressiva sincronizada via `supabase_realtime`, login Discord OAuth2, Rich Embeds Webhook (`discordWebhook.ts`) e RBAC (`user`, `student`, `mod`, `admin`, `super_admin`).

---

## 🧙 Roadmap dos Resources Customizados VICCS (Fases 2 a 6)

| Sistema | Resource Planejado | Descrição |
| :--- | :--- | :--- |
| 🧱 **Fundação VICCS** | `viccs-core`, `viccs-ui`, `viccs-characters` | Identidade, permissões, UI "Wizarding Elegance" em CEF e sincronização de fichas aprovadas do Supabase com o servidor. |
| 🪄 **Magias & Combate** | `viccs-spells`, `viccs-combat` | Feitiços customizados além do pack base, maestria gradual, cooldowns e duelos formais. |
| 📚 **Aulas & Casas** | `viccs-classes` | Progressão acadêmica, matérias, tarefas em sala e Taça das Casas. |
| 💰 **Economia & Itens** | `viccs-economy`, `viccs-inventory` | Galeões, Sicles e Knuts, slots customizados de varinha e comércio. |
| 📜 **Quests & Mundo** | `viccs-quests`, `viccs-world` | Missões ramificadas, clima dinâmico, estações e eventos mundiais. |
| 🤖 **NPCs & Criaturas** | `viccs-npc`, `viccs-beasts` | NPCs com rotinas e diálogos; resgate e cuidados de criaturas em vivários. |
| ⚗️ **Crafting & Habitação** | `viccs-crafting`, `viccs-housing` | Herbologia, caldeirões de poções, quartos comunais e propriedades. |
| 💬 **Social & Segurança** | `viccs-social`, `viccs-admin` | Chat RP, correio coruja, moderação e auditoria anti-cheat server-side. |

---

## 🏗️ Arquitetura Técnica

```text
┌─────────────────────────────────────────────────────────────────┐
│                    VICCS ACCIO HL SERVER                        │
├──────────────────────────────┬──────────────────────────────────┤
│  Plataforma Web (Produção)   │  Servidor de Jogo (Fase 1 Ativa) │
│  React 19 + Vite 6 + TS      │  ArcaneMP 1.15.1 (Framework 44)  │
│  Tailwind v4 + Three.js      │  HMP Foundations v0.12.0 (30 mod)│
├──────────────────────────────┼──────────────────────────────────┤
│  Supabase Cloud (ACCIO_Rp)   │  MariaDB / MySQL (Gameplay)      │
│  PostgreSQL + Auth + Storage │  37 tabelas migradas (hogwartsmp)│
│  + Realtime + Discord Webhook│  via hmp-mysql (127.0.0.1:3306)  │
└──────────────────────────────┴──────────────────────────────────┘
```

---

## 📁 Estrutura de Diretórios

```text
VICCS_Accio_HL_Server/
├── .agent/              # Cortex do Projeto (Contexto, Memória, Diretrizes, Planos e Skills)
├── client/              # (Local / .gitignore) Launcher e cliente ArcaneMP 1.15.1
├── scripts/             # Scripts SQL oficiais (migration_accio_rp.sql)
├── server/              # Servidor ArcaneMP 1.15.1 + Foundations v0.12.0 + Accio_Server_Manager.bat
├── supabase/            # (Reservado) Configurações locais da CLI do Supabase
└── website/             # Plataforma Web de Pré-Registro e Admissão (React + Vite + Three.js)
```

---

## 📖 Documentação & Governança

Toda a documentação técnica, memória operacional, regras de arquitetura e procedimentos residem em [`.agent/`](.agent/), [`server/README.md`](server/README.md) e [`website/README.md`](website/README.md):

* [Visão Geral & Status Atual](.agent/overview/PROJECT_STATUS.md)
* [Operação do Servidor Local (`server/`)](server/README.md)
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
* **Repositório do Website (Subtree):** [https://github.com/pauloviccs/accio_rp_website.git](https://github.com/pauloviccs/accio_rp_website.git)
* **Framework:** [ArcaneMP](https://arcane.mp/) · [Docs ArcaneMP](https://docs.arcane.mp/) · [HMP Foundations](https://github.com/arcane-mp/foundations)

---

*VICCS Accio — Accio, Aventura!* 🪄
