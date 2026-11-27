// ═══════════════════════════════════════════════════════════════
// VICCS Accio — Shared UI Server API (Audio Fix, Fade & Magic Eye)
// Arquivo: server/main.js
// ═══════════════════════════════════════════════════════════════

'use strict';

const defaultConfig = require('../config/default.json');
const {
    resolveHouseTheme,
    normalizeParchmentPayload,
    resolveAudioCue,
    collectNearbyInteractions,
    buildWizardEyeActions,
    PERSONAL_SERVICE_TARGETS,
    evaluateEyeTarget,
    selectMagicEyeTarget,
    buildPlayerBookPayload,
} = require('./service');

const RESOURCE_NAME = 'viccs-ui';
const RESOURCE_VERSION = '1.0.0';
const startedAt = Date.now();

const Hmp = Imports.get('hmp-lib');
const HmpUI = Imports.get('hmp-ui');
const ViccsCore = Imports.get('viccs-core');
const logger = Hmp.logger.create(RESOURCE_NAME);

let config;
try {
    config = ViccsCore.config.load(RESOURCE_NAME, defaultConfig);
} catch (error) {
    logger.warn(`Fallback de config em ${RESOURCE_NAME}: ${error instanceof Error ? error.message : String(error)}`);
    config = defaultConfig;
}

const eyeRateLimiter = Hmp.rateLimit.create({ limit: 8, windowMs: 1000 });
const eyeScanLimiter = Hmp.rateLimit.create({ limit: 12, windowMs: 1000 });
const bookRateLimiter = Hmp.rateLimit.create({ limit: 6, windowMs: 1000 });
const activeAudioHandles = new Map();
const eyeTargetProviders = new Map();
const bookPageProviders = new Map();
const openBookPlayers = new Map();

let ready = false;
function getOptApi(name) {
    return ViccsCore.ecosystem?.getApi ? ViccsCore.ecosystem.getApi(name) : ViccsCore.safeImport(name);
}

function stopPlayerAudio(playerId) {
    const prev = activeAudioHandles.get(playerId);
    const audioApi = getOptApi('hmp-audio');
    if (!prev || !audioApi?.sounds?.stop) return;
    activeAudioHandles.delete(playerId);
    try {
        audioApi.sounds.stop(prev.owner, prev.handle);
    } catch (_) {}
}

function audioCue(player, cueOrEvent, durationSeconds = null) {
    if (!config.featureToggles?.audioEnabled || !player) return false;
    const audioApi = getOptApi('hmp-audio');
    if (!audioApi?.sounds?.playForPlayer) return false;

    const eventName = resolveAudioCue(cueOrEvent, config.audioCues || {});
    if (!eventName) return false;

    const maxDur = Math.max(1, Math.min(8, Number(durationSeconds || config.audio?.maxCueDurationSeconds) || 3));
    const owner = { resource: RESOURCE_NAME, id: `cue:${player.id}` };

    stopPlayerAudio(player.id);

    try {
        const handle = audioApi.sounds.playForPlayer(owner, player, eventName, { duration: maxDur });
        if (handle) {
            activeAudioHandles.set(player.id, { owner, handle });
        }
        return true;
    } catch (error) {
        logger.debug(`Audio cue ignorado (${eventName}): ${error instanceof Error ? error.message : String(error)}`);
        return false;
    }
}

async function houseTheme(player) {
    const fallback = config.theme?.defaultHouse || 'gryffindor';
    const housesApi = getOptApi('hmp-houses');
    if (!player || !housesApi?.membership?.get) return fallback;

    try {
        const membership = await housesApi.membership.get(player);
        return resolveHouseTheme(membership?.house, fallback);
    } catch (_) {
        return fallback;
    }
}

function emitPlayerHouseTheme(player, explicitHouse = null) {
    if (!player || typeof player.emit !== 'function') return;
    Promise.resolve(explicitHouse ? resolveHouseTheme(explicitHouse, config.theme?.defaultHouse) : houseTheme(player))
        .then((theme) => {
            if (player.connected !== false) {
                player.emit('viccs:ui:theme', JSON.stringify({ house: theme }));
            }
        })
        .catch(() => {});
}

function notify(player, payload) {
    if (!player) return false;
    try {
        const normalized = typeof payload === 'string'
            ? { description: payload, tone: 'inform' }
            : {
                title: payload?.title,
                description: String(payload?.description || payload?.message || '').trim(),
                tone: payload?.tone || payload?.type || 'inform',
                duration: payload?.duration,
            };

        if (!normalized.description) return false;
        return HmpUI.notify(player, normalized);
    } catch (error) {
        logger.warn(`Falha em notify: ${error instanceof Error ? error.message : String(error)}`);
        return false;
    }
}

async function fade(player, options = {}) {
    if (!player || typeof player.emit !== 'function') return false;
    if (config.featureToggles?.fadeEnabled === false) return false;

    const house = options.house || await houseTheme(player);
    player.emit('viccs:ui:fade', JSON.stringify({
        direction: options.direction === 'out' ? 'out' : 'in',
        durationMs: Number(options.durationMs || config.fade?.defaultDurationMs) || 550,
        eyebrow: options.eyebrow || '',
        caption: options.caption || '',
        house,
    }));
    return true;
}

async function parchment(player, rawPayload) {
    if (!player || typeof player.emit !== 'function') return false;
    const house = rawPayload?.house || await houseTheme(player);
    const normalized = normalizeParchmentPayload(
        { ...rawPayload, house },
        {
            defaultSignature: config.parchment?.defaultSignature,
            defaultHouse: config.theme?.defaultHouse,
        },
    );

    audioCue(player, 'parchmentOpen', 2);
    player.emit('viccs:ui:parchment:open', JSON.stringify(normalized));
    return true;
}

function sanitizeVec3(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const x = Number(raw.x);
    const y = Number(raw.y);
    const z = Number(raw.z);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return null;
    return { x, y, z };
}

function sanitizeScanPayload(rawPayload) {
    let payload = {};
    try {
        payload = typeof rawPayload === 'string' ? JSON.parse(rawPayload || '{}') : (rawPayload || {});
    } catch (_) {
        payload = {};
    }
    const cameraPos = sanitizeVec3(payload?.camera?.position);
    const cameraRot = payload?.camera?.rotation && typeof payload.camera.rotation === 'object'
        ? {
            pitch: Number(payload.camera.rotation.pitch) || 0,
            yaw: Number(payload.camera.rotation.yaw) || 0,
            roll: Number(payload.camera.rotation.roll) || 0,
        }
        : null;
    const traceHit = payload?.traceHit && typeof payload.traceHit === 'object'
        ? {
            position: sanitizeVec3(payload.traceHit.position || payload.traceHit.hitPoint),
            actor: payload.traceHit.actor?.name ? { name: String(payload.traceHit.actor.name).slice(0, 96) } : null,
            levelObjectKey: payload.traceHit.levelObjectKey ? String(payload.traceHit.levelObjectKey).slice(0, 128) : null,
        }
        : null;

    return {
        id: payload?.id ? String(payload.id).trim().slice(0, 96) : '',
        kind: payload?.kind ? String(payload.kind).trim().slice(0, 32) : '',
        providerId: payload?.providerId ? String(payload.providerId).trim().slice(0, 96) : null,
        playerPos: sanitizeVec3(payload?.playerPos),
        camera: cameraPos && cameraRot ? { position: cameraPos, rotation: cameraRot } : null,
        traceHit,
    };
}

function registerTargetProvider(spec = {}) {
    const resource = String(spec.resource || 'custom').trim();
    const id = String(spec.id || '').trim();
    if (!id || typeof spec.resolveTargets !== 'function') {
        throw new TypeError('eye.registerTargetProvider exige { id, resolveTargets }');
    }
    const key = `${resource}:${id}`;
    const entry = {
        key,
        resource,
        id,
        resolveTargets: spec.resolveTargets,
        execute: typeof spec.execute === 'function' ? spec.execute : null,
    };
    eyeTargetProviders.set(key, entry);
    return () => eyeTargetProviders.delete(key);
}

function registerPageProvider(spec = {}) {
    const resource = String(spec.resource || 'custom').trim();
    const id = String(spec.id || '').trim();
    if (!id || typeof spec.resolve !== 'function') {
        throw new TypeError('book.registerPageProvider exige { id, resolve }');
    }
    const key = `${resource}:${id}`;
    const entry = {
        key,
        resource,
        id,
        title: String(spec.title || id),
        eyebrow: spec.eyebrow ? String(spec.eyebrow) : null,
        order: Number.isFinite(Number(spec.order)) ? Number(spec.order) : 60,
        resolve: spec.resolve,
        onAction: typeof spec.onAction === 'function' ? spec.onAction : null,
    };
    bookPageProviders.set(key, entry);
    return () => bookPageProviders.delete(key);
}

function clearProvidersForResource(resourceName) {
    if (!resourceName) return;
    for (const [k, v] of eyeTargetProviders) {
        if (v.resource === resourceName) eyeTargetProviders.delete(k);
    }
    for (const [k, v] of bookPageProviders) {
        if (v.resource === resourceName) bookPageProviders.delete(k);
    }
}

async function collectWorldEyeCandidates(player) {
    const hmpCore = getOptApi('hmp-core');
    const interactApi = getOptApi('hmp-interact');
    const housesApi = getOptApi('hmp-houses');
    const activeChar = hmpCore?.characters?.active ? hmpCore.characters.active(player) : null;
    const membership = housesApi?.membership?.get ? await housesApi.membership.get(player).catch(() => null) : null;

    let location = null;
    try {
        location = typeof player.location === 'function' ? player.location() : null;
    } catch (_) {}

    const candidates = [];
    const allInteract = interactApi?.list ? interactApi.list() : [];
    for (const entry of Array.isArray(allInteract) ? allInteract : []) {
        if (!entry || !entry.id) continue;
        if (entry.areaId && location?.areaId && entry.areaId !== location.areaId) continue;
        candidates.push({
            id: entry.id,
            kind: 'world',
            providerId: null,
            label: entry.label || entry.id,
            actionLabel: entry.actionLabel || 'Interagir',
            controlHint: 'F',
            position: entry.position || null,
            promptDistance: entry.promptDistance || entry.radius || Number(config.eye?.radiusCm) || 1800,
            priority: entry.priority || 0,
            levelObjectKey: entry.levelObjectKey || null,
            actorName: entry.actorName || null,
            requiresCharacter: entry.requiresCharacter !== false,
        });
    }

    const providerContext = {
        core: hmpCore,
        character: activeChar,
        house: membership?.house || null,
        playerPos: player.position || null,
        areaId: location?.areaId || null,
        config,
    };

    const providerJobs = [...eyeTargetProviders.values()].map(async (provider) => {
        try {
            const items = await provider.resolveTargets(player, providerContext);
            if (!Array.isArray(items)) return [];
            return items
                .filter((item) => item && item.id)
                .map((item) => ({
                    ...item,
                    providerId: provider.key,
                    kind: item.kind || 'provider',
                }));
        } catch (_) {
            return [];
        }
    });

    const settled = await Promise.allSettled(providerJobs);
    for (const res of settled) {
        if (res.status === 'fulfilled' && Array.isArray(res.value)) {
            candidates.push(...res.value);
        }
    }

    return {
        candidates,
        hasCharacter: Boolean(activeChar),
        serverPos: player.position || null,
    };
}

async function handleEyeQuery(player, rawPayload, isScan = false) {
    if (!config.featureToggles?.magicEyeEnabled) return;
    if (isScan ? !eyeScanLimiter.allow(player.id) : !eyeRateLimiter.allow(player.id)) return;

    const scan = sanitizeScanPayload(rawPayload);
    const house = await houseTheme(player);
    const { candidates, hasCharacter, serverPos } = await collectWorldEyeCandidates(player);

    const selection = selectMagicEyeTarget({
        candidates,
        camera: scan.camera,
        playerPos: serverPos || scan.playerPos,
        traceHit: scan.traceHit,
        maxRadiusCm: Number(config.eye?.radiusCm) || 1800,
        hasCharacter,
    });

    if (!isScan) {
        audioCue(player, 'eyeOpen', 1.5);
        player.emit('viccs:ui:eye:open', JSON.stringify({
            house,
            active: true,
            target: selection.target,
            nearbyCount: selection.nearbyCount,
        }));
        return;
    }

    player.emit('viccs:ui:eye:update', JSON.stringify({
        house,
        active: true,
        target: selection.target,
        nearbyCount: selection.nearbyCount,
    }));
}

async function handleEyeTrigger(player, rawPayload) {
    if (!config.featureToggles?.magicEyeEnabled || !eyeRateLimiter.allow(player.id)) return;

    const scan = sanitizeScanPayload(rawPayload);
    if (!scan.id || PERSONAL_SERVICE_TARGETS.has(scan.id)) {
        player.emit('viccs:ui:eye:feedback', JSON.stringify({
            ok: false,
            state: 'blocked',
            reason: 'Este alvo pertence ao Livro do Jogador ([Esc]).',
        }));
        audioCue(player, 'denied', 1.5);
        return;
    }

    const { candidates, hasCharacter, serverPos } = await collectWorldEyeCandidates(player);
    const candidate = candidates.find((c) => c.id === scan.id && (!scan.providerId || c.providerId === scan.providerId));
    if (!candidate) {
        player.emit('viccs:ui:eye:feedback', JSON.stringify({
            ok: false,
            state: 'unavailable',
            reason: 'Alvo não está mais ao alcance ou disponível.',
        }));
        audioCue(player, 'denied', 1.5);
        return;
    }

    const evaluated = evaluateEyeTarget(candidate, {
        playerPos: serverPos,
        camera: scan.camera,
        maxRadiusCm: Number(config.eye?.radiusCm) || 1800,
        hasCharacter,
    });

    if (!evaluated || evaluated.state !== 'available') {
        player.emit('viccs:ui:eye:feedback', JSON.stringify({
            ok: false,
            state: evaluated?.state || 'unavailable',
            reason: evaluated?.reason || 'Interação indisponível no momento.',
        }));
        audioCue(player, 'denied', 1.5);
        return;
    }

    if (evaluated.providerId && eyeTargetProviders.has(evaluated.providerId)) {
        const provider = eyeTargetProviders.get(evaluated.providerId);
        if (typeof provider.execute === 'function') {
            try {
                const executed = await provider.execute(player, evaluated);
                if (executed === false) {
                    player.emit('viccs:ui:eye:feedback', JSON.stringify({
                        ok: false,
                        state: 'unavailable',
                        reason: 'Não foi possível concluir esta interação.',
                    }));
                    audioCue(player, 'denied', 1.5);
                    return;
                }
            } catch (error) {
                player.emit('viccs:ui:eye:feedback', JSON.stringify({
                    ok: false,
                    state: 'unavailable',
                    reason: 'Falha ao validar interação no servidor.',
                }));
                logger.warn(`Erro ao executar alvo ${evaluated.id}: ${error instanceof Error ? error.message : String(error)}`);
                audioCue(player, 'denied', 1.5);
                return;
            }
        }
        audioCue(player, 'uiConfirm', 1.5);
        player.emit('viccs:ui:eye:feedback', JSON.stringify({
            ok: true,
            id: evaluated.id,
            closeOnTrigger: config.eye?.closeOnTrigger !== false,
        }));
        return;
    }

    const interactApi = getOptApi('hmp-interact');
    if (evaluated.kind === 'world' && interactApi?.trigger) {
        try {
            await interactApi.trigger(player, evaluated.id);
            audioCue(player, 'uiConfirm', 1.5);
            player.emit('viccs:ui:eye:feedback', JSON.stringify({
                ok: true,
                id: evaluated.id,
                closeOnTrigger: config.eye?.closeOnTrigger !== false,
            }));
            return;
        } catch (error) {
            logger.warn(`Falha hmp-interact.trigger(${evaluated.id}): ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    player.emit('viccs:ui:eye:feedback', JSON.stringify({
        ok: false,
        state: 'unavailable',
        reason: 'Interação indisponível neste servidor.',
    }));
    audioCue(player, 'denied', 1.5);
}

async function resolveBookData(player, initialPage = null) {
    const snapshot = ViccsCore.ecosystem?.getPlayerBookSnapshot
        ? await ViccsCore.ecosystem.getPlayerBookSnapshot(player)
        : null;

    const customPages = [];
    const providerJobs = [...bookPageProviders.values()].map(async (provider) => {
        try {
            const page = await provider.resolve(player, snapshot);
            if (!page || page.available === false) return null;
            return {
                id: page.id || provider.id,
                title: page.title || provider.title,
                eyebrow: page.eyebrow || provider.eyebrow,
                order: page.order ?? provider.order,
                ...page,
                actions: Array.isArray(page.actions)
                    ? page.actions.map((act) => ({ ...act, providerId: act.providerId || provider.key }))
                    : [],
            };
        } catch (_) {
            return null;
        }
    });

    const settled = await Promise.allSettled(providerJobs);
    for (const res of settled) {
        if (res.status === 'fulfilled' && res.value) customPages.push(res.value);
    }

    return buildPlayerBookPayload({
        snapshot,
        customPages,
        initialPage,
        bookConfig: config.book || {},
    });
}

async function openBook(player, options = {}) {
    if (!player || config.featureToggles?.enabled === false || config.featureToggles?.playerBookEnabled === false) {
        return false;
    }
    const payload = await resolveBookData(player, options?.initialPage || null);
    openBookPlayers.set(player.id, { activePage: payload.activePage });
    audioCue(player, 'bookOpen', 1.5);
    player.emit('viccs:ui:book:open', JSON.stringify(payload));
    return true;
}

async function refreshBook(player) {
    if (!player || !openBookPlayers.has(player.id)) return false;
    const prev = openBookPlayers.get(player.id);
    const payload = await resolveBookData(player, prev?.activePage || null);
    player.emit('viccs:ui:book:update', JSON.stringify(payload));
    return true;
}

function closeBook(player, playSound = false) {
    if (!player) return false;
    const hadOpen = openBookPlayers.delete(player.id);
    if (hadOpen) {
        if (playSound) audioCue(player, 'bookClose', 1.5);
        player.emit('viccs:ui:book:close', '{}');
    }
    return hadOpen;
}

async function toggleBook(player, options = {}) {
    if (!player) return false;
    if (openBookPlayers.has(player.id)) {
        closeBook(player, true);
        return false;
    }
    return await openBook(player, options);
}

async function handleBookAction(player, rawPayload) {
    if (!player || !bookRateLimiter.allow(player.id)) return;

    let payload = {};
    try {
        payload = typeof rawPayload === 'string' ? JSON.parse(rawPayload || '{}') : (rawPayload || {});
    } catch (_) {
        return;
    }

    const action = String(payload.action || 'open-service').trim();
    const serviceTarget = payload.serviceTarget ? String(payload.serviceTarget).trim() : null;
    const providerId = payload.providerId ? String(payload.providerId).trim() : null;

    audioCue(player, 'uiClick', 1.5);

    if (action === 'open-native-settings') {
        openBookPlayers.delete(player.id);
        player.emit('viccs:ui:book:close', '{}');
        player.emit('viccs:ui:book:nativeSettings', '{}');
        return;
    }

    if (action === 'provider-action' && providerId && bookPageProviders.has(providerId)) {
        const provider = bookPageProviders.get(providerId);
        if (typeof provider.onAction === 'function') {
            try {
                await provider.onAction(player, payload);
                await refreshBook(player);
            } catch (error) {
                player.emit('viccs:ui:book:feedback', JSON.stringify({
                    message: error instanceof Error ? error.message : 'Falha ao executar ação.',
                }));
            }
        }
        return;
    }

    if (action === 'open-service' && serviceTarget && PERSONAL_SERVICE_TARGETS.has(serviceTarget)) {
        if (serviceTarget === 'reapply-robes') {
            const result = await ViccsCore.ecosystem?.openService?.(player, 'reapply-robes', payload.payload || {});
            await refreshBook(player);
            const msg = result && typeof result === 'object' && result.message
                ? result.message
                : (result ? 'Vestes da Casa sincronizadas com segurança.' : 'Não foi possível reaplicar vestes agora.');
            player.emit('viccs:ui:book:feedback', JSON.stringify({ message: msg }));
            return;
        }

        openBookPlayers.delete(player.id);
        player.emit('viccs:ui:book:close', '{}');
        setTimeout(() => {
            if (player.connected === false) return;
            void ViccsCore.ecosystem?.openService?.(player, serviceTarget, payload.payload || {});
        }, 45);
    }
}

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

function refreshBookForPlayerOrId(playerOrId) {
    const player = resolveOnlinePlayer(playerOrId);
    if (player && openBookPlayers.has(player.id)) {
        void refreshBook(player);
    }
}

function status() {
    return {
        resource: RESOURCE_NAME,
        version: RESOURCE_VERSION,
        enabled: config.featureToggles?.enabled !== false,
        ready,
        audioAvailable: Boolean(getOptApi('hmp-audio')),
        magicEyeEnabled: config.featureToggles?.magicEyeEnabled !== false,
        playerBookEnabled: config.featureToggles?.playerBookEnabled !== false,
        eyeProviders: eyeTargetProviders.size,
        bookProviders: bookPageProviders.size,
        uptimeMs: Date.now() - startedAt,
    };
}

const eyeApi = Object.freeze({
    registerTargetProvider,
    unregisterTargetProvider: (id, resource = 'custom') => eyeTargetProviders.delete(`${resource}:${id}`),
});

const bookApi = Object.freeze({
    open: openBook,
    close: (player) => closeBook(player, false),
    toggle: toggleBook,
    refresh: refreshBook,
    registerPageProvider,
    unregisterPageProvider: (id, resource = 'custom') => bookPageProviders.delete(`${resource}:${id}`),
});

Exports.register('notify', notify);
Exports.register('parchment', parchment);
Exports.register('fade', fade);
Exports.register('houseTheme', houseTheme);
Exports.register('audioCue', audioCue);
Exports.register('eye', eyeApi);
Exports.register('book', bookApi);
Exports.register('status', status);

ViccsCore.registry.register(RESOURCE_NAME, {
    version: RESOURCE_VERSION,
    priority: 25,
    enabled: config.featureToggles?.enabled !== false,
    ready: false,
    statusProvider: status,
});

Events.on('viccs:ui:notify', (player, payload) => notify(player, payload));
Events.on('viccs:ui:parchment', (player, payload) => { void parchment(player, payload); });

Events.onClient('viccs:ui:eye:query', (player, raw) => { void handleEyeQuery(player, raw, false); });
Events.onClient('viccs:ui:eye:scan', (player, raw) => { void handleEyeQuery(player, raw, true); });
Events.onClient('viccs:ui:eye:trigger', (player, raw) => { void handleEyeTrigger(player, raw); });

Events.onClient('viccs:ui:book:toggle', (player, raw) => {
    let opts = {};
    try {
        opts = typeof raw === 'string' ? JSON.parse(raw || '{}') : (raw || {});
    } catch (_) {}
    void toggleBook(player, opts);
});
Events.onClient('viccs:ui:book:action', (player, raw) => { void handleBookAction(player, raw); });
Events.onClient('viccs:ui:book:closed', (player) => {
    if (player && openBookPlayers.delete(player.id)) {
        audioCue(player, 'bookClose', 1.5);
    }
});

Events.on('hmp:character:loaded', (payload) => {
    const player = payload?.session?.player;
    if (!player || typeof player.emit !== 'function') return;
    emitPlayerHouseTheme(player);
    player.emit('viccs:ui:eye:config', JSON.stringify({
        enabled: config.featureToggles?.magicEyeEnabled !== false,
        key: config.eye?.key || 'alt',
        mode: config.eye?.mode === 'hold' ? 'hold' : 'toggle',
        radiusCm: Number(config.eye?.radiusCm) || 1800,
        scanIntervalMs: Number(config.eye?.scanIntervalMs) || 140,
        syncIntervalMs: Number(config.eye?.syncIntervalMs) || 450,
    }));
    player.emit('viccs:ui:book:config', JSON.stringify({
        enabled: config.featureToggles?.playerBookEnabled !== false,
        disableNativePauseMenu: config.featureToggles?.disableNativePauseMenu !== false,
        key: config.book?.key || 'escape',
        settingsKey: config.book?.settingsKey || 'f10',
    }));
});

Events.on('hmp:houses:changed', (payload) => {
    if (payload?.player) {
        emitPlayerHouseTheme(payload.player, payload.membership?.house || null);
        refreshBookForPlayerOrId(payload.player);
    }
});

Events.on('hmp:progression:changed', (payload) => refreshBookForPlayerOrId(payload?.player || payload?.playerId));
Events.on('hmp:spells:granted', (payload) => refreshBookForPlayerOrId(payload?.player));
Events.on('hmp:spells:revoked', (payload) => refreshBookForPlayerOrId(payload?.player));
Events.on('hmp:spells:assignments', (payload) => refreshBookForPlayerOrId(payload?.player));
Events.on('hmp:inventory:changed', (payload) => refreshBookForPlayerOrId(payload?.player));
Events.on('hmp:duels:invited', (payload) => refreshBookForPlayerOrId(payload?.target || payload?.player));

Events.on('viccs:sorting:completed', (payload) => {
    const player = resolveOnlinePlayer(payload?.playerId);
    if (player && payload?.primaryHouse) {
        emitPlayerHouseTheme(player, payload.primaryHouse);
    }
    refreshBookForPlayerOrId(player || payload?.playerId);
});
Events.on('viccs:sorting:paused', (payload) => refreshBookForPlayerOrId(payload?.playerId));
Events.on('viccs:sorting:closed', (payload) => refreshBookForPlayerOrId(payload?.playerId));
Events.on('viccs:characters:profileUpdated', (payload) => refreshBookForPlayerOrId(payload?.playerId));
Events.on('viccs:characters:robesUpdated', (payload) => refreshBookForPlayerOrId(payload?.playerId));
Events.on('viccs:auth:linked', (payload) => refreshBookForPlayerOrId(payload?.playerId));

Events.on('playerDisconnect', (player) => {
    if (!player) return;
    stopPlayerAudio(player.id);
    openBookPlayers.delete(player.id);
});

Events.on('resourceStop', (name) => {
    if (!name || name === RESOURCE_NAME) {
        for (const playerId of activeAudioHandles.keys()) stopPlayerAudio(playerId);
        openBookPlayers.clear();
        eyeTargetProviders.clear();
        bookPageProviders.clear();
        ready = false;
        ViccsCore.registry.setReady(RESOURCE_NAME, false);
        return;
    }
    clearProvidersForResource(name);
});

Events.on('resourceStart', (name) => {
    if (name && name !== RESOURCE_NAME) return;
    if (config.featureToggles?.enabled === false) {
        logger.warn('viccs-ui desabilitado via featureToggles.enabled = false');
        return;
    }

    ready = true;
    ViccsCore.registry.setReady(RESOURCE_NAME, true);
    logger.info(`Kit visual ArcaneMP + Olho Magico (${config.eye?.key || 'alt'}) + Livro do Jogador (${config.book?.key || 'escape'}) pronto`);
});
