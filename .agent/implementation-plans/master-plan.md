# Plano de Implementação — VICCS Accio HL Server

## Visão Geral das Fases

```
Fase 0 ✅  Biblioteca de Contexto (.agent cortex)
Fase 1 ⏳  Setup do Servidor e Infraestrutura (Arcane MP em server/; Supabase ACCIO_Rp ✅)
Fase 2 ⏳  Core Resources (fundação do ecossistema)
Fase 3 ⏳  Sistemas de Gameplay (mecânicas principais)
Fase 4 ⏳  Mundo e Imersão (NPCs, beasts, world)
Fase 5 ✅/⏳ Administração e Plataforma Web (Website Pré-Registro & Painel Admin Web ✅; viccs-admin ⏳)
Fase 6 ⏳  Polish, Testes e Launch
```

---

## Fase 1 — Setup do Servidor e Infraestrutura

### Objetivos
- Servidor Arcane MP funcional localmente
- Banco de dados MySQL/MariaDB configurado
- Projeto Supabase configurado
- HMP Foundations instalado e validado

### Tarefas
1. Baixar/instalar Arcane MP Server
2. Configurar `server.json` (nome, porta, maxPlayers, etc.)
3. Instalar e configurar MySQL/MariaDB
4. Configurar conexão no `hmp-mysql`
5. Criar projeto Supabase (Auth, Storage, Database)
6. Instalar HMP Foundations (todos os resources `hmp-*`)
7. Validar que o servidor inicia e aceita conexões
8. Testar spawn básico de jogador

### Critério de Sucesso
- Servidor roda localmente sem erros
- Jogador conecta e spawna no mundo
- Banco de dados acessível e funcional

---

## Fase 2 — Core Resources

### Objetivos
- Fundação do ecossistema VICCS
- API compartilhada para todos os resources
- Framework UI customizado
- Sistema de personagens expandido

### Resources
1. **viccs-core** (priority: 20)
   - API compartilhada (exports de utilidades)
   - Sistema de permissões estendido
   - Player data management
   - Server tick system
   - Event bus helpers

2. **viccs-ui** (priority: 25)
   - Componentes visuais padrão (Wizarding Elegance)
   - Notifications, dialogs, context menus
   - Tooltips, progress bars, tabs
   - Sistema de temas por Casa

3. **viccs-characters** (priority: 30)
   - Criação de personagem expandida
   - Backstory, personalidade, objetivos RP
   - Aparência customizada
   - Multi-character management

### Critério de Sucesso
- viccs-core exporta API funcional consumida por outros resources
- viccs-ui renderiza componentes com estética Wizarding Elegance
- Jogadores criam personagens com atributos customizados

---

## Fase 3 — Sistemas de Gameplay

### Objetivos
- Mecânicas centrais de jogo funcionais
- Sistemas integrados via Event Bus
- Tudo configurável via JSON

### Resources (em ordem de prioridade)
1. **viccs-spells** (priority: 40)
   - Sistema de magias completo
   - Cooldowns, mastery, efeitos
   - Integração com combat

2. **viccs-inventory** (priority: 42)
   - Inventário expandido
   - Slots customizados
   - Transferências atômicas

3. **viccs-economy** (priority: 44)
   - Sistema de Galeões/Sicles/Knuts
   - API de transações
   - Anti-exploit

4. **viccs-combat** (priority: 46)
   - PvP e PvE expandido
   - Duelos formais
   - Sistema de dano integrado

5. **viccs-classes** (priority: 48)
   - Matérias e progressão acadêmica
   - Schedule de aulas
   - Sistema de XP por matéria

6. **viccs-quests** (priority: 50)
   - Missões dinâmicas
   - Quest chains
   - Objetivos multi-tipo

### Critério de Sucesso
- Jogador lança magias, compra items, completa quests
- Sistemas conversam entre si via eventos
- Toda mecânica ajustável via config sem tocar em código

---

## Fase 4 — Mundo e Imersão

### Resources
1. **viccs-world** — Clima, tempo, zonas, eventos mundiais
2. **viccs-npc** — NPCs com IA, schedules, diálogos
3. **viccs-beasts** — Criaturas mágicas expandidas
4. **viccs-housing** — Habitações de jogadores
5. **viccs-crafting** — Poções, Herbologia, crafting completo
6. **viccs-social** — Chat RP, emotes, owl mail

---

## Fase 5 — Administração e Plataforma

### Resources e Projetos
1. **viccs-admin** — Ferramentas de moderação avançadas
2. **Website** — Site público (informações, regras, aplicações)
3. **Painel Admin Web** — Gestão remota via Supabase

---

## Fase 6 — Polish e Launch

1. Testes de carga e performance
2. Balanceamento de mecânicas (via config ajustments)
3. Documentação para jogadores
4. Beta fechado com community testers
5. Iteração baseada em feedback
6. Launch público

