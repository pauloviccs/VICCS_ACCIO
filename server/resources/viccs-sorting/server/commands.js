// ═══════════════════════════════════════════════════════════════
// VICCS Accio — Sorting Hat Commands (Somente Admin por Padrão)
// Arquivo: server/commands.js
// ═══════════════════════════════════════════════════════════════

'use strict';

function registerCommands({ hmp, core, handlers, config, events, logger }) {
    const router = hmp.command.createRouter({ prefix: '[viccs-sorting]', logger });

    if (config.featureToggles?.enablePlayerCommands) {
        router.register('chapeu', {
            aliases: ['sorting', 'selecao'],
            description: 'Inicia ou retoma a Cerimônia do Chapéu Seletor',
            usage: '/chapeu',
        }, async ({ player }) => {
            await handlers.startOrResumeForPlayer(player);
        });
    }

    router.register('resorting', {
        description: 'Reinicia a seleção de Casa de um jogador (Admin)',
        usage: '/resorting [me|nick|#id] [motivo]',
        guard: async ({ player }) => {
            const ok = await core.groups.has(player, 'admin', 1) || await core.groups.has(player, 'super_admin', 1);
            return ok || 'Acesso restrito a administradores.';
        },
    }, async ({ player, args, resolvePlayer, reply }) => {
        const res = resolvePlayer(args[0] || 'me');
        if (!res.ok) {
            reply('Uso: /resorting [me|nick|#id] [motivo]');
            return;
        }
        const reason = args.slice(1).join(' ') || 'Re-sorteio autorizado pela Diretoria';
        const done = await handlers.resetForCharacter(res.player, player, reason);
        reply(done ? `Seleção reiniciada para ${res.player.nickname}.` : 'Alvo sem personagem ativo.');
    });

    events.on('chatCommand', router.handle);
    return router;
}

module.exports = {
    registerCommands,
};
