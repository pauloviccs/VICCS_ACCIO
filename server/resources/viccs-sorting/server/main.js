// ═══════════════════════════════════════════════════════════════
// VICCS Accio — Sorting Hat Entry Point
// Arquivo: server/main.js
// ═══════════════════════════════════════════════════════════════

'use strict';

const defaultConfig = require('../config/default.json');
const { createDatabase } = require('./database');
const { createHandlers } = require('./handlers');
const { registerCommands } = require('./commands');

const RESOURCE_NAME = 'viccs-sorting';
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
const handlers = createHandlers({
    hmp: Hmp,
    core: Core,
    houses: Houses,
    viccsCore: ViccsCore,
    viccsUi: ViccsUI,
    database,
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
        questionBankSize: Array.isArray(config.questionBank) ? config.questionBank.length : 0,
        hatstallThreshold: Number(config.rules?.hatstallThreshold) || 1.6,
        uptimeMs: Date.now() - startedAt,
    };
}

const ceremonyApi = Object.freeze({
    start: (player) => handlers.startOrResumeForPlayer(player),
    getStateForPlayer: (player) => handlers.getStateForPlayer(player),
    reset: (targetPlayer, actorPlayer, reason) => handlers.resetForCharacter(targetPlayer, actorPlayer, reason),
    getSession: (characterId) => database.getSession(characterId),
});

Exports.register('ceremony', ceremonyApi);
Exports.register('status', status);

ViccsCore.registry.register(RESOURCE_NAME, {
    version: RESOURCE_VERSION,
    priority: 35,
    enabled: config.featureToggles?.enabled !== false,
    ready: false,
    statusProvider: status,
});

handlers.registerEvents();
registerCommands({ hmp: Hmp, core: Core, handlers, config, events: Events, logger });

Events.on('resourceStop', (name) => {
    if (!name || name === RESOURCE_NAME) {
        handlers.stopAll();
        ready = false;
        ViccsCore.registry.setReady(RESOURCE_NAME, false);
    }
});

Events.on('resourceStart', async (name) => {
    if (name && name !== RESOURCE_NAME) return;
    if (config.featureToggles?.enabled === false) {
        logger.warn('viccs-sorting desabilitado via featureToggles.enabled = false');
        return;
    }

    try {
        await database.init();
        ready = true;
        ViccsCore.registry.setReady(RESOURCE_NAME, true);
        logger.info(`Inicializado com sucesso (${config.questionBank?.length || 0} dilemas, limiar Hatstall < ${config.rules?.hatstallThreshold || 1.6})`);
    } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        ready = false;
        logger.error(`Falha na inicialização: ${lastError}`);
        throw error;
    }
});

