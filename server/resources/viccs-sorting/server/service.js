// ═══════════════════════════════════════════════════════════════
// VICCS Accio — Sorting Hat Fail-Proof Engine (Pure Logic)
// Arquivo: server/service.js
// ═══════════════════════════════════════════════════════════════

'use strict';

const crypto = require('crypto');

const HOUSE_KEYS = ['G', 'R', 'H', 'S'];

/**
 * Embaralhamento Fisher-Yates sem viés estatístico.
 * @template T
 * @param {T[]} items
 * @param {() => number} [rng=Math.random]
 * @returns {T[]}
 */
function shuffleArray(items, rng = Math.random) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

function defaultTokenGenerator() {
    return crypto.randomBytes(10).toString('hex');
}

function emptyScores() {
    return { G: 0, R: 0, H: 0, S: 0 };
}

/**
 * Gera tokens opacos embaralhados para as alternativas de uma pergunta.
 */
function buildQuestionTokens(question, rng = Math.random, tokenGen = defaultTokenGenerator) {
    const indexed = question.options.map((opt, idx) => ({
        idx,
        text: opt.text,
    }));
    const shuffled = shuffleArray(indexed, rng);
    return shuffled.map((entry) => ({
        token: tokenGen(),
        optionIndex: entry.idx,
        text: entry.text,
    }));
}

/**
 * Cria uma nova sessão persistível do Chapéu Seletor.
 */
function startCeremonySession({
    characterId,
    questionBank,
    questionsPerSession = 8,
    rng = Math.random,
    tokenGen = defaultTokenGenerator,
}) {
    if (!Array.isArray(questionBank) || questionBank.length < questionsPerSession) {
        throw new RangeError(`questionBank deve ter ao menos ${questionsPerSession} perguntas`);
    }

    const picked = shuffleArray(questionBank, rng).slice(0, questionsPerSession);
    const questionIds = picked.map((q) => q.id);
    const firstTokens = buildQuestionTokens(picked[0], rng, tokenGen);

    return {
        characterId: Number(characterId),
        status: 'IN_PROGRESS',
        questionIds,
        currentIndex: 0,
        currentOptions: firstTokens,
        scores: emptyScores(),
        isHatstallTriggered: false,
        primaryHouse: null,
        secondaryHouse: null,
        scoreDiff: null,
    };
}

/**
 * Ordena pontuação decrescente e calcula diferença entre 1ª e 2ª casa.
 */
function rankScores(scores) {
    const ranked = HOUSE_KEYS
        .map((key) => ({ key, score: Number(scores?.[key]) || 0 }))
        .sort((a, b) => b.score - a.score);

    const first = ranked[0];
    const second = ranked[1];
    const diff = Number((first.score - second.score).toFixed(4));

    return { ranked, first, second, diff };
}

/**
 * Processa a resposta de um token opaco, atualiza pesos no servidor e decide próximo estado.
 */
function submitAnswer({
    session,
    token,
    questionBank,
    hatstallQuestion,
    hatstallThreshold = 1.6,
    rng = Math.random,
    tokenGen = defaultTokenGenerator,
}) {
    if (!session || (session.status !== 'IN_PROGRESS' && session.status !== 'HATSTALL')) {
        throw new Error('Sessão do Chapéu Seletor não está aceitando respostas');
    }

    const matchedOption = (session.currentOptions || []).find((opt) => opt.token === token);
    if (!matchedOption) {
        throw new TypeError('Token de alternativa inválido ou expirado');
    }

    const currentQuestionId = session.questionIds[session.currentIndex];
    const questionObj =
        currentQuestionId === hatstallQuestion.id
            ? hatstallQuestion
            : questionBank.find((q) => q.id === currentQuestionId);

    if (!questionObj) {
        throw new Error(`Pergunta não encontrada no catálogo: ${currentQuestionId}`);
    }

    const chosenOption = questionObj.options[matchedOption.optionIndex];
    if (!chosenOption) {
        throw new Error('Índice de opção fora dos limites');
    }

    const nextScores = { ...session.scores };
    for (const key of HOUSE_KEYS) {
        nextScores[key] = Number(((Number(nextScores[key]) || 0) + (Number(chosenOption.weights?.[key]) || 0)).toFixed(4));
    }

    const nextIndex = session.currentIndex + 1;

    if (nextIndex < session.questionIds.length) {
        const nextQuestionId = session.questionIds[nextIndex];
        const nextQuestion = questionBank.find((q) => q.id === nextQuestionId);
        return {
            ...session,
            scores: nextScores,
            currentIndex: nextIndex,
            currentOptions: buildQuestionTokens(nextQuestion, rng, tokenGen),
        };
    }

    const { first, second, diff } = rankScores(nextScores);

    if (!session.isHatstallTriggered && diff < Number(hatstallThreshold)) {
        const extendedIds = [...session.questionIds, hatstallQuestion.id];
        return {
            ...session,
            status: 'HATSTALL',
            questionIds: extendedIds,
            currentIndex: nextIndex,
            currentOptions: buildQuestionTokens(hatstallQuestion, rng, tokenGen),
            scores: nextScores,
            isHatstallTriggered: true,
        };
    }

    return {
        ...session,
        status: 'DELIBERATING',
        currentIndex: nextIndex,
        currentOptions: [],
        scores: nextScores,
        primaryHouse: first.key,
        secondaryHouse: second.key,
        scoreDiff: diff,
    };
}

/**
 * Monta payload seguro para o cliente CEF — NUNCA inclui pesos, scores ou IDs de casa durante o quiz.
 */
function buildClientPrompt({ session, questionBank, hatstallQuestion, housesMeta, whispers = [] }) {
    if (!session) return null;

    if (session.status === 'COMPLETED' || session.status === 'DELIBERATING') {
        const primaryMeta = housesMeta?.[session.primaryHouse] || null;
        const secondaryMeta = housesMeta?.[session.secondaryHouse] || null;
        return {
            status: session.status,
            isHatstall: Boolean(session.isHatstallTriggered),
            secondaryHouseName: secondaryMeta?.name || null,
            result: session.status === 'COMPLETED' && primaryMeta
                ? {
                    house: primaryMeta.slug,
                    houseName: primaryMeta.name,
                    motto: primaryMeta.motto,
                    welcomeTitle: primaryMeta.welcomeTitle,
                    letterParagraphs: primaryMeta.letterParagraphs,
                }
                : null,
        };
    }

    const qId = session.questionIds[session.currentIndex];
    const q = qId === hatstallQuestion.id ? hatstallQuestion : questionBank.find((item) => item.id === qId);

    return {
        status: session.status,
        step: session.currentIndex + 1,
        totalSteps: session.questionIds.length,
        isHatstall: Boolean(session.isHatstallTriggered),
        whisper: whispers.length ? whispers[session.currentIndex % whispers.length] : 'Hmm... interessante...',
        question: {
            category: q?.category || '',
            text: q?.text || '',
            options: (session.currentOptions || []).map((opt) => ({
                token: opt.token,
                text: opt.text,
            })),
        },
    };
}

module.exports = {
    HOUSE_KEYS,
    shuffleArray,
    startCeremonySession,
    rankScores,
    submitAnswer,
    buildClientPrompt,
};

