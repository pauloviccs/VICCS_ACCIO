// ═══════════════════════════════════════════════════════════════
// VICCS Accio — Character Profiles & Wands Database
// Arquivo: server/database.js
// ═══════════════════════════════════════════════════════════════

'use strict';

function createDatabase({ mysql, logger }) {
    let migrated = false;

    async function init() {
        await mysql.migrate('viccs-characters', [
            {
                version: 1,
                name: 'create viccs_character_profiles and viccs_character_wands',
                statements: [
                    `CREATE TABLE IF NOT EXISTS viccs_character_profiles (
                        character_id INT NOT NULL PRIMARY KEY,
                        supabase_application_id VARCHAR(64) NULL,
                        discord_id VARCHAR(64) NULL,
                        birth_date VARCHAR(32) NOT NULL DEFAULT '',
                        birth_place VARCHAR(80) NOT NULL DEFAULT 'Grã-Bretanha',
                        blood_status VARCHAR(24) NOT NULL DEFAULT 'half-blood',
                        academic_year TINYINT UNSIGNED NOT NULL DEFAULT 1,
                        patronus VARCHAR(80) NOT NULL DEFAULT '',
                        house VARCHAR(24) NULL,
                        secondary_house VARCHAR(24) NULL,
                        hatstall TINYINT(1) NOT NULL DEFAULT 0,
                        sorted_at TIMESTAMP NULL,
                        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        INDEX idx_viccs_profiles_discord (discord_id),
                        INDEX idx_viccs_profiles_house (house)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
                    `CREATE TABLE IF NOT EXISTS viccs_character_wands (
                        character_id INT NOT NULL PRIMARY KEY,
                        wood VARCHAR(64) NOT NULL,
                        core VARCHAR(80) NOT NULL,
                        length VARCHAR(32) NOT NULL,
                        flexibility VARCHAR(48) NOT NULL,
                        handle_id VARCHAR(64) NOT NULL,
                        chosen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
                ],
            },
            {
                version: 2,
                name: 'add full_name, backstory, intro_completed and unique application ownership',
                statements: [
                    `ALTER TABLE viccs_character_profiles
                        ADD COLUMN IF NOT EXISTS full_name VARCHAR(120) NULL AFTER discord_id,
                        ADD COLUMN IF NOT EXISTS character_backstory LONGTEXT NULL AFTER patronus,
                        ADD COLUMN IF NOT EXISTS intro_completed TINYINT(1) NOT NULL DEFAULT 0 AFTER sorted_at`,
                    `CREATE UNIQUE INDEX IF NOT EXISTS idx_viccs_profiles_app_unique
                        ON viccs_character_profiles (supabase_application_id)`,
                ],
            },
            {
                version: 3,
                name: 'add robes_house and robes_applied persistence for house uniform sync',
                statements: [
                    `ALTER TABLE viccs_character_profiles
                        ADD COLUMN IF NOT EXISTS robes_house VARCHAR(24) NULL AFTER intro_completed,
                        ADD COLUMN IF NOT EXISTS robes_applied TINYINT(1) NOT NULL DEFAULT 0 AFTER robes_house`,
                ],
            },
            {
                version: 4,
                name: 'add dormitory, preferred_house, and word_count for complete portal sync',
                statements: [
                    `ALTER TABLE viccs_character_profiles
                        ADD COLUMN IF NOT EXISTS dormitory VARCHAR(16) NOT NULL DEFAULT 'wizard' AFTER blood_status,
                        ADD COLUMN IF NOT EXISTS preferred_house VARCHAR(24) NULL AFTER patronus,
                        ADD COLUMN IF NOT EXISTS word_count INT UNSIGNED NOT NULL DEFAULT 0 AFTER character_backstory`,
                ],
            },
        ]);

        migrated = true;
        logger.info('Tabelas viccs_character_profiles e viccs_character_wands verificadas');
    }

    async function getProfile(characterId) {
        return await mysql.single(
            'SELECT * FROM viccs_character_profiles WHERE character_id = ?',
            [Number(characterId)],
        );
    }

    async function getWand(characterId) {
        return await mysql.single(
            'SELECT * FROM viccs_character_wands WHERE character_id = ?',
            [Number(characterId)],
        );
    }

    async function isApplicationClaimedElsewhere(applicationId, characterId) {
        if (!applicationId) return false;
        const row = await mysql.single(
            'SELECT character_id FROM viccs_character_profiles WHERE supabase_application_id = ? AND character_id <> ?',
            [String(applicationId), Number(characterId)],
        );
        return Boolean(row);
    }

    async function upsertProfile(characterId, data) {
        await mysql.query(
            `INSERT INTO viccs_character_profiles
                (character_id, supabase_application_id, discord_id, full_name, birth_date, birth_place, blood_status, dormitory, academic_year, patronus, preferred_house, character_backstory, word_count, house, secondary_house, hatstall, sorted_at, intro_completed)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                supabase_application_id = COALESCE(VALUES(supabase_application_id), supabase_application_id),
                discord_id = COALESCE(VALUES(discord_id), discord_id),
                full_name = COALESCE(VALUES(full_name), full_name),
                birth_date = VALUES(birth_date),
                birth_place = VALUES(birth_place),
                blood_status = VALUES(blood_status),
                dormitory = VALUES(dormitory),
                academic_year = VALUES(academic_year),
                patronus = VALUES(patronus),
                preferred_house = COALESCE(VALUES(preferred_house), preferred_house),
                character_backstory = COALESCE(VALUES(character_backstory), character_backstory),
                word_count = GREATEST(word_count, VALUES(word_count)),
                house = COALESCE(VALUES(house), house),
                secondary_house = COALESCE(VALUES(secondary_house), secondary_house),
                hatstall = VALUES(hatstall),
                sorted_at = COALESCE(VALUES(sorted_at), sorted_at),
                intro_completed = GREATEST(intro_completed, VALUES(intro_completed))`,
            [
                Number(characterId),
                data.supabaseApplicationId || null,
                data.discordId || null,
                data.fullName || null,
                data.birthDate || '',
                data.birthPlace || 'Grã-Bretanha',
                data.bloodStatus || 'half-blood',
                data.dormitory === 'witch' ? 'witch' : 'wizard',
                Number(data.academicYear) || 1,
                data.patronus || '',
                data.preferredHouse || null,
                data.characterBackstory || null,
                Number(data.wordCount) || 0,
                data.house || null,
                data.secondaryHouse || null,
                data.hatstall ? 1 : 0,
                data.sortedAt || null,
                data.introCompleted ? 1 : 0,
            ],
        );

        return await getProfile(characterId);
    }

    async function upsertWand(characterId, wand) {
        await mysql.query(
            `INSERT INTO viccs_character_wands (character_id, wood, core, length, flexibility, handle_id)
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                wood = VALUES(wood),
                core = VALUES(core),
                length = VALUES(length),
                flexibility = VALUES(flexibility),
                handle_id = VALUES(handle_id)`,
            [
                Number(characterId),
                wand.wood,
                wand.core,
                wand.length,
                wand.flexibility,
                wand.handleId,
            ],
        );

        return await getWand(characterId);
    }

    async function updateSortingResult(characterId, { primaryHouse, secondaryHouse, hatstall }) {
        await mysql.update(
            `UPDATE viccs_character_profiles
             SET house = ?, secondary_house = ?, hatstall = ?, sorted_at = CURRENT_TIMESTAMP
             WHERE character_id = ?`,
            [primaryHouse, secondaryHouse || null, hatstall ? 1 : 0, Number(characterId)],
        );
        return await getProfile(characterId);
    }

    async function markIntroCompleted(characterId) {
        await mysql.update(
            'UPDATE viccs_character_profiles SET intro_completed = 1 WHERE character_id = ?',
            [Number(characterId)],
        );
    }

    async function updateRobesState(characterId, { robesHouse = null, robesApplied = false } = {}) {
        await mysql.update(
            'UPDATE viccs_character_profiles SET robes_house = ?, robes_applied = ? WHERE character_id = ?',
            [robesHouse ? String(robesHouse).toLowerCase() : null, robesApplied ? 1 : 0, Number(characterId)],
        );
        return await getProfile(characterId);
    }

    return {
        isMigrated: () => migrated,
        init,
        getProfile,
        getWand,
        isApplicationClaimedElsewhere,
        upsertProfile,
        upsertWand,
        updateSortingResult,
        markIntroCompleted,
        updateRobesState,
    };
}

module.exports = {
    createDatabase,
};
