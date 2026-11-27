# 🏰 VICCS Accio — Hogwarts Legacy Roleplay Server

> Servidor de Roleplay MMO-RPG ambientado no universo de Hogwarts Legacy nos anos 2000 (pós-Batalha de Hogwarts, sob a diretoria de Aurelian Vale Diggory), rodando sobre o framework [ArcaneMP](https://arcane.mp/) (`1.15.1`) + **HMP Foundations (`v0.12.0`)**, expandido pelos módulos autorais **`viccs-*`** e integrado à plataforma web de pré-registro em **React + Supabase + Discord**.

---

## ⚡ Status Atual do Projeto

* **🌐 Plataforma Web (`website/`):** Em produção/sincronizada com [`accio_rp_website.git`](https://github.com/pauloviccs/accio_rp_website.git) (15 componentes React, Three.js, PDF e áudio), conectada ao Supabase (`ACCIO_Rp`) e Discord OAuth2.
* **🧙 Servidor de Jogo (`server/` — Fase 2 Validada em Testes Automatizados · Em Validação Ao Vivo):** Operacional localmente em `127.0.0.1:27016` com **34 resources JS ativos**: os 30 módulos base do **HMP Foundations v0.12.0** (`hmp-*`) + os 4 resources autorais da Fase 2 (**`viccs-core`**, **`viccs-ui`**, **`viccs-characters`**, **`viccs-sorting`**), já com controles imersivos (`Alt` Olho Mágico / `Esc` Livro do Jogador), uniforme inicial de ingressante (`Unaffiliated`), teleporte automático para o Salão Principal (`FT_HW_GreatHall`), trava anti-loop de áudio e `31/31` testes passando em `node --test`.
* **🎨 Identidade Visual Unificada & Localização PT-BR:** Todas as 7 WebViews CEF do ArcaneMP (`hmp-ui`, `hmp-spawn`, `hmp-characters`, `creator.js`, `hmp-inventory`, `hmp-emotes`, `hmp-business`), scripts server/client e configs em `server/data/` foram adaptados para o design system do `website/` (`viccs-ui/ui/tokens.css`, ornamentos SVG, tema reativo por casa) e traduzidos para Português Brasileiro, conectados pela **Ponte Universal (`ecosystemBridge.js`)**.
* **🗄️ Persistência Local:** MariaDB local (`hogwartsmp`, 37 tabelas do Foundations + 5 tabelas `viccs_*` criadas automaticamente via `MySQL.migrate`), gerenciado por **`Accio_Server_Manager.bat`** (`server-manager.ps1` / `start-server.ps1`).

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

## 🧱 Resources Autorais VICCS (Fase 2 Ativa + Roadmap)

| Resource | Status | Responsabilidade |
| :--- | :--- | :--- |
| **`viccs-core`** | 🟢 **Implementado (v1.0.0)** | Identidade, `EraGate`, auditoria (`viccs_audit`), `safeImport`, `ticketBridge`, snapshot do Livro do Jogador (`getPlayerBookSnapshot`), análise de vestes e **Ponte Universal (`ecosystemBridge.js`)**. |
| **`viccs-ui`** | 🟢 **Implementado (v1.0.0)** | Design System compartilhado (`tokens.css`, `ornaments.js`, emblemas, varinhas), Pergaminho diegético, Fade, **Olho Mágico (`Alt`)** não-bloqueante e **Livro do Jogador (`Esc`, bypass nativo em `F10`)**. |
| **`viccs-characters`** | 🟡 **Implementado · Em validação ao vivo** | Perfis e varinhas (`viccs_character_profiles`, `viccs_character_wands`), uniforme inicial neutro (`Outfit_001_Basic`/`Back_001_Basic`) via `gear.equip`, reaplicação não-destrutiva de vestes da Casa e ponte Supabase. |
| **`viccs-sorting`** | 🟡 **Implementado · Em validação ao vivo** | Teleporte automático ao Salão Principal (`FT_HW_GreatHall`) antes da Cerimônia do Chapéu Seletor (`viccs_sorting_sessions`, 12 dilemas, Hatstall `< 1.6`, pausa/retomada sem reroll e integração `hmp-houses`). |
| `viccs-spells`, `viccs-combat` | ⏳ **Fase 3 (Planejado)** | Feitiços customizados além do pack base, maestria gradual, cooldowns e duelos expandidos. |
| `viccs-classes`, `viccs-housecup`, `viccs-economy`, `viccs-quests` | ⏳ **Fases 3–4 (Planejado)** | Aulas acadêmicas, Taça das Casas, Galeões/Sicles/Knuts e missões narrativas. |
| `viccs-world`, `viccs-npc`, `viccs-beasts`, `viccs-housing`, `viccs-crafting`, `viccs-social`, `viccs-admin` | ⏳ **Fases 4–5 (Planejado)** | Clima/estações, NPCs, criaturas, habitações, poções/herbologia, social e moderação anti-cheat. |

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
* **Bilhete & Código de Embarque Anti-Spoofing (`TicketModal`):** Geração autenticada de código único (`ACCIO-*`, válido por 10 min via RPC `issue_server_link_code`) para vincular a ficha do Supabase ao personagem no servidor via Direct Connect sem fraudes.
* **Cronômetro & Painel Ministerial (`AppleTimerModal` + `AdminPanelModal`):** Contagem regressiva sincronizada via `supabase_realtime`, login Discord OAuth2, Rich Embeds Webhook (`discordWebhook.ts`) e RBAC (`user`, `student`, `mod`, `admin`, `super_admin`).

---

## 🏗️ Arquitetura Técnica

```text
┌──────────────────────────────────────────────────────────────────────┐
│                      VICCS ACCIO HL SERVER                           │
├───────────────────────────────┬──────────────────────────────────────┤
│  Plataforma Web (Produção)    │  Servidor de Jogo (Fase 2 Ativa)     │
│  React 19 + Vite 6 + TS       │  ArcaneMP 1.15.1 (Framework 44.1.1)  │
│  Tailwind v4 + Three.js       │  30 HMP Foundations + 4 VICCS Cores  │
│                               │  Ponte Universal + UI Unificada PTBR │
├───────────────────────────────┼──────────────────────────────────────┤
│  Supabase Cloud (ACCIO_Rp)    │  MariaDB / MySQL (Gameplay)          │
│  PostgreSQL + Auth + Storage  │  37 tabelas HMP + 5 tabelas VICCS    │
│  + Realtime + Discord Webhook │  via hmp-mysql (127.0.0.1:3306)      │
└───────────────────────────────┴──────────────────────────────────────┘
```

---

## 📁 Estrutura de Diretórios

```text
VICCS_Accio_HL_Server/
├── .agent/              # Cortex do Projeto (Contexto, Memória, Diretrizes, Planos e Skills)
├── client/              # (Local / .gitignore) Launcher e cliente ArcaneMP 1.15.1
├── scripts/             # Scripts SQL oficiais (migration_accio_rp.sql)
├── server/              # Servidor ArcaneMP 1.15.1 + 30 hmp-* + 4 viccs-* + Accio_Server_Manager.bat
├── supabase/            # (Reservado) Configurações locais da CLI do Supabase
└── website/             # Plataforma Web de Pré-Registro e Admissão (React + Vite + Three.js)
```

---

## 📖 Documentação & Governança

Toda a documentação técnica, memória operacional, regras de arquitetura e procedimentos residem em [`.agent/`](.agent/), [`server/README.md`](server/README.md) e [`website/README.md`](website/README.md):

* [Visão Geral & Status Atual](.agent/overview/PROJECT_STATUS.md)
* [Operação do Servidor Local (`server/`)](server/README.md)
* [Arquitetura do Servidor](.agent/context/architecture.md)
* [ArcaneMP Scripting & HMP Foundations](.agent/context/arcanemp-scripting-foundations.md)
* [Stack Tecnológico](.agent/context/stack.md)
* [Schema de Banco de Dados](.agent/context/database_schema.md)
* [Script de Migração Supabase](scripts/migration_accio_rp.sql)
* [Plano da Fase 2 (Core Resources)](.agent/implementation-plans/phase-2-core-resources-plan.md)
* [Guia de Estilo de Código](.agent/guidelines/code_style.md)
* [Diretrizes de UI/UX](.agent/guidelines/ui_ux.md)
* [Convenções de Resources](.agent/guidelines/resource_conventions.md)
* [Plano Mestre de Implementação](.agent/implementation-plans/master-plan.md)
* [Documentação do Website](website/README.md)

---

## 🔗 Repositórios & Referências

* **Monorepo do Servidor:** [https://github.com/pauloviccs/VICCS_ACCIO.git](https://github.com/pauloviccs/VICCS_ACCIO.git)
* **Repositório do Website (Subtree):** [https://github.com/pauloviccs/accio_rp_website.git](https://github.com/pauloviccs/accio_rp_website.git)
* **Framework:** [ArcaneMP](https://arcane.mp/) · [Docs ArcaneMP](https://docs.arcane.mp/) · [HMP Foundations](https://github.com/arcane-mp/foundations)

---

*VICCS Accio — Accio, Aventura!* 🪄
