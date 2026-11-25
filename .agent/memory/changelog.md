# Changelog — VICCS Accio HL Server

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
