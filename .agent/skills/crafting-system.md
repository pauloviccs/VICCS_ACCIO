# Skill: Sistema de Crafting (Poções, Herbologia, Encantamentos)

## Quando Usar
Ao criar, configurar ou expandir o sistema de crafting do servidor — incluindo
preparação de poções, cultivo de plantas, e enchantment de equipamentos.

## Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                    viccs-crafting                         │
│                                                         │
│  Subsistemas:                                           │
│  ├── Poções (Potions)                                   │
│  │   └── Estações de poções, receitas, ingredientes     │
│  ├── Herbologia (Herbology)                             │
│  │   └── Cultivo, colheita, greenhouse management       │
│  ├── Encantamentos (Enchanting)                         │
│  │   └── Upgrade de equipamentos, runas, gems           │
│  └── Alquimia Avançada (VICCS Custom)                   │
│      └── Combinações experimentais, descobertas         │
│                                                         │
│  Integra com:                                           │
│  ├── viccs-inventory  → Materiais e produtos            │
│  ├── viccs-economy    → Custo e venda de crafts         │
│  ├── viccs-classes    → Desbloqueia receitas por nível  │
│  └── viccs-quests     → Craft como objetivo de quest    │
└─────────────────────────────────────────────────────────┘
```

## Config de Receitas (config/recipes.json)

```json
{
    "$schema": "viccs-config",
    "$resource": "viccs-crafting",
    "$version": "1.0.0",

    "craftingSettings": {
        "failureEnabled": true,
        "baseSuccessRate": 0.85,
        "masterySuccessBonus": 0.03,
        "criticalCraftChance": 0.1,
        "criticalCraftBonusQuantity": 1
    },

    "recipes": {
        "wiggenweld_potion": {
            "name": "Poção Wiggenweld",
            "category": "potion",
            "subcategory": "healing",
            "craftTimeMs": 10000,
            "stationType": "potion_station",
            "ingredients": [
                { "itemId": "horklump_juice", "quantity": 1 },
                { "itemId": "dittany_leaves", "quantity": 1 }
            ],
            "result": {
                "itemId": "wiggenweld_potion",
                "quantity": 1
            },
            "requirements": {
                "subjectLevel": { "potions": 1 },
                "recipeKnown": true
            },
            "xpReward": {
                "potions": 15
            }
        },
        "felix_felicis": {
            "name": "Felix Felicis",
            "category": "potion",
            "subcategory": "buff",
            "craftTimeMs": 30000,
            "stationType": "advanced_potion_station",
            "ingredients": [
                { "itemId": "ashwinder_egg", "quantity": 2 },
                { "itemId": "horseradish", "quantity": 1 },
                { "itemId": "squill_bulb", "quantity": 1 },
                { "itemId": "moonstone_powder", "quantity": 3 },
                { "itemId": "occamy_eggshell", "quantity": 1 }
            ],
            "result": {
                "itemId": "felix_felicis",
                "quantity": 1
            },
            "requirements": {
                "subjectLevel": { "potions": 6 },
                "recipeKnown": true,
                "questRequired": "quest_liquid_luck"
            },
            "xpReward": {
                "potions": 100
            },
            "effects": {
                "luckBonus": 0.3,
                "durationMs": 600000,
                "cooldownMs": 86400000
            }
        }
    },

    "plants": {
        "dittany": {
            "name": "Ditamno",
            "growthTimeMs": 600000,
            "harvestYield": [2, 4],
            "regrowable": true,
            "regrowthTimeMs": 300000,
            "potSize": "small",
            "herbologyLevel": 1
        },
        "venomous_tentacula": {
            "name": "Tentácula Venenosa",
            "growthTimeMs": 1800000,
            "harvestYield": [1, 2],
            "regrowable": false,
            "potSize": "large",
            "herbologyLevel": 3,
            "combatUsable": true,
            "combatDamage": 30
        }
    }
}
```

## Fluxo de Crafting

```
1. Jogador interage com estação de crafting
   └► Client emite 'viccs:crafting:openStation'

2. Server valida acesso e envia receitas conhecidas
   └► Filtra por: recipes_known + subject level

3. UI mostra receitas disponíveis com ingredientes
   └► Destaca quais ingredientes o jogador tem/falta

4. Jogador seleciona receita e confirma
   └► Client emite 'viccs:crafting:craftRequest'

5. Server valida:
   ├── Receita conhecida?
   ├── Nível de matéria suficiente?
   ├── Ingredientes no inventário?
   └── Estação correta?

6. Se válido → craft inicia
   ├── Timer de craftTimeMs começa
   ├── Ingredientes consumidos
   ├── Animação de craft no client
   └── Chance de sucesso calculada

7. Craft completo:
   ├── Sucesso → item adicionado ao inventário
   ├── Crítico → quantidade bonus
   ├── Falha → ingredientes perdidos (parcialmente)
   └── XP de matéria concedido
```

## Regras

1. **Receitas são 100% config-driven** — NUNCA hardcode ingredientes ou tempos
2. **Validação SEMPRE no server** — client mostra UI apenas
3. **Ingredientes consumidos ANTES** do resultado (atomicidade via transação)
4. **Craft failure** é configurável — pode ser desabilitado por poção/nível
5. **XP de matéria** integra com viccs-classes automaticamente

