# Skill: Sistema de Economia e Comércio

## Quando Usar
Ao criar, configurar ou expandir qualquer funcionalidade econômica:
moedas, lojas, comércio entre jogadores, leilões, crafting economy, etc.

## Arquitetura Econômica

```
┌─────────────────────────────────────────────────────────┐
│                    viccs-economy                         │
│                                                         │
│  Wallets (Galeões/Sicles/Knuts)                        │
│  ├── Ganhar: quests, vendas, drops, crafting            │
│  ├── Gastar: lojas, crafting, serviços, housing         │
│  └── Transferir: comércio P2P, correio owl              │
│                                                         │
│  Integra com:                                           │
│  ├── viccs-shops     → Lojas de NPCs                   │
│  ├── viccs-inventory → Items e stacking                 │
│  ├── viccs-quests    → Recompensas de missões           │
│  ├── viccs-crafting  → Custo de materiais/produtos      │
│  ├── viccs-housing   → Compra/aluguel de habitações     │
│  └── viccs-combat    → Loot de criaturas                │
└─────────────────────────────────────────────────────────┘
```

## Config Econômica (config/economy.json)

```json
{
    "$schema": "viccs-config",
    "$resource": "viccs-economy",
    "$version": "1.0.0",
    "$description": "Configuração do sistema econômico do servidor",

    "currency": {
        "// nota": "1 Galeão = 17 Sicles = 493 Knuts",
        "conversionRates": {
            "galleonToSickle": 17,
            "sickleToKnut": 29
        },
        "startingBalance": {
            "galleons": 50,
            "sickles": 0,
            "knuts": 0
        },
        "maxBalance": {
            "galleons": 999999
        }
    },

    "trading": {
        "enabled": true,
        "maxTradeDistance": 10.0,
        "tradeCooldownMs": 5000,
        "maxItemsPerTrade": 10,
        "taxPercentage": 2,
        "minTradeLevel": 5
    },

    "shops": {
        "restockIntervalMs": 3600000,
        "buybackMultiplier": 0.4,
        "haggleEnabled": true,
        "haggleMaxDiscount": 0.15,
        "haggleCharmBonus": 0.05
    },

    "drops": {
        "baseGalleonDropChance": 0.3,
        "galleonDropRange": [1, 5],
        "bossMultiplier": 10,
        "eliteMultiplier": 3
    },

    "sinks": {
        "// nota": "Gold sinks para controlar inflação",
        "fastTravelCost": 5,
        "repairCost": {
            "weapon": 10,
            "armor": 15,
            "accessory": 5
        },
        "respawnPenalty": 0,
        "houseTax": {
            "small": 50,
            "medium": 150,
            "large": 500,
            "intervalDays": 7
        }
    },

    "antiExploit": {
        "maxTransactionsPerMinute": 10,
        "maxGalleonTransferPerDay": 10000,
        "suspiciousThreshold": 5000,
        "logAllTransactions": true
    }
}
```

## API de Economia (exports)

```javascript
// Funções expostas para outros resources usarem

exports('getBalance', async (characterId) => {
    return await db.getWallet(characterId);
});

exports('addBalance', async (characterId, galleons, reason) => {
    const result = await db.addGalleons(characterId, galleons);
    logTransaction(characterId, galleons, 'credit', reason);
    Events.emit('viccs:economy:balanceChanged', { characterId, galleons, reason });
    return result;
});

exports('deductBalance', async (characterId, galleons, reason) => {
    const wallet = await db.getWallet(characterId);
    if (wallet.galleons < galleons) return false;
    await db.deductGalleons(characterId, galleons);
    logTransaction(characterId, -galleons, 'debit', reason);
    Events.emit('viccs:economy:balanceChanged', { characterId, galleons: -galleons, reason });
    return true;
});

exports('transfer', async (fromCharId, toCharId, galleons, reason) => {
    return await db.atomicTransfer(fromCharId, toCharId, galleons, reason);
});

exports('canAfford', async (characterId, galleons) => {
    const wallet = await db.getWallet(characterId);
    return wallet.galleons >= galleons;
});
```

## Fluxo de Compra em Loja

```
1. Jogador interage com NPC shopkeeper
   └► viccs-npc emite 'viccs:npc:interact' com role='shopkeeper'

2. Server carrega catálogo da loja
   └► Lê config de items + stock atual do banco

3. UI de loja abre no client
   └► Lista items com preços, quantidades, descrições

4. Jogador seleciona item e confirma compra
   └► Client emite 'viccs:shops:buyRequest'

5. Server valida:
   ├── Item existe no catálogo?
   ├── Stock disponível?
   ├── Jogador tem Galeões?
   ├── Inventário tem espaço?
   └── Rate limit OK?

6. Se válido:
   ├── Deduz Galeões (viccs-economy.deductBalance)
   ├── Adiciona item (viccs-inventory.addItem)
   ├── Reduz stock da loja
   ├── Registra transação no log
   └── Notifica jogador (sucesso)

7. Se inválido:
   └── Notifica jogador (erro com motivo)
```

## Regras

1. **TODA transação** é validada e logada no server
2. **Inflação** é controlada via gold sinks definidos no config
3. **Anti-exploit**: rate limiting e threshold de transferências suspeitas
4. **Atomicidade**: transferências P2P usam transações SQL
5. **Auditoria**: toda movimentação de Galeões tem reason registrado

