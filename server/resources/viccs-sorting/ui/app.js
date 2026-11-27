// ═══════════════════════════════════════════════════════════════
// VICCS Accio — Sorting Hat CEF App
// Arquivo: ui/app.js
// ═══════════════════════════════════════════════════════════════

'use strict';

const overlay = document.getElementById('overlay');
const panel = document.getElementById('sorting-panel');
const dividerSlot = document.getElementById('divider-slot');
const whisperEl = document.getElementById('hat-whisper');
const stepEl = document.getElementById('step-indicator');
const pauseBtn = document.getElementById('btn-pause');
const quizStage = document.getElementById('quiz-stage');
const delibStage = document.getElementById('deliberation-stage');
const errorStage = document.getElementById('error-stage');
const resultStage = document.getElementById('result-stage');
const optionsList = document.getElementById('options-list');
const errorTextEl = document.getElementById('error-text');
const robesNoteEl = document.getElementById('result-robes-note');

let isOpen = false;
let currentOptions = [];
let locked = false;
let currentStatus = null;

window.ViccsOrnaments.injectFrameCorners(panel);
dividerSlot.appendChild(window.ViccsOrnaments.createDivider('sorting-divider'));

function send(eventName, payload = {}) {
    try {
        if (typeof callEvent === 'function') callEvent(eventName, JSON.stringify(payload));
    } catch (_) {}
}

function submitToken(token) {
    if (locked || !token) return;
    locked = true;
    send('answer', { token });
}

function pauseCeremony() {
    if (!isOpen || currentStatus === 'COMPLETED') return;
    closeModal();
    send('pause');
}

function renderState(state = {}) {
    isOpen = true;
    locked = false;
    currentStatus = state.status || 'IN_PROGRESS';
    overlay.classList.remove('hidden');
    errorStage.classList.add('hidden');

    if (currentStatus === 'DELIBERATING') {
        pauseBtn.classList.remove('hidden');
        quizStage.classList.add('hidden');
        resultStage.classList.add('hidden');
        delibStage.classList.remove('hidden');
        stepEl.textContent = 'Deliberando...';
        whisperEl.textContent = 'Difícil... muito difícil...';
        document.getElementById('deliberation-text').textContent = state.secondaryHouseName
            ? `Vejo grande afinidade com ${state.secondaryHouseName}... mas há algo mais profundo...`
            : 'Consultando cada recanto da sua mente...';
        return;
    }

    if (currentStatus === 'COMPLETED' && state.result) {
        pauseBtn.classList.add('hidden');
        window.ViccsOrnaments.applyHouseTheme(state.result.house);
        quizStage.classList.add('hidden');
        delibStage.classList.add('hidden');
        resultStage.classList.remove('hidden');
        stepEl.textContent = state.isHatstall ? 'Hatstall Histórico' : 'Seleção Concluída';
        whisperEl.textContent = state.result.welcomeTitle || '';

        const emblem = document.getElementById('result-emblem');
        emblem.src = window.ViccsOrnaments.houseEmblemUrl(state.result.house);
        emblem.alt = state.result.houseName;

        document.getElementById('result-house').textContent = state.result.houseName;
        document.getElementById('result-motto').textContent = `"${state.result.motto}"`;

        const lettersEl = document.getElementById('result-letters');
        lettersEl.replaceChildren();
        for (const pText of state.result.letterParagraphs || []) {
            const p = document.createElement('p');
            p.textContent = pText;
            lettersEl.appendChild(p);
        }

        if (state.robesNotice) {
            robesNoteEl.textContent = state.robesNotice;
            robesNoteEl.classList.remove('hidden');
        } else {
            robesNoteEl.textContent = '';
            robesNoteEl.classList.add('hidden');
        }
        return;
    }

    pauseBtn.classList.remove('hidden');
    delibStage.classList.add('hidden');
    resultStage.classList.add('hidden');
    quizStage.classList.remove('hidden');

    whisperEl.textContent = state.isHatstall
        ? 'Empate raro... preciso de uma última decisão!'
        : (state.whisper || 'Hmm... interessante...');
    stepEl.textContent = `Dilema ${state.step || 1} de ${state.totalSteps || 8}`;
    document.getElementById('question-category').textContent = state.question?.category || '';
    document.getElementById('question-text').textContent = state.question?.text || '';

    optionsList.replaceChildren();
    currentOptions = state.question?.options || [];

    currentOptions.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'option-btn';

        const keyBadge = document.createElement('span');
        keyBadge.className = 'option-key';
        keyBadge.textContent = String(idx + 1);

        const label = document.createElement('span');
        label.textContent = opt.text;

        btn.append(keyBadge, label);
        btn.addEventListener('click', () => submitToken(opt.token));
        optionsList.appendChild(btn);
    });
}

function renderError(data = {}) {
    isOpen = true;
    locked = false;
    currentStatus = 'ERROR';
    overlay.classList.remove('hidden');
    quizStage.classList.add('hidden');
    delibStage.classList.add('hidden');
    resultStage.classList.add('hidden');
    errorStage.classList.remove('hidden');
    pauseBtn.classList.remove('hidden');
    stepEl.textContent = 'Atenção na Seleção';
    errorTextEl.textContent = data.message || 'Falha momentânea ao registrar sua Casa. Tente confirmar novamente ou pause com segurança.';
    document.getElementById('btn-error-retry').classList.toggle('hidden', data.canRetry === false);
}

function closeModal() {
    isOpen = false;
    locked = false;
    overlay.classList.add('hidden');
}

pauseBtn.addEventListener('click', pauseCeremony);
document.getElementById('btn-error-pause').addEventListener('click', pauseCeremony);
document.getElementById('btn-error-retry').addEventListener('click', () => {
    if (locked) return;
    locked = true;
    send('retryConfirm');
});

document.getElementById('btn-finish').addEventListener('click', () => {
    closeModal();
    send('close');
});

window.addEventListener('viccs:sorting:state', (event) => renderState(event.detail));
window.addEventListener('viccs:sorting:error', (event) => renderError(event.detail));
window.addEventListener('viccs:sorting:close', () => closeModal());

window.addEventListener('keydown', (event) => {
    if (!isOpen) return;
    const num = Number(event.key);
    if (num >= 1 && num <= currentOptions.length && !quizStage.classList.contains('hidden')) {
        event.preventDefault();
        submitToken(currentOptions[num - 1].token);
    } else if (event.key === 'Escape') {
        event.preventDefault();
        if (currentStatus === 'COMPLETED') {
            closeModal();
            send('close');
        } else {
            pauseCeremony();
        }
    }
});

send('ready');
