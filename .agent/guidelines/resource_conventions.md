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
        "files": [
            "client/main.js",
            "ui/**/*"
        ],
        "exports": [
            "status"
        ],
        "resourceDependencies": [
            { "name": "hmp-lib", "version": "0.12.0" },
            { "name": "hmp-core", "version": "0.12.0" },
            { "name": "viccs-core", "version": "1.0.0" }
        ],
        "errorBehavior": "stop",
        "priority": 50
    }
}
```

### Regras do package.json

- `priority`: Valores menores carregam primeiro
  - `-1000 a -250`: HMP Foundations (`hmp-mysql`, `hmp-lib`, `hmp-core`, `hmp-ui`, `hmp-houses`, etc.)
  - `20-39`: VICCS Core (`viccs-core`, `viccs-ui`, `viccs-characters`)
  - `40-59`: VICCS Systems (`viccs-spells`, `viccs-inventory`, `viccs-economy`)
  - `60-79`: VICCS Features (`viccs-quests`, `viccs-housing`)
  - `80-99`: VICCS Addons (`viccs-events`, `viccs-seasonal`)
- `resourceDependencies`: SEMPRE listar explicitamente (preferencialmente com `{ "name": "...", "version": "..." }`, seguindo `hmp-*`). `viccs-core` é obrigatório para resources de gameplay VICCS.
- `exports`: Declarar explicitamente no bloco `mafiahub.exports` cada chave registrada via `Exports.register(name, value)`.

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

### Padrão de APIs Compartilhadas (`Exports.register` & `Imports.get`)

Resources expõem funções/objetos via `Exports.register(...)` (declarados em `mafiahub.exports` no `package.json`) e consomem via `Imports.get(...)`:

```javascript
// No viccs-core (server/main.js):
Exports.register('getCharacterData', async (characterId) => {
    return await fetchCharacterFromDB(characterId);
});

// Em outro resource:
const ViccsCore = Imports.get('viccs-core');
const characterData = await ViccsCore.getCharacterData(charId);
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
2. Use seções lógicas com nomes descritivos e fáceis de manusear por operadores não-programadores
3. Valores numéricos DEVEM ter comentário `//` explicando a unidade (ms, segundos, metros, pontos) e limites seguros
4. Ranges DEVEM ter limites documentados e validados no carregamento (`Hmp.validation` / `validate`)
5. Features toggles SEMPRE no topo como `featureToggles` (`enabled`, `debugMode`, flags granulares)
6. Todo resource deve suportar **override em `server/data/viccs-{nome}.json`** mesclado sobre `config/default.json` via `Hmp.config.load` / `Hmp.config.merge`, mantendo compatibilidade com configs antigas através de `defaults` completos.

## Contrato Universal do Ecossistema VICCS

1. **`status()` Obrigatório:** Todo resource `viccs-*` exporta `status()` (`Exports.register('status', ...)`), retornando `{ resource, version, enabled, ready, dependencies, stats }` para saúde e telemetria unificada.
2. **Importação Segura de Módulos Opcionais:** Dependências obrigatórias vão em `resourceDependencies` no `package.json`; integrações opcionais (ex.: `viccs-quests` ouvindo `viccs-spells`) devem usar `safeImport(name)` (`try { return Imports.get(name); } catch { return null; }`) e fallback limpo caso o módulo não esteja ativo — nunca quebrar spawn ou travar controles por indisponibilidade de módulo secundário.
3. **Compatibilidade Universal de Payloads:** Eventos `viccs:{resource}:{ação}` e APIs exportadas nunca mudam assinaturas de forma destrutiva — novos campos são sempre opcionais e retrocompatíveis.
4. **Higiene Client↔Server:** Eventos vindos do client usam `Events.emitServer(...)` no client e `Events.onClient(...)` no server com `Hmp.rateLimit` e `Hmp.validation`, além de `Hmp.input.controls` / `Hmp.input.shortcuts` para evitar conflitos de teclas e foco travado.
5. **Experiência Imersiva Obrigatória (Fases 2–6):** Todo recurso voltado ao jogador deve seguir `server/.agent/scripting/regras-de-implementacao-experiencia-imersiva-accio.md`:
   - Integrar interações de mundo ao **Olho Mágico (`Alt`)** (via `hmp-interact` / `viccs-ui.eye`) e sistemas pessoais ao **Livro do Jogador (`Esc`)** (via `viccs-ui.book`), evitando comandos de chat obrigatórios.
   - Responder às **6 Perguntas Obrigatórias** (visão/ação, resposta/conclusão, cancelamento/recuperação, autoridade/persistência, API real do ArcaneMP e preservação do front-end) antes de considerar o sistema concluído.
   - Em áudios (`hmp-audio` / `viccs-ui.audioCue`), usar apenas cues breves one-shot e interromper handles anteriores para impedir loops.

