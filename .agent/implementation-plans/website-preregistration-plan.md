# Plano de Execução — Website de Pré-Registro VICCS Accio

## 1. Visão Geral e Objetivo "North Star"
Desenvolver a aplicação web oficial de pré-lançamento do servidor **VICCS Accio (Hogwarts Legacy Roleplay)**, focada em:
- **Geração de FOMO e Retenção Brutal:** Sensação de lote pioneiro exclusivo e urgência antes do lançamento.
- **Identidade Visual Absoluta (IDV):** Fidelidade matemática à paleta oficial (#160504, #5B1009, #B83A0C, #F47A16, #FFC34F, #FFF0B2) e aos elementos estelares/arcanos do emblema ACCIO combinados com a estética nobre de Hogwarts Legacy.
- **Gate de Autenticação Discord:** Login obrigatório via Discord antes de liberar o formulário profundo.
- **Formulário de Whitelist & Ficha Arcane MP:** Coleta dos dados necessários para integração com os recursos `hmp-core` e `hmp-characters` do Arcane MP, com campo de história de no mínimo 3.000 palavras e proteção de auto-save.
- **Banco de Dados Supabase:** Persistência relacional com Row Level Security (RLS) e sincronização via Supabase MCP.
- **Micro-interações Apple-like:** Modais com física spring, bottom sheets no mobile, backdrop blur denso e feedback visual de toque.

---

## 2. Stack Tecnológico

| Camada | Tecnologia | Motivo da Escolha |
|---|---|---|
| **Framework Web** | Next.js 15 (App Router) + React 19 | SSR para SEO/Meta tags do Discord, rotas de API para OAuth, performance de ponta |
| **Estilização** | Tailwind CSS v4 + PostCSS | Tokenização nativa da paleta VICCS, classes utilitárias e facilidade para design responsivo |
| **Animações** | Framer Motion + CSS Spring Physics | Animações nível Apple (bottom sheets, springs fluidos, micro-interações sem lag) |
| **Efeitos Visuais** | Canvas HTML5 (Partículas Mágicas / Poeira Cósmica) | Efeito estelar atmosférico leve e otimizado para mobile (60-120fps) |
| **Autenticação & DB** | Supabase (PostgreSQL + Auth Discord) | Gerenciamento de sessão, RLS para segurança, facilidade via MCP |
| **Ícones** | Lucide React | Ícones minimalistas e refinados |

---

## 3. Identidade Visual (IDV) — Sistema de Tokens

### 3.1 Paleta Cromática Oficial
- **Vinho Profundo:** `#160504` (Background primário, imersão total)
- **Borgonha Arcano:** `#5B1009` (Superfícies de cards, fundos de modal, gradientes)
- **Âmbar Queimado:** `#B83A0C` (Contornos de destaque, brilho de energia)
- **Laranja Astral:** `#F47A16` (Badges de alerta, acentos vivos)
- **Ouro Luminoso:** `#FFC34F` (Botões de ação primária, títulos nobres, estrelas)
- **Marfim Estelar:** `#FFF0B2` (Tipografia primária, pontos de luz, alta legibilidade)

### 3.2 Gradientes & Sombras
- **Fundo Radiante:** `radial-gradient(ellipse at top, #401008 0%, #210604 55%, #100303 100%)`
- **Gradiente Dourado Nobre:** `linear-gradient(135deg, #FFF0B2 0%, #FFC34F 35%, #F47A16 70%, #FFE28A 100%)`
- **Glassmorphism Arcano:** `background: rgba(33, 6, 4, 0.75); backdrop-filter: blur(24px); border: 1px solid rgba(255, 195, 79, 0.25);`
- **Glow Mágico Apple:** `box-shadow: 0 0 35px rgba(244, 122, 22, 0.25), inset 0 1px 0 rgba(255, 240, 178, 0.2);`

---

## 4. Arquitetura do Banco de Dados (Supabase PostgreSQL)

### 4.1 Tabelas

#### Tabela `profiles` (Extensão do `auth.users`)
- `id` (UUID, PK referenciando `auth.users.id`)
- `discord_id` (TEXT, NOT NULL, UNIQUE — Snowflake do Discord para Arcane MP)
- `discord_username` (TEXT, NOT NULL)
- `discord_avatar` (TEXT)
- `email` (TEXT)
- `created_at` (TIMESTAMPTZ DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ DEFAULT NOW())

#### Tabela `character_applications` (Ficha & História)
- `id` (UUID, PK DEFAULT gen_random_uuid())
- `user_id` (UUID, FK -> `profiles.id`, UNIQUE)
- `registration_number` (INT GENERATED ALWAYS AS IDENTITY) — Usado para o ticket `#ACCIO-XXXX`
- `first_name` (TEXT NOT NULL) — Nome do personagem
- `last_name` (TEXT NOT NULL) — Sobrenome do personagem
- `birth_date` (DATE NOT NULL) — Data de nascimento no universo bruxo
- `birth_place` (TEXT NOT NULL) — Local de nascimento
- `blood_status` (TEXT NOT NULL) — Sangue-Puro, Mestiço, Nascido-Trouxa
- `preferred_house` (TEXT NOT NULL) — Grifinória, Sonserina, Corvinal, Lufa-Lufa
- `wand_wood` (TEXT NOT NULL) — Madeira da varinha
- `wand_core` (TEXT NOT NULL) — Núcleo mágico
- `wand_length` (TEXT NOT NULL) — Comprimento em polegadas
- `wand_flexibility` (TEXT NOT NULL) — Flexibilidade
- `patronus` (TEXT) — Forma do Patrono (opcional ou não corpóreo)
- `character_backstory` (TEXT NOT NULL) — Mínimo de 3.000 palavras
- `word_count` (INT NOT NULL) — Contagem validada
- `rp_experience` (TEXT) — Resumo de experiências anteriores em RP
- `rules_accepted` (BOOLEAN DEFAULT TRUE)
- `status` (TEXT DEFAULT 'pending') — 'pending', 'approved', 'rejected', 'revision_requested'
- `reviewer_notes` (TEXT)
- `reviewed_by` (TEXT)
- `created_at` (TIMESTAMPTZ DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ DEFAULT NOW())

### 4.2 Políticas de Segurança (Row Level Security - RLS)
- Usuários autenticados podem ver e editar apenas seu próprio perfil e aplicação.
- Acesso de leitura público bloqueado para dados sensíveis.
- Service Role (Server Arcane MP) possui bypass de RLS para sincronizar o jogador quando ele conectar no jogo.

---

## 5. Engenharia de UX & Elementos de FOMO

1. **Hero com Contagem Regressiva e Lote Limitado:**
   - Display imersivo com contador de tempo para a abertura da Whitelist Alfa.
   - Indicador de vagas: *"Apenas 100 cartas de admissão liberadas para o 1º Lote de Pioneiros"*.
2. **Gate de Discord sem Fricção:**
   - O jogador visualiza a ambientação, mas para abrir a ficha de personagem precisa clicar em *"Conectar com Discord e Reivindicar sua Carta de Hogwarts"*.
3. **Editor de História Resiliente (Zero Data Loss):**
   - 3.000 palavras é um texto denso (aprox. 6 a 8 páginas).
   - O sistema terá **Auto-save em LocalStorage a cada 3 segundos**. Se o navegador fechar ou a bateria do celular acabar, o jogador não perde uma vírgula.
   - Barra de progresso circular estilo Apple com contador `[ 1.450 / 3.000 palavras ]` e mudança de cor para ouro quando a meta é batida.
4. **Ticket de Embarque "Expresso de Hogwarts" (Passagem de Embarque):**
   - Após enviar com sucesso, um modal Apple-like exibe um bilhete mágico personalizado com seu nome, número de registro (`#ACCIO-0089`), casa e QR code, pronto para compartilhar no Instagram/Discord gerando viralização.

---

## 6. Etapas de Implementação

- **Etapa 1:** Configuração do banco Supabase via MCP (executar DDL das tabelas `profiles` e `character_applications`, views e triggers de updated_at).
- **Etapa 2:** Scaffolding da aplicação Next.js na pasta `website/` com Tailwind CSS e dependências.
- **Etapa 3:** Integração dos assets da IDV (SVG do logotipo, gradientes, ícones e fontes).
- **Etapa 4:** Construção dos componentes de Front-End:
  - Hero com Canvas de partículas mágicas e contador de vagas.
  - Modal de autenticação e estado de sessão do Discord.
  - Formulário guiado em etapas (Identidade -> Varinha -> História 3.000 palavras -> Revisão).
  - Modal Apple-like de confirmação com Ticket interativo.
- **Etapa 5:** Testes responsivos (Mobile touch, iOS notch/safe-areas, Android) e validação de 100% dos requisitos.

