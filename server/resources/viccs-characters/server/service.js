// ═══════════════════════════════════════════════════════════════
// VICCS Accio — Character Profiles & Wands (Pure Logic)
// Arquivo: server/service.js
// ═══════════════════════════════════════════════════════════════

'use strict';

const BLOOD_LABELS = Object.freeze({
    'pure-blood': 'Sangue Puro',
    'half-blood': 'Mestiço',
    'muggle-born': 'Nascido Trouxa',
});

const HOUSE_LABELS = Object.freeze({
    gryffindor: 'Grifinória',
    slytherin: 'Sonserina',
    ravenclaw: 'Corvinal',
    hufflepuff: 'Lufa-Lufa',
});

const DORMITORY_LABELS = Object.freeze({
    wizard: 'Bruxo (Ala Masculina)',
    witch: 'Bruxa (Ala Feminina)',
});

/**
 * Resolve uma opção de cabo de varinha pelo ID, com fallback para o catálogo.
 * @param {string} handleId
 * @param {Array<object>} handles
 */
function resolveWandHandle(handleId, handles = []) {
    const cleanId = String(handleId || '').trim().toLowerCase();
    const found = handles.find((h) => String(h.id || '').toLowerCase() === cleanId);
    return found || handles[0] || {
        id: 'imperial-brown-gold',
        name: 'Imperial — Brown & Gold',
        family: 'Imperial',
        colorName: 'Mogno Real & Ouro 24k',
        cutoutUrl: 'fw://resources/viccs-ui/ui/assets/wands/cutouts/imperial-brown-gold.png',
        sketchUrl: 'fw://resources/viccs-ui/ui/assets/wands/sketches/Imperial_-_Brown_and_Gold_Field_Guide_sketch.webp',
    };
}

/**
 * Converte uma candidatura aprovada do Supabase (`character_applications`) para perfil VICCS.
 * @param {object} app
 * @param {object} configDefaults
 * @param {Array<object>} handles
 */
function normalizeApplicationToProfile(app, configDefaults = {}, handles = []) {
    if (!app || typeof app !== 'object') return null;

    const blood = BLOOD_LABELS[app.blood_status] ? app.blood_status : (configDefaults.defaultBloodStatus || 'half-blood');
    const dormitory = app.dormitory === 'witch' ? 'witch' : 'wizard';
    const handle = resolveWandHandle(app.wand_handle || configDefaults.defaultWand?.handleId, handles);
    const fullName = [app.first_name, app.last_name].filter(Boolean).join(' ').trim();
    const backstory = app.character_backstory ? String(app.character_backstory).slice(0, 100000) : '';
    const computedWords = backstory ? backstory.trim().split(/\s+/).filter(Boolean).length : 0;
    const wordCount = Math.max(0, Math.trunc(Number(app.word_count)) || computedWords);

    return {
        supabaseApplicationId: app.id ? String(app.id) : null,
        discordId: app.discord_id ? String(app.discord_id) : null,
        fullName: fullName || null,
        birthDate: app.birth_date ? String(app.birth_date).slice(0, 32) : '',
        birthPlace: app.birth_place ? String(app.birth_place).slice(0, 80) : (configDefaults.defaultBirthPlace || ''),
        bloodStatus: blood,
        dormitory,
        preferredHouse: HOUSE_LABELS[app.preferred_house] ? app.preferred_house : null,
        patronus: app.patronus ? String(app.patronus).slice(0, 80) : '',
        characterBackstory: backstory,
        wordCount,
        wand: {
            wood: String(app.wand_wood || configDefaults.defaultWand?.wood || 'Carvalho Inglês').slice(0, 64),
            core: String(app.wand_core || configDefaults.defaultWand?.core || 'Pena de Fênix').slice(0, 80),
            length: String(app.wand_length || configDefaults.defaultWand?.length || '11 polegadas').slice(0, 32),
            flexibility: String(app.wand_flexibility || configDefaults.defaultWand?.flexibility || 'Firme').slice(0, 48),
            handleId: handle.id,
        },
    };
}

/**
 * Monta view-model seguro para o painel CEF `/ficha` e `/varinha`.
 */
function buildCharacterSheetViewModel({ character, profile, wand, house, handles = [], initialTab = 'sheet' }) {
    const activeHouse = HOUSE_LABELS[house] ? house : (profile?.house || null);
    const handle = resolveWandHandle(wand?.handleId || wand?.handle_id, handles);
    const rawStory = String(profile?.characterBackstory || profile?.character_backstory || '').trim();
    const backstoryExcerpt = rawStory
        ? (rawStory.length > 650 ? `${rawStory.slice(0, 650).trim()}...` : rawStory)
        : 'Crônica registrada aguardando sincronização ministerial.';
    const dormitory = profile?.dormitory === 'witch' ? 'witch' : 'wizard';

    return {
        initialTab: initialTab === 'wand' ? 'wand' : 'sheet',
        characterId: character?.id || profile?.characterId || 0,
        characterName: profile?.fullName || profile?.full_name || character?.name || 'Bruxo Sem Nome',
        house: activeHouse,
        houseLabel: activeHouse ? HOUSE_LABELS[activeHouse] : 'Ainda Não Selecionado',
        academicYear: Number(profile?.academicYear || profile?.academic_year || 1),
        bloodStatus: profile?.bloodStatus || profile?.blood_status || 'half-blood',
        bloodStatusLabel: BLOOD_LABELS[profile?.bloodStatus || profile?.blood_status] || 'Mestiço',
        dormitory,
        dormitoryLabel: DORMITORY_LABELS[dormitory] || 'Bruxo (Ala Masculina)',
        birthDate: profile?.birthDate || profile?.birth_date || 'Não informado',
        birthPlace: profile?.birthPlace || profile?.birth_place || 'Grã-Bretanha',
        patronus: profile?.patronus || 'Não manifestado',
        hatstall: Boolean(profile?.hatstall),
        wordCount: Number(profile?.wordCount || profile?.word_count || 0),
        fullBackstory: rawStory || 'Crônica registrada aguardando sincronização ministerial.',
        backstoryExcerpt,
        wand: {
            wood: wand?.wood || 'Carvalho Inglês',
            core: wand?.core || 'Pena de Fênix',
            length: wand?.length || '11 polegadas',
            flexibility: wand?.flexibility || 'Firme',
            handleId: handle.id,
            handleName: handle.name,
            handleFamily: handle.family,
            colorName: handle.colorName,
            cutoutUrl: handle.cutoutUrl,
            sketchUrl: handle.sketchUrl,
        },
    };
}

/**
 * Extrai nome/sobrenome/dormitório e resumo completo da ficha aprovada no Supabase para o criador 3D.
 */
function buildCreatorPrefillFromApplication(approved, handles = []) {
    if (!approved || typeof approved !== 'object') return null;

    let first = String(approved.first_name || '').trim();
    let last = String(approved.last_name || '').trim();

    if (!first && approved.character_name) {
        const parts = String(approved.character_name).trim().split(/\s+/).filter(Boolean);
        first = parts[0] || '';
        last = parts.slice(1).join(' ');
    }

    first = first.slice(0, 32);
    last = last.slice(0, 32);
    if (!first && !last) return null;

    const dormitory = approved.dormitory === 'witch' ? 'witch' : 'wizard';
    const handle = resolveWandHandle(approved.wand_handle, handles);
    const blood = BLOOD_LABELS[approved.blood_status] || 'Mestiço';
    const preferredHouseLabel = HOUSE_LABELS[approved.preferred_house] || null;
    const rawStory = String(approved.character_backstory || '').trim();
    const wordCount = Math.max(0, Math.trunc(Number(approved.word_count)) || (rawStory ? rawStory.split(/\s+/).filter(Boolean).length : 0));

    return {
        applicationId: approved.id ? String(approved.id) : null,
        first,
        last,
        dormitory,
        preferredHouse: approved.preferred_house || null,
        preferredHouseLabel,
        bloodStatus: approved.blood_status || 'half-blood',
        bloodStatusLabel: blood,
        birthDate: approved.birth_date || '',
        birthPlace: approved.birth_place || 'Grã-Bretanha',
        patronus: approved.patronus || 'Em despertar interior',
        wordCount,
        wand: {
            wood: approved.wand_wood || 'Carvalho Inglês',
            core: approved.wand_core || 'Pena de Fênix',
            length: approved.wand_length || '11 polegadas',
            flexibility: approved.wand_flexibility || 'Firme',
            handleName: handle.name,
            handleFamily: handle.family,
        },
    };
}

/**
 * Planeja patches nao-destrutivos para uniforme escolar / vestes da Casa sem duplicar ou apagar trajes equipados.
 */
function planHouseRobePatch({
    nativeRows = [],
    house = null,
    outfitItemId = 'Outfit_001_Basic',
    backItemId = 'Back_001_Basic',
    force = false,
    allowUnaffiliated = false,
} = {}) {
    const rawNormalized = String(house || '').trim().toLowerCase();
    const sortedHouses = ['gryffindor', 'slytherin', 'ravenclaw', 'hufflepuff'];
    let normalizedHouse = null;
    if (sortedHouses.includes(rawNormalized)) {
        normalizedHouse = rawNormalized;
    } else if (rawNormalized === 'unaffiliated' || (allowUnaffiliated && !rawNormalized)) {
        normalizedHouse = 'unaffiliated';
    }

    if (!normalizedHouse) {
        return {
            ok: false,
            house: null,
            operations: [],
            items: [outfitItemId, backItemId],
            preservedCustomGear: false,
            alreadySynced: false,
            reason: 'Casa ainda não definida.',
        };
    }

    const rows = Array.isArray(nativeRows) ? nativeRows : [];
    const outfitId = String(outfitItemId || 'Outfit_001_Basic').trim();
    const backId = String(backItemId || 'Back_001_Basic').trim();

    let hasOutfitOwned = false;
    let hasBackOwned = false;
    let equippedOutfit = null;
    let equippedBack = null;

    for (const row of rows) {
        if (!row || typeof row !== 'object') continue;
        const id = String(row.itemId || '').trim();
        const holder = String(row.holder || '').trim();
        if (!id) continue;

        if (id === outfitId) hasOutfitOwned = true;
        if (id === backId) hasBackOwned = true;

        if (row.equipped === true) {
            if (!equippedOutfit && (/outfit/i.test(holder) || /^Outfit_/i.test(id))) {
                equippedOutfit = id;
            }
            if (!equippedBack && (/back|robe|cloak/i.test(holder) || /^Back_/i.test(id))) {
                equippedBack = id;
            }
        }
    }

    const operations = [];
    const slotPairs = [
        { itemId: outfitId, owned: hasOutfitOwned, equippedInSlot: equippedOutfit },
        { itemId: backId, owned: hasBackOwned, equippedInSlot: equippedBack },
    ];

    for (const slot of slotPairs) {
        const otherGearEquipped = Boolean(slot.equippedInSlot && slot.equippedInSlot !== slot.itemId);
        const alreadyEquipped = slot.equippedInSlot === slot.itemId;
        const shouldEquip = Boolean(force || !slot.equippedInSlot);

        if (!slot.owned) {
            operations.push({
                op: 'give',
                itemId: slot.itemId,
                identified: true,
                equipped: shouldEquip,
            });
        } else if (!alreadyEquipped && (force || !otherGearEquipped)) {
            operations.push({
                op: 'equip',
                itemId: slot.itemId,
            });
        }
    }

    const preservedCustomGear = Boolean(
        !force && ((equippedOutfit && equippedOutfit !== outfitId) || (equippedBack && equippedBack !== backId)),
    );

    return {
        ok: true,
        house: normalizedHouse,
        operations,
        items: [outfitId, backId],
        preservedCustomGear,
        alreadySynced: operations.length === 0,
    };
}

module.exports = {
    BLOOD_LABELS,
    HOUSE_LABELS,
    DORMITORY_LABELS,
    resolveWandHandle,
    normalizeApplicationToProfile,
    buildCharacterSheetViewModel,
    buildCreatorPrefillFromApplication,
    planHouseRobePatch,
};

