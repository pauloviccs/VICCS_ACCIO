// ═══════════════════════════════════════════════════════════════
// VICCS Accio — Shared UI Tests
// Arquivo: test/service.test.js
// ═══════════════════════════════════════════════════════════════

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
    resolveHouseTheme,
    normalizeParchmentPayload,
    resolveAudioCue,
    collectNearbyInteractions,
    buildWizardEyeActions,
    evaluateEyeTarget,
    selectMagicEyeTarget,
    buildPlayerBookPayload,
} = require('../server/service');

test('resolveHouseTheme normalizes valid houses and falls back safely', () => {
    assert.equal(resolveHouseTheme('  SLYTHERIN '), 'slytherin');
    assert.equal(resolveHouseTheme('invalid', 'ravenclaw'), 'ravenclaw');
    assert.equal(resolveHouseTheme('', 'unknown'), 'gryffindor');
});

test('normalizeParchmentPayload splits body lines and preserves house metadata', () => {
    const payload = normalizeParchmentPayload({
        title: 'Carta de Boas-Vindas',
        body: 'Primeiro paragrafo.\n\nSegundo paragrafo.',
        house: 'Hufflepuff',
    }, {
        defaultSignature: 'Diretor Diggory',
        defaultHouse: 'gryffindor',
    });

    assert.equal(payload.house, 'hufflepuff');
    assert.deepEqual(payload.paragraphs, ['Primeiro paragrafo.', 'Segundo paragrafo.']);
    assert.equal(payload.signature, 'Diretor Diggory');
});

test('resolveAudioCue blocks sustain loop events and resolves one-shot cues', () => {
    const map = { uiOpen: 'open', sortingComplete: 'stinger', accioLoop: 'accio_cast' };
    assert.equal(resolveAudioCue('uiOpen', map), 'open');
    assert.equal(resolveAudioCue('sortingComplete', map), 'stinger');
    assert.equal(resolveAudioCue('accioLoop', map), 'stinger');
    assert.equal(resolveAudioCue('accio_cast', map), 'stinger');
});

test('collectNearbyInteractions filters by areaId and radius in cm', () => {
    const interactions = [
        { id: 'shop.ollivanders', label: 'Ollivanders', areaId: 'Overland', position: { x: 100, y: 100, z: 0 }, radius: 250 },
        { id: 'far.shop', label: 'Longe', areaId: 'Overland', position: { x: 10000, y: 0, z: 0 }, radius: 250 },
        { id: 'other.map', label: 'Outro Mapa', areaId: 'Hogwarts', position: { x: 120, y: 100, z: 0 }, radius: 250 },
    ];

    const nearby = collectNearbyInteractions({
        interactions,
        playerPos: { x: 0, y: 0, z: 0 },
        playerAreaId: 'Overland',
        radiusCm: 1800,
    });

    assert.equal(nearby.length, 1);
    assert.equal(nearby[0].id, 'shop.ollivanders');
    assert.equal(nearby[0].distanceLabel, '1 m');
});

test('buildWizardEyeActions hides sorting when player already has a house', () => {
    const withHouse = buildWizardEyeActions({ hasHouse: true, hasInventory: true, hasEmotes: true, hasCharacters: true, hasSorting: true, hasBanking: true, hasBeasts: true });
    const withoutHouse = buildWizardEyeActions({ hasHouse: false, hasInventory: true, hasEmotes: true, hasCharacters: true, hasSorting: true, needsLink: true });

    assert.equal(withHouse.some((a) => a.id === 'sorting'), false);
    assert.equal(withHouse.some((a) => a.id === 'banking'), true);
    assert.equal(withHouse.some((a) => a.id === 'beasts'), true);
    assert.equal(withoutHouse.some((a) => a.id === 'sorting'), true);
    assert.equal(withoutHouse.some((a) => a.id === 'link'), true);
});

test('evaluateEyeTarget classifies available, unavailable and blocked states clearly', () => {
    const near = evaluateEyeTarget({
        id: 'door.great_hall',
        label: 'Portas do Salão Principal',
        actionLabel: 'Entrar no Salão',
        position: { x: 100, y: 0, z: 0 },
        promptDistance: 350,
    }, {
        playerPos: { x: 0, y: 0, z: 0 },
        hasCharacter: true,
    });
    assert.equal(near.state, 'available');
    assert.equal(near.stateLabel, 'Disponível');
    assert.equal(near.controlHint, 'F');

    const far = evaluateEyeTarget({
        id: 'door.great_hall',
        label: 'Portas do Salão Principal',
        position: { x: 900, y: 0, z: 0 },
        promptDistance: 300,
    }, {
        playerPos: { x: 0, y: 0, z: 0 },
        hasCharacter: true,
    });
    assert.equal(far.state, 'unavailable');
    assert.equal(far.stateLabel, 'Indisponível');

    const blocked = evaluateEyeTarget({
        id: 'vault.gringotts',
        label: 'Cofre Lacrado',
        requiresCharacter: true,
        position: { x: 100, y: 0, z: 0 },
    }, {
        playerPos: { x: 0, y: 0, z: 0 },
        hasCharacter: false,
    });
    assert.equal(blocked.state, 'blocked');
    assert.equal(blocked.stateLabel, 'Bloqueado');
});

test('selectMagicEyeTarget ignores personal system menus and selects aimed world target', () => {
    const result = selectMagicEyeTarget({
        camera: {
            position: { x: 0, y: 0, z: 100 },
            rotation: { pitch: 0, yaw: 0, roll: 0 },
        },
        playerPos: { x: 0, y: 0, z: 100 },
        maxRadiusCm: 1800,
        hasCharacter: true,
        candidates: [
            { id: 'sheet', label: 'Ficha do Jogador', position: { x: 200, y: 0, z: 100 } },
            { id: 'banking', label: 'Gringotes', position: { x: 200, y: 0, z: 100 } },
            { id: 'world.behind', label: 'Caldeirão Atrás', position: { x: -200, y: 0, z: 100 } },
            { id: 'world.front', label: 'Estante de Poções', actionLabel: 'Examinar Estante', position: { x: 400, y: 0, z: 100 } },
        ],
    });

    assert.ok(result.target);
    assert.equal(result.target.id, 'world.front');
    assert.equal(result.target.state, 'available');
    assert.equal(result.nearbyCount, 2);
});

test('buildPlayerBookPayload omits unavailable systems and supports dynamic Phase 3-6 pages', () => {
    const book = buildPlayerBookPayload({
        snapshot: {
            house: 'hufflepuff',
            character: { id: 9, name: 'Ana Abbott', house: 'hufflepuff', houseLabel: 'Lufa-Lufa', academicYearLabel: '2º Ano' },
            onboarding: { hasCharacter: true, hasCompletedSorting: true, needsLink: false },
            robes: { canReapply: true, needsReapply: true, statusText: 'Uniforme pendente de aplicação' },
            wand: null,
            progression: { available: false },
            spells: { available: false, unlockedCount: 0, lessonsCount: 0 },
            resources: { inventoryAvailable: true, inventoryUsedSlots: 3, inventoryTotalSlots: 20, inventoryNativeCount: 4 },
        },
        customPages: [
            { id: 'classes-rp', title: 'Horário de Aulas (Fase 4)', order: 35, available: true, statusText: 'Poções às 19h' },
            { id: 'hidden-stub', title: 'Oculto', available: false },
        ],
    });

    const pageIds = book.pages.map((p) => p.id);
    assert.equal(book.house, 'hufflepuff');
    assert.equal(pageIds.includes('character'), true);
    assert.equal(pageIds.includes('classes'), false);
    assert.equal(pageIds.includes('spells'), false);
    assert.equal(pageIds.includes('grimoire'), true);
    assert.equal(pageIds.includes('classes-rp'), true);
    assert.equal(pageIds.includes('hidden-stub'), false);
    assert.equal(pageIds.includes('system'), true);

    const charPage = book.pages.find((p) => p.id === 'character');
    assert.equal(charPage.actions.some((a) => a.serviceTarget === 'reapply-robes'), true);
});

test('viccs-ui client shortcut handlers accept (physicalKey, state) strings for Alt and Esc without double-toggling', () => {
    const fs = require('node:fs');
    const vm = require('node:vm');
    const path = require('node:path');

    const registeredShortcuts = [];
    const emittedServer = [];
    const clientEvents = new Map();
    const viewHandlers = new Map();
    let nextViewId = 1;

    const sandbox = {
        console,
        Date,
        Math,
        JSON,
        setTimeout,
        clearTimeout,
        setInterval: () => 1,
        clearInterval: () => {},
        Imports: {
            get: () => ({
                input: {
                    shortcuts: {
                        register: (spec) => {
                            registeredShortcuts.push(spec);
                            return () => {};
                        },
                    },
                    controls: {
                        held: () => false,
                        acquire: () => ({ release: () => {} }),
                    },
                },
                ui: { notify: () => {} },
            }),
        },
        Events: {
            on: (ev, fn) => clientEvents.set(ev, fn),
            emit: () => {},
            emitServer: (ev, raw) => emittedServer.push({ ev, raw }),
        },
        Web: {
            createView: () => nextViewId++,
            on: (viewId, ev, fn) => {
                viewHandlers.set(`${viewId}:${ev}`, fn);
            },
            emit: () => {},
            showView: () => {},
            hideView: () => {},
            focusView: () => {},
            destroyView: () => {},
        },
        Game: { setPauseMenuEnabled: () => {}, areControlsLocked: () => false },
        Camera: { capture: () => ({ position: { x: 0, y: 0, z: 100 }, rotation: { pitch: 0, yaw: 0 } }) },
        LocalPlayer: { getPosition: () => ({ x: 0, y: 0, z: 100 }) },
        World: { lineTrace: () => null },
    };

    const code = fs.readFileSync(path.join(__dirname, '../client/main.js'), 'utf8');
    vm.runInNewContext(code, sandbox, { filename: 'viccs-ui/client/main.js' });

    const altBinding = registeredShortcuts.find((s) => s.id === 'magic-eye');
    const laltBinding = registeredShortcuts.find((s) => s.id === 'magic-eye-lalt');
    const escBinding = registeredShortcuts.find((s) => s.id === 'player-book-open');
    assert.ok(altBinding);
    assert.ok(laltBinding);
    assert.ok(escBinding);

    // Simula disparo real do hmp-lib: handler(physicalKey, state) em strings
    laltBinding.handler('lalt', 'down');
    altBinding.handler('alt', 'down'); // duplicata dentro da janela de debounce
    assert.equal(emittedServer.filter((e) => e.ev === 'viccs:ui:eye:query').length, 1);

    escBinding.handler('escape', 'down');
    assert.equal(emittedServer.filter((e) => e.ev === 'viccs:ui:book:toggle').length, 1);
});

test('viccs-ui book/app.js initializes with ornaments.js cleanly without TypeError and emits ready', () => {
    const fs = require('node:fs');
    const vm = require('node:vm');
    const path = require('node:path');

    const calledEvents = [];
    const elements = new Map();
    function makeEl(id = '') {
        const classes = new Set();
        const attrs = {};
        const el = {
            id,
            textContent: '',
            value: '',
            src: '',
            alt: '',
            title: '',
            role: '',
            dataset: {},
            children: [],
            style: {},
            classList: {
                add: (...c) => c.forEach((x) => classes.add(x)),
                remove: (...c) => c.forEach((x) => classes.delete(x)),
                toggle: (c, force) => (force === undefined ? (classes.has(c) ? classes.delete(c) : classes.add(c)) : (force ? classes.add(c) : classes.delete(c))),
                contains: (c) => classes.has(c),
            },
            setAttribute: (k, v) => { attrs[k] = String(v); },
            getAttribute: (k) => attrs[k] ?? null,
            appendChild: (c) => { el.children.push(c); return c; },
            append: (...c) => { el.children.push(...c); },
            prepend: (...c) => { el.children.unshift(...c); },
            replaceChildren: () => { el.children.length = 0; },
            addEventListener: () => {},
            querySelector: () => null,
            querySelectorAll: () => [],
            closest: () => null,
            focus: () => {},
        };
        if (id) elements.set(id, el);
        return el;
    }

    const windowListeners = new Map();
    const sandbox = {
        console,
        setTimeout,
        clearTimeout,
        document: {
            documentElement: makeEl('html'),
            getElementById: (id) => elements.get(id) || makeEl(id),
            createElement: (tag) => makeEl(tag),
            createElementNS: (_ns, tag) => makeEl(tag),
        },
        callEvent: (ev, raw) => calledEvents.push({ ev, raw }),
    };
    sandbox.window = {
        ...sandbox,
        addEventListener: (ev, fn) => windowListeners.set(ev, fn),
    };
    sandbox.self = sandbox.window;

    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../ui/ornaments.js'), 'utf8'), sandbox, { filename: 'ornaments.js' });
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../ui/book/app.js'), 'utf8'), sandbox, { filename: 'book/app.js' });

    assert.equal(calledEvents.some((e) => e.ev === 'ready'), true);
    assert.ok(sandbox.window.ViccsOrnaments.injectFrameCorners);
    assert.ok(sandbox.window.ViccsOrnaments.attachCorners);
});
