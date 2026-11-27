// ═══════════════════════════════════════════════════════════════
// VICCS Accio — Core Ecosystem
// Arquivo: server/events.js
// Descrição: Ponte de eventos entre HMP Foundations e o ecossistema VICCS
// ═══════════════════════════════════════════════════════════════

'use strict';

/**
 * Registra listeners de ciclo de vida e gerencia o tick global do servidor.
 */
function createEventsBridge({ events, logger, eraGate, config, getOnlineCount }) {
    let tickHandle = null;
    let tickCount = 0;

    function register() {
        events.on('hmp:session:ready', (session) => {
            if (!session?.player) return;
            events.emit('viccs:core:playerReady', {
                playerId: session.playerId,
                accountId: session.account?.id || null,
                principal: session.principal || null,
                era: eraGate.getState(),
                timestamp: Date.now(),
            });
        });

        events.on('hmp:character:loaded', (payload) => {
            const session = payload?.session;
            const character = payload?.character;
            if (!session?.player || !character) return;

            events.emit('viccs:core:characterLoaded', {
                playerId: session.playerId,
                accountId: session.account?.id || null,
                characterId: character.id,
                characterName: character.name,
                era: eraGate.getState(),
                timestamp: Date.now(),
            });
        });

        events.on('hmp:character:unloaded', (payload) => {
            const session = payload?.session;
            const character = payload?.character;
            if (!character) return;

            events.emit('viccs:core:characterUnloaded', {
                playerId: session?.playerId || null,
                characterId: character.id,
                timestamp: Date.now(),
            });
        });
    }

    function startTick() {
        stopTick();
        if (!config.featureToggles?.tickEnabled) return;

        const intervalMs = Math.max(1000, Math.min(300000, Number(config.tick?.intervalMs) || 15000));
        tickHandle = setInterval(() => {
            tickCount += 1;
            try {
                events.emit('viccs:core:serverTick', {
                    tick: tickCount,
                    onlinePlayers: typeof getOnlineCount === 'function' ? getOnlineCount() : 0,
                    era: eraGate.getState(),
                    timestamp: Date.now(),
                });
            } catch (error) {
                logger.warn(`Erro ao emitir viccs:core:serverTick: ${error instanceof Error ? error.message : String(error)}`);
            }
        }, intervalMs);
    }

    function stopTick() {
        if (tickHandle) {
            clearInterval(tickHandle);
            tickHandle = null;
        }
    }

    return {
        register,
        startTick,
        stopTick,
        getTickCount: () => tickCount,
    };
}

module.exports = {
    createEventsBridge,
};

