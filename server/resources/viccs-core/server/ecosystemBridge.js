// ═══════════════════════════════════════════════════════════════
// VICCS Accio — Universal Ecosystem Bridge (HMP <-> VICCS)
// Arquivo: server/ecosystemBridge.js
// ═══════════════════════════════════════════════════════════════

'use strict';

const { safeImportWith, buildPlayerBookSnapshot } = require('./service');

const HMP_MODULES = Object.freeze([
    'hmp-mysql',
    'hmp-lib',
    'hmp-audio',
    'hmp-ui',
    'hmp-core',
    'hmp-pvp',
    'hmp-houses',
    'hmp-inventory',
    'hmp-characters',
    'hmp-spawn',
    'hmp-blips',
    'hmp-banking',
    'hmp-interact',
    'hmp-activities',
    'hmp-doors',
    'hmp-world',
    'hmp-express',
    'hmp-worldstate',
    'hmp-loot',
    'hmp-beasts',
    'hmp-emotes',
    'hmp-npcs',
    'hmp-shops',
    'hmp-progression',
    'hmp-spells',
    'hmp-duels',
    'hmp-jobs',
    'hmp-business',
    'hmp-admin',
    'hmp-webhooks',
]);

const VICCS_MODULES = Object.freeze([
    'viccs-core',
    'viccs-ui',
    'viccs-characters',
    'viccs-sorting',
]);

const HOUSE_LABELS_PT = Object.freeze({
    gryffindor: 'Grifinória',
    slytherin: 'Sonserina',
    ravenclaw: 'Corvinal',
    hufflepuff: 'Lufa-Lufa',
});

function formatHouseLabel(slug) {
    const key = String(slug || '').trim().toLowerCase();
    return HOUSE_LABELS_PT[key] || null;
}

/**
 * Resolve mapa booleano de disponibilidade de módulos sem lançar exceções.
 */
function buildCapabilitiesSnapshot(apis) {
    const map = {};
    for (const [name, api] of Object.entries(apis || {})) {
        map[name] = Boolean(api);
    }
    return map;
}

/**
 * Cria a ponte universal que conecta HMP Foundations `hmp-*` e módulos autorais `viccs-*`.
 */
function createEcosystemBridge({ core, events, safeImport, auditApi, ticketBridge, config, logger }) {
    const apis = new Map();
    const missingUntil = new Map();
    const activeSortingPlayers = new Set();

    function getApi(name) {
        if (!name) return null;
        if (apis.has(name)) return apis.get(name);
        const blockedUntil = missingUntil.get(name) || 0;
        if (Date.now() < blockedUntil) return null;

        const mod = safeImport(name);
        if (mod) {
            apis.set(name, mod);
            missingUntil.delete(name);
            return mod;
        }
        missingUntil.set(name, Date.now() + 10000);
        return null;
    }

    function refresh(onlyName = null) {
        if (onlyName) {
            apis.delete(onlyName);
            missingUntil.delete(onlyName);
            getApi(onlyName);
            return capabilities();
        }
        for (const name of [...HMP_MODULES, ...VICCS_MODULES]) {
            missingUntil.delete(name);
            getApi(name);
        }
        return capabilities();
    }

    function capabilities() {
        const snapshot = {};
        for (const name of [...HMP_MODULES, ...VICCS_MODULES]) {
            snapshot[name] = apis.has(name);
        }
        return buildCapabilitiesSnapshot(snapshot);
    }

    function emitEcosystem(suffix, payload) {
        try {
            events.emit(`viccs:ecosystem:${suffix}`, {
                ...payload,
                timestamp: Date.now(),
            });
        } catch (error) {
            logger.warn(`Erro ao emitir viccs:ecosystem:${suffix}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    async function sendWebhookSafe(payload) {
        if (config.featureToggles?.ecosystemWebhooks === false) return false;
        const webhooks = getApi('hmp-webhooks');
        if (!webhooks || typeof webhooks.send !== 'function') return false;
        try {
            await webhooks.send(payload);
            return true;
        } catch (error) {
            logger.debug(`Webhook ignorado: ${error instanceof Error ? error.message : String(error)}`);
            return false;
        }
    }

    async function getPlayerContext(player) {
        if (!player) return null;
        const session = core.sessions?.get ? core.sessions.get(player) : null;
        const character = core.characters?.active ? core.characters.active(player) : null;
        const verified = ticketBridge?.getVerifiedSession ? ticketBridge.getVerifiedSession(player) : null;

        const context = {
            playerId: player.id,
            nickname: player.nickname || null,
            accountId: session?.account?.id || null,
            verifiedDiscordId: verified?.discordId || null,
            character: character
                ? { id: character.id, name: character.name, slot: character.slot }
                : null,
            profile: null,
            wand: null,
            house: null,
            economy: null,
            employment: { jobs: [], onDuty: null },
            businesses: { managedIds: [] },
            inventory: null,
            beasts: { count: 0 },
            spells: { grantedCount: 0 },
            duel: { active: false },
            sortingActive: activeSortingPlayers.has(player.id),
        };

        if (!character) return context;

        const viccsChars = getApi('viccs-characters');
        if (viccsChars?.profiles?.get) {
            try {
                context.profile = await viccsChars.profiles.get(character.id);
            } catch (_) {}
        }
        if (viccsChars?.wands?.get) {
            try {
                context.wand = await viccsChars.wands.get(character.id);
            } catch (_) {}
        }

        const houses = getApi('hmp-houses');
        if (houses?.membership?.get) {
            try {
                const membership = await houses.membership.get(player);
                if (membership?.house) {
                    const standing = houses.points?.get ? await houses.points.get(membership.house) : null;
                    context.house = {
                        slug: membership.house,
                        label: formatHouseLabel(membership.house) || membership.house,
                        points: standing?.points ?? null,
                    };
                }
            } catch (_) {}
        }

        const banking = getApi('hmp-banking');
        if (banking?.accounts?.personal) {
            try {
                const acc = await banking.accounts.personal(player, 'galleons');
                if (acc) {
                    context.economy = {
                        accountNumber: acc.number,
                        balance: acc.balance,
                        currency: 'galleons',
                    };
                }
            } catch (_) {}
        }

        const jobs = getApi('hmp-jobs');
        if (jobs?.employment?.list) {
            try {
                const list = await jobs.employment.list(character.id);
                const duty = jobs.duty?.get ? jobs.duty.get(player) : null;
                context.employment = {
                    jobs: Array.isArray(list) ? list.map((j) => ({ jobId: j.jobId, grade: j.grade, active: j.active })) : [],
                    onDuty: duty ? { jobId: duty.jobId, grade: duty.grade } : null,
                };
            } catch (_) {}
        }

        const business = getApi('hmp-business');
        if (business?.businesses?.managed) {
            try {
                const managed = await business.businesses.managed(player);
                context.businesses = {
                    managedIds: Array.isArray(managed) ? managed.map((b) => b.id) : [],
                };
            } catch (_) {}
        }

        const beasts = getApi('hmp-beasts');
        if (beasts?.bag?.list) {
            try {
                const list = beasts.bag.list(player);
                context.beasts = { count: Array.isArray(list) ? list.length : 0 };
            } catch (_) {}
        }

        const spells = getApi('hmp-spells');
        if (spells?.grants?.list) {
            try {
                const grants = await spells.grants.list(player);
                context.spells = { grantedCount: Array.isArray(grants) ? grants.length : 0 };
            } catch (_) {}
        }

        const inventory = getApi('hmp-inventory');
        if (inventory) {
            try {
                const nativeRows = inventory.native?.list ? inventory.native.list(player) : [];
                const invView = inventory.inventory?.get ? await inventory.inventory.get(player) : null;
                context.inventory = {
                    usedSlots: Number(invView?.usedSlots) || 0,
                    totalSlots: Number(invView?.container?.slots) || 0,
                    nativeCount: Array.isArray(nativeRows) ? nativeRows.length : 0,
                };
            } catch (_) {}
        }

        return context;
    }

    async function getPlayerBookSnapshot(player) {
        if (!player) return null;
        const session = core.sessions?.get ? core.sessions.get(player) : null;
        const character = core.characters?.active ? core.characters.active(player) : null;
        const verified = ticketBridge?.getVerifiedSession ? ticketBridge.getVerifiedSession(player) : null;
        const caps = capabilities();
        const viccsChars = getApi('viccs-characters');
        const viccsSorting = getApi('viccs-sorting');
        const houses = getApi('hmp-houses');
        const inventory = getApi('hmp-inventory');
        const progressionApi = getApi('hmp-progression');
        const spellsApi = getApi('hmp-spells');
        const banking = getApi('hmp-banking');
        const jobs = getApi('hmp-jobs');
        const business = getApi('hmp-business');
        const beasts = getApi('hmp-beasts');
        const activities = getApi('hmp-activities');

        let expectedRobeItems = ['Outfit_001_Basic', 'Back_001_Basic'];
        if (viccsChars?.sync?.getHouseRobeItems) {
            try {
                const cfgItems = viccsChars.sync.getHouseRobeItems();
                if (Array.isArray(cfgItems) && cfgItems.length) expectedRobeItems = cfgItems;
            } catch (_) {}
        }

        if (!character) {
            return buildPlayerBookSnapshot({
                playerId: player.id,
                nickname: player.nickname || '',
                accountId: session?.account?.id || null,
                verifiedDiscordId: verified?.discordId || null,
                isTicketBridgeConfigured: Boolean(ticketBridge?.isConfigured?.()),
                capabilities: caps,
                expectedRobeItems,
            });
        }

        const safe = async (fn, fallback = null) => {
            try {
                return await fn();
            } catch (_) {
                return fallback;
            }
        };

        const [
            profile,
            wand,
            membership,
            houseStandings,
            sortingState,
            nativeRows,
            inventoryView,
            progression,
            talents,
            flooFlames,
            spellsResolved,
            grantedSpells,
            bankingAcc,
            jobList,
            duty,
            managedBusinesses,
            beastsBag,
        ] = await Promise.all([
            safe(() => viccsChars?.profiles?.get?.(character.id), null),
            safe(() => viccsChars?.wands?.get?.(character.id), null),
            safe(() => houses?.membership?.get?.(player), null),
            safe(() => houses?.points?.standings?.(), []),
            safe(() => viccsSorting?.ceremony?.getStateForPlayer?.(player), null),
            safe(() => (inventory?.native?.list ? inventory.native.list(player) : []), []),
            safe(() => (inventory?.inventory?.get ? inventory.inventory.get(player) : null), null),
            safe(() => progressionApi?.progression?.get?.(player), null),
            safe(() => progressionApi?.talents?.list?.(player), []),
            safe(() => progressionApi?.flooFlames?.list?.(player), []),
            safe(() => spellsApi?.policy?.resolve?.(player), null),
            safe(() => spellsApi?.grants?.list?.(player), []),
            safe(() => banking?.accounts?.personal?.(player, 'galleons'), null),
            safe(() => jobs?.employment?.list?.(character.id), []),
            safe(() => jobs?.duty?.get?.(player), null),
            safe(() => business?.businesses?.managed?.(player), []),
            safe(() => (beasts?.bag?.list ? beasts.bag.list(player) : []), []),
        ]);

        const lessonsList = Array.isArray(spellsApi?.lessons?.list?.()) ? spellsApi.lessons.list() : [];
        let pendingDuel = false;
        try {
            const invites = activities?.invitations?.list ? activities.invitations.list(player) : [];
            pendingDuel = Array.isArray(invites) && invites.some((inv) => inv.activityId === 'duel:standard');
        } catch (_) {}

        return buildPlayerBookSnapshot({
            playerId: player.id,
            nickname: player.nickname || '',
            accountId: session?.account?.id || null,
            verifiedDiscordId: verified?.discordId || null,
            isTicketBridgeConfigured: Boolean(ticketBridge?.isConfigured?.()),
            character: { id: character.id, name: character.name, slot: character.slot },
            profile,
            wand,
            house: membership?.house || null,
            houseStandings,
            sorting: sortingState,
            nativeRows,
            expectedRobeItems,
            inventoryView,
            progression,
            talents,
            flooFlames,
            spellsResolved,
            grantedSpells,
            lessonsCount: lessonsList.length,
            bankingGalleons: bankingAcc ? bankingAcc.balance : null,
            jobs: jobList,
            duty,
            businesses: managedBusinesses,
            beastsCount: Array.isArray(beastsBag) ? beastsBag.length : 0,
            pendingDuel,
            capabilities: caps,
        });
    }

    async function openService(player, target, payload = {}) {
        if (!player) return false;
        switch (target) {
            case 'book': {
                const ui = getApi('viccs-ui');
                if (ui?.book?.open) return await ui.book.open(player, payload || {});
                return false;
            }
            case 'reapply-robes': {
                const chars = getApi('viccs-characters');
                if (chars?.sync?.reapplyHouseRobes) {
                    return await chars.sync.reapplyHouseRobes(player, { force: true, ...(payload || {}) });
                }
                return false;
            }
            case 'sheet':
            case 'wand': {
                const chars = getApi('viccs-characters');
                if (chars?.profiles?.openSheet) {
                    return await chars.profiles.openSheet(player, target);
                }
                return false;
            }
            case 'link': {
                const chars = getApi('viccs-characters');
                if (chars?.profiles?.openLinkModal) {
                    return chars.profiles.openLinkModal(player);
                }
                return false;
            }
            case 'inventory': {
                const inv = getApi('hmp-inventory');
                if (inv?.ui?.open) return await inv.ui.open(player);
                return false;
            }
            case 'emotes': {
                const emotes = getApi('hmp-emotes');
                if (emotes?.ui?.open) return await emotes.ui.open(player);
                return false;
            }
            case 'characters': {
                const chars = getApi('hmp-characters');
                if (chars?.ui?.open) return await chars.ui.open(player, { mode: 'join' });
                return false;
            }
            case 'sorting': {
                const sorting = getApi('viccs-sorting');
                if (sorting?.ceremony?.start) return await sorting.ceremony.start(player);
                return false;
            }
            case 'banking': {
                const banking = getApi('hmp-banking');
                if (banking?.ui?.open) {
                    await banking.ui.open(player);
                    return true;
                }
                return false;
            }
            case 'jobs': {
                const jobs = getApi('hmp-jobs');
                if (jobs?.ui?.open) {
                    await jobs.ui.open(player);
                    return true;
                }
                return false;
            }
            case 'business': {
                const business = getApi('hmp-business');
                if (business?.ui?.open) {
                    return await business.ui.open(player);
                }
                return false;
            }
            case 'beasts': {
                const beasts = getApi('hmp-beasts');
                if (beasts?.menu?.open) {
                    await beasts.menu.open(player);
                    return true;
                }
                return false;
            }
            case 'duel-accept': {
                const duels = getApi('hmp-duels');
                if (duels?.accept) {
                    return await duels.accept(player);
                }
                return false;
            }
            default:
                return false;
        }
    }

    function registerListeners() {
        events.on('viccs:sorting:started', (payload) => {
            if (payload?.playerId) activeSortingPlayers.add(payload.playerId);
        });

        events.on('viccs:sorting:completed', (payload) => {
            if (payload?.playerId) activeSortingPlayers.delete(payload.playerId);
            emitEcosystem('houseChanged', {
                playerId: payload?.playerId || null,
                characterId: payload?.characterId || null,
                house: payload?.primaryHouse || null,
                source: 'viccs-sorting',
            });

            if (payload?.primaryHouse) {
                const housePt = formatHouseLabel(payload.primaryHouse) || payload.primaryHouse;
                void sendWebhookSafe({
                    title: '🎩 Cerimônia do Chapéu Seletor',
                    description: `O estudante **#${payload.characterId}** foi selecionado para **${housePt}**${payload.hatstall ? ' após um raro *Hatstall*' : ''}!`,
                });
            }
        });

        events.on('viccs:sorting:closed', (payload) => {
            if (payload?.playerId) activeSortingPlayers.delete(payload.playerId);
        });

        events.on('hmp:character:may-switch', (request) => {
            if (!request?.player) return;
            if (activeSortingPlayers.has(request.player.id)) {
                request.allow = false;
                request.reason = 'Conclua a Cerimônia do Chapéu Seletor antes de trocar de personagem.';
            }
        });

        events.on('playerDisconnect', (player) => {
            if (player) activeSortingPlayers.delete(player.id);
        });

        events.on('hmp:houses:changed', (payload) => {
            emitEcosystem('houseChanged', {
                playerId: payload?.player?.id || null,
                characterId: payload?.character?.id || null,
                house: payload?.membership?.house || null,
                previousHouse: payload?.previousHouse || null,
                source: 'hmp-houses',
            });
        });

        events.on('hmp:houses:points', (payload) => {
            emitEcosystem('housePoints', {
                house: payload?.transaction?.house || null,
                amount: payload?.transaction?.amount || 0,
                balanceAfter: payload?.standing?.points ?? null,
                reason: payload?.transaction?.reason || '',
            });
        });

        events.on('hmp:banking:transferred', (payload) => {
            emitEcosystem('economy', {
                type: 'transfer',
                playerId: payload?.player?.id || null,
                amount: payload?.transaction?.amount || 0,
            });
        });

        events.on('hmp:banking:deposited', (payload) => {
            emitEcosystem('economy', {
                type: 'deposit',
                playerId: payload?.player?.id || null,
                characterId: payload?.character?.id || null,
                amount: payload?.transaction?.amount || 0,
            });
        });

        events.on('hmp:banking:withdrawn', (payload) => {
            emitEcosystem('economy', {
                type: 'withdraw',
                playerId: payload?.player?.id || null,
                characterId: payload?.character?.id || null,
                amount: payload?.transaction?.amount || 0,
            });
        });

        events.on('hmp:shop:purchased', (payload) => {
            emitEcosystem('commerce', {
                action: 'buy',
                playerId: payload?.player?.id || null,
                characterId: payload?.character?.id || null,
                shopId: payload?.shop?.id || null,
                offerId: payload?.offer?.id || null,
            });
        });

        events.on('hmp:shop:sold', (payload) => {
            emitEcosystem('commerce', {
                action: 'sell',
                playerId: payload?.player?.id || null,
                characterId: payload?.character?.id || null,
                shopId: payload?.shop?.id || null,
                offerId: payload?.offer?.id || null,
            });
        });

        events.on('hmp:jobs:duty', (payload) => {
            emitEcosystem('jobChanged', {
                action: 'duty',
                playerId: payload?.player?.id || null,
                jobId: payload?.job?.id || null,
                onDuty: Boolean(payload?.onDuty),
            });
        });

        events.on('hmp:jobs:hired', (payload) => {
            emitEcosystem('jobChanged', { action: 'hired', characterId: payload?.employment?.characterId || null, jobId: payload?.job?.id || null });
        });

        events.on('hmp:jobs:fired', (payload) => {
            emitEcosystem('jobChanged', { action: 'fired', characterId: payload?.employment?.characterId || null, jobId: payload?.job?.id || null });
        });

        events.on('hmp:inventory:changed', (payload) => {
            emitEcosystem('inventory', {
                playerId: payload?.player?.id || null,
                characterId: payload?.character?.id || null,
                action: payload?.action || 'changed',
                source: payload?.source || 'custom',
            });
        });

        events.on('hmp:progression:changed', (payload) => {
            emitEcosystem('progression', {
                characterId: payload?.characterId || null,
                experience: payload?.experience ?? null,
            });
        });

        events.on('hmp:interact:used', (payload) => {
            emitEcosystem('interact', {
                playerId: payload?.player?.id || null,
                interactionId: payload?.interaction?.id || payload?.id || null,
            });
        });

        events.on('hmp:activities:completed', (payload) => {
            emitEcosystem('activityCompleted', {
                activityId: payload?.activityId || payload?.session?.activityId || null,
                reason: payload?.reason || null,
            });
            if (auditApi?.record && payload?.activityId === 'duel:standard') {
                void auditApi.record({
                    resource: 'hmp-duels',
                    action: 'duel.completed',
                    reason: payload?.reason || 'Duelo encerrado',
                    after: { activityId: payload?.activityId },
                });
            }
        });
        events.on('resourceStart', (name) => {
            if (name) {
                missingUntil.delete(name);
                apis.delete(name);
            }
        });

        events.on('resourceStop', (name) => {
            if (name) {
                apis.delete(name);
                missingUntil.delete(name);
            } else {
                apis.clear();
                missingUntil.clear();
            }
        });
    }

    function summary() {
        const caps = capabilities();
        const total = Object.keys(caps).length;
        const active = Object.values(caps).filter(Boolean).length;
        return { totalModules: total, activeModules: active };
    }

    return {
        refresh,
        getApi,
        capabilities,
        getPlayerContext,
        getPlayerBookSnapshot,
        openService,
        registerListeners,
        summary,
    };
}

module.exports = {
    HMP_MODULES,
    VICCS_MODULES,
    HOUSE_LABELS_PT,
    formatHouseLabel,
    buildCapabilitiesSnapshot,
    createEcosystemBridge,
};
