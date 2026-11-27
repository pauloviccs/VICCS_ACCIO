// ═══════════════════════════════════════════════════════════════
// VICCS Accio — Sorting Hat Database Persistence
// Arquivo: server/database.js
// ═══════════════════════════════════════════════════════════════

'use strict';

function createDatabase({ mysql, logger }) {
    let migrated = false;

    async function init() {
        await mysql.migrate('viccs-sorting', [
            {
                version: 1,
                name: 'create viccs_sorting_sessions',
                up: `CREATE TABLE IF NOT EXISTS viccs_sorting_sessions (
                    character_id INT NOT NULL PRIMARY KEY,
                    status VARCHAR(24) NOT NULL,
                    question_ids_json TEXT NOT NULL,
                    option_tokens_json TEXT NOT NULL,
                    current_index TINYINT UNSIGNED NOT NULL DEFAULT 0,
                    scores_json TEXT NOT NULL,
                    is_hatstall TINYINT(1) NOT NULL DEFAULT 0,
                    primary_house CHAR(1) NULL,
                    secondary_house CHAR(1) NULL,
                    score_diff DECIMAL(8,4) NULL,
                    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    completed_at TIMESTAMP NULL,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
            },
        ]);

        migrated = true;
        logger.info('Tabela viccs_sorting_sessions verificada');
    }

    function hydrateRow(row) {
        if (!row) return null;
        return {
            characterId: Number(row.character_id),
            status: row.status,
            questionIds: JSON.parse(row.question_ids_json || '[]'),
            currentOptions: JSON.parse(row.option_tokens_json || '[]'),
            currentIndex: Number(row.current_index),
            scores: JSON.parse(row.scores_json || '{"G":0,"R":0,"H":0,"S":0}'),
            isHatstallTriggered: Boolean(row.is_hatstall),
            primaryHouse: row.primary_house || null,
            secondaryHouse: row.secondary_house || null,
            scoreDiff: row.score_diff !== null && row.score_diff !== undefined ? Number(row.score_diff) : null,
            completedAt: row.completed_at || null,
        };
    }

    async function getSession(characterId) {
        const row = await mysql.single(
            'SELECT * FROM viccs_sorting_sessions WHERE character_id = ?',
            [Number(characterId)],
        );
        return hydrateRow(row);
    }

    async function saveSession(session) {
        await mysql.query(
            `INSERT INTO viccs_sorting_sessions
                (character_id, status, question_ids_json, option_tokens_json, current_index, scores_json, is_hatstall, primary_house, secondary_house, score_diff, completed_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                status = VALUES(status),
                question_ids_json = VALUES(question_ids_json),
                option_tokens_json = VALUES(option_tokens_json),
                current_index = VALUES(current_index),
                scores_json = VALUES(scores_json),
                is_hatstall = VALUES(is_hatstall),
                primary_house = VALUES(primary_house),
                secondary_house = VALUES(secondary_house),
                score_diff = VALUES(score_diff),
                completed_at = VALUES(completed_at)`,
            [
                Number(session.characterId),
                session.status,
                JSON.stringify(session.questionIds || []),
                JSON.stringify(session.currentOptions || []),
                Number(session.currentIndex) || 0,
                JSON.stringify(session.scores || { G: 0, R: 0, H: 0, S: 0 }),
                session.isHatstallTriggered ? 1 : 0,
                session.primaryHouse || null,
                session.secondaryHouse || null,
                session.scoreDiff !== undefined ? session.scoreDiff : null,
                session.status === 'COMPLETED' ? new Date() : null,
            ],
        );

        return await getSession(session.characterId);
    }

    async function deleteSession(characterId) {
        return await mysql.update(
            'DELETE FROM viccs_sorting_sessions WHERE character_id = ?',
            [Number(characterId)],
        );
    }

    return {
        isMigrated: () => migrated,
        init,
        getSession,
        saveSession,
        deleteSession,
    };
}

module.exports = {
    createDatabase,
};

