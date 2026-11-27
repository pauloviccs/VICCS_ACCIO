// ═══════════════════════════════════════════════════════════════
// VICCS Accio — Sorting Hat Fail-Proof Tests
// Arquivo: test/service.test.js
// ═══════════════════════════════════════════════════════════════

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const defaultConfig = require('../config/default.json');
const {
    shuffleArray,
    startCeremonySession,
    submitAnswer,
    buildClientPrompt,
} = require('../server/service');

test('shuffleArray preserves all elements without mutating input', () => {
    const original = [1, 2, 3, 4, 5, 6];
    const shuffled = shuffleArray(original, () => 0.25);

    assert.deepEqual(original, [1, 2, 3, 4, 5, 6]);
    assert.deepEqual([...shuffled].sort((a, b) => a - b), original);
});

test('startCeremonySession selects 8 unique questions and hides weights in client prompt', () => {
    const session = startCeremonySession({
        characterId: 101,
        questionBank: defaultConfig.questionBank,
        questionsPerSession: 8,
    });

    assert.equal(session.questionIds.length, 8);
    assert.equal(new Set(session.questionIds).size, 8);
    assert.equal(session.currentOptions.length, 4);

    const prompt = buildClientPrompt({
        session,
        questionBank: defaultConfig.questionBank,
        hatstallQuestion: defaultConfig.hatstallQuestion,
        housesMeta: defaultConfig.houses,
        whispers: defaultConfig.whispers,
    });

    const serialized = JSON.stringify(prompt);
    assert.equal(serialized.includes('weights'), false);
    assert.equal(serialized.includes('scores'), false);
    assert.equal(prompt.question.options.length, 4);
    assert.ok(prompt.question.options[0].token.length >= 8);
});

test('submitAnswer triggers Hatstall when top-2 difference is below threshold 1.6', () => {
    // Cria banco mínimo determinístico para forçar empate técnico < 1.6 após 8 respostas
    const tieBank = Array.from({ length: 8 }, (_, idx) => ({
        id: `q_${idx}`,
        category: 'Teste',
        text: `Pergunta ${idx}`,
        options: [
            { text: 'Opção A', weights: { G: 1.0, R: 0.95, H: 0.0, S: 0.0 } },
            { text: 'Opção B', weights: { G: 1.0, R: 0.95, H: 0.0, S: 0.0 } },
            { text: 'Opção C', weights: { G: 1.0, R: 0.95, H: 0.0, S: 0.0 } },
            { text: 'Opção D', weights: { G: 1.0, R: 0.95, H: 0.0, S: 0.0 } },
        ],
    }));

    let session = startCeremonySession({
        characterId: 7,
        questionBank: tieBank,
        questionsPerSession: 8,
    });

    for (let i = 0; i < 8; i++) {
        session = submitAnswer({
            session,
            token: session.currentOptions[0].token,
            questionBank: tieBank,
            hatstallQuestion: defaultConfig.hatstallQuestion,
            hatstallThreshold: 1.6,
        });
    }

    assert.equal(session.status, 'HATSTALL');
    assert.equal(session.isHatstallTriggered, true);
    assert.equal(session.questionIds.length, 9);

    // Responde a pergunta de desempate e verifica transição para DELIBERATING
    session = submitAnswer({
        session,
        token: session.currentOptions[0].token,
        questionBank: tieBank,
        hatstallQuestion: defaultConfig.hatstallQuestion,
        hatstallThreshold: 1.6,
    });

    assert.equal(session.status, 'DELIBERATING');
    assert.ok(['G', 'R', 'H', 'S'].includes(session.primaryHouse));
    assert.ok(['G', 'R', 'H', 'S'].includes(session.secondaryHouse));
});

test('submitAnswer rejects invalid/replayed option tokens', () => {
    const session = startCeremonySession({
        characterId: 9,
        questionBank: defaultConfig.questionBank,
        questionsPerSession: 8,
    });

    assert.throws(() => submitAnswer({
        session,
        token: 'forged-token-000',
        questionBank: defaultConfig.questionBank,
        hatstallQuestion: defaultConfig.hatstallQuestion,
    }), TypeError);
});

test('sorting session state can pause mid-quiz and resume without reroll', () => {
    let session = startCeremonySession({
        characterId: 55,
        questionBank: defaultConfig.questionBank,
        questionsPerSession: 8,
    });
    const originalQuestionIds = [...session.questionIds];

    for (let i = 0; i < 3; i++) {
        session = submitAnswer({
            session,
            token: session.currentOptions[0].token,
            questionBank: defaultConfig.questionBank,
            hatstallQuestion: defaultConfig.hatstallQuestion,
            hatstallThreshold: 1.6,
        });
    }

    const persistedSnapshot = JSON.parse(JSON.stringify(session));
    assert.equal(persistedSnapshot.status, 'IN_PROGRESS');
    assert.equal(persistedSnapshot.currentIndex, 3);
    assert.deepEqual(persistedSnapshot.questionIds, originalQuestionIds);

    let resumed = persistedSnapshot;
    while (resumed.status === 'IN_PROGRESS' || resumed.status === 'HATSTALL') {
        resumed = submitAnswer({
            session: resumed,
            token: resumed.currentOptions[0].token,
            questionBank: defaultConfig.questionBank,
            hatstallQuestion: defaultConfig.hatstallQuestion,
            hatstallThreshold: 1.6,
        });
    }

    assert.equal(resumed.status, 'DELIBERATING');
    assert.ok(['G', 'R', 'H', 'S'].includes(resumed.primaryHouse));
});

test('viccs-sorting auto-teleports unsorted player to FT_HW_GreatHall and opens Sorting Hat via PlayerManager.getById', async () => {
    const { createHandlers } = require('../server/handlers');
    const eventMap = new Map();
    const fastTravels = [];
    const clientEmits = [];
    const fades = [];

    const player = {
        id: 88,
        nickname: 'Novato',
        connected: true,
        position: { x: 366784, y: -461527, z: -82610 },
        location: () => ({ destinationId: null, x: 366784, y: -461527, z: -82610 }),
        setFastTravelUnlocked: () => {},
        fastTravel: (dest) => {
            fastTravels.push(dest);
            setTimeout(() => {
                player.position = { x: 401000, y: -441000, z: -80000 };
                eventMap.get('playerFastTravelComplete')?.(player, 901, 0);
            }, 15);
            return 901;
        },
        emit: (ev, raw) => clientEmits.push({ ev, raw }),
    };

    const prevPlayerManager = global.PlayerManager;
    global.PlayerManager = {
        getById: (id) => (Number(id) === 88 ? player : null),
        getAll: () => [player],
    };

    try {
        let savedSession = null;
        const handlers = createHandlers({
            hmp: {
                rateLimit: { create: () => ({ allow: () => true }) },
                validation: { string: (v) => String(v) },
            },
            core: { characters: { active: () => ({ id: 601, name: 'Novato' }) } },
            houses: { membership: { get: async () => null, set: async () => true, clear: async () => true } },
            viccsCore: { audit: { record: async () => true }, safeImport: () => null },
            viccsUi: { fade: async (_p, d) => fades.push(d), notify: () => {}, audioCue: () => {} },
            database: {
                getSession: async () => savedSession,
                saveSession: async (s) => { savedSession = s; return s; },
                deleteSession: async () => {},
            },
            config: {
                ...defaultConfig,
                ceremonyLocation: { enabled: true, fastTravelId: 'FT_HW_GreatHall', timeoutMs: 2000, settleMs: 10 },
            },
            events: {
                on: (ev, fn) => eventMap.set(ev, fn),
                onClient: (ev, fn) => eventMap.set(`client:${ev}`, fn),
                emit: () => {},
            },
            logger: { info: () => {}, warn: () => {}, error: () => {} },
        });

        handlers.registerEvents();
        await eventMap.get('viccs:characters:onboardingReady')({
            playerId: 88,
            characterId: 601,
            house: null,
            introCompleted: false,
        });

        assert.deepEqual(fastTravels, ['FT_HW_GreatHall']);
        assert.equal(fades.some((f) => f.direction === 'in'), true);
        assert.equal(fades.some((f) => f.direction === 'out'), true);
        assert.equal(clientEmits.some((e) => e.ev === 'viccs:sorting:state'), true);
        handlers.stopAll();
    } finally {
        global.PlayerManager = prevPlayerManager;
    }
});

