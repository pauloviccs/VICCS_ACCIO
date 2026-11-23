# 🏰 VICCS Accio — Hogwarts Legacy Roleplay Server

> Servidor de Roleplay MMO-RPG imersivo ambientado no universo de Hogwarts Legacy nos anos 2000, desenvolvido sobre o framework [Arcane MP](https://arcane.mp/).

---

## ⚡ Visão Geral

O **VICCS Accio** transforma *Hogwarts Legacy* em uma experiência multiplayer persistente de alta fidelidade com mecânicas customizadas que ultrapassam o jogo original. Uma infraestrutura viva que une o framework de rede **Arcane MP (C++ / Node.js)** a uma plataforma web moderna integrada ao **Supabase** e ao **Discord** para admissão, whitelist ministerial e gestão em tempo real.

---

## 🌐 Plataforma Web de Pré-Registro & Admissão

A pasta [`website/`](website/) hospeda a aplicação oficial de convocação de pioneiros do servidor:

* **Carta de Hogwarts 3D:** Abertura tridimensional e lúdica da carta de convocação de Hogwarts lacrada a cera.
* **Criação de Personagem Padrão Hogwarts Legacy:**
  * Catálogo de 11 famílias de cabos de varinhas recortadas em canal alfa transparente via visão computacional (OpenCV).
  * Pedestal cinematográfico com visualização dupla: **[🪄 3D Macro]** e **[📜 Guia de Campo]** (pergaminho do século XIX).
  * Seletores canônicos de dormitórios (`Bruxo/Wizard` vs `Bruxa/Witch`), linhagens arcanas e os Três Grandes Núcleos de Garrick Ollivanders.
  * Validador dinâmico de crônica de personagem com meta mínima de 3.000 palavras.
* **Motor Dinâmico de Temas das Quatro Casas:** Transição de cores fluida em 0.8s (Grifinória, Sonserina, Corvinal e Lufa-Lufa) acionada pelas bandeiras, navbar ou ficha, sincronizada via `localStorage` e perfil Discord.
* **Estandartes 3D das Quatro Casas:** Renderização tridimensional em Three.js com física física de tecidos e iluminação medieval.
* **Ficha de Matrícula em Pergaminho (PDF):** Geração de documento de época estilizado com brasão oficial, dados heráldicos da varinha e sincronização automática com o Supabase Storage (`character_sheets`).
* **Cronômetro Apple Responsivo:** Modal inspirado no iOS com animação suave de roleta para contagem regressiva de 60 dias de pré-registro com suporte a Realtime WebSockets.
* **Integração Discord & Supabase:** Autenticação OAuth2, webhook com Rich Embeds diagramados e controle de acesso RBAC (`user`, `student`, `mod`, `admin`, `super_admin`).

---

## 🧙 Features Planejadas para o Servidor

| Sistema | Descrição |
| :--- | :--- |
| 🪄 **Magias** | Sistema expandido com feitiços canônicos e originais, maestria gradual e combos de duelo. |
| 📚 **Aulas & Casas** | Progressão acadêmica com matérias, tarefas em sala, exames N.O.M.s e Taça das Casas. |
| 💰 **Economia Viva** | Moedas do mundo bruxo (Galeões, Sicles, Knuts), lojas no Beco Diagonal e Hogsmeade. |
| 📜 **Quests Dinâmicas** | Missões com narrativa ramificada, eventos mundiais sazonais e ocorrências do Ministério. |
| 🤖 **NPCs & IA** | Personagens vivos com rotinas de dia/noite, memórias e diálogos contextuais. |
| 🦅 **Criaturas Mágicas** | Resgate, cuidados em vivário, vínculo mágico e montarias aladas. |
| ⚗️ **Herbologia & Poções** | Minigames de caldeirão, cultivo de plantas raras e alquimia avançada. |
| 🏠 **Acomodações** | Quartos comunais por Casa e propriedades residenciais customizáveis. |
| 💬 **Voz de Proximidade 3D** | Comunicação por voz espacializada (Opus), sussurros, eco em masmorras e correio coruja. |
| 🛡️ **Segurança & Anti-Cheat** | Servidor 100% autoritativo em Node.js com validação de inventário, feitiços e movimentação. |

---

## 🏗️ Arquitetura Técnica

```text
┌────────────────────────────────────────────────────────┐
│               VICCS ACCIO ROLEPLAY SERVER              │
├───────────────────────────┬────────────────────────────┤
│   Arcane MP (C++ Core)    │    Plataforma Web (React)  │
│   Node.js (Server Scripts)│    Vite 6 + Tailwind CSS   │
│   V8 Sandboxed (Clients)  │    Three.js + jsPDF        │
├───────────────────────────┼────────────────────────────┤
│   MySQL / MariaDB         │    Supabase Cloud          │
│   (Persistência Gameplay) │    (ACCIO_Rp / Realtime)   │
└───────────────────────────┴────────────────────────────┘
```

---

## 📁 Estrutura de Diretórios

```text
VICCS_Accio_HL_Server/
├── .agent/              # Cortex do Projeto (Contexto, Memória, Skills e Diretrizes)
├── scripts/             # Scripts de automação, processamento de assets e migração SQL
├── server/              # (Fase 1) Servidor Arcane MP e resources de gameplay
├── supabase/            # Configurações locais da CLI do Supabase
└── website/             # Aplicação web React do pré-registro oficial
```

---

## 📖 Documentação & Governança

Toda a documentação técnica, regras de arquitetura e procedimentos operacionais residem na pasta [`.agent/`](.agent/):

* [Visão Geral & Status Atual](.agent/overview/PROJECT_STATUS.md)
* [Arquitetura do Servidor](.agent/context/architecture.md)
* [Stack Tecnológico](.agent/context/stack.md)
* [Schema de Banco de Dados](.agent/context/database_schema.md)
* [Guia de Estilo de Código](.agent/guidelines/code_style.md)
* [Diretrizes de UI/UX](.agent/guidelines/ui_ux.md)
* [Artesão de Varinhas (Skill)](.agent/skills/wand-asset-artisan.md)

---

## 🔗 Repositórios Oficiais

* **Monorepo do Servidor:** [https://github.com/pauloviccs/VICCS_ACCIO.git](https://github.com/pauloviccs/VICCS_ACCIO.git)
* **Website Standalone:** [https://github.com/pauloviccs/accio_rp_website.git](https://github.com/pauloviccs/accio_rp_website.git)
* **Framework:** [Arcane MP](https://arcane.mp/)

---

*VICCS Accio — Accio, Aventura!* 🪄
