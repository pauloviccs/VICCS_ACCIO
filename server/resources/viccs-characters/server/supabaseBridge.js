// ═══════════════════════════════════════════════════════════════
// VICCS Accio — Supabase Whitelist Bridge (Server-Only)
// Arquivo: server/supabaseBridge.js
// ═══════════════════════════════════════════════════════════════

'use strict';

function createSupabaseBridge({ config, logger }) {
    const url = String(process.env.VICCS_SUPABASE_URL || config.supabase?.url || '').replace(/\/+$/, '');
    const key = String(process.env.VICCS_SUPABASE_SERVICE_KEY || config.supabase?.serviceRoleKey || '');
    const timeoutMs = Math.max(1500, Math.min(15000, Number(config.supabase?.timeoutMs) || 6000));

    function isConfigured() {
        return Boolean(config.featureToggles?.supabaseSync && url && key && typeof fetch === 'function');
    }

    async function request(pathWithQuery, options = {}) {
        if (!isConfigured()) return null;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch(`${url}/rest/v1/${pathWithQuery}`, {
                method: options.method || 'GET',
                headers: {
                    apikey: key,
                    Authorization: `Bearer ${key}`,
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    Prefer: options.prefer || 'return=representation',
                },
                body: options.body ? JSON.stringify(options.body) : undefined,
                signal: controller.signal,
            });

            if (!response.ok) {
                logger.warn(`Supabase retornou HTTP ${response.status}`);
                return null;
            }
            return await response.json();
        } catch (error) {
            logger.warn(`Falha na ponte Supabase: ${error instanceof Error ? error.message : String(error)}`);
            return null;
        } finally {
            clearTimeout(timer);
        }
    }

    async function fetchApprovedApplication(discordId) {
        if (!isConfigured() || !discordId) return null;
        const rows = await request(
            `character_applications?discord_id=eq.${encodeURIComponent(String(discordId))}&status=eq.approved&order=created_at.desc&limit=1`,
        );
        return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    }

    async function fetchApplicationById(applicationId, { requireApproved = true } = {}) {
        if (!isConfigured() || !applicationId) return null;
        const statusFilter = requireApproved ? '&status=eq.approved' : '';
        const rows = await request(
            `character_applications?id=eq.${encodeURIComponent(String(applicationId))}${statusFilter}&limit=1`,
        );
        return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    }

    async function linkGameCharacter({ applicationId, gameCharacterId }) {
        if (!isConfigured() || !applicationId || !gameCharacterId) return false;
        const patched = await request(
            `character_applications?id=eq.${encodeURIComponent(String(applicationId))}`,
            {
                method: 'PATCH',
                body: {
                    game_character_id: Number(gameCharacterId),
                    updated_at: new Date().toISOString(),
                },
            },
        );
        return Array.isArray(patched) && patched.length > 0;
    }

    async function syncSortingOutcome({ applicationId, sortedHouse, secondaryHouse, isHatstall, gameCharacterId }) {
        if (!isConfigured() || !applicationId || !sortedHouse) return false;
        const patched = await request(
            `character_applications?id=eq.${encodeURIComponent(String(applicationId))}`,
            {
                method: 'PATCH',
                body: {
                    sorted_house: sortedHouse,
                    secondary_house: secondaryHouse || null,
                    is_hatstall: Boolean(isHatstall),
                    sorted_at: new Date().toISOString(),
                    game_character_id: Number(gameCharacterId) || null,
                },
            },
        );
        return Array.isArray(patched) && patched.length > 0;
    }

    return {
        isConfigured,
        fetchApprovedApplication,
        fetchApplicationById,
        linkGameCharacter,
        syncSortingOutcome,
    };
}

module.exports = {
    createSupabaseBridge,
};
