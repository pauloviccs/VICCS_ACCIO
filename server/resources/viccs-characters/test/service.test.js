// ═══════════════════════════════════════════════════════════════
// VICCS Accio — Characters Tests
// Arquivo: test/service.test.js
// ═══════════════════════════════════════════════════════════════

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const defaultConfig = require('../config/default.json');
const {
    resolveWandHandle,
    normalizeApplicationToProfile,
    buildCharacterSheetViewModel,
    buildCreatorPrefillFromApplication,
    planHouseRobePatch,
} = require('../server/service');

test('resolveWandHandle returns exact handle or falls back safely', () => {
    const exact = resolveWandHandle('celestial-blue', defaultConfig.wandHandles);
    const fallback = resolveWandHandle('does-not-exist', defaultConfig.wandHandles);

    assert.equal(exact.family, 'Celestial');
    assert.equal(fallback.id, 'arrow-black');
});

test('normalizeApplicationToProfile maps Supabase application to VICCS character profile', () => {
    const profile = normalizeApplicationToProfile({
        id: 'uuid-123',
        discord_id: '149567984597466064',
        first_name: 'Albus',
        last_name: 'Diggory',
        birth_date: '1989-07-31',
        birth_place: 'Londres',
        blood_status: 'half-blood',
        preferred_house: 'ravenclaw',
        wand_wood: 'Teixo',
        wand_core: 'Pena de Fênix',
        wand_length: '12 polegadas',
        wand_flexibility: 'Maleável',
        wand_handle: 'botanical-gold',
        patronus: 'Fênix',
    }, defaultConfig.defaults, defaultConfig.wandHandles);

    assert.equal(profile.fullName, 'Albus Diggory');
    assert.equal(profile.preferredHouse, 'ravenclaw');
    assert.equal(profile.wand.handleId, 'botanical-gold');
    assert.equal(profile.characterBackstory, '');
});

test('buildCharacterSheetViewModel formats labels and wand URLs cleanly', () => {
    const vm = buildCharacterSheetViewModel({
        character: { id: 7, name: 'Elena Vance' },
        profile: { academic_year: 3, blood_status: 'muggle-born', birth_place: 'Edimburgo' },
        wand: { wood: 'Videira', core: 'Pelo de Unicórnio', length: '10¾ polegadas', flexibility: 'Dócil', handle_id: 'regal-blue' },
        house: 'slytherin',
        handles: defaultConfig.wandHandles,
        initialTab: 'wand',
    });

    assert.equal(vm.initialTab, 'wand');
    assert.equal(vm.houseLabel, 'Sonserina');
    assert.equal(vm.bloodStatusLabel, 'Nascido Trouxa');
    assert.equal(vm.wand.handleFamily, 'Régio');
    assert.ok(vm.wand.cutoutUrl.endsWith('/regal-blue.png'));
});

test('normalizeApplicationToProfile preserves full long backstory (>24k chars), dormitory, and wordCount', () => {
    const longBackstory = `${'Palavra '.repeat(3500)}fim.`;
    assert.ok(longBackstory.length > 24000);

    const profile = normalizeApplicationToProfile({
        id: 'uuid-long',
        discord_id: '149567984597466064',
        first_name: 'Astro',
        last_name: 'Gowdie',
        dormitory: 'witch',
        character_backstory: longBackstory,
        word_count: 3501,
    }, defaultConfig.defaults, defaultConfig.wandHandles);

    assert.equal(profile.dormitory, 'witch');
    assert.equal(profile.wordCount, 3501);
    assert.equal(profile.characterBackstory.length, longBackstory.length);
    assert.ok(profile.characterBackstory.endsWith('fim.'));
});

test('buildCreatorPrefillFromApplication prioritizes first_name/last_name and supports character_name fallback', () => {
    const modern = buildCreatorPrefillFromApplication({
        id: 'app-modern-1',
        first_name: 'Hermione',
        last_name: 'Granger',
        dormitory: 'witch',
        preferred_house: 'gryffindor',
        blood_status: 'muggle-born',
        birth_date: '1979-09-19',
        birth_place: 'Londres',
        patronus: 'Lontra',
        word_count: 3104,
        wand_wood: 'Videira',
        wand_core: 'Coração de Dragão',
        wand_length: '10¾ polegadas',
        wand_flexibility: 'Flexível',
        wand_handle: 'botanical-gold',
    }, defaultConfig.wandHandles);
    assert.equal(modern.applicationId, 'app-modern-1');
    assert.equal(modern.first, 'Hermione');
    assert.equal(modern.last, 'Granger');
    assert.equal(modern.dormitory, 'witch');
    assert.equal(modern.preferredHouse, 'gryffindor');
    assert.equal(modern.preferredHouseLabel, 'Grifinória');
    assert.equal(modern.bloodStatusLabel, 'Nascido Trouxa');
    assert.equal(modern.wordCount, 3104);
    assert.equal(modern.wand.handleFamily, 'Botânico');

    const legacy = buildCreatorPrefillFromApplication({
        character_name: 'Draco Malfoy',
        preferred_house: 'slytherin',
    }, defaultConfig.wandHandles);
    assert.equal(legacy.first, 'Draco');
    assert.equal(legacy.last, 'Malfoy');
    assert.equal(legacy.dormitory, 'wizard');
    assert.equal(legacy.preferredHouse, 'slytherin');
    assert.equal(legacy.preferredHouseLabel, 'Sonserina');

    assert.equal(buildCreatorPrefillFromApplication({}), null);
});

test('planHouseRobePatch grants uniform cleanly and preserves custom equipped gear unless forced', () => {
    const fresh = planHouseRobePatch({
        house: 'gryffindor',
        nativeRows: [],
        force: false,
    });
    assert.equal(fresh.ok, true);
    assert.deepEqual(fresh.operations, [
        { op: 'give', itemId: 'Outfit_001_Basic', identified: true, equipped: true },
        { op: 'give', itemId: 'Back_001_Basic', identified: true, equipped: true },
    ]);

    const customWorn = planHouseRobePatch({
        house: 'ravenclaw',
        nativeRows: [
            { itemId: 'Outfit_020_Fancy', holder: 'Outfit', equipped: true, count: 1 },
            { itemId: 'Back_001_Basic', holder: 'Back', equipped: false, count: 1 },
        ],
        force: false,
    });
    assert.equal(customWorn.preservedCustomGear, true);
    assert.deepEqual(customWorn.operations, [
        { op: 'give', itemId: 'Outfit_001_Basic', identified: true, equipped: false },
        { op: 'equip', itemId: 'Back_001_Basic' },
    ]);

    const forced = planHouseRobePatch({
        house: 'ravenclaw',
        nativeRows: [
            { itemId: 'Outfit_020_Fancy', holder: 'Outfit', equipped: true, count: 1 },
            { itemId: 'Outfit_001_Basic', holder: 'Outfit', equipped: false, count: 1 },
            { itemId: 'Back_001_Basic', holder: 'Back', equipped: true, count: 1 },
        ],
        force: true,
    });
    assert.deepEqual(forced.operations, [
        { op: 'equip', itemId: 'Outfit_001_Basic' },
    ]);

    const noHouse = planHouseRobePatch({ house: null });
    assert.equal(noHouse.ok, false);

    const unaffiliated = planHouseRobePatch({
        house: 'unaffiliated',
        nativeRows: [],
        force: false,
    });
    assert.equal(unaffiliated.ok, true);
    assert.equal(unaffiliated.house, 'unaffiliated');
    assert.deepEqual(unaffiliated.operations, [
        { op: 'give', itemId: 'Outfit_001_Basic', identified: true, equipped: true },
        { op: 'give', itemId: 'Back_001_Basic', identified: true, equipped: true },
    ]);

    const unaffiliatedNullAllow = planHouseRobePatch({
        house: null,
        allowUnaffiliated: true,
        nativeRows: [],
    });
    assert.equal(unaffiliatedNullAllow.ok, true);
    assert.equal(unaffiliatedNullAllow.house, 'unaffiliated');
});

test('viccs-characters handlers dress unaffiliated students via inventory.patch + gear.equip and use PlayerManager.getById', async () => {
    const { createHandlers } = require('../server/handlers');
    const eventMap = new Map();
    const emittedEvents = [];
    const clientEmits = [];
    const patchCalls = [];
    const equipCalls = [];

    const inventoryRows = [
        { itemId: 'Outfit_001_Basic', holder: 'Outfit', equipped: false, variation: 'var-outfit-1' },
    ];

    const player = {
        id: 77,
        nickname: 'Calouro',
        connected: true,
        inventory: {
            list: () => inventoryRows.map((r) => ({ ...r })),
            patch: (ops, _opts, cb) => {
                patchCalls.push(ops);
                for (const op of ops) {
                    if (op.op !== 'give') return cb(new Error('Unknown inventory patch operation'));
                    inventoryRows.push({ itemId: op.itemId, holder: 'ActorBackpack', equipped: Boolean(op.equipped), variation: 'var-new' });
                }
                cb(null, { revision: 3 });
            },
            waitForRevision: async () => true,
        },
        gear: {
            equip: (itemId, opts, cb) => {
                equipCalls.push({ itemId, opts });
                const target = inventoryRows.find((r) => r.itemId === itemId);
                if (target) target.equipped = true;
                cb(null, { ok: true });
            },
        },
        emit: (ev, raw) => clientEmits.push({ ev, raw }),
    };

    const prevPlayerManager = global.PlayerManager;
    global.PlayerManager = {
        getById: (id) => (Number(id) === 77 ? player : null),
        getAll: () => [player],
    };

    try {
        let currentProfile = {
            character_id: 501,
            full_name: 'Helena Raven',
            blood_status: 'half-blood',
            academic_year: 1,
            house: null,
            intro_completed: 0,
            robes_house: null,
            robes_applied: 0,
        };
        const handlers = createHandlers({
            hmp: { rateLimit: { create: () => ({ allow: () => true }) } },
            core: {
                sessions: { get: () => ({ player, playerId: 77 }) },
                characters: { active: () => ({ id: 501, name: 'Helena Raven' }) },
            },
            houses: {
                membership: { get: async () => (currentProfile.house ? { house: currentProfile.house } : null), sync: async () => true },
            },
            viccsCore: { audit: { record: async () => true }, auth: { isTicketBridgeConfigured: () => false, getVerifiedSession: () => null }, safeImport: () => null },
            viccsUi: { fade: async () => true, notify: () => {}, audioCue: () => {} },
            database: {
                getProfile: async () => ({ ...currentProfile }),
                getWand: async () => ({ wood: 'Teixo', core: 'Pena de Fênix', length: '11', flexibility: 'Firme', handle_id: 'imperial-brown-gold' }),
                upsertProfile: async (_id, data) => ({ ...currentProfile, ...data }),
                upsertWand: async (_id, w) => w,
                updateRobesState: async (_id, s) => {
                    currentProfile = { ...currentProfile, robes_house: s.robesHouse, robes_applied: s.robesApplied ? 1 : 0 };
                    return currentProfile;
                },
                updateSortingResult: async (_id, s) => {
                    currentProfile = { ...currentProfile, house: s.primaryHouse, secondary_house: s.secondaryHouse, hatstall: s.hatstall ? 1 : 0 };
                    return currentProfile;
                },
                markIntroCompleted: async () => {},
            },
            supabaseBridge: { isConfigured: () => false },
            config: defaultConfig,
            events: {
                on: (ev, fn) => eventMap.set(ev, fn),
                onClient: (ev, fn) => eventMap.set(`client:${ev}`, fn),
                emit: (ev, payload) => emittedEvents.push({ ev, payload }),
            },
            logger: { info: () => {}, warn: () => {}, error: () => {} },
        });

        handlers.registerEvents();

        // Spawn complete -> equips unassigned Hogwarts robes BEFORE sorting and emits onboardingReady
        const onSpawnComplete = eventMap.get('hmp:spawn:complete');
        await onSpawnComplete({ session: { player, playerId: 77 }, character: { id: 501, name: 'Helena Raven' } });
        // wait microtasks cleanly
        await new Promise((r) => setTimeout(r, 20));

        assert.equal(patchCalls.length, 1);
        assert.deepEqual(patchCalls[0].map((op) => op.op), ['give']);
        assert.equal(patchCalls[0][0].itemId, 'Back_001_Basic');
        assert.equal(equipCalls.length, 1);
        assert.equal(equipCalls[0].itemId, 'Outfit_001_Basic');
        assert.equal(equipCalls[0].opts.variation, 'var-outfit-1');
        assert.equal(currentProfile.robes_house, 'unaffiliated');
        assert.equal(currentProfile.robes_applied, 1);
        assert.equal(emittedEvents.some((e) => e.ev === 'viccs:characters:onboardingReady'), true);

        // Sorting completed -> resolved via PlayerManager.getById and updates robes_house
        await eventMap.get('viccs:sorting:completed')({ playerId: 77, characterId: 501, primaryHouse: 'ravenclaw', hatstall: false });
        assert.equal(currentProfile.house, 'ravenclaw');
        assert.equal(currentProfile.robes_house, 'ravenclaw');
    } finally {
        global.PlayerManager = prevPlayerManager;
    }
});

test('viccs-characters creator code gate verifies, survives cancel without burning code, and commits on hmp:character:created', async () => {
    const { createHandlers } = require('../server/handlers');
    const eventMap = new Map();
    const emittedEvents = [];
    const clientEmits = [];
    const consumedCodes = [];
    const linkedApps = [];
    const auditLogs = [];
    let upsertedProfile = null;
    let upsertedWand = null;

    const fullLongStory = `${'Crônica ancestral de Astro Gowdie em Hogwarts. '.repeat(650)}Final da jornada.`;
    assert.ok(fullLongStory.length > 24000);

    const player = {
        id: 88,
        nickname: 'AstroG',
        connected: true,
        emit: (ev, raw) => clientEmits.push({ ev, payload: typeof raw === 'string' ? JSON.parse(raw) : raw }),
    };

    const appRows = {
        'app-pending': {
            id: 'app-pending',
            status: 'pending',
            discord_id: '149567984597466064',
            first_name: 'Astro',
            last_name: 'Pendente',
            dormitory: 'wizard',
            character_backstory: 'Ainda em revisão.',
            word_count: 3,
            game_character_id: null,
        },
        'app-approved': {
            id: 'app-approved',
            status: 'approved',
            discord_id: '149567984597466064',
            first_name: 'Astro',
            last_name: 'Gowdie',
            birth_date: '1989-03-14',
            birth_place: 'Edimburgo',
            blood_status: 'half-blood',
            dormitory: 'wizard',
            preferred_house: 'slytherin',
            patronus: 'Corvo Negro',
            wand_wood: 'Ébano',
            wand_core: 'Fibra de Coração de Dragão',
            wand_length: '12 polegadas',
            wand_flexibility: 'Inflexível',
            wand_handle: 'regal-blue',
            character_backstory: fullLongStory,
            word_count: 4553,
            game_character_id: null,
        },
    };

    const handlers = createHandlers({
        hmp: { rateLimit: { create: () => ({ allow: () => true }) } },
        core: { sessions: { get: () => ({ player, playerId: 88 }) }, characters: { active: () => null } },
        houses: null,
        viccsCore: {
            audit: { record: async (entry) => auditLogs.push(entry) },
            auth: {
                isTicketBridgeConfigured: () => true,
                getVerifiedSession: () => null,
                previewLinkCode: async (_p, rawCode) => {
                    const normalized = String(rawCode || '').trim().toUpperCase();
                    if (normalized === 'VICCS-PEN-111') return { ok: true, code: normalized, discordId: '149567984597466064', applicationId: 'app-pending' };
                    if (normalized === 'VICCS-AST-999') return { ok: true, code: normalized, discordId: '149567984597466064', applicationId: 'app-approved' };
                    return { ok: false, reason: 'Código inválido.' };
                },
                consumeLinkCode: async (_p, code, opts) => {
                    consumedCodes.push({ code, opts });
                    return { ok: true, discordId: '149567984597466064', applicationId: 'app-approved' };
                },
            },
            safeImport: () => null,
        },
        viccsUi: { fade: async () => true, notify: () => {}, audioCue: () => {} },
        database: {
            getProfile: async () => null,
            getWand: async () => null,
            isApplicationClaimedElsewhere: async () => false,
            upsertProfile: async (charId, data) => {
                upsertedProfile = { characterId: charId, ...data };
                return upsertedProfile;
            },
            upsertWand: async (charId, data) => {
                upsertedWand = { characterId: charId, ...data };
                return upsertedWand;
            },
            updateRobesState: async () => ({}),
            updateSortingResult: async () => ({}),
            markIntroCompleted: async () => {},
        },
        supabaseBridge: {
            isConfigured: () => true,
            fetchApplicationById: async (id) => appRows[id] || null,
            linkGameCharacter: async (payload) => {
                linkedApps.push(payload);
                return true;
            },
        },
        config: defaultConfig,
        events: {
            on: (ev, fn) => eventMap.set(ev, fn),
            onClient: (ev, fn) => eventMap.set(`client:${ev}`, fn),
            emit: (ev, payload) => emittedEvents.push({ ev, payload }),
        },
        logger: { info: () => {}, warn: () => {}, error: () => {} },
    });

    handlers.registerEvents();

    // 1. Sem código validado, criação deve ser barrada pelo gate autoritativo
    const blocked = handlers.prepareCreationForPlayer(player);
    assert.equal(blocked.ok, false);
    assert.equal(consumedCodes.length, 0);

    // 2. Ficha pending deve ser rejeitada quando requireApprovedApplication = true
    const pendingRes = await handlers.verifyCreatorCodeForPlayer(player, 'VICCS-PEN-111');
    assert.equal(pendingRes.ok, false);
    assert.match(pendingRes.reason, /aprovação/i);
    assert.equal(consumedCodes.length, 0);

    // 3. Ficha approved valida com sucesso e retorna prefill completo, sem queimar o código
    const okRes = await handlers.verifyCreatorCodeForPlayer(player, 'viccs-ast-999');
    assert.equal(okRes.ok, true);
    assert.equal(okRes.prefill.first, 'Astro');
    assert.equal(okRes.prefill.last, 'Gowdie');
    assert.equal(okRes.prefill.dormitory, 'wizard');
    assert.equal(okRes.prefill.preferredHouse, 'slytherin');
    assert.equal(okRes.prefill.wand.handleFamily, 'Régio');
    assert.equal(consumedCodes.length, 0);

    // 4. Cancelamento limpa estado pendente sem queimar o código, permitindo revalidar depois
    eventMap.get('client:hmp-characters:cancelled')(player);
    assert.equal(handlers.prepareCreationForPlayer(player).ok, false);
    assert.equal(consumedCodes.length, 0);

    const reverified = await handlers.verifyCreatorCodeForPlayer(player, 'VICCS-AST-999');
    assert.equal(reverified.ok, true);
    const prepared = handlers.prepareCreationForPlayer(player);
    assert.equal(prepared.ok, true);
    assert.equal(prepared.claim.prefill.first, 'Astro');

    // 5. Confirmação real em hmp:character:created consome atomicamente, grava full backstory e vincula Supabase
    await eventMap.get('hmp:character:created')({
        session: { player, playerId: 88 },
        character: { id: 902, name: 'Astro Gowdie' },
    });

    assert.equal(consumedCodes.length, 1);
    assert.equal(consumedCodes[0].code, 'VICCS-AST-999');
    assert.equal(consumedCodes[0].opts.expectedDiscordId, '149567984597466064');
    assert.equal(upsertedProfile.characterId, 902);
    assert.equal(upsertedProfile.dormitory, 'wizard');
    assert.equal(upsertedProfile.preferredHouse, 'slytherin');
    assert.equal(upsertedProfile.wordCount, 4553);
    assert.equal(upsertedProfile.characterBackstory.length, fullLongStory.length);
    assert.equal(upsertedWand.handleId, 'regal-blue');
    assert.equal(linkedApps.length, 1);
    assert.deepEqual(linkedApps[0], { applicationId: 'app-approved', gameCharacterId: 902 });
    assert.equal(auditLogs.some((a) => a.action === 'character.synced_on_create'), true);
    assert.equal(emittedEvents.some((e) => e.ev === 'viccs:auth:linked'), true);
});

