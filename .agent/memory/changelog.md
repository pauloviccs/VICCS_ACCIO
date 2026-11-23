# Changelog — VICCS Accio HL Server

## [0.1.0] — 2026-11-23

### Adicionado
- **Plataforma Web de Pré-Registro Completa (`website/`):**
  - Aplicação construída com React 19, Vite 6, TypeScript e Tailwind CSS v4.
  - Animação da Carta de Convocação de Hogwarts em 3D com selo de cera lacrado.
  - Autenticação OAuth2 via Discord conectada ao fluxo de emissão do bilhete de pioneiro.
  - Estandartes 3D das quatro Casas em Three.js com simulação física de vento em tecido e iluminação de tochas medievais.
  - Motor universal de temas dinâmicos das Quatro Casas com transição GPU de 0.8s, adaptando fundos, letterings, partículas e botões.
  - Criação de personagem no padrão de console de Hogwarts Legacy com 11 famílias de cabos de varinhas recortadas em PNG transparente com OpenCV (remoção de arrasto nativo de mouse).
  - Pedestal cinematográfico com alternador entre `3D Macro` e `Guia de Campo` (pergaminho do século XIX).
  - Seletores canônicos de dormitórios (`Bruxo/Wizard` vs `Bruxa/Witch`), linhagens arcanas e os Três Grandes Núcleos de Garrick Ollivanders.
  - Gerador de pergaminho oficial de matrícula em PDF estilizado com brasão heráldico, dados da varinha e upload automático em nuvem.
  - Cronômetro Apple Timer responsivo com roleta inspirada no iOS para controle do prazo de 60 dias de pré-registro com suporte a Realtime WebSockets.
  - Disparo de notificações diagramadas via Webhook Ministerial no Discord a cada novo registro.
  - Skill permanente documentada: `wand-asset-artisan.md` cobrindo a taxonomia das 11 famílias de varinhas de HL.

### Corrigido & Migrado
- **Migração do Banco de Dados Supabase Oficial (`ACCIO_Rp`):**
  - Descoberto e corrigido o apontamento incorreto do `.env` anterior (que apontava para um projeto legado de portfólio).
  - Executada a migração oficial no projeto `ACCIO_Rp` (`siwjyavftankitbdagzo`) da organização `VICCS`.
  - Criadas e ativadas as tabelas `character_applications`, `accio_settings` e `user_roles`.
  - Configurado o bucket de armazenamento público `character_sheets` para PDFs com limite de 10MB.
  - Implementadas políticas de Row Level Security (RLS) e publicações no `supabase_realtime`.
  - PauloViccs configurado com cargo `super_admin` no RBAC.
  - Registro pioneiro de validação gravado com sucesso no Supabase e refletido no contador do site (`1 / 100`).

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
