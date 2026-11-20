# Convenções de Resources — VICCS Accio HL Server

## Namespace e Nomenclatura

Todo resource customizado VICCS usa o prefixo `viccs-`:

```
viccs-{sistema}         → ex: viccs-spells, viccs-quests
```

Resources que estendem funcionalidades do HMP Foundations mantêm prefixo `hmp-`.

## package.json Padrão

Todo resource DEVE seguir este template de manifesto:

```json
{
    "name": "viccs-{nome}",
    "version": "1.0.0",
    "author": "VICCS Team",
    "description": "Descrição clara e concisa do resource",
    "mafiahub": {
        "serverScripts": [
            "server/main.js"
        ],
        "clientScripts": [
            "client/main.js"
        ],
        "sharedScripts": [
            "shared/constants.js"
        ],
        "files": [
            "ui/**/*"
        ],
        "resourceDependencies": [
            "hmp-lib",
            "hmp-ui",
            "viccs-core"
        ],
        "priority": 50
    }
}
```

### Regras do package.json

- `priority`: Valores menores carregam primeiro
  - `0-9`: Core (hmp-mysql, hmp-lib)
  - `10-19`: Foundation (hmp-core, hmp-ui)
  - `20-39`: VICCS Core (viccs-core, viccs-ui)
  - `40-59`: VICCS Systems (viccs-spells, viccs-inventory)
  - `60-79`: VICCS Features (viccs-quests, viccs-housing)
  - `80-99`: VICCS Addons (viccs-events, viccs-seasonal)
- `resourceDependencies`: SEMPRE listar explicitamente. `viccs-core` é obrigatório para todo resource VICCS

## Estrutura de Diretórios Obrigatória

```
viccs-{nome}/
│
├── package.json                  # Manifesto do resource
│
├── config/
│   └── default.json              # Config principal (parametrização)
│
├── server/
│   ├── main.js                   # Entry point — inicializa e registra eventos
│   ├── events.js                 # Event handlers (recebe/emite eventos)
│   ├── commands.js               # Slash commands e comandos de chat
│   ├── database.js               # Funções de persistência (queries SQL)
│   └── utils.js                  # Helpers e funções utilitárias
│
├── client/
│   ├── main.js                   # Entry point client-side
│   └── handlers.js               # Handlers de inputs/apresentação
│
├── shared/
│   └── constants.js              # Constantes compartilhadas (enums, IDs)
│
└── ui/                           # (Opcional) Painéis CEF
    ├── index.html                # HTML do painel
    ├── styles.css                # Estilos (seguindo ui_ux.md)
    └── app.js                    # Lógica do painel
```

## Padrão do Entry Point (server/main.js)

```javascript
// ═══════════════════════════════════════════════════════════════
// VICCS Accio — {Nome do Resource}
// Arquivo: server/main.js
// Descrição: Entry point — inicialização e registro de módulos
// ═══════════════════════════════════════════════════════════════

'use strict';

const config = require('../config/default.json');
const { registerEvents } = require('./events');
const { registerCommands } = require('./commands');
const { initDatabase } = require('./database');

// ─── Inicialização ───────────────────────────────────────────

(async function init() {
    console.log(`[viccs-{nome}] Inicializando v${config.$version}...`);

    try {
        await initDatabase();
        registerEvents();
        registerCommands();

        console.log(`[viccs-{nome}] ✓ Inicializado com sucesso`);
    } catch (error) {
        console.error(`[viccs-{nome}] ✗ Falha na inicialização:`, error);
    }
})();
```

## Comunicação Inter-Resource

### Padrão de Eventos

Formato obrigatório: `viccs:{resource}:{ação}`

```javascript
// Emitindo um evento para o ecossistema
Events.emit('viccs:spells:cast', { 
    playerId: player.id,
    spellId: 'expelliarmus',
    targetId: target.id,
});

// Ouvindo evento de outro resource
Events.on('viccs:spells:cast', (data) => {
    // viccs-combat responde ao cast de magia
    handleCombatSpell(data);
});
```

### Padrão de APIs Compartilhadas

Resources podem expor funções via `exports`:

```javascript
// No viccs-core:
exports('getCharacterData', async (characterId) => {
    return await fetchCharacterFromDB(characterId);
});

// Em outro resource:
const characterData = await exports['viccs-core'].getCharacterData(charId);
```

## Config Files (config/default.json)

Toda configuração DEVE seguir este schema:

```json
{
    "$schema": "viccs-config",
    "$resource": "viccs-{nome}",
    "$version": "1.0.0",
    "$description": "Descrição do que esta config controla",

    "featureToggles": {
        "enabled": true,
        "debugMode": false
    },

    "settings": {
        "// comentário": "Use chaves com // para documentar inline"
    }
}
```

### Regras de Config

1. SEMPRE inclua os campos `$schema`, `$resource`, `$version`, `$description`
2. Use seções lógicas com nomes descritivos
3. Valores numéricos DEVEM ter comentário explicando a unidade (ms, segundos, metros)
4. Ranges DEVEM ter limites documentados
5. Features toggles SEMPRE no topo como `featureToggles`

