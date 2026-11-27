# Arquitetura do Servidor VICCS — Arcane MP

## Visão Geral

O VICCS Accio é um servidor de Roleplay MMO-RPG ambientado no universo de Hogwarts Legacy, construído sobre o framework **Arcane MP** (antigo HogwartsMP), que por sua vez é baseado no **MafiaHub Framework** (C++).

```
┌─────────────────────────────────────────────────────────────────┐
│                     CAMADA DE APRESENTAÇÃO                       │
│  Website (React 19 + Vite 6 + Three.js) │ Painel Admin │ Arcane MP│
└─────────────────────┬───────────────────────┬───────────────────┘
                      │                       │
┌─────────────────────▼───────────────────────▼───────────────────┐
│                     CAMADA CLIENT-SIDE                            │
│  V8 Sandbox │ CEF UI Panels (HTML/CSS/JS) │ HUD │ Inputs        │
│  clientScripts → Renderização local, câmera, UI overlays        │
└─────────────────────┬───────────────────────────────────────────┘
                      │ Events.emit / Events.on (Event Bus)
┌─────────────────────▼───────────────────────────────────────────┐
│                     CAMADA SERVER-SIDE                            │
│  Node.js Runtime │ serverScripts │ Lógica autoritativa          │
│  Players │ NPCs │ Beasts │ World │ StateBags │ Zones            │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│                     CAMADA DE DADOS                              │
│  Supabase (PostgreSQL + Auth + Storage + Realtime + Edge Funcs) │
│  MySQL/MariaDB (HMP Foundations via hmp-mysql)                  │
└─────────────────────────────────────────────────────────────────┘
```

## Modelo de Execução (Runtime)

### Server Runtime (Node.js)
- **Autoridade absoluta** sobre o estado do jogo
- Valida TODAS as ações dos jogadores antes de aplicar
- Gerencia: Players, NPCs, Beasts, World Objects, Zones, StateBags
- Acesso a banco de dados, lógica de negócio, anti-cheat

### Client Runtime (V8 Sandboxed)
- Executa em contexto V8 isolado no cliente
- Gerencia: Apresentação local, câmera, inputs, HUD, animações locais
- **NÃO tem acesso** ao banco de dados ou lógica privilegiada
- Comunica-se com o servidor APENAS via Event Bus

### CEF UI Panels (Chromium Embedded Framework)
- Interface web renderizada sobre o jogo
- HTML/CSS/JS padrão para menus, inventários, diálogos, HUD
- Declarados na seção `files` do `package.json` do resource

## Modelo de Comunicação

```
Client (V8)  ──Events.emit("requestAction", data)──►  Server (Node.js)
                                                           │
                                                     [Validação]
                                                     [Lógica]
                                                     [Persistência]
                                                           │
Client (V8)  ◄──Events.emit("actionResult", result)───────┘
```

### StateBags (Estado Replicado)
- Key-value stores anexados a entidades (Player, WorldObject, etc.)
- Sincronizam automaticamente via rede para clientes relevantes
- **EFÊMEROS** — para estado de sessão (UI toggles, visual states, buffs temporários)
- **NÃO substituem** persistência em banco de dados

## Estrutura de Resources

Cada funcionalidade é um **Resource** independente, dividido em duas camadas complementares integradas via **Ponte Universal (`viccs-core/server/ecosystemBridge.js`)**:

```text
server/resources/
├── hmp-* (30 módulos)    # HMP Foundations v0.12.0 (base física, inventário, casas, bancos, lojas, feitiços, duelos, etc.)
│                         # Visual unificado com viccs-ui + localização PT-BR + sync de [data-house-theme]
├── viccs-core/           # [ATIVO] Identidade, EraGate, auditoria, safeImport, ticketBridge e Ponte Universal HMP <-> VICCS
├── viccs-ui/             # [ATIVO] Design system CEF compartilhado (tokens.css, ornaments.js), Pergaminho, Fade e Olho Mágico (Alt)
├── viccs-characters/     # [ATIVO] Perfis, 11 famílias de varinhas, ponte Supabase e pré-preenchimento do criador
├── viccs-sorting/        # [ATIVO] Cerimônia do Chapéu Seletor (12 dilemas, Hatstall < 1.6, sessão DB e hmp-houses)
├── viccs-spells/         # [FASE 3] Sistema de magias customizado
├── viccs-inventory/      # [FASE 3] Inventário expandido
├── viccs-economy/        # [FASE 3] Economia, comércio, Galeões
├── viccs-quests/         # [FASE 3] Sistema de missões
├── viccs-classes/        # [FASE 3] Aulas e progressão acadêmica
├── viccs-combat/         # [FASE 3] PvP e PvE expandido
├── viccs-world/          # [FASE 4] Gestão do mundo, clima, tempo
├── viccs-npc/            # [FASE 4] NPCs customizados com IA
├── viccs-beasts/         # [FASE 4] Criaturas mágicas expandidas
├── viccs-housing/        # [FASE 4] Habitações de jogadores
├── viccs-crafting/       # [FASE 4] Poções, Herbologia, Crafting
├── viccs-social/         # [FASE 4] Chat RP, emotes, interações
└── viccs-admin/          # [FASE 5] Ferramentas avançadas de administração
```

## Princípios Arquiteturais

1. **Modularidade Total**: Cada resource é independente, com dependências declaradas
2. **Config-Driven**: Toda mecânica parametrizada via arquivos de config (JSON/YAML)
3. **Event-Driven**: Comunicação via Event Bus — zero acoplamento direto
4. **Server-Authoritative**: Servidor SEMPRE valida — cliente NUNCA tem autoridade
5. **Ecossistema Coeso**: Resources conversam via eventos padronizados e APIs compartilhadas
6. **Consistência Visual**: Código segue EXATAMENTE o mesmo padrão em todos os arquivos

