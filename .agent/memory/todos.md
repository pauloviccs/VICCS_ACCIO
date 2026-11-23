# TODO List — VICCS Accio HL Server

## Fase 0 — Biblioteca de Contexto ✅
- [x] Criar .agent/context/architecture.md
- [x] Criar .agent/context/stack.md
- [x] Criar .agent/context/database_schema.md
- [x] Criar .agent/guidelines/code_style.md
- [x] Criar .agent/guidelines/ui_ux.md
- [x] Criar .agent/guidelines/resource_conventions.md
- [x] Criar skills de desenvolvimento
- [x] Criar planos de implementação
- [x] Criar PROJECT_STATUS.md

## Plataforma Web & Pré-Registro (Fase 1.2 / 1.3) ✅
- [x] Scaffolding do projeto web com Vite, React 19, TypeScript e Tailwind CSS v4
- [x] Modal interativo da Carta de Hogwarts abrindo em perspectiva 3D na primeira visita
- [x] Autenticação OAuth2 via Discord associada ao pré-registro oficial
- [x] Estandartes 3D das Quatro Casas com WebGL Three.js e física de tecido
- [x] Criação de personagem no padrão de console de Hogwarts Legacy (sem arrasto de imagens)
- [x] 11 famílias canônicas de cabos de varinhas recortadas em PNG transparente com OpenCV
- [x] Pedestal cinematográfico de inspeção com modos 3D Macro e Guia de Campo
- [x] Seletores canônicos de Garrick Ollivanders (madeira, núcleos canônicos, comprimento e flexibilidade)
- [x] Motor universal de cores e temas dinâmicos das 4 Casas com transição suave de 0.8s
- [x] Cronômetro Apple Timer responsivo com roleta animada sincronizado via Realtime
- [x] Gerador de pergaminho oficial de admissão em PDF com jsPDF/html2canvas e upload em Storage
- [x] Webhook Discord com Rich Embed diagramado formatado para cada nova submissão
- [x] Migração oficial do banco de dados Supabase no projeto ACCIO_Rp (siwjyavftankitbdagzo)
- [x] Controle de acesso RBAC no banco de dados (user, student, mod, admin, super_admin)
- [x] Sincronização e deploy nos repositórios Git (monorepo e standalone website)

## Fase 1 — Setup do Servidor Arcane MP ⏳
- [ ] Instalar Arcane MP Server no diretório `server/`
- [ ] Configurar `server.json`
- [ ] Configurar banco MySQL/MariaDB (via hmp-mysql)
- [ ] Conectar banco de gameplay com o pipeline de contas aprovadas no Supabase
- [ ] Testar conexão local básica de rede (MafiaNet UDP)
- [ ] Instalar HMP Foundations
- [ ] Validar carregamento de resources base

## Fase 2 — Core Resources
- [ ] Desenvolver viccs-core (identidade, permissões, API compartilhada)
- [ ] Desenvolver viccs-ui (componentes visuais padrão CEF)
- [ ] Desenvolver viccs-characters (sincronização de aparência e varinhas do site para o jogo)
- [ ] Configurar sistema de eventos cross-resource

## Fase 3 — Sistemas de Gameplay
- [ ] viccs-spells (magias customizadas, cooldowns e partículas)
- [ ] viccs-inventory (inventário com slots de varinha e cabos)
- [ ] viccs-economy (sistema econômico de Galeões, Sicles e Knuts)
- [ ] viccs-combat (PvP e PvE com duelos formais)
- [ ] viccs-classes (aulas acadêmicas, matérias e pontuação das Casas)
- [ ] viccs-quests (missões dinâmicas e chains)

## Fase 4 — Mundo e Imersão
- [ ] viccs-world (clima dinâmico, ciclo dia/noite, estações)
- [ ] viccs-npc (NPCs com inteligência, schedules e diálogos)
- [ ] viccs-beasts (criaturas mágicas e vivários)
- [ ] viccs-housing (acomodações comunais e casas de jogadores)
- [ ] viccs-crafting (herbologia e caldeirões de poções)
- [ ] viccs-social (chat RP por proximidade, emotes e correio coruja)

## Fase 5 — Administração e Plataforma
- [ ] viccs-admin (painel in-game para moderação e anti-cheat server-side)
- [ ] Painel web ministerial conectado ao Supabase para aprovação de fichas

## Fase 6 — Polish e Launch
- [ ] Testes de carga e stress testing
- [ ] Balanceamento geral de feitiços e economia
- [ ] Beta fechado para pioneiros pré-registrados
- [ ] Lançamento público oficial
