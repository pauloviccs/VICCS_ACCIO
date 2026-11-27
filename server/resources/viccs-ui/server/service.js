// ═══════════════════════════════════════════════════════════════
// VICCS Accio — Shared UI Service (Pure Logic)
// Arquivo: server/service.js
// ═══════════════════════════════════════════════════════════════

'use strict';

const VALID_HOUSES = new Set(['gryffindor', 'slytherin', 'ravenclaw', 'hufflepuff']);
const SUSTAIN_LOOP_BLACKLIST = new Set(['accio', 'accio_cast']);

function resolveHouseTheme(house, fallback = 'gryffindor') {
    const normalized = String(house || '').trim().toLowerCase();
    if (VALID_HOUSES.has(normalized)) return normalized;
    const fb = String(fallback || 'gryffindor').trim().toLowerCase();
    return VALID_HOUSES.has(fb) ? fb : 'gryffindor';
}

function normalizeParchmentPayload(raw = {}, defaults = {}) {
    const title = String(raw.title || 'Pergaminho Oficial').trim().slice(0, 96);
    const eyebrow = String(raw.eyebrow || 'Correspondência Oficial de Hogwarts').trim().slice(0, 80);
    const signature = String(raw.signature || defaults.defaultSignature || 'Diretoria de Hogwarts').trim().slice(0, 120);
    const closeLabel = String(raw.closeLabel || 'Guardar Pergaminho').trim().slice(0, 48);

    const paragraphs = Array.isArray(raw.paragraphs)
        ? raw.paragraphs.map((p) => String(p || '').trim()).filter(Boolean).slice(0, 20)
        : String(raw.body || '')
            .split(/\r?\n/)
            .map((p) => p.trim())
            .filter(Boolean)
            .slice(0, 20);

    const house = raw.house ? resolveHouseTheme(raw.house, defaults.defaultHouse) : null;

    return {
        eyebrow,
        title,
        paragraphs,
        signature,
        closeLabel,
        house,
    };
}

/**
 * Resolve alias Wwise evitando eventos contínuos sem terminador em cues curtos de UI.
 */
function resolveAudioCue(cueOrEvent, cueMap = {}) {
    const key = String(cueOrEvent || '').trim();
    if (!key) return null;
    const resolved = Object.prototype.hasOwnProperty.call(cueMap, key)
        ? String(cueMap[key] || '').trim()
        : key;

    if (!resolved) return null;
    if (SUSTAIN_LOOP_BLACKLIST.has(resolved.toLowerCase())) {
        return 'stinger';
    }
    return resolved;
}

/**
 * Calcula distância 3D euclidiana em centímetros entre duas coordenadas.
 */
function distanceCm(a, b) {
    if (!a || !b) return Infinity;
    const dx = Number(a.x || 0) - Number(b.x || 0);
    const dy = Number(a.y || 0) - Number(b.y || 0);
    const dz = Number(a.z || 0) - Number(b.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Filtra interações de mundo próximas ao jogador para exibição no Olho Mágico (Alt).
 */
function collectNearbyInteractions({ interactions = [], playerPos, playerAreaId, radiusCm = 1800, limit = 6 }) {
    if (!playerPos || !Array.isArray(interactions)) return [];
    const areaLower = playerAreaId ? String(playerAreaId).toLowerCase() : null;
    const found = [];

    for (const def of interactions) {
        if (!def || !def.position) continue;
        if (def.areaId && areaLower && String(def.areaId).toLowerCase() !== areaLower) continue;

        const dist = distanceCm(playerPos, def.position);
        const maxDist = Math.max(Number(radiusCm) || 1800, Number(def.radius) || 250);
        if (dist <= maxDist) {
            const meters = Math.max(1, Math.round(dist / 100));
            found.push({
                id: String(def.id),
                label: String(def.label || def.id),
                description: def.description ? String(def.description) : 'Pressionar para interagir',
                distanceCm: Math.round(dist),
                distanceLabel: `${meters} m`,
            });
        }
    }

    found.sort((a, b) => a.distanceCm - b.distanceCm);
    return found.slice(0, limit);
}

/**
 * Monta as ações contextuais sem comando exibidas no Olho Mágico (Alt).
 */
function buildWizardEyeActions({
    hasHouse,
    hasInventory,
    hasEmotes,
    hasCharacters,
    hasSorting,
    hasBanking = false,
    hasJobs = false,
    hasBusiness = false,
    hasBeasts = false,
    needsLink = false,
    pendingDuel = false,
}) {
    const actions = [];

    if (pendingDuel) {
        actions.push({
            id: 'duel-accept',
            label: 'Aceitar Duelo Pendente',
            description: 'Responder ao desafio mágico aberto agora',
            badge: 'Duelo',
        });
    }

    if (needsLink) {
        actions.push({
            id: 'link',
            label: 'Vincular Ficha do Site',
            description: 'Inserir Código de Embarque oficial ACCIO',
            badge: 'Site',
        });
    }

    actions.push(
        { id: 'sheet', label: 'Ficha Ministerial', description: 'Identidade, casa e história do bruxo', badge: 'Perfil' },
        { id: 'wand', label: 'Oficina Ollivanders', description: 'Inspecionar madeira, núcleo e cabo da varinha', badge: 'Varinha' },
    );

    if (hasInventory) {
        actions.push({ id: 'inventory', label: 'Baú & Inventário', description: 'Itens, poções e equipamentos', badge: 'Baú' });
    }
    if (hasBanking) {
        actions.push({ id: 'banking', label: 'Cofre de Gringotes', description: 'Saldo bancário, depósitos e transferências', badge: 'Banco' });
    }
    if (hasJobs) {
        actions.push({ id: 'jobs', label: 'Carreira & Serviço', description: 'Entrar em serviço, cargo e escala', badge: 'Ofício' });
    }
    if (hasBusiness) {
        actions.push({ id: 'business', label: 'Livro de Negócios', description: 'Gerenciar balcões, preços e estoque', badge: 'Loja' });
    }
    if (hasBeasts) {
        actions.push({ id: 'beasts', label: 'Mala de Criaturas', description: 'Gerenciar ou libertar animais fantásticos', badge: 'Mala' });
    }
    if (hasEmotes) {
        actions.push({ id: 'emotes', label: 'Expressões & Emotes', description: 'Posturas e gestos de roleplay', badge: 'Social' });
    }
    if (hasCharacters) {
        actions.push({ id: 'characters', label: 'Seletor de Bruxos', description: 'Alternar personagem ou editar visual', badge: 'Conta' });
    }
    if (!hasHouse && hasSorting) {
        actions.push({ id: 'sorting', label: 'Chapéu Seletor', description: 'Iniciar ou retomar sua seleção de Casa', badge: 'Cerimônia' });
    }

    return actions;
}

const EYE_TARGET_STATES = Object.freeze({
    AVAILABLE: 'available',
    UNAVAILABLE: 'unavailable',
    BLOCKED: 'blocked',
});

const EYE_STATE_LABELS = Object.freeze({
    available: 'Disponível',
    unavailable: 'Indisponível',
    blocked: 'Bloqueado',
});

const PERSONAL_SERVICE_TARGETS = new Set([
    'book',
    'reapply-robes',
    'sheet',
    'wand',
    'link',
    'inventory',
    'emotes',
    'characters',
    'sorting',
    'banking',
    'jobs',
    'business',
    'beasts',
    'duel-accept',
]);

function toRadians(deg) {
    return (Number(deg) || 0) * (Math.PI / 180);
}

/**
 * Calcula vetor diretor e ponto final de visada a partir da câmera (Unreal degrees).
 */
function computeWorldAim({ cameraPos, cameraRot, rangeCm = 1800 } = {}) {
    if (!cameraPos || typeof cameraPos !== 'object' || !cameraRot || typeof cameraRot !== 'object') {
        return null;
    }
    const pitch = toRadians(cameraRot.pitch);
    const yaw = toRadians(cameraRot.yaw);
    const cosPitch = Math.cos(pitch);
    const forward = {
        x: cosPitch * Math.cos(yaw),
        y: cosPitch * Math.sin(yaw),
        z: Math.sin(pitch),
    };
    const range = Math.max(100, Number(rangeCm) || 1800);
    const start = {
        x: Number(cameraPos.x) || 0,
        y: Number(cameraPos.y) || 0,
        z: Number(cameraPos.z) || 0,
    };
    return {
        start,
        forward,
        end: {
            x: start.x + (forward.x * range),
            y: start.y + (forward.y * range),
            z: start.z + (forward.z * range),
        },
    };
}

/**
 * Avalia um candidato do Olho Mágico classificando estritamente em available/unavailable/blocked.
 */
function evaluateEyeTarget(candidate, context = {}) {
    if (!candidate || typeof candidate !== 'object') return null;

    const maxRadiusCm = Math.max(150, Number(context.maxRadiusCm) || 1800);
    const originPos = context.playerPos || context.camera?.position || null;
    const rawDist = candidate.position && originPos
        ? distanceCm(originPos, candidate.position)
        : (Number.isFinite(Number(candidate.distanceCm)) ? Number(candidate.distanceCm) : null);
    const dist = rawDist !== null && Number.isFinite(rawDist) ? Math.round(rawDist) : null;
    const promptDistance = Math.max(120, Number(candidate.promptDistance) || Number(candidate.radius) || maxRadiusCm);

    let state = EYE_TARGET_STATES.AVAILABLE;
    let reason = null;

    if (candidate.state === EYE_TARGET_STATES.BLOCKED || candidate.blocked === true) {
        state = EYE_TARGET_STATES.BLOCKED;
        reason = String(candidate.reason || 'Acesso bloqueado por requisito').slice(0, 140);
    } else if (candidate.requiresCharacter && !context.hasCharacter) {
        state = EYE_TARGET_STATES.BLOCKED;
        reason = 'Requer personagem ativo';
    } else if (candidate.state === EYE_TARGET_STATES.UNAVAILABLE || candidate.available === false) {
        state = EYE_TARGET_STATES.UNAVAILABLE;
        reason = String(candidate.reason || 'Indisponível no momento').slice(0, 140);
    } else if (dist !== null && dist > promptDistance) {
        state = EYE_TARGET_STATES.UNAVAILABLE;
        reason = 'Aproxime-se para interagir';
    }

    const controlHint = String(candidate.controlHint || 'F').trim().slice(0, 16) || 'F';
    const actionLabel = String(candidate.actionLabel || 'Interagir').trim().slice(0, 48) || 'Interagir';

    return {
        id: String(candidate.id || '').trim(),
        kind: String(candidate.kind || 'interact').trim(),
        providerId: candidate.providerId ? String(candidate.providerId) : null,
        label: String(candidate.label || 'Alvo Interativo').trim().slice(0, 80),
        actionLabel,
        controlHint,
        state,
        stateLabel: EYE_STATE_LABELS[state],
        reason,
        distanceCm: dist,
        distanceLabel: dist === null ? '' : (dist < 100 ? '< 1 m' : `${Math.round(dist / 100)} m`),
        position: candidate.position || null,
        priority: Number(candidate.priority) || 0,
        actorName: candidate.actorName || null,
        levelObjectKey: candidate.levelObjectKey || null,
    };
}

/**
 * Seleciona o alvo do mundo realmente sob a retícula central (sem menus pessoais).
 */
function selectMagicEyeTarget({
    candidates = [],
    camera = null,
    playerPos = null,
    traceHit = null,
    maxRadiusCm = 1800,
    minDot = 0.84,
    hasCharacter = true,
} = {}) {
    const aim = camera?.position && camera?.rotation
        ? computeWorldAim({ cameraPos: camera.position, cameraRot: camera.rotation, rangeCm: maxRadiusCm })
        : null;

    let best = null;
    let bestScore = -Infinity;
    let nearbyCount = 0;

    for (const rawCandidate of Array.isArray(candidates) ? candidates : []) {
        if (!rawCandidate || PERSONAL_SERVICE_TARGETS.has(rawCandidate.serviceTarget || rawCandidate.id)) {
            continue;
        }
        const evaluated = evaluateEyeTarget(rawCandidate, {
            playerPos,
            camera,
            traceHit,
            maxRadiusCm,
            hasCharacter,
        });
        if (!evaluated || !evaluated.id) continue;

        if (evaluated.distanceCm !== null && evaluated.distanceCm > maxRadiusCm) {
            continue;
        }
        nearbyCount += 1;

        let matchedByTrace = false;
        let score = 0;

        if (traceHit && typeof traceHit === 'object') {
            if (evaluated.levelObjectKey && traceHit.levelObjectKey && evaluated.levelObjectKey === traceHit.levelObjectKey) {
                matchedByTrace = true;
                score += 1200;
            }
            if (evaluated.actorName && traceHit.actor?.name && evaluated.actorName === traceHit.actor.name) {
                matchedByTrace = true;
                score += 1100;
            }
            if (evaluated.position && traceHit.position) {
                const hitDist = distanceCm(evaluated.position, traceHit.position);
                if (hitDist <= 220) {
                    matchedByTrace = true;
                    score += Math.max(0, 600 - hitDist);
                }
            }
        }

        if (aim && evaluated.position) {
            const dx = (Number(evaluated.position.x) || 0) - aim.start.x;
            const dy = (Number(evaluated.position.y) || 0) - aim.start.y;
            const dz = (Number(evaluated.position.z) || 0) - aim.start.z;
            const mag = Math.sqrt((dx * dx) + (dy * dy) + (dz * dz));
            const dot = mag > 1 ? ((dx * aim.forward.x) + (dy * aim.forward.y) + (dz * aim.forward.z)) / mag : 1;
            if (!matchedByTrace && dot < minDot) {
                continue;
            }
            score += dot * 500;
        } else if (!matchedByTrace) {
            if (evaluated.distanceCm === null || evaluated.distanceCm > 350) continue;
        }

        if (evaluated.state === EYE_TARGET_STATES.AVAILABLE) score += 80;
        score += Math.max(-50, Math.min(50, evaluated.priority));
        if (evaluated.distanceCm !== null) {
            score -= evaluated.distanceCm * 0.05;
        }

        if (score > bestScore) {
            bestScore = score;
            best = evaluated;
        }
    }

    return {
        target: best,
        nearbyCount,
    };
}

/**
 * Monta páginas disponíveis do Livro do Jogador (`Esc`) ocultando sistemas indisponíveis na fase atual.
 */
function buildPlayerBookPayload({
    snapshot = null,
    customPages = [],
    initialPage = null,
    bookConfig = {},
} = {}) {
    const safeSnap = snapshot && typeof snapshot === 'object' ? snapshot : {};
    const char = safeSnap.character || {};
    const onb = safeSnap.onboarding || {};
    const robes = safeSnap.robes || {};
    const wand = safeSnap.wand || null;
    const prog = safeSnap.progression || {};
    const spells = safeSnap.spells || {};
    const res = safeSnap.resources || {};
    const houseTheme = resolveHouseTheme(char.house, 'gryffindor');
    const pages = [];

    const charActions = [];
    if (robes.canReapply) {
        charActions.push({
            id: 'reapply-robes',
            label: 'Reaplicar Vestes da Casa',
            kind: robes.needsReapply ? 'primary' : 'secondary',
            serviceTarget: 'reapply-robes',
            hint: 'Equipa e sincroniza o uniforme escolar da sua Casa sem apagar outros itens.',
        });
    }
    if (onb.hasCharacter) {
        charActions.push({
            id: 'open-sheet',
            label: 'Abrir Ficha Completa',
            kind: 'secondary',
            serviceTarget: 'sheet',
        });
    }
    if (!onb.hasCompletedSorting && onb.hasCharacter) {
        charActions.push({
            id: 'open-sorting',
            label: onb.hasResumeSorting ? 'Retomar Chapéu Seletor' : 'Iniciar Chapéu Seletor',
            kind: 'primary',
            serviceTarget: 'sorting',
        });
    }
    if (res.charactersAvailable) {
        charActions.push({
            id: 'open-characters',
            label: 'Trocar Personagem',
            kind: 'secondary',
            serviceTarget: 'characters',
        });
    }

    pages.push({
        id: 'character',
        order: 10,
        title: bookConfig?.pages?.character || 'Personagem & Casa',
        eyebrow: 'Identidade & Pertencimento',
        badge: char.houseLabel || 'Sem Casa',
        statusText: onb.nextStep || '',
        missingRequirement: !onb.hasCompletedSorting && onb.hasCharacter
            ? 'Cerimônia do Chapéu Seletor ainda não concluída.'
            : null,
        stats: [
            { label: 'Nome', value: char.name || 'Sem personagem' },
            { label: 'Casa', value: char.houseLabel || 'Aguardando seleção' },
            { label: 'Ano Letivo', value: char.academicYearLabel || '1º Ano' },
            { label: 'Linhagem', value: char.bloodStatusLabel || 'Não declarada' },
            { label: 'Origem', value: char.birthPlace || 'Grã-Bretanha' },
            { label: 'Patrono', value: char.patronus || 'Não manifestado' },
            {
                label: 'Vestes Escolares',
                value: robes.statusText || 'Indisponível',
                highlight: robes.needsReapply ? 'warn' : 'ok',
            },
            ...(char.housePoints !== null && char.housePoints !== undefined
                ? [{ label: 'Pontos da Casa', value: String(char.housePoints) }]
                : []),
        ],
        standings: Array.isArray(char.houseStandings) ? char.houseStandings : [],
        actions: charActions,
    });

    if (wand || onb.hasCharacter) {
        const wandActions = [];
        if (onb.hasCharacter) {
            wandActions.push({
                id: 'open-wand',
                label: wand ? 'Inspecionar Varinha' : 'Registrar / Ver Varinha',
                kind: 'primary',
                serviceTarget: 'wand',
            });
        }
        pages.push({
            id: 'wand',
            order: 20,
            title: bookConfig?.pages?.wand || 'Varinha',
            eyebrow: 'Oficina Ollivanders',
            badge: wand?.wood ? `${wand.wood}` : 'Pendente',
            statusText: wand?.wood
                ? 'Vínculo registrado em Ollivanders.'
                : 'Nenhuma varinha registrada na ficha atual.',
            missingRequirement: wand?.wood ? null : 'Vincule sua ficha aprovada ou consulte Ollivanders.',
            stats: wand
                ? [
                    { label: 'Madeira', value: wand.wood || '-' },
                    { label: 'Núcleo', value: wand.core || '-' },
                    { label: 'Comprimento', value: wand.length || '-' },
                    { label: 'Flexibilidade', value: wand.flexibility || '-' },
                    { label: 'Empunhadura', value: wand.handleId || 'Clássica' },
                ]
                : [],
            actions: wandActions,
        });
    }

    if (prog.available || Number(spells.lessonsCount) > 0) {
        pages.push({
            id: 'classes',
            order: 30,
            title: bookConfig?.pages?.classes || 'Aulas & Evolução',
            eyebrow: 'Formação Acadêmica',
            badge: `Nível ${prog.level || 1}`,
            statusText: Number(spells.lessonsCount) > 0
                ? `${spells.lessonsCount} aula(s) registrada(s) no currículo.`
                : 'Acompanhamento de nível, talentos e chamas de Flu.',
            missingRequirement: Number(prog.talentPoints) > 0
                ? null
                : 'Conclua atividades e aulas para acumular novos pontos de talento.',
            stats: [
                { label: 'Nível Bruxo', value: String(prog.level || 1) },
                { label: 'Experiência', value: `${prog.experiencePoints || 0} XP` },
                { label: 'Pontos de Talento', value: String(prog.talentPoints || 0) },
                { label: 'Talentos Ativos', value: String(prog.ownedTalentsCount || 0) },
                { label: 'Chamas de Flu', value: String(prog.flooFlamesCount || 0) },
            ],
            actions: [],
        });
    }

    if (spells.available || Number(spells.unlockedCount) > 0) {
        const list = Array.isArray(spells.unlocked) ? spells.unlocked : [];
        pages.push({
            id: 'spells',
            order: 40,
            title: bookConfig?.pages?.spells || 'Magias',
            eyebrow: 'Repertório Arcano',
            badge: `${spells.unlockedCount || 0} feitiço(s)`,
            statusText: list.length
                ? 'Feitiços liberados para o seu personagem.'
                : 'Nenhum feitiço especial liberado além dos básicos.',
            missingRequirement: list.length ? null : 'Aprenda feitiços em aulas ou missões oficiais.',
            stats: [
                { label: 'Feitiços Conhecidos', value: String(spells.unlockedCount || 0) },
                { label: 'Conjuntos Bônus', value: String(spells.bonusLoadouts || 0) },
            ],
            tags: list,
            actions: [],
        });
    }

    const grimActions = [];
    const grimStats = [];
    if (res.inventoryAvailable) {
        grimStats.push({ label: 'Mochila (Slots)', value: `${res.inventoryUsedSlots || 0}/${res.inventoryTotalSlots || 0}` });
        grimStats.push({ label: 'Itens Nativos', value: String(res.inventoryNativeCount || 0) });
        grimActions.push({ id: 'inv', label: 'Abrir Mochila & Baú', kind: 'primary', serviceTarget: 'inventory' });
    }
    if (res.bankingAvailable) {
        grimStats.push({ label: 'Gringotes', value: res.galleons !== null && res.galleons !== undefined ? `${res.galleons} Galeões` : 'Ativo' });
        grimActions.push({ id: 'bank', label: 'Gringotes', kind: 'secondary', serviceTarget: 'banking' });
    }
    if (res.jobsAvailable) {
        grimStats.push({ label: 'Ofícios', value: res.onDuty ? 'Em Turno' : `${res.jobCount || 0} vínculo(s)` });
        grimActions.push({ id: 'jobs', label: 'Carreira', kind: 'secondary', serviceTarget: 'jobs' });
    }
    if (res.businessAvailable) {
        grimStats.push({ label: 'Negócios', value: `${res.managedBusinessCount || 0} sob gestão` });
        grimActions.push({ id: 'biz', label: 'Negócios', kind: 'secondary', serviceTarget: 'business' });
    }
    if (res.beastsAvailable) {
        grimStats.push({ label: 'Criaturas', value: String(res.beastCount || 0) });
        grimActions.push({ id: 'beasts', label: 'Maleta de Criaturas', kind: 'secondary', serviceTarget: 'beasts' });
    }
    if (res.emotesAvailable) {
        grimActions.push({ id: 'emotes', label: 'Expressões', kind: 'secondary', serviceTarget: 'emotes' });
    }
    if (res.pendingDuel) {
        grimActions.push({ id: 'duel', label: 'Aceitar Duelo Pendente', kind: 'primary', serviceTarget: 'duel-accept' });
    }

    if (grimStats.length > 0 || grimActions.length > 0) {
        pages.push({
            id: 'grimoire',
            order: 50,
            title: bookConfig?.pages?.grimoire || 'Grimório & Recursos',
            eyebrow: 'Bens & Ofícios',
            badge: `${grimStats.length} registro(s)`,
            statusText: 'Acesse sistemas pessoais disponíveis ao seu personagem.',
            stats: grimStats,
            actions: grimActions,
        });
    }

    for (const custom of Array.isArray(customPages) ? customPages : []) {
        if (!custom || custom.available === false || !custom.id) continue;
        pages.push({
            id: String(custom.id),
            order: Number.isFinite(Number(custom.order)) ? Number(custom.order) : 60,
            title: String(custom.title || custom.id),
            eyebrow: String(custom.eyebrow || 'Sistema de Hogwarts'),
            badge: custom.badge ? String(custom.badge) : '',
            statusText: String(custom.statusText || ''),
            missingRequirement: custom.missingRequirement || null,
            stats: Array.isArray(custom.stats) ? custom.stats : [],
            tags: Array.isArray(custom.tags) ? custom.tags : [],
            actions: Array.isArray(custom.actions) ? custom.actions : [],
        });
    }

    const sysActions = [];
    if (onb.needsLink) {
        sysActions.push({
            id: 'link-account',
            label: 'Vincular Conta RP',
            kind: 'primary',
            serviceTarget: 'link',
        });
    }
    sysActions.push({
        id: 'open-native-settings',
        label: 'Configurações do Jogo',
        kind: 'secondary',
        action: 'open-native-settings',
        hint: 'Abre temporariamente o menu nativo de áudio, vídeo e atalhos.',
    });

    pages.push({
        id: 'system',
        order: 90,
        title: bookConfig?.pages?.system || 'Sistema & Controles',
        eyebrow: 'Orientação & Ajustes',
        badge: onb.needsLink ? 'Vínculo Pendente' : 'Sincronizado',
        statusText: 'Use [ALT] apenas para mirar e interagir no mundo; [ESC] abre e fecha este Livro.',
        stats: [
            { label: 'Olho Mágico (Mundo)', value: '[ALT] Observar alvos sem travar a câmera' },
            { label: 'Confirmar Alvo', value: '[F] Executar alvo disponível na mira' },
            { label: 'Livro do Jogador', value: '[ESC] Abrir ou fechar este tomo pessoal' },
            { label: 'Configurações Nativas', value: '[F10] ou botão abaixo para ajustes do jogo' },
            {
                label: 'Vínculo Discord',
                value: onb.verifiedDiscordId
                    ? `Vinculado (${onb.verifiedDiscordId})`
                    : (onb.isTicketBridgeConfigured ? 'Aguardando código de vínculo' : 'Opcional / Local'),
            },
        ],
        actions: sysActions,
    });

    pages.sort((a, b) => a.order - b.order);

    const activePage = pages.some((p) => p.id === initialPage) ? initialPage : pages[0]?.id || 'character';

    return {
        house: houseTheme,
        character: {
            id: char.id || null,
            name: char.name || safeSnap.nickname || 'Bruxo',
            houseLabel: char.houseLabel || 'Sem Casa',
            houseMotto: char.houseMotto || '',
            academicYearLabel: char.academicYearLabel || '1º Ano',
        },
        onboarding: onb,
        robes,
        recommendations: Array.isArray(safeSnap.recommendations) ? safeSnap.recommendations : [],
        activePage,
        pages,
        generatedAt: safeSnap.generatedAt || new Date().toISOString(),
    };
}

module.exports = {
    VALID_HOUSES,
    resolveHouseTheme,
    normalizeParchmentPayload,
    resolveAudioCue,
    distanceCm,
    collectNearbyInteractions,
    buildWizardEyeActions,
    EYE_TARGET_STATES,
    EYE_STATE_LABELS,
    PERSONAL_SERVICE_TARGETS,
    computeWorldAim,
    evaluateEyeTarget,
    selectMagicEyeTarget,
    buildPlayerBookPayload,
};
