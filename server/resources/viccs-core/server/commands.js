// ═══════════════════════════════════════════════════════════════
// VICCS Accio — Core Ecosystem
// Arquivo: server/commands.js
// Descrição: Comandos administrativos de diagnóstico e auditoria do ecossistema
// ═══════════════════════════════════════════════════════════════

'use strict';

/**
 * Registra roteador de comandos do viccs-core via `hmp-lib`.
 */
function registerCommands({ hmp, core, registry, eraGate, database, config, events, logger }) {
    const router = hmp.command.createRouter({ prefix: '[viccs-core]', logger });
    const adminGroups = Array.isArray(config.commands?.adminGroups)
        ? config.commands.adminGroups
        : [{ key: 'admin', minimumGrade: 1 }];

    async function isAdminGuard({ player }) {
        try {
            const checks = await Promise.all(
                adminGroups.map((g) => core.groups.has(player, g.key, g.minimumGrade ?? 1)),
            );
            return checks.some(Boolean) || 'Acesso restrito a administradores do Ministério.';
        } catch (error) {
            logger.warn(`Falha ao verificar permissão de admin: ${error instanceof Error ? error.message : String(error)}`);
            return 'Não foi possível validar suas permissões agora.';
        }
    }

    router.register('viccsstatus', {
        aliases: ['vstatus'],
        description: 'Exibe status de todos os resources VICCS e da Era ativa',
        usage: '/viccsstatus',
        guard: isAdminGuard,
    }, ({ reply }) => {
        const era = eraGate.getState();
        const items = registry.snapshot();
        const summary = items.length
            ? items.map((item) => `${item.name}@${item.version}:${item.ready ? 'OK' : 'INIT'}`).join(' | ')
            : 'Nenhum resource registrado.';

        reply(`Era: ${era.eraId} (${era.academicYear}, Dir. ${era.headmaster})`);
        reply(`Ecossistema (${items.length}): ${summary}`);
    });

    router.register('viccsaudit', {
        aliases: ['vaudit'],
        description: 'Lista últimos registros da tabela viccs_audit',
        usage: '/viccsaudit [limite] [resource]',
        guard: isAdminGuard,
    }, async ({ args, reply }) => {
        const limit = Number(args[0]) || Number(config.audit?.defaultQueryLimit) || 10;
        const resourceFilter = args[1] || null;
        const rows = await database.listRecentAudit(limit, resourceFilter);

        if (!rows.length) {
            reply('Nenhum registro de auditoria encontrado.');
            return;
        }

        for (const row of rows.slice(0, 8)) {
            reply(`#${row.id} [${row.resource}] ${row.action} por ${row.actor_name} (${row.reason || 'sem motivo'})`);
        }
    });

    events.on('chatCommand', router.handle);
    return router;
}

module.exports = {
    registerCommands,
};

