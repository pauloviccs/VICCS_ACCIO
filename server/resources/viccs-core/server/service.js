// ═══════════════════════════════════════════════════════════════
// VICCS Accio — Core Ecosystem
// Arquivo: server/service.js
// Descrição: Regras puras do ecossistema (EraGate, Registry, Config, Audit, SafeImport)
// ═══════════════════════════════════════════════════════════════

'use strict';

const fs = require('fs');
const path = require('path');

const UNSAFE_MERGE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Faz merge profundo seguro de objetos planos (arrays são substituídos, chaves perigosas ignoradas).
 * @param {Record<string, unknown>} target
 * @param {Record<string, unknown>} source
 * @returns {Record<string, unknown>}
 */
function deepMergePlain(target, source) {
    const out = { ...(target || {}) };
    if (!source || typeof source !== 'object' || Array.isArray(source)) {
        return out;
    }

    for (const [key, value] of Object.entries(source)) {
        if (UNSAFE_MERGE_KEYS.has(key)) continue;

        const current = out[key];
        const bothPlain =
            value &&
            typeof value === 'object' &&
            !Array.isArray(value) &&
            current &&
            typeof current === 'object' &&
            !Array.isArray(current);

        if (bothPlain) {
            out[key] = deepMergePlain(current, value);
        } else if (Array.isArray(value)) {
            out[key] = value.slice();
        } else {
            out[key] = value;
        }
    }

    return out;
}

/**
 * Carrega configuração padrão do resource e aplica override opcional em `data/<resource>.json`.
 * @param {string} resourceName
 * @param {Record<string, unknown>} defaultConfig
 * @param {object} [options]
 * @returns {Record<string, unknown>}
 */
function loadLayeredConfig(resourceName, defaultConfig, options = {}) {
    const cwd = options.cwd || process.cwd();
    const overrideRel = options.overridePath || path.join('data', `${resourceName}.json`);
    const overrideAbs = path.isAbsolute(overrideRel) ? overrideRel : path.resolve(cwd, overrideRel);

    let result = deepMergePlain({}, defaultConfig || {});

    if (fs.existsSync(overrideAbs)) {
        const raw = fs.readFileSync(overrideAbs, 'utf8');
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw new TypeError(`[${resourceName}] Override de config deve ser um objeto JSON: ${overrideAbs}`);
        }
        result = deepMergePlain(result, parsed);
    }

    if (typeof options.validate === 'function') {
        const verdict = options.validate(result);
        if (verdict === false) {
            throw new TypeError(`[${resourceName}] Falha na validação da configuração`);
        }
    }

    return result;
}

/**
 * Resolve uma dependência opcional com degradação graciosa.
 * @param {(name: string) => unknown} importer
 * @param {string} resourceName
 * @returns {unknown|null}
 */
function safeImportWith(importer, resourceName) {
    if (typeof importer !== 'function' || !resourceName) return null;
    try {
        const mod = importer(String(resourceName));
        return mod || null;
    } catch (_) {
        return null;
    }
}

/**
 * Cria o controlador de Era canônica (`EraGate`) parametrizado por config.
 * @param {object} initialEra
 * @param {boolean} [enforce=true]
 */
function createEraGate(initialEra = {}, enforce = true) {
    let state = {
        eraId: String(initialEra.eraId || 'post-war-2000s'),
        academicYear: Number(initialEra.academicYear) || 2000,
        headmaster: String(initialEra.headmaster || 'Aurelian Vale Diggory'),
        term: String(initialEra.term || 'autumn'),
        enforce: enforce !== false,
    };

    function getState() {
        return { ...state };
    }

    function setEra(patch = {}) {
        if (patch.eraId !== undefined) state.eraId = String(patch.eraId);
        if (patch.academicYear !== undefined) {
            const yr = Number(patch.academicYear);
            if (!Number.isSafeInteger(yr) || yr < 1800 || yr > 3000) {
                throw new RangeError('academicYear deve ser um ano inteiro válido (1800-3000)');
            }
            state.academicYear = yr;
        }
        if (patch.headmaster !== undefined) state.headmaster = String(patch.headmaster);
        if (patch.term !== undefined) state.term = String(patch.term);
        if (patch.enforce !== undefined) state.enforce = Boolean(patch.enforce);
        return getState();
    }

    /**
     * Verifica se um registro canônico ou evento está disponível na era ativa.
     * @param {{ availableFrom?: number, availableUntil?: number, eraIds?: string[], needsReview?: boolean }} entry
     * @returns {boolean}
     */
    function isAvailable(entry) {
        if (!entry || typeof entry !== 'object') return true;
        if (entry.needsReview === true) return false;
        if (!state.enforce) return true;

        if (Array.isArray(entry.eraIds) && entry.eraIds.length > 0) {
            if (!entry.eraIds.includes(state.eraId)) return false;
        }

        if (entry.availableFrom !== undefined && state.academicYear < Number(entry.availableFrom)) {
            return false;
        }

        if (entry.availableUntil !== undefined && state.academicYear > Number(entry.availableUntil)) {
            return false;
        }

        return true;
    }

    return {
        getState,
        setEra,
        isAvailable,
    };
}

/**
 * Cria o registro universal de saúde e metadados dos resources VICCS.
 */
function createRegistry() {
    const entries = new Map();

    function register(name, meta = {}) {
        const key = String(name || '').trim();
        if (!key) throw new TypeError('Nome do resource no registry não pode ser vazio');

        const record = {
            name: key,
            version: String(meta.version || '1.0.0'),
            priority: Number.isFinite(Number(meta.priority)) ? Number(meta.priority) : 50,
            enabled: meta.enabled !== false,
            ready: Boolean(meta.ready),
            statusProvider: typeof meta.statusProvider === 'function' ? meta.statusProvider : null,
            registeredAt: new Date().toISOString(),
        };

        entries.set(key, record);
        return {
            name: record.name,
            version: record.version,
            priority: record.priority,
            enabled: record.enabled,
            ready: record.ready,
            registeredAt: record.registeredAt,
        };
    }

    function unregister(name) {
        return entries.delete(String(name || '').trim());
    }

    function setReady(name, ready = true) {
        const record = entries.get(String(name || '').trim());
        if (!record) return false;
        record.ready = Boolean(ready);
        return true;
    }

    function snapshot() {
        const list = [];
        for (const record of entries.values()) {
            let liveStatus = null;
            if (record.statusProvider) {
                try {
                    liveStatus = record.statusProvider();
                } catch (err) {
                    liveStatus = { error: err instanceof Error ? err.message : String(err) };
                }
            }
            list.push({
                name: record.name,
                version: record.version,
                priority: record.priority,
                enabled: record.enabled,
                ready: liveStatus?.ready !== undefined ? Boolean(liveStatus.ready) : record.ready,
                details: liveStatus,
                registeredAt: record.registeredAt,
            });
        }
        return list.sort((a, b) => a.priority - b.priority);
    }

    function count() {
        return entries.size;
    }

    return {
        register,
        unregister,
        setReady,
        count,
        snapshot,
    };
}

/**
 * Normaliza e sanitiza uma entrada de auditoria antes da persistência.
 * @param {object} input
 * @param {number} [maxReasonLength=240]
 */
function sanitizeAuditEntry(input = {}, maxReasonLength = 240) {
    const resource = String(input.resource || 'viccs-core').trim().slice(0, 64);
    const action = String(input.action || '').trim().slice(0, 80);
    if (!action) {
        throw new TypeError('Campo action é obrigatório para auditoria');
    }

    const actorCharacterId =
        Number.isSafeInteger(Number(input.actorCharacterId)) && Number(input.actorCharacterId) > 0
            ? Number(input.actorCharacterId)
            : null;
    const targetCharacterId =
        Number.isSafeInteger(Number(input.targetCharacterId)) && Number(input.targetCharacterId) > 0
            ? Number(input.targetCharacterId)
            : null;

    const actorName = String(input.actorName || 'Sistema').trim().slice(0, 80);
    const reason = String(input.reason || '').trim().slice(0, maxReasonLength);

    const beforeJson = input.before !== undefined ? JSON.stringify(input.before) : null;
    const afterJson = input.after !== undefined ? JSON.stringify(input.after) : null;

    return {
        resource,
        action,
        actorCharacterId,
        actorName,
        targetCharacterId,
        reason,
        beforeJson,
        afterJson,
    };
}

const HOUSE_LABELS_PT = Object.freeze({
    gryffindor: 'Grifinória',
    slytherin: 'Sonserina',
    ravenclaw: 'Corvinal',
    hufflepuff: 'Lufa-Lufa',
});

const HOUSE_MOTTOS_PT = Object.freeze({
    gryffindor: 'Onde habitam os corajosos de coração',
    slytherin: 'Astúcia e ambição forjam grandes destinos',
    ravenclaw: 'O espírito sem limites é o maior tesouro',
    hufflepuff: 'Leais, justos e incansáveis na jornada',
});

const BLOOD_STATUS_LABELS_PT = Object.freeze({
    'pure-blood': 'Puro-Sangue',
    'half-blood': 'Mestiço',
    'muggle-born': 'Nascido Trouxa',
    squib: 'Aborto',
    unknown: 'Não declarado',
});

function normalizeCanonicalHouse(raw) {
    const key = String(raw || '').trim().toLowerCase();
    return Object.prototype.hasOwnProperty.call(HOUSE_LABELS_PT, key) ? key : null;
}

/**
 * Resume o estado das vestes escolares / uniforme da Casa no inventário nativo sem assumir sobrescrita.
 * @param {object} [params]
 */
function summarizeRobesInventory({
    nativeRows = [],
    house = null,
    profile = null,
    expectedItems = ['Outfit_001_Basic', 'Back_001_Basic'],
} = {}) {
    const normalizedHouse = normalizeCanonicalHouse(house);
    const expectedList = Array.isArray(expectedItems) && expectedItems.length
        ? expectedItems.map((item) => String(item).trim()).filter(Boolean)
        : ['Outfit_001_Basic', 'Back_001_Basic'];
    const expectedSet = new Set(expectedList);
    const rows = Array.isArray(nativeRows) ? nativeRows : [];

    const ownedItems = [];
    const equippedExpected = [];
    let equippedOutfit = null;
    let equippedBack = null;

    for (const row of rows) {
        if (!row || typeof row !== 'object') continue;
        const itemId = String(row.itemId || '').trim();
        const holder = String(row.holder || '').trim();
        if (!itemId) continue;

        if (expectedSet.has(itemId) && !ownedItems.includes(itemId)) {
            ownedItems.push(itemId);
        }

        if (row.equipped === true) {
            if (expectedSet.has(itemId) && !equippedExpected.includes(itemId)) {
                equippedExpected.push(itemId);
            }
            if (!equippedOutfit && (/outfit/i.test(holder) || /^Outfit_/i.test(itemId))) {
                equippedOutfit = itemId;
            }
            if (!equippedBack && (/back|robe|cloak/i.test(holder) || /^Back_/i.test(itemId))) {
                equippedBack = itemId;
            }
        }
    }

    const hasCustomGearEquipped = Boolean(
        (equippedOutfit && !expectedSet.has(equippedOutfit))
        || (equippedBack && !expectedSet.has(equippedBack)),
    );
    const hasAnySchoolRobe = ownedItems.length > 0;
    const hasCompleteUniformEquipped = expectedList.every((id) => equippedExpected.includes(id));
    const recordedHouse = normalizeCanonicalHouse(profile?.robes_house);
    const robesApplied = Boolean(profile?.robes_applied);
    const houseMatches = Boolean(normalizedHouse && recordedHouse === normalizedHouse);
    const needsReapply = Boolean(
        normalizedHouse && (!robesApplied || !houseMatches || !hasAnySchoolRobe),
    );

    let statusText = hasCompleteUniformEquipped
        ? 'Uniforme escolar neutro equipado (aguardando seleção de Casa)'
        : (hasAnySchoolRobe ? 'Uniforme escolar no inventário (aguardando seleção de Casa)' : 'Aguardando seleção de Casa');
    if (normalizedHouse) {
        if (hasCompleteUniformEquipped && robesApplied && houseMatches) {
            statusText = `Vestes de ${HOUSE_LABELS_PT[normalizedHouse]} equipadas`;
        } else if (hasCustomGearEquipped && hasAnySchoolRobe && houseMatches) {
            statusText = 'Traje personalizado equipado (vestes no inventário)';
        } else if (hasAnySchoolRobe && robesApplied && houseMatches) {
            statusText = `Uniforme de ${HOUSE_LABELS_PT[normalizedHouse]} disponível no inventário`;
        } else {
            statusText = 'Uniforme pendente de aplicação ou sincronização';
        }
    }

    return {
        house: normalizedHouse,
        houseLabel: normalizedHouse ? HOUSE_LABELS_PT[normalizedHouse] : 'Sem Casa',
        expectedItems: expectedList,
        ownedItems,
        equippedExpected,
        equippedSlots: {
            outfit: equippedOutfit,
            back: equippedBack,
        },
        hasCustomGearEquipped,
        hasAnySchoolRobe,
        hasCompleteUniformEquipped,
        recordedHouse,
        robesApplied,
        needsReapply,
        canReapply: Boolean(normalizedHouse),
        statusText,
    };
}

/**
 * Monta o view-model consolidado do Livro do Jogador (`Esc`).
 * @param {object} [raw]
 */
function buildPlayerBookSnapshot(raw = {}) {
    const house = normalizeCanonicalHouse(raw.house);
    const profile = raw.profile && typeof raw.profile === 'object' ? raw.profile : null;
    const character = raw.character && typeof raw.character === 'object' ? raw.character : null;
    const sorting = raw.sorting && typeof raw.sorting === 'object' ? raw.sorting : null;
    const progression = raw.progression && typeof raw.progression === 'object' ? raw.progression : null;
    const talents = Array.isArray(raw.talents) ? raw.talents : [];
    const flooFlames = Array.isArray(raw.flooFlames) ? raw.flooFlames : [];
    const spellsResolved = raw.spellsResolved && typeof raw.spellsResolved === 'object' ? raw.spellsResolved : null;
    const inventoryView = raw.inventoryView && typeof raw.inventoryView === 'object' ? raw.inventoryView : null;
    const capabilities = raw.capabilities && typeof raw.capabilities === 'object' ? raw.capabilities : {};

    const robes = summarizeRobesInventory({
        nativeRows: raw.nativeRows,
        house,
        profile,
        expectedItems: raw.expectedRobeItems,
    });

    const isTicketBridgeConfigured = Boolean(raw.isTicketBridgeConfigured);
    const verifiedDiscordId = raw.verifiedDiscordId ? String(raw.verifiedDiscordId) : null;
    const needsLink = Boolean(isTicketBridgeConfigured && !verifiedDiscordId);

    const sortingStatus = sorting?.status
        ? String(sorting.status).toUpperCase()
        : (house ? 'COMPLETED' : 'NOT_STARTED');
    const sortingTotalQuestions = Number(sorting?.totalQuestions) || 8;
    const sortingAnsweredCount = Number(sorting?.answeredCount) || 0;
    const hasCompletedSorting = sortingStatus === 'COMPLETED' || Boolean(house);
    const hasResumeSorting = !hasCompletedSorting && (sortingStatus === 'IN_PROGRESS' || sortingStatus === 'HATSTALL' || sortingStatus === 'DELIBERATING');
    const introCompleted = Boolean(profile?.intro_completed);
    const hasCharacter = Boolean(character?.id);
    const hasWand = Boolean(raw.wand && (raw.wand.wood || raw.wand.core));

    let nextStep = 'Explore Hogwarts com liberdade: use [Alt] para observar alvos do mundo e [Esc] para consultar este Livro.';
    if (needsLink) {
        nextStep = 'Vincule sua conta aprovada usando o código de integração para sincronizar seu histórico.';
    } else if (!hasCharacter) {
        nextStep = 'Crie ou selecione seu personagem para iniciar sua jornada em Hogwarts.';
    } else if (!hasCompletedSorting) {
        nextStep = hasResumeSorting
            ? `Retome a Cerimônia do Chapéu Seletor (${sortingAnsweredCount}/${sortingTotalQuestions} respostas preservadas).`
            : 'Participe da Cerimônia do Chapéu Seletor para receber sua Casa e vestes escolares.';
    } else if (robes.needsReapply) {
        nextStep = 'Aplique ou reaplique suas Vestes da Casa com segurança na página Personagem & Casa.';
    } else if (!introCompleted && hasWand) {
        nextStep = 'Inspecione sua varinha na página Varinha para concluir seu registro inicial.';
    }

    const houseStandings = Array.isArray(raw.houseStandings)
        ? raw.houseStandings.map((entry) => ({
            house: normalizeCanonicalHouse(entry?.house) || String(entry?.house || '').toLowerCase(),
            label: HOUSE_LABELS_PT[normalizeCanonicalHouse(entry?.house)] || String(entry?.label || entry?.house || ''),
            points: Number(entry?.points) || 0,
        }))
        : [];
    const ownStanding = house ? houseStandings.find((entry) => entry.house === house) : null;

    const unlockedSpells = Array.isArray(spellsResolved?.entitlements?.spells)
        ? spellsResolved.entitlements.spells
        : (Array.isArray(raw.grantedSpells) ? raw.grantedSpells : []);

    const bloodKey = String(profile?.blood_status || 'unknown').trim().toLowerCase();
    const yearNum = Math.max(1, Math.min(7, Number(profile?.academic_year) || 1));

    const recommendations = [];
    if (needsLink) {
        recommendations.push({
            id: 'link-account',
            title: 'Vincular Conta RP',
            detail: 'Insira o código de aprovação para importar ficha e varinha.',
            actionLabel: 'Inserir Código',
            serviceTarget: 'link',
        });
    }
    if (hasCharacter && !hasCompletedSorting) {
        recommendations.push({
            id: hasResumeSorting ? 'resume-sorting' : 'start-sorting',
            title: hasResumeSorting ? 'Retomar Chapéu Seletor' : 'Cerimônia do Chapéu Seletor',
            detail: hasResumeSorting
                ? `Seu progresso (${sortingAnsweredCount}/${sortingTotalQuestions}) está salvo.`
                : 'Descubra sua Casa oficial em Hogwarts.',
            actionLabel: hasResumeSorting ? 'Retomar Cerimônia' : 'Iniciar Cerimônia',
            serviceTarget: 'sorting',
        });
    }
    if (robes.canReapply && robes.needsReapply) {
        recommendations.push({
            id: 'reapply-robes',
            title: 'Sincronizar Vestes da Casa',
            detail: robes.statusText,
            actionLabel: 'Reaplicar Vestes',
            serviceTarget: 'reapply-robes',
        });
    }
    if (raw.pendingDuel) {
        recommendations.push({
            id: 'accept-duel',
            title: 'Desafio de Duelo Pendente',
            detail: 'Você recebeu um convite formal de duelo.',
            actionLabel: 'Aceitar Duelo',
            serviceTarget: 'duel-accept',
        });
    }

    return {
        playerId: Number(raw.playerId) || null,
        nickname: String(raw.nickname || ''),
        generatedAt: new Date().toISOString(),
        onboarding: {
            hasAccount: Boolean(raw.accountId),
            verifiedDiscordId,
            isTicketBridgeConfigured,
            needsLink,
            hasCharacter,
            hasHouse: Boolean(house),
            hasWand,
            hasCompletedSorting,
            sortingStatus,
            sortingAnsweredCount,
            sortingTotalQuestions,
            hasResumeSorting,
            introCompleted,
            nextStep,
        },
        character: {
            id: character?.id ?? null,
            name: character?.name || raw.nickname || 'Bruxo sem registro',
            academicYear: yearNum,
            academicYearLabel: `${yearNum}º Ano`,
            bloodStatus: bloodKey,
            bloodStatusLabel: BLOOD_STATUS_LABELS_PT[bloodKey] || BLOOD_STATUS_LABELS_PT.unknown,
            birthPlace: profile?.birth_place || 'Grã-Bretanha',
            patronus: profile?.patronus || 'Não manifestado',
            house,
            houseLabel: house ? HOUSE_LABELS_PT[house] : 'Sem Casa',
            houseMotto: house ? HOUSE_MOTTOS_PT[house] : 'Aguardando seleção do Chapéu',
            housePoints: ownStanding ? ownStanding.points : null,
            houseStandings,
        },
        robes,
        wand: raw.wand
            ? {
                wood: raw.wand.wood || null,
                core: raw.wand.core || null,
                length: raw.wand.length || null,
                flexibility: raw.wand.flexibility || null,
                handleId: raw.wand.handle_id || raw.wand.handleId || null,
            }
            : null,
        progression: {
            available: Boolean(progression),
            level: progression ? Number(progression.level) || 1 : 1,
            experiencePoints: progression ? Number(progression.experiencePoints) || 0 : 0,
            talentPoints: progression ? Number(progression.talentPoints) || 0 : 0,
            ownedTalentsCount: talents.filter((t) => t?.status !== 'revoked').length,
            flooFlamesCount: flooFlames.length,
        },
        spells: {
            available: Boolean(capabilities['hmp-spells'] || spellsResolved || raw.grantedSpells),
            unlockedCount: unlockedSpells.length,
            unlocked: unlockedSpells.slice(0, 24),
            lessonsCount: Number(raw.lessonsCount) || 0,
            bonusLoadouts: spellsResolved?.policy?.bonusLoadouts ?? 0,
            managedSpells: Boolean(spellsResolved?.policy),
        },
        resources: {
            galleons: raw.bankingGalleons !== undefined && raw.bankingGalleons !== null ? Number(raw.bankingGalleons) : null,
            bankingAvailable: Boolean(capabilities['hmp-banking']),
            inventoryAvailable: Boolean(capabilities['hmp-inventory']),
            inventoryUsedSlots: Number(inventoryView?.usedSlots) || 0,
            inventoryTotalSlots: Number(inventoryView?.container?.slots) || 0,
            inventoryNativeCount: Array.isArray(raw.nativeRows) ? raw.nativeRows.length : 0,
            jobsAvailable: Boolean(capabilities['hmp-jobs']),
            jobCount: Array.isArray(raw.jobs) ? raw.jobs.length : 0,
            onDuty: Boolean(raw.duty?.onDuty || raw.duty?.active),
            businessAvailable: Boolean(capabilities['hmp-business']),
            managedBusinessCount: Array.isArray(raw.businesses) ? raw.businesses.length : 0,
            beastsAvailable: Boolean(capabilities['hmp-beasts']),
            beastCount: Number(raw.beastsCount) || 0,
            emotesAvailable: Boolean(capabilities['hmp-emotes']),
            charactersAvailable: Boolean(capabilities['hmp-characters']),
            pendingDuel: Boolean(raw.pendingDuel),
        },
        capabilities,
        recommendations,
    };
}

module.exports = {
    deepMergePlain,
    loadLayeredConfig,
    safeImportWith,
    createEraGate,
    createRegistry,
    sanitizeAuditEntry,
    normalizeCanonicalHouse,
    summarizeRobesInventory,
    buildPlayerBookSnapshot,
};

