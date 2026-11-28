// ═══════════════════════════════════════════════════════════════
// VICCS Accio — Characters Extension Entry Point
// Arquivo: server/main.js
// ═══════════════════════════════════════════════════════════════

'use strict';

const defaultConfig = require('../config/default.json');
const { resolveWandHandle } = require('./service');
const { createDatabase } = require('./database');
const { createSupabaseBridge } = require('./supabaseBridge');
const { createHandlers } = require('./handlers');
const { registerCommands } = require('./commands');

const RESOURCE_NAME = 'viccs-characters';
const RESOURCE_VERSION = '1.0.0';
const startedAt = Date.now();

const Hmp = Imports.get('hmp-lib');
const MySQL = Imports.get('hmp-mysql');
const Core = Imports.get('hmp-core');
const Houses = Imports.get('hmp-houses');
const ViccsCore = Imports.get('viccs-core');
const ViccsUI = Imports.get('viccs-ui');
const logger = Hmp.logger.create(RESOURCE_NAME);

let config;
try {
    config = ViccsCore.config.load(RESOURCE_NAME, defaultConfig);
} catch (error) {
    logger.warn(`Fallback de config em ${RESOURCE_NAME}: ${error instanceof Error ? error.message : String(error)}`);
    config = defaultConfig;
}

const database = createDatabase({ mysql: MySQL, logger });
const supabaseBridge = createSupabaseBridge({ config, logger });
const handlers = createHandlers({
    hmp: Hmp,
    core: Core,
    houses: Houses,
    viccsCore: ViccsCore,
    viccsUi: ViccsUI,
    database,
    supabaseBridge,
    config,
    events: Events,
    logger,
});

let ready = false;
let lastError = '';

function status() {
    return {
        resource: RESOURCE_NAME,
        version: RESOURCE_VERSION,
        enabled: config.featureToggles?.enabled !== false,
        ready,
        lastError,
        supabaseConfigured: supabaseBridge.isConfigured(),
        wandFamilies: Array.isArray(config.wandHandles) ? config.wandHandles.length : 0,
        uptimeMs: Date.now() - startedAt,
    };
}

const profilesApi = Object.freeze({
    get: (characterId) => database.getProfile(characterId),
    upsert: (characterId, data) => database.upsertProfile(characterId, data),
    openSheet: (player, tab = 'sheet') => handlers.openSheetForPlayer(player, tab),
    openLinkModal: (player) => handlers.openLinkModal(player),
});

const wandsApi = Object.freeze({
    get: (characterId) => database.getWand(characterId),
    listHandles: () => (config.wandHandles || []).slice(),
    resolveHandle: (handleId) => resolveWandHandle(handleId, config.wandHandles),
    set: (characterId, wand) => database.upsertWand(characterId, wand),
});

const syncApi = Object.freeze({
    isConfigured: () => supabaseBridge.isConfigured(),
    isCreationCodeRequired: () => handlers.isCreationCodeRequired(),
    prepareCreate: (player) => handlers.prepareCreationForPlayer(player),
    verifyCreatorCode: (player, code) => handlers.verifyCreatorCodeForPlayer(player, code),
    syncPlayer: async (player) => {
        const session = Core.sessions.get(player);
        const character = Core.characters.active(player);
        if (!session || !character) return null;
        return await handlers.ensureCharacterData(session, character);
    },
    reapplyHouseRobes: (player, options = {}) => handlers.applyHouseRobesForPlayer(player, options?.house || null, options),
    getHouseRobeItems: () => [
        config.houseRobes?.outfitItemId || 'Outfit_001_Basic',
        config.houseRobes?.backItemId || 'Back_001_Basic',
    ],
});

Exports.register('profiles', profilesApi);
Exports.register('wands', wandsApi);
Exports.register('sync', syncApi);
Exports.register('status', status);

ViccsCore.registry.register(RESOURCE_NAME, {
    version: RESOURCE_VERSION,
    priority: 30,
    enabled: config.featureToggles?.enabled !== false,
    ready: false,
    statusProvider: status,
});

handlers.registerEvents();
registerCommands({ hmp: Hmp, handlers, config, events: Events, logger });

Events.on('resourceStop', (name) => {
    if (!name || name === RESOURCE_NAME) {
        ready = false;
        ViccsCore.registry.setReady(RESOURCE_NAME, false);
    }
});

Events.on('resourceStart', async (name) => {
    if (name && name !== RESOURCE_NAME) return;
    if (config.featureToggles?.enabled === false) {
        logger.warn('viccs-characters desabilitado via featureToggles.enabled = false');
        return;
    }

    try {
        await database.init();
        ready = true;
        ViccsCore.registry.setReady(RESOURCE_NAME, true);
        logger.info(`Inicializado com sucesso (${config.wandHandles?.length || 0} familias de varinha)`);
    } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        ready = false;
        logger.error(`Falha na inicialização: ${lastError}`);
        throw error;
    }
});

