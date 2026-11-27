# Skill: Comunicação Inter-Resource (Event Bus)

## Quando Usar
Sempre que um resource precisa conversar com outro, receber dados de outro
sistema, ou expor funcionalidade para o ecossistema.

## Conceitos Fundamentais

### O Event Bus do Arcane MP

```
┌──────────────┐    Events.emit()     ┌──────────────┐
│ viccs-spells │ ──────────────────►  │ viccs-combat │
│              │                      │              │
│ "Lancei um   │    Event Bus         │ "Vou calcular│
│  Stupefy"    │  (Global, Server)    │  o dano"     │
└──────────────┘                      └──────────────┘
                         │
                         ▼
                 ┌──────────────┐
                 │ viccs-quests │
                 │              │
                 │ "Progresso   │
                 │  na quest!"  │
                 └──────────────┘
```

**Regra de Ouro:** Nenhum resource importa código de outro resource diretamente.
Toda comunicação acontece via Events ou exports.

## Padrão de Nomeação de Eventos

### Formato Obrigatório
```
viccs:{resource}:{ação}
```

### Categorias de Eventos

#### Eventos de Notificação (Fire-and-Forget)
Informa que algo aconteceu. Não espera resposta.

```javascript
// Emitido por viccs-spells quando uma magia é lançada
Events.emit('viccs:spells:cast', {
    playerId: player.id,
    spellId: 'stupefy',
    targetId: target.id,
    damage: 40,
    timestamp: Date.now(),
});
```

#### Eventos de Request/Response
Pede uma ação e espera resultado via callback ou evento de resposta.

```javascript
// Request: viccs-inventory pede para verificar se jogador tem item
Events.emit('viccs:inventory:check', {
    requestId: generateId(),
    playerId: player.id,
    itemId: 'mandrake-root',
    quantity: 3,
});

// Response: viccs-inventory responde
Events.on('viccs:inventory:check:result', (data) => {
    if (data.requestId === myRequestId) {
        // Processar resultado
    }
});
```

#### Eventos de Sistema
Usados pelo viccs-core para lifecycle do servidor.

```javascript
// Eventos de sistema (emitidos pelo viccs-core)
'viccs:core:playerReady'       // Jogador carregou todos os dados
'viccs:core:characterLoaded'   // Personagem carregado do banco
'viccs:core:serverTick'        // Tick periódico do servidor
'viccs:core:resourceLoaded'    // Um resource terminou de carregar
```

## Padrão de Exports (`Exports.register` & `Imports.get`)

Resources expõem funções ou namespaces declarados em `mafiahub.exports` no `package.json`:

### Expondo uma API

```javascript
// No viccs-economy (server/main.js)
// package.json -> "exports": ["wallet"]

Exports.register('wallet', {
    async getBalance(characterId) {
        const w = await db.getWallet(characterId);
        return {
            galleons: w.galleons,
            sickles: w.sickles,
            knuts: w.knuts,
        };
    },
    async deductBalance(characterId, amount, reason) {
        const success = await db.deductGalleons(characterId, amount);
        if (success) {
            Events.emit('viccs:economy:transaction', {
                characterId,
                amount: -amount,
                reason,
            });
        }
        return success;
    },
});
```

### Consumindo uma API

```javascript
// No viccs-shops (server/events.js)
const Economy = Imports.get('viccs-economy');
const Inventory = Imports.get('viccs-inventory');

async function handlePurchase(player, itemId) {
    const price = getItemPrice(itemId);
    const balance = await Economy.wallet.getBalance(player.characterId);

    if (balance.galleons < price) {
        Events.emit(player, 'viccs:ui:notify', {
            type: 'error',
            message: 'Galeões insuficientes!',
        });
        return;
    }

    const deducted = await Economy.wallet.deductBalance(
        player.characterId,
        price,
        `Compra: ${itemId}`,
    );

    if (deducted) {
        await Inventory.addItem(player.characterId, itemId, 1);
        Events.emit(player, 'viccs:ui:notify', {
            type: 'success',
            message: 'Compra realizada com sucesso!',
        });
    }
}
```

## Comunicação Client ↔ Server

### Server para Client (direcionado)

```javascript
// Server: enviar dados para UM jogador específico
Events.emit(player, 'viccs:spells:cooldownUpdate', {
    spellId: 'stupefy',
    remainingMs: 3000,
});
```

### Server para Todos (broadcast)

```javascript
// Server: enviar para TODOS os jogadores
Events.emitAll('viccs:world:weatherChange', {
    weather: 'storm',
    duration: 300,
});
```

### Client para Server

```javascript
// Client: solicitar ação ao servidor
Events.emit('viccs:spells:requestCast', {
    spellId: 'stupefy',
    targetId: nearestTarget.id,
});
```

## Regras de Segurança

1. **NUNCA confie em dados do client** — sempre valide no server
2. **NUNCA envie dados sensíveis** (senhas, tokens) via eventos ao client
3. **Rate-limit** eventos do client para prevenir spam/exploit
4. **Sanitize** todos os payloads antes de processar
5. **Log** eventos importantes para auditoria

## Anti-Patterns (NÃO FAÇA)

```javascript
// ❌ ERRADO: Import direto de outro resource
const spellManager = require('../../viccs-spells/server/main');

// ✅ CORRETO: Usar Imports.get()
const SpellsApi = Imports.get('viccs-spells');
const spellData = await SpellsApi.getSpellData(spellId);

// ❌ ERRADO: Evento sem namespace
Events.emit('spellCast', data);

// ✅ CORRETO: Evento com namespace completo
Events.emit('viccs:spells:cast', data);

// ❌ ERRADO: Confiar em dados do client
Events.on('viccs:economy:setBalance', (player, amount) => {
    db.setBalance(player.characterId, amount); // EXPLOIT!
});

// ✅ CORRETO: Server valida e processa
Events.on('viccs:economy:requestTransfer', (player, targetId, amount) => {
    if (!validateTransfer(player, targetId, amount)) return;
    processTransfer(player, targetId, amount);
});
```

