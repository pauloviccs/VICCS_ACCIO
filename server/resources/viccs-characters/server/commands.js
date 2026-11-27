// ═══════════════════════════════════════════════════════════════
// VICCS Accio — Character Commands (Opcional / Desligado para Players por Padrão)
// Arquivo: server/commands.js
// ═══════════════════════════════════════════════════════════════

'use strict';

function registerCommands({ hmp, handlers, config, events, logger }) {
    if (!config.featureToggles?.enablePlayerCommands) {
        return null;
    }

    const router = hmp.command.createRouter({ prefix: '[viccs-characters]', logger });

    router.register('ficha', {
        aliases: ['perfil', 'sheet'],
        description: 'Abre a ficha diegética do seu personagem',
        usage: '/ficha',
    }, async ({ player }) => {
        await handlers.openSheetForPlayer(player, 'sheet');
    });

    router.register('varinha', {
        aliases: ['wand', 'ollivanders'],
        description: 'Inspeciona os detalhes da sua varinha de Ollivanders',
        usage: '/varinha',
    }, async ({ player }) => {
        await handlers.openSheetForPlayer(player, 'wand');
    });

    events.on('chatCommand', router.handle);
    return router;
}

module.exports = {
    registerCommands,
};
