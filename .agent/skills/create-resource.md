# Skill: Criar Resource Arcane MP

## Quando Usar
Sempre que for necessário criar um novo resource (módulo de funcionalidade)
para o servidor VICCS Accio no framework Arcane MP.

## Pré-Requisitos
1. Ler `.agent/guidelines/resource_conventions.md` para padrões obrigatórios
2. Ler `.agent/guidelines/code_style.md` para estilo de código
3. Ler `.agent/context/architecture.md` para entender onde o resource se encaixa
4. Verificar `.agent/memory/todos.md` para saber a fase atual

## Procedimento

### Passo 1: Definir o Escopo
- Qual problema exato este resource resolve?
- Quais resources existentes ele precisa conversar?
- Que dados ele persiste no banco?
- Ele tem interface visual (CEF UI)?

### Passo 2: Criar a Estrutura de Pastas

```
server/resources/viccs-{nome}/
├── package.json
├── config/
│   └── default.json
├── server/
│   ├── main.js
│   ├── events.js
│   ├── commands.js
│   ├── database.js
│   └── utils.js
├── client/
│   ├── main.js
│   └── handlers.js
├── shared/
│   └── constants.js
└── ui/            (se necessário)
    ├── index.html
    ├── styles.css
    └── app.js
```

### Passo 3: Configurar o package.json

```json
{
    "name": "viccs-{nome}",
    "version": "1.0.0",
    "author": "VICCS Team",
    "description": "...",
    "mafiahub": {
        "serverScripts": ["server/main.js"],
        "clientScripts": ["client/main.js"],
        "files": ["client/main.js", "ui/**/*"],
        "exports": ["status"],
        "resourceDependencies": [
            { "name": "hmp-lib", "version": "0.12.0" },
            { "name": "hmp-ui", "version": "0.12.0" },
            { "name": "viccs-core", "version": "1.0.0" }
        ],
        "errorBehavior": "stop",
        "priority": 50
    }
}
```

**Regras de Priority:**
- -1000 a -250: HMP Foundations (`hmp-mysql`, `hmp-lib`, `hmp-core`, `hmp-ui`, etc.)
- 20-39: VICCS Core
- 40-59: VICCS Systems
- 60-79: VICCS Features
- 80-99: VICCS Addons

### Passo 4: Criar o Config File

Sempre em `config/default.json` seguindo o schema padrão:

```json
{
    "$schema": "viccs-config",
    "$resource": "viccs-{nome}",
    "$version": "1.0.0",
    "$description": "Descrição do resource",
    "featureToggles": {
        "enabled": true,
        "debugMode": false
    }
}
```

### Passo 5: Implementar server/main.js

Seguir o template de entry point:
```javascript
'use strict';
const config = require('../config/default.json');
const { registerEvents } = require('./events');
const { registerCommands } = require('./commands');
const { initDatabase } = require('./database');

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

### Passo 6: Registrar Eventos

Em `server/events.js`, usar o namespace padrão `viccs:{resource}:{ação}`:

```javascript
function registerEvents() {
    // Eventos do framework
    Events.on('playerConnect', handlePlayerConnect);

    // Eventos do ecossistema VICCS
    Events.on('viccs:{nome}:{ação}', handleAction);
}
```

### Passo 7: Implementar Persistência

Em `server/database.js`, usar `Imports.get('hmp-mysql')` e `MySQL.migrate(...)` (com versionamento em `hmp_schema_migrations`):

```javascript
const MySQL = Imports.get('hmp-mysql');

async function initDatabase() {
    await MySQL.migrate('viccs-{nome}', [
        {
            version: 1,
            name: 'create viccs_{tabela}',
            up: `CREATE TABLE IF NOT EXISTS viccs_{tabela} (
                id INT AUTO_INCREMENT PRIMARY KEY,
                character_id INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_character (character_id)
            ) ENGINE=InnoDB`,
        },
    ]);
}
```

### Passo 8: Criar Client Script (se necessário)

Em `client/main.js`:
```javascript
'use strict';

Events.on('viccs:{nome}:update', (data) => {
    // Atualizar estado local / UI
});
```

### Passo 9: Criar UI Panel (se necessário)

Seguir `.agent/guidelines/ui_ux.md` para a estética "Wizarding Elegance".
Usar componentes do `viccs-ui`.

### Passo 10: Testar Integração

1. Verificar que o resource carrega sem erros no console
2. Testar comunicação via eventos com outros resources
3. Verificar persistência no banco de dados
4. Testar UI em diferentes resoluções

## Checklist Final

- [ ] package.json com dependências corretas
- [ ] config/default.json com todos os parâmetros
- [ ] server/main.js inicializa corretamente
- [ ] Eventos seguem namespace `viccs:{resource}:{ação}`
- [ ] Database tables criadas com IF NOT EXISTS
- [ ] Código segue code_style.md 100%
- [ ] UI segue ui_ux.md (se aplicável)
- [ ] Logs com prefixo `[viccs-{nome}]`
- [ ] Nenhum valor hardcoded — tudo via config
- [ ] Tratamento de erros em operações async

