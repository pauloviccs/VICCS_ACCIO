# Code Style Guide — VICCS Accio HL Server

## Princípio Fundamental

> Todo arquivo de código neste projeto DEVE ser visualmente idêntico em estilo.
> Qualquer desenvolvedor (ou agente de IA) que abra um arquivo precisa sentir
> que foi escrito pela mesma pessoa. Consistência > Preferência pessoal.

## Formatação Geral

```
Indentação:         4 espaços (NUNCA tabs)
Largura máxima:     120 caracteres por linha
Quebra de linha:    LF (Unix-style)
Encoding:           UTF-8 sem BOM
Ponto-e-vírgula:    SEMPRE (obrigatório em todo JS)
Aspas:              Aspas simples ('string') para JS
                    Aspas duplas ("string") para JSON e HTML atributos
Trailing comma:     SEMPRE em arrays/objetos multi-linha
Espaçamento:        1 linha em branco entre funções/blocos lógicos
                    2 linhas em branco antes de seções/exports
Final do arquivo:   Sempre 1 linha em branco no final
```

## Nomenclatura

```
Variáveis:          camelCase           → playerHealth, questStage
Constantes:         SCREAMING_SNAKE     → MAX_SPELL_LEVEL, DEFAULT_GALLEONS
Funções:            camelCase           → calculateDamage(), getPlayerHouse()
Classes:            PascalCase          → SpellManager, QuestTracker
Arquivos:           kebab-case          → spell-manager.js, quest-config.json
Pastas:             kebab-case          → server-utils/, client-hud/
Eventos:            namespace:action    → 'viccs:spells:cast', 'viccs:quest:complete'
Configs (keys):     camelCase           → { "maxPlayers": 100, "spawnDelay": 5 }
Tabelas SQL:        snake_case plural   → spell_cooldowns, quest_completions
Colunas SQL:        snake_case          → character_id, created_at
```

## Estrutura de um Resource

```
viccs-{nome}/
├── package.json              # Manifesto com bloco mafiahub
├── config/
│   └── default.json          # Configurações parametrizadas
├── server/
│   ├── main.js               # Entry point do servidor
│   ├── events.js             # Handlers de eventos
│   ├── commands.js           # Comandos slash/chat
│   ├── database.js           # Queries e persistência
│   └── utils.js              # Helpers internos
├── client/
│   ├── main.js               # Entry point do cliente
│   └── handlers.js           # Handlers locais
├── shared/
│   └── constants.js          # Constantes compartilhadas
└── ui/
    ├── index.html            # UI panel principal
    ├── styles.css            # Estilos
    └── app.js                # Lógica da UI
```

## Padrões de Código

### Imports e Dependências (topo de todo arquivo)

```javascript
// ═══════════════════════════════════════════════════════════════
// VICCS Accio — {Nome do Resource}
// Arquivo: {caminho relativo}
// Descrição: {breve descrição do propósito}
// ═══════════════════════════════════════════════════════════════

'use strict';

// Dependências externas
const { someUtil } = require('hmp-lib');

// Dependências internas
const { SPELL_TYPES } = require('../shared/constants');
const config = require('../config/default.json');
```

### Funções

```javascript
/**
 * Calcula o dano base de uma magia considerando nível e mastery.
 * @param {string} spellId - ID único da magia
 * @param {number} masteryLevel - Nível de maestria (1-10)
 * @returns {number} Dano calculado
 */
function calculateSpellDamage(spellId, masteryLevel) {
    const spellData = config.spells[spellId];

    if (!spellData) {
        console.warn(`[viccs-spells] Magia desconhecida: ${spellId}`);
        return 0;
    }

    const baseDamage = spellData.baseDamage || 0;
    const masteryMultiplier = 1 + (masteryLevel * config.masteryScaling);

    return Math.floor(baseDamage * masteryMultiplier);
}
```

### Event Handlers

```javascript
// ─── Event Handlers ──────────────────────────────────────────

Events.on('playerConnect', (player) => {
    console.log(`[viccs-core] Jogador conectado: ${player.nickname}`);
    initializePlayerData(player);
});

Events.on('viccs:spells:cast', (player, spellId, targetId) => {
    if (!validateSpellCast(player, spellId)) {
        Events.emit(player, 'viccs:ui:notify', {
            type: 'error',
            message: 'Você não pode lançar esta magia agora.',
        });
        return;
    }

    executeSpell(player, spellId, targetId);
});
```

### Config Files

```json
{
    "$schema": "viccs-config",
    "$resource": "viccs-spells",
    "$version": "1.0.0",
    "$description": "Configurações do sistema de magias",

    "masteryScaling": 0.15,
    "globalCooldownMs": 1500,
    "maxSpellsEquipped": 8,

    "spells": {
        "expelliarmus": {
            "name": "Expelliarmus",
            "category": "charm",
            "baseDamage": 25,
            "cooldownMs": 3000,
            "range": 15.0,
            "requiresMastery": 1
        },
        "stupefy": {
            "name": "Stupefy",
            "category": "charm",
            "baseDamage": 40,
            "cooldownMs": 5000,
            "range": 20.0,
            "requiresMastery": 2
        }
    }
}
```

## Regras Inegociáveis

1. **NUNCA** use `var` — sempre `const` (preferido) ou `let`
2. **NUNCA** modifique estado do jogo no client sem validação do server
3. **SEMPRE** trate erros com try/catch em operações async
4. **SEMPRE** log com prefixo do resource: `[viccs-{nome}]`
5. **SEMPRE** documente funções públicas com JSDoc
6. **SEMPRE** use early return para reduzir nesting
7. **SEMPRE** valide inputs antes de processar
8. **NUNCA** hardcode valores — use config files
9. **SEMPRE** use template literals para strings dinâmicas
10. **SEMPRE** desestruture parâmetros quando possível

