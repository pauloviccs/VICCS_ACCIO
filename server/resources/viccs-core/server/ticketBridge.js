// ═══════════════════════════════════════════════════════════════
// VICCS Accio — Verified Website Identity & Ticket Bridge
// Arquivo: server/ticketBridge.js
// ═══════════════════════════════════════════════════════════════

'use strict';

const crypto = require('crypto');

const PROVIDER_NAME = 'accio-supabase';

function sha256Hex(value) {
    return crypto.createHash('sha256').update(String(value || ''), 'utf8').digest('hex');
}

/**
 * Gerencia tickets de uso único (`hogwartsmp://host:port?ticket=...`) e códigos de vínculo direto
 * sem nunca confiar em identificadores declarados livremente pelo cliente.
 */
function createTicketBridge({ core, config, logger }) {
    const supabaseUrl = String(process.env.VICCS_SUPABASE_URL || config.identity?.supabaseUrl || '').replace(/\/+$/, '');
    const serviceKey = String(process.env.VICCS_SUPABASE_SERVICE_KEY || config.identity?.supabaseServiceKey || '');
    const timeoutMs = Math.max(1500, Math.min(15000, Number(config.identity?.timeoutMs) || 6000));
    const verifiedByPlayer = new Map();

    function isConfigured() {
        return Boolean(config.identity?.supabaseTicketValidation && supabaseUrl && serviceKey && typeof fetch === 'function');
    }

    async function supabaseFetch(pathWithQuery, options = {}) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const response = await fetch(`${supabaseUrl}/rest/v1/${pathWithQuery}`, {
                method: options.method || 'GET',
                headers: {
                    apikey: serviceKey,
                    Authorization: `Bearer ${serviceKey}`,
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    Prefer: options.prefer || 'return=representation',
                },
                body: options.body ? JSON.stringify(options.body) : undefined,
                signal: controller.signal,
            });
            if (!response.ok) return null;
            return await response.json();
        } catch (error) {
            logger.warn(`Erro na verificação Supabase Auth Bridge: ${error instanceof Error ? error.message : String(error)}`);
            return null;
        } finally {
            clearTimeout(timer);
        }
    }

    async function redeemJoinTicket({ ticket }) {
        if (!isConfigured() || !ticket) return null;
        const tokenHash = sha256Hex(ticket);
        const nowIso = new Date().toISOString();

        const rows = await supabaseFetch(
            `server_join_tickets?token_hash=eq.${encodeURIComponent(tokenHash)}&used_at=is.null&expires_at=gt.${encodeURIComponent(nowIso)}&limit=1`,
        );
        const row = Array.isArray(rows) ? rows[0] : null;
        if (!row) return null;

        const patched = await supabaseFetch(
            `server_join_tickets?id=eq.${encodeURIComponent(row.id)}&used_at=is.null`,
            { method: 'PATCH', body: { used_at: nowIso } },
        );
        const consumed = Array.isArray(patched) ? patched[0] : null;
        if (!consumed) return null;

        return {
            discordId: String(consumed.discord_id),
            applicationId: consumed.application_id ? String(consumed.application_id) : null,
        };
    }

    async function redeemLinkCodeForPlayer(player, rawCode) {
        if (!player || !rawCode) return { ok: false, reason: 'Código inválido.' };
        if (!isConfigured()) return { ok: false, reason: 'Ponte de verificação Supabase desativada no servidor.' };

        const code = String(rawCode).trim().toUpperCase();
        if (!/^[A-Z0-9-]{6,24}$/.test(code)) {
            return { ok: false, reason: 'Formato de código inválido.' };
        }

        const session = core.sessions.get(player);
        if (!session?.account) {
            return { ok: false, reason: 'Sessão de conta ainda não está pronta.' };
        }

        const nowIso = new Date().toISOString();
        const rows = await supabaseFetch(
            `server_link_codes?code=eq.${encodeURIComponent(code)}&used_at=is.null&expires_at=gt.${encodeURIComponent(nowIso)}&limit=1`,
        );
        const row = Array.isArray(rows) ? rows[0] : null;
        if (!row) {
            return { ok: false, reason: 'Código não encontrado, expirado ou já utilizado.' };
        }

        const patched = await supabaseFetch(
            `server_link_codes?code=eq.${encodeURIComponent(code)}&used_at=is.null`,
            { method: 'PATCH', body: { used_at: nowIso } },
        );
        const consumed = Array.isArray(patched) ? patched[0] : null;
        if (!consumed) {
            return { ok: false, reason: 'Este código já foi resgatado.' };
        }

        const principal = {
            provider: PROVIDER_NAME,
            subject: String(consumed.discord_id),
            trust: 'verified',
        };

        try {
            const linked = await core.accounts.linkIdentity(session.account.id, principal);
            if (!linked) {
                return { ok: false, reason: 'Este Discord já está vinculado a outra conta no servidor.' };
            }
        } catch (error) {
            return {
                ok: false,
                reason: error instanceof Error ? error.message : 'Este Discord já pertence a outra conta.',
            };
        }

        const result = {
            discordId: String(consumed.discord_id),
            applicationId: consumed.application_id ? String(consumed.application_id) : null,
        };
        verifiedByPlayer.set(player.id, result);
        return { ok: true, ...result };
    }

    function registerWithCore() {
        core.tickets.register({
            name: PROVIDER_NAME,
            resource: 'viccs-core',
            priority: 100,
            async redeem(connection) {
                return await redeemJoinTicket(connection);
            },
        });

        core.identity.register({
            name: PROVIDER_NAME,
            resource: 'viccs-core',
            priority: 100,
            trust: 'verified',
            resolve(player) {
                const ticket = core.tickets.get(player);
                if (ticket?.redeemer === PROVIDER_NAME && ticket.result?.discordId) {
                    const data = {
                        discordId: String(ticket.result.discordId),
                        applicationId: ticket.result.applicationId || null,
                    };
                    verifiedByPlayer.set(player.id, data);
                    return {
                        provider: PROVIDER_NAME,
                        subject: data.discordId,
                        trust: 'verified',
                    };
                }
                return null;
            },
        });
    }

    function getVerifiedSession(player) {
        if (!player) return null;
        if (verifiedByPlayer.has(player.id)) return verifiedByPlayer.get(player.id);
        const session = core.sessions.get(player);
        if (session?.principal?.provider === PROVIDER_NAME && session.principal?.trust === 'verified') {
            return { discordId: String(session.principal.subject), applicationId: null };
        }
        return null;
    }

    function clearPlayer(player) {
        if (player) verifiedByPlayer.delete(player.id);
    }

    return {
        PROVIDER_NAME,
        isConfigured,
        registerWithCore,
        redeemLinkCodeForPlayer,
        getVerifiedSession,
        clearPlayer,
    };
}

module.exports = {
    sha256Hex,
    createTicketBridge,
};

