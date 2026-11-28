// ═══════════════════════════════════════════════════════════════
// VICCS Accio — Core Ecosystem Tests
// Arquivo: test/service.test.js
// ═══════════════════════════════════════════════════════════════

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
    deepMergePlain,
    loadLayeredConfig,
    safeImportWith,
    createEraGate,
    createRegistry,
    sanitizeAuditEntry,
    summarizeRobesInventory,
    buildPlayerBookSnapshot,
} = require('../server/service');
const {
    formatHouseLabel,
    buildCapabilitiesSnapshot,
} = require('../server/ecosystemBridge');

test('deepMergePlain preserves defaults, merges nested objects and blocks prototype keys', () => {
    const base = {
        featureToggles: { enabled: true, debugMode: false },
        canonEra: { eraId: 'post-war-2000s', academicYear: 2000 },
        list: [1, 2],
    };

    const override = JSON.parse('{"featureToggles":{"debugMode":true},"list":[9],"__proto__":{"polluted":true}}');
    const merged = deepMergePlain(base, override);

    assert.equal(merged.featureToggles.enabled, true);
    assert.equal(merged.featureToggles.debugMode, true);
    assert.equal(merged.canonEra.academicYear, 2000);
    assert.deepEqual(merged.list, [9]);
    assert.equal({}.polluted, undefined);
});

test('loadLayeredConfig loads data/<resource>.json override when present', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'viccs-core-cfg-'));
    fs.mkdirSync(path.join(tempDir, 'data'));
    fs.writeFileSync(
        path.join(tempDir, 'data', 'viccs-core.json'),
        JSON.stringify({ canonEra: { academicYear: 2001 } }),
        'utf8',
    );

    const cfg = loadLayeredConfig(
        'viccs-core',
        { canonEra: { eraId: 'post-war-2000s', academicYear: 2000 } },
        { cwd: tempDir },
    );

    assert.equal(cfg.canonEra.eraId, 'post-war-2000s');
    assert.equal(cfg.canonEra.academicYear, 2001);
    fs.rmSync(tempDir, { recursive: true, force: true });
});

test('EraGate enforces year bounds, eraIds and needsReview safely', () => {
    const gate = createEraGate({ eraId: 'post-war-2000s', academicYear: 2000 }, true);

    assert.equal(gate.isAvailable({ availableFrom: 1998, availableUntil: 2005 }), true);
    assert.equal(gate.isAvailable({ availableFrom: 2002 }), false);
    assert.equal(gate.isAvailable({ eraIds: ['1991-1998'] }), false);
    assert.equal(gate.isAvailable({ needsReview: true }), false);

    gate.setEra({ academicYear: 2002, enforce: false });
    assert.equal(gate.isAvailable({ eraIds: ['1991-1998'] }), true);
    assert.equal(gate.isAvailable({ needsReview: true }), false);
});

test('Registry orders resources by priority and reports status safely even on throw', () => {
    const registry = createRegistry();
    registry.register('viccs-sorting', { priority: 35, ready: true });
    registry.register('viccs-core', {
        priority: 20,
        ready: true,
        statusProvider: () => ({ ready: true, ok: 1 }),
    });
    registry.register('viccs-broken', {
        priority: 30,
        ready: false,
        statusProvider: () => { throw new Error('boom'); },
    });

    const snap = registry.snapshot();
    assert.equal(registry.count(), 3);
    assert.deepEqual(snap.map((s) => s.name), ['viccs-core', 'viccs-broken', 'viccs-sorting']);
    assert.equal(snap[0].details.ok, 1);
    assert.equal(snap[1].details.error, 'boom');
});

test('safeImportWith degrades gracefully when optional module is absent', () => {
    const missing = safeImportWith(() => { throw new Error('not loaded'); }, 'viccs-prophet');
    const present = safeImportWith((name) => ({ name }), 'viccs-ui');

    assert.equal(missing, null);
    assert.deepEqual(present, { name: 'viccs-ui' });
});

test('sanitizeAuditEntry validates required action and truncates long reasons', () => {
    assert.throws(() => sanitizeAuditEntry({ resource: 'viccs-core' }), TypeError);

    const entry = sanitizeAuditEntry({
        resource: 'viccs-sorting',
        action: 'house.assigned',
        actorCharacterId: 42,
        actorName: 'McGonagall',
        reason: 'x'.repeat(300),
        before: null,
        after: { house: 'gryffindor' },
    }, 50);

    assert.equal(entry.actorCharacterId, 42);
    assert.equal(entry.reason.length, 50);
    assert.equal(entry.afterJson, '{"house":"gryffindor"}');
});


test('ecosystem helpers map Portuguese house names and module capabilities', () => {
    assert.equal(formatHouseLabel('slytherin'), 'Sonserina');
    assert.equal(formatHouseLabel('HUFFLEPUFF'), 'Lufa-Lufa');
    assert.equal(formatHouseLabel('unknown'), null);

    const caps = buildCapabilitiesSnapshot({
        'hmp-houses': { ok: true },
        'hmp-beasts': null,
    });
    assert.deepEqual(caps, {
        'hmp-houses': true,
        'hmp-beasts': false,
    });
});

test('summarizeRobesInventory tracks equipped uniform, custom gear, and sync state non-destructively', () => {
    const synced = summarizeRobesInventory({
        house: 'gryffindor',
        profile: { robes_house: 'gryffindor', robes_applied: 1 },
        nativeRows: [
            { itemId: 'Outfit_001_Basic', holder: 'Outfit', count: 1, equipped: true },
            { itemId: 'Back_001_Basic', holder: 'Back', count: 1, equipped: true },
        ],
    });
    assert.equal(synced.hasCompleteUniformEquipped, true);
    assert.equal(synced.hasCustomGearEquipped, false);
    assert.equal(synced.needsReapply, false);

    const customGear = summarizeRobesInventory({
        house: 'slytherin',
        profile: { robes_house: 'slytherin', robes_applied: 1 },
        nativeRows: [
            { itemId: 'Outfit_012_Common', holder: 'Outfit', count: 1, equipped: true },
            { itemId: 'Outfit_001_Basic', holder: 'Outfit', count: 1, equipped: false },
            { itemId: 'Back_001_Basic', holder: 'Back', count: 1, equipped: true },
        ],
    });
    assert.equal(customGear.hasCustomGearEquipped, true);
    assert.equal(customGear.hasAnySchoolRobe, true);
    assert.equal(customGear.needsReapply, false);

    const pending = summarizeRobesInventory({
        house: 'ravenclaw',
        profile: { robes_house: null, robes_applied: 0 },
        nativeRows: [],
    });
    assert.equal(pending.needsReapply, true);
    assert.equal(pending.canReapply, true);
});

test('buildPlayerBookSnapshot surfaces nextStep, resume sorting state, and synced metrics', () => {
    const resuming = buildPlayerBookSnapshot({
        playerId: 3,
        nickname: 'Cedrico',
        accountId: 9,
        isTicketBridgeConfigured: true,
        verifiedDiscordId: null,
        character: { id: 12, name: 'Cedrico Diggory' },
        sorting: { status: 'IN_PROGRESS', answeredCount: 5, totalQuestions: 8 },
        capabilities: { 'hmp-spells': false, 'hmp-banking': true },
    });
    assert.equal(resuming.onboarding.needsLink, true);
    assert.equal(resuming.onboarding.hasResumeSorting, true);
    assert.equal(resuming.recommendations.some((r) => r.id === 'link-account'), true);
    assert.equal(resuming.recommendations.some((r) => r.id === 'resume-sorting'), true);

    const ready = buildPlayerBookSnapshot({
        playerId: 4,
        nickname: 'Luna',
        accountId: 10,
        character: { id: 21, name: 'Luna Lovegood' },
        house: 'ravenclaw',
        profile: { academic_year: 4, blood_status: 'pure-blood', birth_place: 'Ottery St Catchpole', patronus: 'Lebre', intro_completed: 1, robes_house: 'ravenclaw', robes_applied: 1 },
        wand: { wood: 'Sabugueiro', core: 'Pelo de Testrálio', length: '11 polegadas', flexibility: 'Flexível', handle_id: 'botanical-gold' },
        sorting: { status: 'COMPLETED', answeredCount: 8, totalQuestions: 8 },
        nativeRows: [
            { itemId: 'Outfit_001_Basic', holder: 'Outfit', count: 1, equipped: true },
            { itemId: 'Back_001_Basic', holder: 'Back', count: 1, equipped: true },
        ],
        progression: { level: 3, experiencePoints: 450, talentPoints: 2 },
        talents: [{ talentId: 'accio_mastery', status: 'owned' }],
        flooFlames: ['hogwarts_great_hall'],
        spellsResolved: { entitlements: { spells: ['Lumos', 'Accio'] }, policy: { bonusLoadouts: 1 } },
        lessonsCount: 4,
        bankingGalleons: 125,
        capabilities: { 'hmp-spells': true, 'hmp-banking': true, 'hmp-inventory': true },
    });
    assert.equal(ready.character.houseLabel, 'Corvinal');
    assert.equal(ready.robes.needsReapply, false);
    assert.equal(ready.spells.unlockedCount, 2);
    assert.equal(ready.resources.galleons, 125);
    assert.equal(ready.recommendations.length, 0);
});

test('ticketBridge previewLinkCode checks without consuming, while consumeLinkCodeForPlayer redeems atomically', async () => {
    const { createTicketBridge } = require('../server/ticketBridge');
    const prevFetch = global.fetch;
    const fetchLog = [];
    const linkIdentityCalls = [];
    const sessionObj = { playerId: 9, account: { id: 42 } };
    const player = { id: 9, nickname: 'Astro' };

    global.fetch = async (url, init = {}) => {
        const method = init.method || 'GET';
        fetchLog.push({ url, method, body: init.body ? JSON.parse(init.body) : null });

        if (method === 'GET' && url.includes('server_link_codes?code=eq.VICCS-AST-777')) {
            return {
                ok: true,
                json: async () => [{
                    id: 'code-1',
                    code: 'VICCS-AST-777',
                    discord_id: '149567984597466064',
                    application_id: 'app-uuid-9',
                    expires_at: '2099-01-01T00:00:00.000Z',
                    used_at: null,
                }],
            };
        }
        if (method === 'PATCH' && url.includes('server_link_codes?code=eq.VICCS-AST-777')) {
            return {
                ok: true,
                json: async () => [{
                    id: 'code-1',
                    code: 'VICCS-AST-777',
                    discord_id: '149567984597466064',
                    application_id: 'app-uuid-9',
                    expires_at: '2099-01-01T00:00:00.000Z',
                    used_at: init.body ? JSON.parse(init.body).used_at : '2026-11-28T00:00:00.000Z',
                }],
            };
        }
        return { ok: true, json: async () => [] };
    };

    try {
        const bridge = createTicketBridge({
            core: {
                sessions: { get: (p) => (p === player ? sessionObj : null) },
                accounts: {
                    linkIdentity: async (accountId, principal) => {
                        linkIdentityCalls.push({ accountId, principal });
                        return true;
                    },
                },
            },
            config: {
                identity: {
                    supabaseTicketValidation: true,
                    supabaseUrl: 'https://example.supabase.co',
                    supabaseServiceKey: 'service-key-test',
                    timeoutMs: 3000,
                },
            },
            logger: { warn: () => {}, info: () => {} },
        });

        const preview = await bridge.previewLinkCode(player, 'viccs-ast-777');
        assert.equal(preview.ok, true);
        assert.equal(preview.code, 'VICCS-AST-777');
        assert.equal(preview.discordId, '149567984597466064');
        assert.equal(preview.applicationId, 'app-uuid-9');
        assert.equal(fetchLog.filter((f) => f.method === 'PATCH').length, 0);
        assert.equal(linkIdentityCalls.length, 0);

        const wrongDiscord = await bridge.consumeLinkCodeForPlayer(player, 'VICCS-AST-777', {
            expectedDiscordId: '999999999',
        });
        assert.equal(wrongDiscord.ok, false);
        assert.equal(fetchLog.filter((f) => f.method === 'PATCH').length, 0);

        const consumed = await bridge.consumeLinkCodeForPlayer(player, 'VICCS-AST-777', {
            expectedDiscordId: '149567984597466064',
        });
        assert.equal(consumed.ok, true);
        assert.equal(consumed.applicationId, 'app-uuid-9');
        assert.equal(fetchLog.filter((f) => f.method === 'PATCH').length, 1);
        assert.equal(linkIdentityCalls.length, 1);
        assert.equal(linkIdentityCalls[0].accountId, 42);
        assert.equal(linkIdentityCalls[0].principal.subject, '149567984597466064');
        assert.equal(bridge.getVerifiedSession(player).applicationId, 'app-uuid-9');
    } finally {
        global.fetch = prevFetch;
    }
});
