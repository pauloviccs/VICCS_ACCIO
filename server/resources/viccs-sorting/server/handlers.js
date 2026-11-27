// ═══════════════════════════════════════════════════════════════
// VICCS Accio — Sorting Hat Handlers & Seamless Cascade
// Arquivo: server/handlers.js
// ═══════════════════════════════════════════════════════════════

'use strict';

const {
    startCeremonySession,
    submitAnswer,
    buildClientPrompt,
} = require('./service');

function createHandlers({ hmp, core, houses, viccsCore, viccsUi, database, config, events, logger }) {
    const rateLimiter = hmp.rateLimit.create({
        limit: Number(config.rules?.rateLimitMaxRequests) || 4,
        windowMs: Number(config.rules?.rateLimitWindowMs) || 1000,
    });

    const activeDeliberations = new Map();
    const activeOnboardingTimers = new Map();
    const activeOnboardingFlows = new Set();
    const greatHallArrivedConnections = new Map();
    const pendingFastTravels = new Map();
    const pendingTeleports = new Map();
    const pausedCharacterIds = new Set();
    let cachedGreatHallCoords = null;

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

    function delayMs(ms) {
        return new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(ms) || 0)));
    }

    function isWithinRadius(posA, posB, radiusCm) {
        if (!posA || !posB) return false;
        const dx = Number(posA.x) - Number(posB.x);
        const dy = Number(posA.y) - Number(posB.y);
        const dz = Number(posA.z) - Number(posB.z);
        if (![dx, dy, dz].every(Number.isFinite)) return false;
        return Math.hypot(dx, dy, dz) <= Number(radiusCm || 3000);
    }

    function waitForFastTravel(player, fastTravelId, timeoutMs) {
        return new Promise((resolve) => {
            if (!player || typeof player.fastTravel !== 'function') {
                resolve({ ok: false, method: 'fastTravel', reason: 'api-unavailable' });
                return;
            }
            try {
                player.setFastTravelUnlocked?.(fastTravelId, true);
            } catch (_) {}

            const reqId = Number(player.fastTravel(fastTravelId));
            if (!Number.isSafeInteger(reqId) || reqId <= 0) {
                resolve({ ok: false, method: 'fastTravel', reason: 'unknown-destination' });
                return;
            }

            const key = `${player.id}:${reqId}`;
            const timer = setTimeout(() => {
                pendingFastTravels.delete(key);
                resolve({ ok: false, method: 'fastTravel', reason: 'timeout', requestId: reqId });
            }, timeoutMs);

            pendingFastTravels.set(key, {
                playerId: player.id,
                requestId: reqId,
                fastTravelId,
                timer,
                resolve,
            });
        });
    }

    function waitForTeleport(player, coords, timeoutMs) {
        return new Promise((resolve) => {
            if (!player || typeof player.teleport !== 'function') {
                resolve({ ok: false, method: 'teleport', reason: 'api-unavailable' });
                return;
            }
            const opts = { snapToGround: true };
            if (Number.isFinite(Number(coords.yaw))) {
                opts.yaw = Number(coords.yaw);
            }

            const reqId = Number(player.teleport(Number(coords.x), Number(coords.y), Number(coords.z), opts));
            if (!Number.isSafeInteger(reqId) || reqId <= 0) {
                resolve({ ok: false, method: 'teleport', reason: 'rejected' });
                return;
            }

            const key = `${player.id}:${reqId}`;
            const timer = setTimeout(() => {
                pendingTeleports.delete(key);
                resolve({ ok: false, method: 'teleport', reason: 'timeout', requestId: reqId });
            }, timeoutMs);

            pendingTeleports.set(key, {
                playerId: player.id,
                requestId: reqId,
                timer,
                resolve,
            });
        });
    }

    async function transportToGreatHallForCeremony(player, characterId) {
        const locCfg = config.ceremonyLocation || {};
        if (locCfg.enabled === false) {
            return { ok: true, skipped: true, reason: 'disabled' };
        }
        if (!isPlayerConnected(player)) {
            return { ok: false, reason: 'disconnected' };
        }

        const fastTravelId = String(locCfg.fastTravelId || 'FT_HW_GreatHall').trim() || 'FT_HW_GreatHall';
        const alreadyRadius = Math.max(500, Math.min(15000, Number(locCfg.alreadyThereRadiusCm) || 3000));
        const timeoutMs = Math.max(3000, Math.min(30000, Number(locCfg.timeoutMs) || 12000));
        const settleMs = Math.max(100, Math.min(2000, Number(locCfg.settleMs) || 450));

        const coords = locCfg.coordinates && Number.isFinite(Number(locCfg.coordinates.x))
            && Number.isFinite(Number(locCfg.coordinates.y)) && Number.isFinite(Number(locCfg.coordinates.z))
            ? locCfg.coordinates
            : null;

        let currentLoc = null;
        try {
            currentLoc = typeof player.location === 'function' ? player.location() : null;
        } catch (_) {}

        const currentPos = currentLoc && Number.isFinite(Number(currentLoc.x)) ? currentLoc : player.position;
        if (greatHallArrivedConnections.get(player.id) === characterId) {
            return { ok: true, method: 'already-arrived' };
        }
        if (currentLoc?.destinationId && String(currentLoc.destinationId).toLowerCase() === fastTravelId.toLowerCase()) {
            greatHallArrivedConnections.set(player.id, characterId);
            return { ok: true, method: 'already-at-destination' };
        }
        if (coords && isWithinRadius(currentPos, coords, alreadyRadius)) {
            greatHallArrivedConnections.set(player.id, characterId);
            return { ok: true, method: 'already-near-coords' };
        }
        if (!coords && cachedGreatHallCoords && isWithinRadius(currentPos, cachedGreatHallCoords, alreadyRadius)) {
            greatHallArrivedConnections.set(player.id, characterId);
            return { ok: true, method: 'already-near-cached' };
        }

        await delayMs(260);
        if (!isPlayerConnected(player)) return { ok: false, reason: 'disconnected' };

        const result = coords
            ? await waitForTeleport(player, coords, timeoutMs)
            : await waitForFastTravel(player, fastTravelId, timeoutMs);

        if (result.ok) {
            greatHallArrivedConnections.set(player.id, characterId);
            await delayMs(settleMs);
        } else {
            logger.warn(`Transporte para o Salão Principal (${fastTravelId}) terminou em fallback para char #${characterId}: ${result.reason || result.status}`);
        }
        return result;
    }

    async function getStateForPlayer(player) {
        const character = core.characters?.active ? core.characters.active(player) : null;
        if (!character) return null;
        const session = await database.getSession(character.id);
        if (!session) {
            return {
                status: 'NOT_STARTED',
                answeredCount: 0,
                totalQuestions: Number(config.rules?.questionsPerSession) || 8,
                primaryHouse: null,
                isHatstall: false,
            };
        }
        return {
            status: session.status,
            answeredCount: Number(session.currentIndex) || 0,
            totalQuestions: Array.isArray(session.questionIds) ? session.questionIds.length : 8,
            primaryHouse: session.primaryHouse || null,
            isHatstall: Boolean(session.isHatstallTriggered),
        };
    }

    async function finalizeCeremony(player, session) {
        const primaryMeta = config.houses?.[session.primaryHouse];
        const secondaryMeta = config.houses?.[session.secondaryHouse];
        if (!primaryMeta) return null;

        try {
            await houses.membership.set(player, primaryMeta.slug, {
                resource: 'viccs-sorting',
                actor: player,
                reason: session.isHatstallTriggered ? 'Cerimônia do Chapéu Seletor (Hatstall)' : 'Cerimônia do Chapéu Seletor',
            });
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            logger.error(`Falha ao aplicar Casa (${primaryMeta.slug}) para char #${session.characterId}: ${msg}`);
            player.emit('viccs:sorting:error', JSON.stringify({
                message: 'Não foi possível confirmar sua Casa no momento. Tente confirmar novamente ou pause sem perder seu progresso.',
                canRetry: true,
            }));
            return null;
        }

        const completedSession = {
            ...session,
            status: 'COMPLETED',
        };
        await database.saveSession(completedSession);
        pausedCharacterIds.delete(completedSession.characterId);

        let robesNotice = 'Uniforme escolar da sua Casa pronto no inventário. Confira em [Esc] -> Personagem & Casa.';
        const viccsChars = viccsCore.ecosystem?.getApi
            ? viccsCore.ecosystem.getApi('viccs-characters')
            : viccsCore.safeImport?.('viccs-characters');
        if (viccsChars?.sync?.reapplyHouseRobes) {
            try {
                const robeResult = await viccsChars.sync.reapplyHouseRobes(player, {
                    house: primaryMeta.slug,
                    force: false,
                    silent: true,
                });
                if (robeResult?.message) {
                    robesNotice = robeResult.message;
                }
            } catch (_) { }
        }

        viccsUi.audioCue(player, 'sortingComplete', 3);

        if (config.featureToggles?.announceVerdictToAll !== false && typeof player.sendChat === 'function') {
            player.sendChat(`[Chapéu Seletor] ${primaryMeta.name.toUpperCase()}!`);
        }

        const clientPrompt = buildClientPrompt({
            session: completedSession,
            questionBank: config.questionBank,
            hatstallQuestion: config.hatstallQuestion,
            housesMeta: config.houses,
            whispers: config.whispers,
        });

        player.emit('viccs:sorting:state', JSON.stringify({
            ...clientPrompt,
            robesNotice,
        }));

        events.emit('viccs:sorting:completed', {
            characterId: completedSession.characterId,
            playerId: player.id,
            primaryHouse: primaryMeta.slug,
            secondaryHouse: secondaryMeta?.slug || null,
            hatstall: Boolean(completedSession.isHatstallTriggered),
            scoreDiff: completedSession.scoreDiff,
            timestamp: Date.now(),
        });

        return completedSession;
    }

    async function startOrResumeForPlayer(player, options = {}) {
        const character = core.characters.active(player);
        if (!character) {
            if (!options.silent) {
                viccsUi.notify(player, {
                    title: 'Chapéu Seletor',
                    description: 'Selecione um personagem antes de iniciar a Cerimônia de Seleção.',
                    tone: 'warning',
                });
            }
            return false;
        }

        const existingHouse = await houses.membership.get(player);
        let session = await database.getSession(character.id);

        if (existingHouse && (!session || session.status === 'COMPLETED')) {
            if (!options.silent) {
                viccsUi.notify(player, {
                    title: 'Seleção Concluída',
                    description: 'Você já pertence a uma Casa de Hogwarts.',
                    tone: 'inform',
                });
            }
            return false;
        }

        if (!session) {
            session = startCeremonySession({
                characterId: character.id,
                questionBank: config.questionBank,
                questionsPerSession: Number(config.rules?.questionsPerSession) || 8,
            });
            session = await database.saveSession(session);
        }

        pausedCharacterIds.delete(character.id);

        if (session.status === 'DELIBERATING') {
            await finalizeCeremony(player, session);
            return true;
        }

        const prompt = buildClientPrompt({
            session,
            questionBank: config.questionBank,
            hatstallQuestion: config.hatstallQuestion,
            housesMeta: config.houses,
            whispers: config.whispers,
        });

        viccsUi.audioCue(player, 'uiOpen', 2);
        events.emit('viccs:sorting:started', {
            playerId: player.id,
            characterId: character.id,
        });
        player.emit('viccs:sorting:state', JSON.stringify(prompt));
        return true;
    }

    async function handleAnswer(player, rawPayload) {
        if (!rateLimiter.allow(player.id)) return;

        const character = core.characters.active(player);
        if (!character) return;

        let payload = {};
        try {
            payload = typeof rawPayload === 'string' ? JSON.parse(rawPayload) : (rawPayload || {});
        } catch (_) {
            return;
        }

        let token;
        try {
            token = hmp.validation.string(payload.token, { name: 'token', minLength: 8, maxLength: 64 });
        } catch (_) {
            return;
        }

        const session = await database.getSession(character.id);
        if (!session || (session.status !== 'IN_PROGRESS' && session.status !== 'HATSTALL')) {
            return;
        }

        let updated;
        try {
            updated = submitAnswer({
                session,
                token,
                questionBank: config.questionBank,
                hatstallQuestion: config.hatstallQuestion,
                hatstallThreshold: Number(config.rules?.hatstallThreshold) || 1.6,
            });
        } catch (error) {
            logger.warn(`Resposta rejeitada para char #${character.id}: ${error instanceof Error ? error.message : String(error)}`);
            return;
        }

        await database.saveSession(updated);

        const prompt = buildClientPrompt({
            session: updated,
            questionBank: config.questionBank,
            hatstallQuestion: config.hatstallQuestion,
            housesMeta: config.houses,
            whispers: config.whispers,
        });

        viccsUi.audioCue(player, 'uiClick', 1.5);
        player.emit('viccs:sorting:state', JSON.stringify(prompt));

        if (updated.status === 'DELIBERATING') {
            const delayMs = Math.max(2200, Math.min(2600, Number(config.rules?.deliberationMs) || 2400));
            const prevTimer = activeDeliberations.get(character.id);
            if (prevTimer) clearTimeout(prevTimer);

            const timer = setTimeout(() => {
                activeDeliberations.delete(character.id);
                if (!isPlayerConnected(player)) return;
                finalizeCeremony(player, updated).catch((err) => {
                    logger.error(`Erro ao finalizar seleção #${character.id}: ${err instanceof Error ? err.message : String(err)}`);
                });
            }, delayMs);

            activeDeliberations.set(character.id, timer);
        }
    }

    async function resetForCharacter(targetPlayer, actorPlayer, reason = 'Re-sorteio administrativo') {
        const character = core.characters.active(targetPlayer);
        if (!character) return false;

        const prevTimer = activeDeliberations.get(character.id);
        if (prevTimer) {
            clearTimeout(prevTimer);
            activeDeliberations.delete(character.id);
        }

        const prevMembership = await houses.membership.get(targetPlayer);
        await database.deleteSession(character.id);
        if (prevMembership) {
            await houses.membership.clear(targetPlayer, {
                resource: 'viccs-sorting',
                actor: actorPlayer,
                reason,
            });
        }

        await viccsCore.audit.record({
            resource: 'viccs-sorting',
            action: 'sorting.reset',
            actorCharacterId: core.characters.active(actorPlayer)?.id || null,
            actorName: actorPlayer?.nickname || 'Admin',
            targetCharacterId: character.id,
            reason,
            before: { house: prevMembership?.house || null },
            after: { house: null },
        });

        return true;
    }

    function registerEvents() {
        events.on('playerFastTravelComplete', (ftPlayer, requestId, status) => {
            if (!ftPlayer) return;
            const key = `${ftPlayer.id}:${Number(requestId)}`;
            const pending = pendingFastTravels.get(key);
            if (!pending) return;
            pendingFastTravels.delete(key);
            clearTimeout(pending.timer);
            const numericStatus = Number(status);
            if (numericStatus === 0 && ftPlayer.position && Number.isFinite(Number(ftPlayer.position.x))) {
                cachedGreatHallCoords = {
                    x: Number(ftPlayer.position.x),
                    y: Number(ftPlayer.position.y),
                    z: Number(ftPlayer.position.z),
                };
            }
            pending.resolve({
                ok: numericStatus === 0,
                method: 'fastTravel',
                status: numericStatus,
                requestId: Number(requestId),
            });
        });

        events.on('playerTeleportComplete', (tpPlayer, requestId, status) => {
            if (!tpPlayer) return;
            const key = `${tpPlayer.id}:${Number(requestId)}`;
            const pending = pendingTeleports.get(key);
            if (!pending) return;
            pendingTeleports.delete(key);
            clearTimeout(pending.timer);
            const numericStatus = Number(status);
            pending.resolve({
                ok: numericStatus === 0,
                method: 'teleport',
                status: numericStatus,
                requestId: Number(requestId),
            });
        });

        events.on('viccs:characters:onboardingReady', async (payload) => {
            if (
                config.featureToggles?.autoStartOnOnboarding === false
                || payload?.house
                || payload?.introCompleted
                || pausedCharacterIds.has(payload?.characterId)
            ) {
                return;
            }
            const player = resolveOnlinePlayer(payload?.playerId);
            if (!isPlayerConnected(player)) return;
            if (activeOnboardingFlows.has(player.id)) return;

            const session = payload?.characterId ? await database.getSession(payload.characterId) : null;
            if (session?.status === 'COMPLETED') return;

            const existingTimer = activeOnboardingTimers.get(player.id);
            if (existingTimer) {
                clearTimeout(existingTimer);
                activeOnboardingTimers.delete(player.id);
            }

            activeOnboardingFlows.add(player.id);
            try {
                try {
                    await viccsUi.fade(player, {
                        direction: 'in',
                        durationMs: 420,
                        eyebrow: 'Salão Principal de Hogwarts',
                        caption: session
                            ? 'Retornando ao Salão Principal para a Seleção...'
                            : 'Conduzindo você ao Salão Principal para a Seleção...',
                    });
                } catch (_) { }

                await transportToGreatHallForCeremony(player, payload?.characterId);
                if (!isPlayerConnected(player)) return;

                if (pausedCharacterIds.has(payload?.characterId)) return;
                const latestSession = payload?.characterId ? await database.getSession(payload.characterId) : null;
                if (latestSession?.status === 'COMPLETED') return;

                try {
                    await startOrResumeForPlayer(player, { silent: true });
                } finally {
                    try {
                        await viccsUi.fade(player, { direction: 'out', durationMs: 460 });
                    } catch (_) { }
                }
            } finally {
                activeOnboardingFlows.delete(player.id);
            }
        });

        events.onClient('viccs:sorting:answer', (player, rawPayload) => {
            void handleAnswer(player, rawPayload);
        });

        events.onClient('viccs:sorting:pause', async (player) => {
            if (!player) return;
            const character = core.characters.active(player);
            if (!character) return;

            if (activeDeliberations.has(character.id)) {
                clearTimeout(activeDeliberations.get(character.id));
                activeDeliberations.delete(character.id);
            }

            const session = await database.getSession(character.id);
            if (session && session.status !== 'COMPLETED') {
                pausedCharacterIds.add(character.id);
                viccsUi.notify(player, {
                    title: 'Seleção Pausada',
                    description: `Progresso preservado (${session.currentIndex}/${session.questionIds.length}). Retome pelo Livro do Jogador ([Esc]).`,
                    tone: 'inform',
                    duration: 6000,
                });
                events.emit('viccs:sorting:paused', {
                    playerId: player.id,
                    characterId: character.id,
                    answeredCount: session.currentIndex,
                    totalQuestions: session.questionIds.length,
                    timestamp: Date.now(),
                });
            }
        });

        events.onClient('viccs:sorting:retryConfirm', async (player) => {
            if (!player || !rateLimiter.allow(player.id)) return;
            const character = core.characters.active(player);
            if (!character) return;
            const session = await database.getSession(character.id);
            if (session?.status === 'DELIBERATING') {
                await finalizeCeremony(player, session);
                return;
            }
            await startOrResumeForPlayer(player);
        });

        events.onClient('viccs:sorting:closed', async (player) => {
            if (!player) return;
            const character = core.characters.active(player);
            if (!character) return;
            const session = await database.getSession(character.id);
            events.emit('viccs:sorting:closed', {
                playerId: player.id,
                characterId: character.id,
                completed: Boolean(session?.status === 'COMPLETED'),
                timestamp: Date.now(),
            });
        });

        events.on('playerDisconnect', (player) => {
            if (!player) return;
            activeOnboardingFlows.delete(player.id);
            greatHallArrivedConnections.delete(player.id);
            for (const [key, pending] of pendingFastTravels.entries()) {
                if (pending.playerId === player.id) {
                    clearTimeout(pending.timer);
                    pendingFastTravels.delete(key);
                    pending.resolve({ ok: false, method: 'fastTravel', reason: 'disconnect' });
                }
            }
            for (const [key, pending] of pendingTeleports.entries()) {
                if (pending.playerId === player.id) {
                    clearTimeout(pending.timer);
                    pendingTeleports.delete(key);
                    pending.resolve({ ok: false, method: 'teleport', reason: 'disconnect' });
                }
            }
            const onbTimer = activeOnboardingTimers.get(player.id);
            if (onbTimer) {
                clearTimeout(onbTimer);
                activeOnboardingTimers.delete(player.id);
            }
            const character = core.characters.active(player);
            if (character) {
                pausedCharacterIds.delete(character.id);
                if (activeDeliberations.has(character.id)) {
                    clearTimeout(activeDeliberations.get(character.id));
                    activeDeliberations.delete(character.id);
                }
            }
        });
    }

    function stopAll() {
        for (const timer of activeDeliberations.values()) clearTimeout(timer);
        for (const timer of activeOnboardingTimers.values()) clearTimeout(timer);
        for (const pending of pendingFastTravels.values()) {
            clearTimeout(pending.timer);
            pending.resolve({ ok: false, method: 'fastTravel', reason: 'resource-stop' });
        }
        for (const pending of pendingTeleports.values()) {
            clearTimeout(pending.timer);
            pending.resolve({ ok: false, method: 'teleport', reason: 'resource-stop' });
        }
        activeDeliberations.clear();
        activeOnboardingTimers.clear();
        activeOnboardingFlows.clear();
        greatHallArrivedConnections.clear();
        pendingFastTravels.clear();
        pendingTeleports.clear();
        pausedCharacterIds.clear();
    }

    return {
        startOrResumeForPlayer,
        getStateForPlayer,
        resetForCharacter,
        registerEvents,
        stopAll,
    };
}

module.exports = {
    createHandlers,
};
