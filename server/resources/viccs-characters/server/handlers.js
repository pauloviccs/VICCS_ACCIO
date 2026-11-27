// ═══════════════════════════════════════════════════════════════
// VICCS Accio — Character Handlers, Security Link & Seamless Flow
// Arquivo: server/handlers.js
// ═══════════════════════════════════════════════════════════════

'use strict';

const {
    resolveWandHandle,
    normalizeApplicationToProfile,
    buildCharacterSheetViewModel,
    buildCreatorPrefillFromApplication,
    planHouseRobePatch,
} = require('./service');

function createHandlers({ hmp, core, houses, viccsCore, viccsUi, database, supabaseBridge, config, events, logger }) {
    const linkRateLimiter = hmp.rateLimit.create({ limit: 5, windowMs: 10000 });
    const pendingIntroTriggers = new Set();

    function resolveOnlinePlayer(playerOrId) {
        if (playerOrId && typeof playerOrId === 'object' && 'id' in playerOrId) {
            return playerOrId;
        }
        const numericId = Number(playerOrId);
        if (!Number.isSafeInteger(numericId) || numericId <= 0 || typeof PlayerManager === 'undefined') {
            return null;
        }
        if (typeof PlayerManager.getById === 'function') {
            const direct = PlayerManager.getById(numericId);
            if (direct) return direct;
        }
        if (typeof PlayerManager.getAll === 'function') {
            const all = PlayerManager.getAll();
            if (Array.isArray(all)) {
                return all.find((p) => Number(p?.id) === numericId) || null;
            }
        }
        return null;
    }

    function isPlayerConnected(player) {
        return Boolean(player && player.id !== undefined && player.connected !== false);
    }

    function resolveTrustedDiscord(session) {
        const verified = viccsCore.auth.getVerifiedSession(session?.player);
        if (verified?.discordId) {
            return { discordId: verified.discordId, applicationId: verified.applicationId || null, verified: true };
        }

        if (config.featureToggles?.allowAssertedDiscordInDev && !config.featureToggles?.requireWhitelistVerification) {
            const devDiscord =
                session?.player?.discordId ||
                (session?.principal?.provider === 'client-discord' ? session.principal.subject : null);
            if (devDiscord) {
                return { discordId: String(devDiscord), applicationId: null, verified: false };
            }
        }

        return null;
    }

    async function ensureCharacterData(session, character) {
        if (!character?.id) return null;

        let profile = await database.getProfile(character.id);
        let wand = await database.getWand(character.id);

        const identity = resolveTrustedDiscord(session);
        let syncedFromSupabase = false;
        let whitelistData = null;

        if ((!profile || !profile.supabase_application_id) && identity && supabaseBridge.isConfigured()) {
            const approved = identity.applicationId
                ? await supabaseBridge.fetchApplicationById(identity.applicationId)
                : await supabaseBridge.fetchApprovedApplication(identity.discordId);

            if (approved) {
                const alreadyOwned = await database.isApplicationClaimedElsewhere(approved.id, character.id);
                if (alreadyOwned) {
                    logger.warn(`Tentativa bloqueada de reutilizar ficha Supabase ${approved.id} no personagem #${character.id}`);
                } else {
                    whitelistData = normalizeApplicationToProfile(approved, config.defaults, config.wandHandles);
                    syncedFromSupabase = Boolean(whitelistData);
                }
            }
        }

        if (!profile || syncedFromSupabase) {
            profile = await database.upsertProfile(character.id, {
                supabaseApplicationId: whitelistData?.supabaseApplicationId || profile?.supabase_application_id || null,
                discordId: identity?.discordId || profile?.discord_id || null,
                fullName: whitelistData?.fullName || profile?.full_name || character.name || null,
                birthDate: whitelistData?.birthDate || profile?.birth_date || '',
                birthPlace: whitelistData?.birthPlace || profile?.birth_place || config.defaults?.defaultBirthPlace || 'Grã-Bretanha',
                bloodStatus: whitelistData?.bloodStatus || profile?.blood_status || config.defaults?.defaultBloodStatus || 'half-blood',
                academicYear: Number(profile?.academic_year || config.defaults?.startingAcademicYear || 1),
                patronus: whitelistData?.patronus || profile?.patronus || '',
                characterBackstory: whitelistData?.characterBackstory || profile?.character_backstory || null,
                house: profile?.house || null,
                secondaryHouse: profile?.secondary_house || null,
                hatstall: Boolean(profile?.hatstall),
                introCompleted: Boolean(profile?.intro_completed),
            });
        }

        if (!wand || syncedFromSupabase) {
            const defWand = whitelistData?.wand || config.defaults?.defaultWand || {};
            const handle = resolveWandHandle(defWand.handleId || wand?.handle_id, config.wandHandles);
            wand = await database.upsertWand(character.id, {
                wood: defWand.wood || wand?.wood || 'Carvalho Inglês',
                core: defWand.core || wand?.core || 'Pena de Fênix',
                length: defWand.length || wand?.length || '11 polegadas',
                flexibility: defWand.flexibility || wand?.flexibility || 'Firme',
                handleId: handle.id,
            });
        }

        if (
            syncedFromSupabase &&
            config.featureToggles?.autoApplyHouseFromWhitelist &&
            whitelistData?.preferredHouse &&
            houses?.membership?.set &&
            session?.player
        ) {
            const currentHouse = await houses.membership.get(session.player);
            if (!currentHouse) {
                await houses.membership.set(session.player, whitelistData.preferredHouse, {
                    resource: 'viccs-characters',
                    actor: session.player,
                    reason: 'Sincronização inicial de whitelist',
                });
                await database.updateSortingResult(character.id, {
                    primaryHouse: whitelistData.preferredHouse,
                    secondaryHouse: null,
                    hatstall: false,
                });
                profile = await database.getProfile(character.id);
            }
        }

        return { profile, wand, syncedFromSupabase };
    }

    async function openSheetForPlayer(player, initialTab = 'sheet', isIntroOnboarding = false) {
        const session = core.sessions.get(player);
        const character = core.characters.active(player);
        if (!session || !character) {
            viccsUi.notify(player, {
                title: 'Ficha Indisponível',
                description: 'Selecione um personagem antes de abrir sua ficha.',
                tone: 'warning',
            });
            return false;
        }

        const ensured = await ensureCharacterData(session, character);
        const membership = houses?.membership?.get ? await houses.membership.get(player) : null;
        const vm = buildCharacterSheetViewModel({
            character,
            profile: ensured?.profile,
            wand: ensured?.wand,
            house: membership?.house || ensured?.profile?.house,
            handles: config.wandHandles,
            initialTab,
        });

        if (isIntroOnboarding) {
            pendingIntroTriggers.add(player.id);
        }

        viccsUi.audioCue(player, 'uiOpen', 2);
        player.emit('viccs:characters:sheet:open', JSON.stringify({ ...vm, isIntroOnboarding }));
        return true;
    }

    function getOptApi(name) {
        return viccsCore.ecosystem?.getApi ? viccsCore.ecosystem.getApi(name) : viccsCore.safeImport?.(name);
    }

    function runInventoryPatch(player, operations) {
        return new Promise((resolve, reject) => {
            if (!player?.inventory || typeof player.inventory.patch !== 'function') {
                reject(new Error('Inventário nativo indisponível nesta sessão.'));
                return;
            }
            let settled = false;
            const done = (err, result) => {
                if (settled) return;
                settled = true;
                if (err) reject(err instanceof Error ? err : new Error(String(err.message || err)));
                else resolve(result);
            };
            try {
                const ret = player.inventory.patch(operations, {}, done);
                if (ret && typeof ret === 'object' && typeof ret.then === 'function') {
                    ret.then((res) => { if (!settled) { settled = true; resolve(res); } }, (e) => { if (!settled) { settled = true; reject(e); } });
                }
            } catch (error) {
                if (!settled) {
                    settled = true;
                    reject(error);
                }
            }
        });
    }

    function runGearEquip(player, itemId, variation = null) {
        return new Promise((resolve, reject) => {
            if (!player?.gear || typeof player.gear.equip !== 'function') {
                resolve(null);
                return;
            }
            let settled = false;
            const done = (err, result) => {
                if (settled) return;
                settled = true;
                if (err) reject(err instanceof Error ? err : new Error(String(err.message || err)));
                else resolve(result);
            };
            const options = variation ? { variation: String(variation) } : {};
            try {
                const ret = player.gear.equip(itemId, options, done);
                if (ret && typeof ret === 'object' && typeof ret.then === 'function') {
                    ret.then((res) => { if (!settled) { settled = true; resolve(res); } }, (e) => { if (!settled) { settled = true; reject(e); } });
                }
            } catch (error) {
                if (!settled) {
                    settled = true;
                    reject(error);
                }
            }
        });
    }

    async function applyHouseRobesForPlayer(player, rawHouse = null, options = {}) {
        const character = core.characters?.active ? core.characters.active(player) : null;
        if (!player || !character) {
            return { ok: false, message: 'Selecione um personagem antes de sincronizar as vestes.' };
        }

        const profile = await database.getProfile(character.id);
        let targetHouse = rawHouse;
        if (!targetHouse && houses?.membership?.get) {
            try {
                const membership = await houses.membership.get(player);
                targetHouse = membership?.house || null;
            } catch (_) {}
        }
        if (!targetHouse) targetHouse = profile?.house || null;
        if (!targetHouse && options.allowUnaffiliated !== false && config.houseRobes?.applyUnaffiliatedOnJoin !== false) {
            targetHouse = 'unaffiliated';
        }

        try {
            if (houses?.membership?.sync) {
                await houses.membership.sync(player);
            }
        } catch (_) {}

        const nativeRows = typeof player.inventory?.list === 'function' ? player.inventory.list() : [];
        const plan = planHouseRobePatch({
            nativeRows,
            house: targetHouse,
            outfitItemId: config.houseRobes?.outfitItemId || 'Outfit_001_Basic',
            backItemId: config.houseRobes?.backItemId || 'Back_001_Basic',
            force: Boolean(options.force),
            allowUnaffiliated: Boolean(options.allowUnaffiliated !== false && targetHouse === 'unaffiliated'),
        });

        if (!plan.ok) {
            return { ok: false, message: plan.reason || 'Casa ainda não definida.' };
        }

        const inventoryApi = getOptApi('hmp-inventory');
        const giveOps = plan.operations.filter((op) => op.op === 'give');
        const equipOps = plan.operations.filter((op) => op.op === 'equip');

        try {
            if (giveOps.length > 0) {
                const patchResult = await runInventoryPatch(player, giveOps);
                const rev = Number(patchResult?.revision);
                if (Number.isSafeInteger(rev) && rev > 0 && typeof player.inventory?.waitForRevision === 'function') {
                    await player.inventory.waitForRevision(rev);
                }
            }

            let refreshedRows = typeof player.inventory?.list === 'function' ? player.inventory.list() : nativeRows;
            const pendingEquipIds = new Set(equipOps.map((op) => op.itemId));
            for (const given of giveOps) {
                if (given.equipped === true) {
                    const row = refreshedRows.find((r) => String(r?.itemId || '').trim() === given.itemId);
                    if (row && row.equipped !== true) {
                        pendingEquipIds.add(given.itemId);
                    }
                }
            }

            for (const itemId of pendingEquipIds) {
                const matchedRow = refreshedRows.find((r) => String(r?.itemId || '').trim() === itemId);
                await runGearEquip(player, itemId, matchedRow?.variation || null);
            }

            if ((giveOps.length > 0 || pendingEquipIds.size > 0) && inventoryApi?.native?.save) {
                await inventoryApi.native.save(player, character);
            }

            await database.updateRobesState(character.id, {
                robesHouse: plan.house,
                robesApplied: true,
            });

            if (viccsCore.audit?.record && (plan.operations.length > 0 || options.force)) {
                await viccsCore.audit.record({
                    resource: 'viccs-characters',
                    action: 'robes.applied',
                    actorCharacterId: character.id,
                    actorName: character.name || player.nickname || 'Jogador',
                    targetCharacterId: character.id,
                    reason: options.force
                        ? 'Reaplicação manual via Livro do Jogador'
                        : (plan.house === 'unaffiliated'
                            ? 'Uniforme inicial de ingressante em Hogwarts'
                            : 'Sincronização automática de uniforme escolar'),
                    after: { house: plan.house, operations: plan.operations.length, preservedCustomGear: plan.preservedCustomGear },
                });
            }

            events.emit('viccs:characters:robesUpdated', {
                playerId: player.id,
                characterId: character.id,
                house: plan.house,
                applied: true,
                preservedCustomGear: plan.preservedCustomGear,
            });

            const successMsg = plan.preservedCustomGear
                ? 'Uniforme salvo no inventário sem sobrescrever seu traje atual.'
                : (plan.house === 'unaffiliated'
                    ? 'Uniforme escolar de Hogwarts equipado!'
                    : 'Vestes escolares da Casa aplicadas com sucesso!');

            return {
                ok: true,
                house: plan.house,
                preservedCustomGear: plan.preservedCustomGear,
                message: successMsg,
            };
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            logger.warn(`Falha ao aplicar vestes da Casa (${plan.house}) para char #${character.id}: ${msg}`);

            if (!profile?.robes_applied) {
                try {
                    await database.updateRobesState(character.id, {
                        robesHouse: plan.house,
                        robesApplied: false,
                    });
                } catch (_) {}
            }

            events.emit('viccs:characters:robesUpdated', {
                playerId: player.id,
                characterId: character.id,
                house: plan.house,
                applied: false,
            });

            if (!options.silent) {
                viccsUi.notify(player, {
                    title: 'Vestes Escolares',
                    description: 'Sua Casa está salva, mas as vestes não responderam agora. Use "Reaplicar Vestes da Casa" no Livro [Esc].',
                    tone: 'warning',
                    duration: 6000,
                });
            }

            return {
                ok: false,
                recoverable: true,
                house: plan.house,
                message: 'Não foi possível aplicar o uniforme agora; sua Casa está preservada. Tente Reaplicar no Livro [Esc].',
            };
        }
    }

    async function beginOnboardingAfterSpawn(session, character) {
        if (!session?.player || !character) return;
        const player = session.player;

        if (config.featureToggles?.requireWhitelistVerification && viccsCore.auth.isTicketBridgeConfigured()) {
            const verified = viccsCore.auth.getVerifiedSession(player);
            if (!verified) {
                player.emit('viccs:characters:link:open', JSON.stringify({
                    characterName: character.name,
                    canDismiss: false,
                    error: '',
                }));
                return;
            }
        }

        const ensured = await ensureCharacterData(session, character);
        const membership = houses?.membership?.get ? await houses.membership.get(player) : null;
        const activeHouse = membership?.house || ensured?.profile?.house || null;
        const desiredRobesState = activeHouse || (config.houseRobes?.applyUnaffiliatedOnJoin !== false ? 'unaffiliated' : null);

        if (
            desiredRobesState
            && config.houseRobes?.restoreOnCharacterLoaded !== false
            && (!ensured?.profile?.robes_applied || ensured?.profile?.robes_house !== desiredRobesState)
        ) {
            await applyHouseRobesForPlayer(player, desiredRobesState, {
                force: false,
                silent: true,
                allowUnaffiliated: true,
            });
        }

        events.emit('viccs:characters:onboardingReady', {
            playerId: player.id,
            characterId: character.id,
            house: activeHouse,
            introCompleted: Boolean(ensured?.profile?.intro_completed),
            timestamp: Date.now(),
        });
    }

    async function pushCreatorPrefill(session) {
        const player = session?.player;
        if (!player || typeof player.emit !== 'function') return;
        const identity = resolveTrustedDiscord(session);
        if (!identity || !supabaseBridge.isConfigured()) return;

        try {
            const approved = identity.applicationId
                ? await supabaseBridge.fetchApplicationById(identity.applicationId)
                : await supabaseBridge.fetchApprovedApplication(identity.discordId);
            const prefill = buildCreatorPrefillFromApplication(approved);
            if (!prefill) return;

            player.emit('viccs:characters:creatorPrefill', JSON.stringify(prefill));
        } catch (_) {}
    }

    function openLinkModal(player) {
        if (!player || typeof player.emit !== 'function') return false;
        const character = core.characters.active(player);
        const canDismiss = !config.featureToggles?.requireWhitelistVerification;
        player.emit('viccs:characters:link:open', JSON.stringify({
            characterName: character?.name || player.nickname || 'Bruxo',
            canDismiss,
            error: '',
        }));
        return true;
    }

    function registerEvents() {
        events.on('hmp:session:ready', (session) => {
            if (session?.player) {
                void pushCreatorPrefill(session);
            }
        });

        events.on('hmp:character:loaded', async (payload) => {
            const session = payload?.session;
            const character = payload?.character;
            if (!session?.player || !character) return;

            try {
                const ensured = await ensureCharacterData(session, character);
                events.emit('viccs:characters:profileLoaded', {
                    playerId: session.playerId,
                    characterId: character.id,
                    profile: ensured?.profile,
                    wand: ensured?.wand,
                    timestamp: Date.now(),
                });
            } catch (error) {
                logger.error(`Erro ao hidratar personagem #${character.id}: ${error instanceof Error ? error.message : String(error)}`);
            }
        });

        events.on('hmp:spawn:complete', (payload) => {
            const session = payload?.session;
            const character = payload?.character;
            if (!session?.player || !character) return;

            beginOnboardingAfterSpawn(session, character).catch((error) => {
                logger.error(`Falha no onboarding pós-spawn #${character.id}: ${error instanceof Error ? error.message : String(error)}`);
            });
        });

        events.on('viccs:sorting:completed', async (payload) => {
            if (!payload?.characterId || !payload?.primaryHouse) return;
            try {
                const updated = await database.updateSortingResult(payload.characterId, {
                    primaryHouse: payload.primaryHouse,
                    secondaryHouse: payload.secondaryHouse || null,
                    hatstall: Boolean(payload.hatstall),
                });
                if (config.houseRobes?.autoApplyOnSorting !== false && payload?.playerId) {
                    const player = resolveOnlinePlayer(payload.playerId);
                    if (isPlayerConnected(player)) {
                        await applyHouseRobesForPlayer(player, payload.primaryHouse, { force: false, silent: true });
                    }
                }
                if (updated?.supabase_application_id && supabaseBridge.isConfigured()) {
                    await supabaseBridge.syncSortingOutcome({
                        applicationId: updated.supabase_application_id,
                        sortedHouse: payload.primaryHouse,
                        secondaryHouse: payload.secondaryHouse || null,
                        isHatstall: Boolean(payload.hatstall),
                        gameCharacterId: payload.characterId,
                    });
                }
            } catch (error) {
                logger.warn(`Erro ao persistir casa no perfil #${payload.characterId}: ${error instanceof Error ? error.message : String(error)}`);
            }
        });

        events.on('viccs:sorting:closed', async (payload) => {
            const playerId = payload?.playerId;
            const player = resolveOnlinePlayer(playerId);
            const character = player ? core.characters.active(player) : null;
            if (!isPlayerConnected(player) || !character || !payload?.completed) return;

            const profile = await database.getProfile(character.id);
            if (profile && !profile.intro_completed && config.featureToggles?.autoShowSheetAfterSorting !== false) {
                try {
                    await viccsUi.fade(player, {
                        direction: 'in',
                        durationMs: 420,
                        eyebrow: 'Oficina Ollivanders & Registro',
                        caption: 'Sua varinha e suas vestes aguardam...',
                    });
                } catch (_) {}
                setTimeout(async () => {
                    if (!isPlayerConnected(player)) return;
                    try {
                        await viccsUi.fade(player, { direction: 'out', durationMs: 420 });
                    } catch (_) {}
                    try {
                        await openSheetForPlayer(player, 'wand', true);
                    } catch (_) {}
                }, 480);
            }
        });

        events.onClient('viccs:characters:sheet:closed', async (player) => {
            if (!player) return;
            const character = core.characters.active(player);
            if (pendingIntroTriggers.delete(player.id) && character) {
                await database.markIntroCompleted(character.id);
                events.emit('viccs:characters:profileUpdated', { playerId: player.id, characterId: character.id });
                if (config.featureToggles?.showControlsIntroAfterOnboarding !== false) {
                    viccsUi.notify(player, {
                        title: 'Bem-vindo a Hogwarts',
                        description: 'Pressione [ESC] para abrir o Livro do Jogador ou [ALT] para usar o Olho Mágico em alvos do mundo.',
                        tone: 'success',
                        duration: 7500,
                    });
                }
            }
        });

        events.onClient('viccs:characters:link:submit', async (player, raw) => {
            if (!linkRateLimiter.allow(player.id)) return;
            let payload = {};
            try {
                payload = typeof raw === 'string' ? JSON.parse(raw) : (raw || {});
            } catch (_) {
                return;
            }

            try {
                const res = await viccsCore.auth.redeemLinkCode(player, payload.code);
                if (!res.ok) {
                    player.emit('viccs:characters:link:error', JSON.stringify({ message: res.reason || 'Código inválido.' }));
                    return;
                }
            } catch (error) {
                player.emit('viccs:characters:link:error', JSON.stringify({
                    message: error instanceof Error ? error.message : 'Falha momentânea ao validar código.',
                }));
                return;
            }

            player.emit('viccs:characters:link:close', '{}');
            const session = core.sessions.get(player);
            const character = core.characters.active(player);
            events.emit('viccs:auth:linked', { playerId: player.id, characterId: character?.id || null });
            if (session && character) {
                await beginOnboardingAfterSpawn(session, character);
            }
        });

        events.onClient('viccs:characters:link:dismissed', async (player) => {
            if (!player || config.featureToggles?.requireWhitelistVerification) return;
            const session = core.sessions.get(player);
            const character = core.characters.active(player);
            if (session && character) {
                await beginOnboardingAfterSpawn(session, character);
            }
        });

        events.on('playerDisconnect', (player) => {
            if (player) pendingIntroTriggers.delete(player.id);
        });
    }

    return {
        ensureCharacterData,
        applyHouseRobesForPlayer,
        openSheetForPlayer,
        openLinkModal,
        registerEvents,
    };
}

module.exports = {
    createHandlers,
};
