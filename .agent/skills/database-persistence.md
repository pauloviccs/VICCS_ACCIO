# Skill: Persistência e Banco de Dados

## Quando Usar
Sempre que um resource precisar salvar, ler, atualizar ou deletar dados
no banco de dados — seja MySQL (gameplay) ou Supabase (plataforma).

## Arquitetura de Dados

```
┌─────────────────────────────────┐  ┌─────────────────────────────────┐
│   MySQL / MariaDB (Gameplay)    │  │  Supabase PostgreSQL (Platform) │
│                                 │  │                                 │
│  Acessado via: hmp-mysql        │  │  Acessado via: Supabase Client  │
│  Usado por: serverScripts       │  │  Usado por: website, edge funcs │
│                                 │  │                                 │
│  ┌── accounts                   │  │  ┌── profiles                   │
│  ├── characters                 │  │  ├── server_logs                │
│  ├── inventories                │  │  ├── news_posts                 │
│  ├── spells_learned             │  │  ├── whitelist_applications     │
│  ├── quest_progress             │  │  └── analytics                  │
│  └── ...gameplay tables         │  │                                 │
└─────────────────────────────────┘  └─────────────────────────────────┘
```

## Usando hmp-mysql (Gameplay Database)

### Inicialização de Tabelas

Todo resource com persistência DEVE ter um `server/database.js`:

```javascript
// ═══════════════════════════════════════════════════════════════
// VICCS Accio — {Nome do Resource}
// Arquivo: server/database.js
// Descrição: Persistência e queries do banco de dados
// ═══════════════════════════════════════════════════════════════

'use strict';

const mysql = exports['hmp-mysql'];

// ─── Inicialização ───────────────────────────────────────────

async function initDatabase() {
    await mysql.query(`
        CREATE TABLE IF NOT EXISTS viccs_{tabela} (
            id INT AUTO_INCREMENT PRIMARY KEY,
            character_id INT NOT NULL,
            data_field VARCHAR(255) NOT NULL,
            quantity INT DEFAULT 0,
            metadata TEXT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_character (character_id),
            INDEX idx_data (data_field)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('[viccs-{nome}] ✓ Database tables verificadas');
}
```

### Padrões de Query

#### SELECT (Leitura)

```javascript
// Buscar um registro
async function getByCharacterId(characterId) {
    const [rows] = await mysql.query(
        'SELECT * FROM viccs_{tabela} WHERE character_id = ?',
        [characterId],
    );
    return rows.length > 0 ? rows[0] : null;
}

// Buscar múltiplos
async function getAllByCharacterId(characterId) {
    const [rows] = await mysql.query(
        'SELECT * FROM viccs_{tabela} WHERE character_id = ? ORDER BY created_at DESC',
        [characterId],
    );
    return rows;
}

// Buscar com join
async function getWithDetails(characterId) {
    const [rows] = await mysql.query(`
        SELECT t.*, c.first_name, c.last_name
        FROM viccs_{tabela} t
        JOIN characters c ON c.id = t.character_id
        WHERE t.character_id = ?
    `, [characterId]);
    return rows;
}
```

#### INSERT (Criação)

```javascript
async function create(characterId, dataField, quantity, metadata = null) {
    const [result] = await mysql.query(
        'INSERT INTO viccs_{tabela} (character_id, data_field, quantity, metadata) VALUES (?, ?, ?, ?)',
        [characterId, dataField, quantity, metadata ? JSON.stringify(metadata) : null],
    );
    return result.insertId;
}
```

#### UPDATE (Atualização)

```javascript
async function update(id, updates) {
    const fields = Object.keys(updates).map((key) => `${key} = ?`).join(', ');
    const values = Object.values(updates);

    await mysql.query(
        `UPDATE viccs_{tabela} SET ${fields} WHERE id = ?`,
        [...values, id],
    );
}

// Incrementar valor
async function increment(characterId, field, amount) {
    await mysql.query(
        `UPDATE viccs_{tabela} SET quantity = quantity + ? WHERE character_id = ? AND data_field = ?`,
        [amount, characterId, field],
    );
}
```

#### DELETE (Remoção)

```javascript
// Soft delete (preferido)
async function softDelete(id) {
    await mysql.query(
        'UPDATE viccs_{tabela} SET deleted_at = NOW() WHERE id = ?',
        [id],
    );
}

// Hard delete (usar com cautela)
async function hardDelete(id) {
    await mysql.query(
        'DELETE FROM viccs_{tabela} WHERE id = ?',
        [id],
    );
}
```

### Transações

Para operações que modificam múltiplas tabelas:

```javascript
async function transferItem(fromCharacterId, toCharacterId, itemId, quantity) {
    const connection = await mysql.getConnection();

    try {
        await connection.beginTransaction();

        // Remover do inventário de origem
        await connection.query(
            'UPDATE viccs_inventories SET quantity = quantity - ? WHERE character_id = ? AND item_id = ? AND quantity >= ?',
            [quantity, fromCharacterId, itemId, quantity],
        );

        // Adicionar ao inventário de destino
        await connection.query(
            `INSERT INTO viccs_inventories (character_id, item_id, quantity) VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)`,
            [toCharacterId, itemId, quantity],
        );

        // Registrar transação
        await connection.query(
            'INSERT INTO viccs_transactions (from_character, to_character, item_id, quantity) VALUES (?, ?, ?, ?)',
            [fromCharacterId, toCharacterId, itemId, quantity],
        );

        await connection.commit();
        return true;
    } catch (error) {
        await connection.rollback();
        console.error('[viccs-inventory] Falha na transferência:', error);
        return false;
    } finally {
        connection.release();
    }
}
```

## Convenções de Schema

### Nomenclatura
```
Tabelas VICCS:      viccs_{nome_plural}       → viccs_spell_cooldowns
Tabelas HMP:        (manter original)         → accounts, characters
PKs:                id                        → INT AUTO_INCREMENT
FKs:                {entidade}_id             → character_id, quest_id
Timestamps:         created_at, updated_at    → TIMESTAMP DEFAULT CURRENT_TIMESTAMP
Soft delete:        deleted_at                → TIMESTAMP NULL
JSON data:          TEXT com JSON.stringify    → metadata, appearance_data
Booleans:           TINYINT(1)                → is_active, is_completed
```

### Índices Obrigatórios
- Toda FK deve ter INDEX
- Colunas usadas em WHERE frequentes devem ter INDEX
- Colunas de busca por texto → INDEX ou FULLTEXT

## Regras Inegociáveis

1. **SEMPRE** use prepared statements (?) — NUNCA concatene strings SQL
2. **SEMPRE** use `CREATE TABLE IF NOT EXISTS` na inicialização
3. **SEMPRE** trate erros de query com try/catch
4. **SEMPRE** log erros com contexto suficiente para debug
5. **NUNCA** exponha erros de SQL ao client
6. **SEMPRE** use transações para operações multi-tabela
7. **SEMPRE** use soft delete quando possível
8. **SEMPRE** use utf8mb4 para suportar caracteres especiais
9. **SEMPRE** indexe foreign keys
10. **NUNCA** faça SELECT * em produção — liste colunas explicitamente

