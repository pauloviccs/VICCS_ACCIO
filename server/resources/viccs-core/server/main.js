// ═══════════════════════════════════════════════════════════════
// VICCS Accio — Core Ecosystem
// Arquivo: server/main.js
// Descrição: Entry point autoritativo do viccs-core
// ═══════════════════════════════════════════════════════════════

'use strict';

const defaultConfig = require('../config/default.json');
const {
    loadLayeredConfig,
    safeImportWith,
    createEraGate,
    createRegistry,
} = require('./service');
const { createDatabase } = require('./database');
const { createEventsBridge } = require('./events');
const { registerCommands } = require('./commands');
const { createTicketBridge } = require('./ticketBridge');
const { createEcosystemBridge } = require('./ecosystemBridge');

const RESOURCE_NAME = 'viccs-core';
const RESOURCE_VERSION = '1.0.0';
const startedAt = Date.now();

const Hmp = Imports.get('hmp-lib');
const MySQL = Imports.get('hmp-mysql');
const Core = Imports.get('hmp-core');
const logger = Hmp.logger.create(RESOURCE_NAME);

let config;
try {
    config = loadLayeredConfig(RESOURCE_NAME, defaultConfig);
} catch (error) {
    logger.error(`Erro ao carregar configuração, usando defaults: ${error instanceof Error ? error.message : String(error)}`);
    config = defaultConfig;
}

const registry = createRegistry();
const eraGate = createEraGate(config.canonEra, config.featureToggles?.enforceEraGate !== false);
const database = createDatabase({
    mysql: MySQL,
    logger,
    auditMaxReasonLength: config.audit?.maxReasonLength || 240,
});
const ticketBridge = createTicketBridge({ core: Core, config, logger });

const eventsBridge = createEventsBridge({
    events: Events,
    logger,
    eraGate,
    config,
    getOnlineCount: () => (typeof PlayerManager !== 'undefined' ? PlayerManager.getAll().length : 0),
});

let ready = false;
let lastError = '';

function safeImport(resourceName) {
    return safeImportWith((name) => Imports.get(name), resourceName);
}

const ecosystem = createEcosystemBridge({
    core: Core,
    events: Events,
    safeImport,
    auditApi: {
        record: (entry) => (config.featureToggles?.auditEnabled === false ? null : database.recordAudit(entry)),
    },
    ticketBridge,
    config,
    logger,
});

function status() {
    return {
        resource: RESOURCE_NAME,
        version: RESOURCE_VERSION,
        enabled: config.featureToggles?.enabled !== false,
        ready,
        lastError,
        era: eraGate.getState(),
        tickCount: eventsBridge.getTickCount(),
        registeredResources: registry.count(),
        ticketBridgeConfigured: ticketBridge.isConfigured(),
        ecosystem: ecosystem.summary(),
        uptimeMs: Date.now() - startedAt,
    };
}

const configApi = Object.freeze({
    load(resourceName, resourceDefaults, options = {}) {
        return loadLayeredConfig(resourceName, resourceDefaults, options);
    },
    getCoreConfig() {
        return { ...config };
    },
});

const eraApi = Object.freeze({
    get: () => eraGate.getState(),
    isAvailable: (entry) => eraGate.isAvailable(entry),
    async set(patch, actor = { name: 'Sistema' }, reason = 'Atualização de Era') {
        const before = eraGate.getState();
        const next = eraGate.setEra(patch);
        await database.saveEra(next);
        if (config.featureToggles?.auditEnabled !== false) {
            await database.recordAudit({
                resource: RESOURCE_NAME,
                action: 'era.updated',
                actorCharacterId: actor?.characterId || null,
                actorName: actor?.name || 'Sistema',
                reason,
                before,
                after: next,
            });
        }
        Events.emit('viccs:core:eraChanged', { before, after: next, timestamp: Date.now() });
        return next;
    },
});

const auditApi = Object.freeze({
    async record(entry) {
        if (config.featureToggles?.auditEnabled === false) return null;
        return await database.recordAudit(entry);
    },
    async listRecent(limit = 20, resourceFilter = null) {
        return await database.listRecentAudit(limit, resourceFilter);
    },
});

const registryApi = Object.freeze({
    register: (name, meta) => registry.register(name, meta),
    unregister: (name) => registry.unregister(name),
    setReady: (name, isReady) => registry.setReady(name, isReady),
    snapshot: () => registry.snapshot(),
});

const authApi = Object.freeze({
    isTicketBridgeConfigured: () => ticketBridge.isConfigured(),
    getVerifiedSession: (player) => ticketBridge.getVerifiedSession(player),
    previewLinkCode: (player, code) => ticketBridge.previewLinkCode(player, code),
    consumeLinkCode: (player, code, options) => ticketBridge.consumeLinkCodeForPlayer(player, code, options),
    redeemLinkCode: (player, code, options) => ticketBridge.redeemLinkCodeForPlayer(player, code, options),
});

const ecosystemApi = Object.freeze({
    refresh: (onlyName) => ecosystem.refresh(onlyName),
    getApi: (name) => ecosystem.getApi(name),
    capabilities: () => ecosystem.capabilities(),
    getPlayerContext: (player) => ecosystem.getPlayerContext(player),
    getPlayerBookSnapshot: (player) => ecosystem.getPlayerBookSnapshot(player),
    openService: (player, target, payload) => ecosystem.openService(player, target, payload),
    summary: () => ecosystem.summary(),
});

Exports.register('status', status);
Exports.register('registry', registryApi);
Exports.register('era', eraApi);
Exports.register('audit', auditApi);
Exports.register('config', configApi);
Exports.register('safeImport', safeImport);
Exports.register('auth', authApi);
Exports.register('ecosystem', ecosystemApi);
Exports.register('bridge', ecosystemApi);

ticketBridge.registerWithCore();
ecosystem.registerListeners();
Events.on('playerDisconnect', (player) => ticketBridge.clearPlayer(player));

registry.register(RESOURCE_NAME, {
    version: RESOURCE_VERSION,
    priority: 20,
    enabled: config.featureToggles?.enabled !== false,
    ready: false,
    statusProvider: status,
});

eventsBridge.register();
registerCommands({
    hmp: Hmp,
    core: Core,
    registry,
    eraGate,
    database,
    config,
    events: Events,
    logger,
});

Events.on('resourceStop', (name) => {
    if (!name || name === RESOURCE_NAME) {
        eventsBridge.stopTick();
        ready = false;
        registry.setReady(RESOURCE_NAME, false);
        logger.info('viccs-core encerrado');
        return;
    }
    registry.unregister(name);
});

Events.on('resourceStart', async (name) => {
    if (name && name !== RESOURCE_NAME) return;
    if (config.featureToggles?.enabled === false) {
        logger.warn('viccs-core desabilitado via featureToggles.enabled = false');
        return;
    }

    try {
        await database.init();
        const persistedEra = await database.loadOrSeedEra(eraGate.getState());
        eraGate.setEra(persistedEra);
        eventsBridge.startTick();
        ready = true;
        registry.setReady(RESOURCE_NAME, true);
        logger.info(`Inicializado com sucesso (Era: ${persistedEra.eraId} / ${persistedEra.academicYear})`);
    } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        ready = false;
        logger.error(`Falha na inicialização: ${lastError}`);
        throw error;
    }
});

