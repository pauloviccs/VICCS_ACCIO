# Skill: NPC e Beast System

## Quando Usar
Ao criar, configurar ou expandir NPCs (personagens não-jogáveis) e Beasts
(criaturas mágicas) no servidor VICCS Accio.

## NPCs no Arcane MP

### Classes Server-Side
```
NPC         → Personagem não-jogável (professores, lojistas, habitantes)
Beast       → Criatura mágica (hipogrifos, fwoopers, thestrals, etc.)
Character   → Base compartilhada para entidades com posição/movimento
```

### Spawn de NPC

```javascript
// ═══════════════════════════════════════════════════════════════
// Spawnar um NPC no mundo
// ═══════════════════════════════════════════════════════════════

const npc = new NPC({
    name: 'Professor Eleazar Fig',
    model: 'npc_eleazar_fig',
    position: { x: 1234.5, y: 567.8, z: 90.1 },
    rotation: 180.0,
    world: 0,
    invincible: true,
    interactable: true,
});

// Configurar comportamento
npc.stateBag.set('viccs:role', 'professor');
npc.stateBag.set('viccs:dialogueId', 'fig_greeting');
npc.stateBag.set('viccs:schedule', 'classroom_schedule_01');
```

### Config de NPCs (config/npcs.json)

```json
{
    "$schema": "viccs-config",
    "$resource": "viccs-npc",
    "$version": "1.0.0",
    "$description": "Definição e posicionamento de NPCs do servidor",

    "npcDefaults": {
        "invincible": true,
        "interactable": true,
        "respawnOnRestart": true,
        "interactRange": 3.0
    },

    "npcs": {
        "shopkeeper_hogsmeade_01": {
            "name": "Madame Rosetta",
            "model": "npc_shopkeeper_female_01",
            "role": "shopkeeper",
            "position": { "x": 1234.5, "y": 567.8, "z": 90.1 },
            "rotation": 180.0,
            "world": 0,
            "schedule": null,
            "dialogues": {
                "greeting": "Bem-vindo ao Três Vassouras! O que posso servir?",
                "farewell": "Volte sempre, querido!",
                "shopId": "shop_three_broomsticks"
            },
            "appearance": {
                "outfit": "shopkeeper_dress_01",
                "accessories": ["apron_01"]
            }
        },
        "professor_flitwick": {
            "name": "Professor Flitwick",
            "model": "npc_flitwick",
            "role": "professor",
            "position": { "x": 500.0, "y": 200.0, "z": 50.0 },
            "rotation": 0,
            "world": 0,
            "schedule": {
                "weekday": [
                    { "time": "08:00", "location": "charms_classroom", "action": "teach" },
                    { "time": "12:00", "location": "great_hall", "action": "eat" },
                    { "time": "14:00", "location": "charms_classroom", "action": "teach" },
                    { "time": "18:00", "location": "staff_lounge", "action": "idle" }
                ],
                "weekend": [
                    { "time": "10:00", "location": "library", "action": "read" },
                    { "time": "15:00", "location": "courtyard", "action": "patrol" }
                ]
            },
            "dialogues": {
                "greeting": "Ah, um aluno! Pronto para a aula de Feitiços?",
                "classActive": "Por favor, tome seu lugar. A aula vai começar!",
                "classInactive": "Estou ocupado agora. Volte no horário da aula."
            }
        }
    }
}
```

## Beasts (Criaturas Mágicas)

### Spawn de Beast

```javascript
const beast = new Beast({
    species: 'hippogriff',
    name: 'Buckbeak',
    position: { x: 2000.0, y: 300.0, z: 10.0 },
    world: 0,
});

// Opções de movimento
beast.move({
    target: { x: 2100.0, y: 300.0, z: 10.0 },
    speed: 'walk',
});

// Follow player
beast.follow({
    target: player,
    distance: 5.0,
    speed: 'walk',
});
```

### Config de Beasts (config/beasts.json)

```json
{
    "$schema": "viccs-config",
    "$resource": "viccs-beasts",
    "$version": "1.0.0",
    "$description": "Definição de criaturas mágicas",

    "beastDefaults": {
        "respawnTimeMs": 300000,
        "capturable": true,
        "tameable": true,
        "maxBondingLevel": 10
    },

    "species": {
        "hippogriff": {
            "name": "Hipogrifo",
            "rarity": "uncommon",
            "baseHealth": 200,
            "baseSpeed": 1.5,
            "rideable": true,
            "flyable": true,
            "behaviors": ["patrol", "graze", "sleep", "flee"],
            "tamingRequirements": {
                "food": "ferret",
                "minBondingForMount": 5,
                "approachSpeed": "slow",
                "bowRequired": true
            },
            "drops": {
                "hippogriff_feather": { "chance": 0.3, "quantity": [1, 3] }
            },
            "spawns": [
                { "zone": "forbidden_forest_east", "count": 3, "world": 0 },
                { "zone": "highlands_north", "count": 2, "world": 0 }
            ]
        },
        "niffler": {
            "name": "Pelúcio",
            "rarity": "common",
            "baseHealth": 50,
            "baseSpeed": 2.0,
            "rideable": false,
            "flyable": false,
            "behaviors": ["patrol", "dig", "steal_shiny", "hide"],
            "tamingRequirements": {
                "food": "gold_coin",
                "minBondingForMount": null,
                "approachSpeed": "normal",
                "bowRequired": false
            },
            "drops": {
                "niffler_fur": { "chance": 0.5, "quantity": [1, 2] }
            },
            "specialAbility": {
                "name": "Detector de Tesouros",
                "description": "Encontra itens escondidos no chão próximo",
                "range": 15.0,
                "cooldownMs": 60000
            }
        }
    },

    "vivariumSlots": {
        "maxBeastsPerVivarium": 12,
        "vivariumTypes": ["forest", "swamp", "coast", "grassland"],
        "feedingCooldownMs": 300000,
        "brushingCooldownMs": 300000,
        "bondingXpPerFeed": 10,
        "bondingXpPerBrush": 15
    }
}
```

## Fluxo de Interação com NPC

```
1. Client detecta proximity com NPC
   └► Events.emit('viccs:npc:approachPrompt', { npcId })

2. Server valida e envia dados do NPC
   └► Events.emit(player, 'viccs:npc:showInteract', { npcData })

3. Client mostra prompt de interação ("E para interagir")

4. Jogador interage
   └► Events.emit('viccs:npc:interact', { npcId })

5. Server processa baseado no role do NPC:
   ├── shopkeeper → abre loja (viccs-shops)
   ├── professor  → inicia aula/diálogo (viccs-classes)
   ├── questgiver → oferece/progride missão (viccs-quests)
   └── generic    → diálogo genérico

6. Server emite eventos para o resource responsável
```

## Regras

1. **NPCs são spawned pelo SERVER** — client renderiza
2. **Posições e schedules** vêm do config — NUNCA hardcoded
3. **Diálogos** suportam variáveis: `{player.name}`, `{player.house}`
4. **Beasts** respeitam o sistema de zonas do viccs-world
5. **Captura de beasts** é validada no server (anti-cheat)
6. **StateBags** controlam estado visual dos NPCs (animação, equipamento)

