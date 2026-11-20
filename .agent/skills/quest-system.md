# Skill: Sistema de Quests e Missões

## Quando Usar
Ao criar, configurar ou expandir o sistema de missões dinâmicas — incluindo
quests principais, side quests, quests diárias, eventos sazonais, e chains
de missões multi-etapa.

## Arquitetura de Quests

```
┌─────────────────────────────────────────────────────────┐
│                     viccs-quests                         │
│                                                         │
│  Quest Engine                                           │
│  ├── Quest Definitions (config/quests/*.json)           │
│  ├── Quest Tracker (progresso por personagem)           │
│  ├── Objective System (kill, collect, talk, discover)   │
│  ├── Reward System (XP, Galeões, items, spells)        │
│  └── Quest Chain Manager (sequências multi-quest)       │
│                                                         │
│  Tipos de Quest:                                        │
│  ├── main      → Linha principal de história            │
│  ├── side      → Missões secundárias                    │
│  ├── daily     → Resetam diariamente                    │
│  ├── weekly    → Resetam semanalmente                   │
│  ├── seasonal  → Eventos temporários                    │
│  ├── house     → Específicas por Casa                   │
│  └── hidden    → Descobertas por exploração             │
└─────────────────────────────────────────────────────────┘
```

## Config de Quest (config/quests/example-quest.json)

```json
{
    "questId": "quest_forbidden_forest_patrol",
    "name": "Patrulha na Floresta Proibida",
    "description": "Algo estranho está acontecendo na Floresta Proibida. Investigue os distúrbios relatados pelo guarda-caça.",
    "type": "side",
    "level": 15,
    "repeatable": false,
    "chainId": "chain_dark_secrets",
    "chainOrder": 1,

    "prerequisites": {
        "minLevel": 10,
        "questsCompleted": ["quest_hogwarts_intro"],
        "houseRequired": null,
        "itemRequired": null
    },

    "giver": {
        "npcId": "hagrid",
        "location": "hagrids_hut",
        "dialogueStart": "Ah, {player.name}! Preciso da tua ajuda. Tem algo esquisito acontecendo na floresta..."
    },

    "stages": [
        {
            "stageId": 1,
            "description": "Fale com Hagrid sobre os distúrbios",
            "objectives": [
                {
                    "type": "talk",
                    "target": "hagrid",
                    "count": 1,
                    "dialogue": "Os thestrals tão agitados, as aranhas fogem pro norte... Nunca vi nada assim."
                }
            ],
            "onComplete": {
                "dialogue": "Vai lá dar uma olhada, mas toma cuidado!",
                "marker": { "zone": "forbidden_forest_entrance", "blipIcon": "quest_marker" }
            }
        },
        {
            "stageId": 2,
            "description": "Investigue a Floresta Proibida (0/3 pistas)",
            "objectives": [
                {
                    "type": "interact",
                    "target": "clue_broken_branches",
                    "count": 1,
                    "hint": "Examine os galhos quebrados"
                },
                {
                    "type": "interact",
                    "target": "clue_dark_residue",
                    "count": 1,
                    "hint": "Analise o resíduo escuro no chão"
                },
                {
                    "type": "interact",
                    "target": "clue_claw_marks",
                    "count": 1,
                    "hint": "Examine as marcas de garras na árvore"
                }
            ],
            "onComplete": {
                "dialogue": "",
                "event": "viccs:quests:forestAmbush"
            }
        },
        {
            "stageId": 3,
            "description": "Derrote as criaturas corrompidas",
            "objectives": [
                {
                    "type": "kill",
                    "target": "corrupted_spider",
                    "count": 5
                }
            ],
            "onComplete": {
                "dialogue": "",
                "marker": { "zone": "hagrids_hut", "blipIcon": "quest_return" }
            }
        },
        {
            "stageId": 4,
            "description": "Relate suas descobertas a Hagrid",
            "objectives": [
                {
                    "type": "talk",
                    "target": "hagrid",
                    "count": 1,
                    "dialogue": "Criaturas corrompidas?! Isso é muito ruim... Preciso avisar Dumbledore. Obrigado, {player.name}."
                }
            ]
        }
    ],

    "rewards": {
        "xp": 500,
        "galleons": 75,
        "items": [
            { "itemId": "potion_wiggenweld_large", "quantity": 3 }
        ],
        "spells": [],
        "housePoints": 20,
        "unlocks": {
            "nextQuest": "quest_dark_secrets_02",
            "area": null,
            "ability": null
        }
    },

    "failConditions": {
        "timeLimit": null,
        "deathLimit": null,
        "canAbandon": true
    }
}
```

## Tipos de Objetivos

```javascript
const OBJECTIVE_TYPES = {
    'talk':       // Falar com NPC específico
    'kill':       // Derrotar N criaturas/inimigos
    'collect':    // Coletar N itens
    'interact':   // Interagir com objeto do mundo
    'discover':   // Chegar em localização
    'escort':     // Acompanhar NPC até destino
    'deliver':    // Entregar item a NPC
    'craft':      // Craftar item específico
    'cast':       // Lançar magia específica N vezes
    'survive':    // Sobreviver por N segundos
    'photograph': // Fotografar criatura/local (VICCS custom)
    'tame':       // Domesticar criatura específica
    'attend':     // Participar de aula
    'duel':       // Vencer N duelos
};
```

## Fluxo de Quest

```
1. Jogador interage com NPC quest giver
   └► 'viccs:npc:interact' → Server verifica quests disponíveis

2. Server verifica prerequisites
   ├── Nível do personagem
   ├── Quests anteriores completadas
   └── Requisitos especiais

3. Se elegível → oferece quest ao jogador
   └► UI de quest com descrição e recompensas

4. Jogador aceita → quest_progress criado no banco
   └► Stage 1 ativado, objetivos rastreados

5. Jogador completa objetivos
   └► Eventos do ecossistema alimentam o tracker:
       ├── 'viccs:combat:kill' → atualiza kill objectives
       ├── 'viccs:inventory:itemAdded' → atualiza collect objectives
       ├── 'viccs:npc:interact' → atualiza talk objectives
       └── 'viccs:world:areaDiscovered' → atualiza discover objectives

6. Stage completo → próximo stage ativado

7. Quest completa → recompensas distribuídas
   ├── XP (viccs-core)
   ├── Galeões (viccs-economy)
   ├── Items (viccs-inventory)
   ├── House Points (viccs-houses)
   └── Unlocks (próxima quest, área, habilidade)
```

## Regras

1. **Quests são definidas em JSON** — 100% configuráveis sem código
2. **Progresso é persistido** no banco a cada objetivo completado
3. **Objetivos escutam eventos** do ecossistema — zero acoplamento direto
4. **Recompensas são distribuídas pelo server** — client mostra UI apenas
5. **Quest chains** respeitam ordem e prerequisites automaticamente
6. **Daily/Weekly quests** resetam via scheduler do server

