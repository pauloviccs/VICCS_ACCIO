// ═══════════════════════════════════════════════════════════════
// VICCS Accio — Core Ecosystem
// Arquivo: server/database.js
// Descrição: Migrations e persistência via hmp-mysql (MySQL/MariaDB)
// ═══════════════════════════════════════════════════════════════

'use strict';

const { sanitizeAuditEntry } = require('./service');

/**
 * Cria camada de persistência do viccs-core sobre `hmp-mysql`.
 * @param {object} options
 */
function createDatabase({ mysql, logger, auditMaxReasonLength = 240 }) {
    let migrated = false;

    async function init() {
        if (!mysql || typeof mysql.migrate !== 'function') {
            throw new Error('[viccs-core] Dependência hmp-mysql indisponível');
        }

        await mysql.migrate('viccs-core', [
            {
                version: 1,
                name: 'create viccs_audit and viccs_era_state',
                statements: [
                    `CREATE TABLE IF NOT EXISTS viccs_audit (
                        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                        resource VARCHAR(64) NOT NULL,
                        action VARCHAR(80) NOT NULL,
                        actor_character_id INT NULL,
                        actor_name VARCHAR(80) NOT NULL DEFAULT 'Sistema',
                        target_character_id INT NULL,
                        reason VARCHAR(240) NOT NULL DEFAULT '',
                        before_json LONGTEXT NULL,
                        after_json LONGTEXT NULL,
                        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        INDEX idx_viccs_audit_resource (resource),
                        INDEX idx_viccs_audit_target (target_character_id),
                        INDEX idx_viccs_audit_created (created_at)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
                    `CREATE TABLE IF NOT EXISTS viccs_era_state (
                        id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
                        era_id VARCHAR(64) NOT NULL,
                        academic_year SMALLINT UNSIGNED NOT NULL,
                        headmaster VARCHAR(120) NOT NULL,
                        term VARCHAR(32) NOT NULL,
                        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
                ],
            },
        ]);

        migrated = true;
        logger.info('Tabelas viccs_audit e viccs_era_state verificadas via MySQL.migrate');
    }

    async function loadOrSeedEra(defaultEra) {
        const existing = await mysql.single(
            'SELECT era_id, academic_year, headmaster, term FROM viccs_era_state WHERE id = 1',
        );
        if (existing) {
            return {
                eraId: existing.era_id,
                academicYear: Number(existing.academic_year),
                headmaster: existing.headmaster,
                term: existing.term,
            };
        }

        await mysql.query(
            `INSERT INTO viccs_era_state (id, era_id, academic_year, headmaster, term)
             VALUES (1, ?, ?, ?, ?)`,
            [defaultEra.eraId, defaultEra.academicYear, defaultEra.headmaster, defaultEra.term],
        );

        return defaultEra;
    }

    async function saveEra(era) {
        await mysql.query(
            `INSERT INTO viccs_era_state (id, era_id, academic_year, headmaster, term)
             VALUES (1, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               era_id = VALUES(era_id),
               academic_year = VALUES(academic_year),
               headmaster = VALUES(headmaster),
               term = VALUES(term)`,
            [era.eraId, era.academicYear, era.headmaster, era.term],
        );
        return era;
    }

    async function recordAudit(entry) {
        const clean = sanitizeAuditEntry(entry, auditMaxReasonLength);
        const id = await mysql.insert(
            `INSERT INTO viccs_audit
                (resource, action, actor_character_id, actor_name, target_character_id, reason, before_json, after_json)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                clean.resource,
                clean.action,
                clean.actorCharacterId,
                clean.actorName,
                clean.targetCharacterId,
                clean.reason,
                clean.beforeJson,
                clean.afterJson,
            ],
        );
        return { id, ...clean };
    }

    async function listRecentAudit(limit = 20, resourceFilter = null) {
        const safeLimit = Math.max(1, Math.min(100, Number(limit) || 20));
        if (resourceFilter) {
            return await mysql.query(
                `SELECT id, resource, action, actor_character_id, actor_name, target_character_id, reason, created_at
                 FROM viccs_audit WHERE resource = ? ORDER BY id DESC LIMIT ?`,
                [String(resourceFilter), safeLimit],
            );
        }
        return await mysql.query(
            `SELECT id, resource, action, actor_character_id, actor_name, target_character_id, reason, created_at
             FROM viccs_audit ORDER BY id DESC LIMIT ?`,
            [safeLimit],
        );
    }

    return {
        isMigrated: () => migrated,
        init,
        loadOrSeedEra,
        saveEra,
        recordAudit,
        listRecentAudit,
    };
}

module.exports = {
    createDatabase,
};

