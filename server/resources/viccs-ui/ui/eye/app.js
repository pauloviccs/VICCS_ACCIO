'use strict';

const hud = document.getElementById('eye-hud');
const reticle = document.getElementById('reticle');
const callout = document.getElementById('eye-callout');
const idleMsg = document.getElementById('callout-idle-msg');
const targetBox = document.getElementById('callout-target');
const targetName = document.getElementById('target-name');
const targetState = document.getElementById('target-state');
const targetKeycap = document.getElementById('target-keycap');
const targetAction = document.getElementById('target-action');
const targetDistance = document.getElementById('target-distance');
const targetReason = document.getElementById('target-reason');
const feedbackEl = document.getElementById('eye-feedback');

let feedbackTimer = null;

function notifyClient(name, payload = {}) {
    try {
        if (typeof callEvent === 'function') {
            callEvent(name, JSON.stringify(payload));
        }
    } catch (_) {}
}

function applyHouseTheme(house) {
    if (!house) return;
    document.documentElement.setAttribute('data-house-theme', String(house).toLowerCase());
}

function renderTarget(target) {
    reticle.classList.remove('is-idle', 'is-available', 'is-unavailable', 'is-blocked');
    callout.classList.remove('is-idle', 'is-available', 'is-unavailable', 'is-blocked');

    if (!target || typeof target !== 'object') {
        reticle.classList.add('is-idle');
        callout.classList.add('is-idle');
        idleMsg.classList.remove('hidden');
        targetBox.classList.add('hidden');
        return;
    }

    const state = ['available', 'unavailable', 'blocked'].includes(target.state)
        ? target.state
        : 'unavailable';

    reticle.classList.add(`is-${state}`);
    callout.classList.add(`is-${state}`);
    idleMsg.classList.add('hidden');
    targetBox.classList.remove('hidden');

    targetName.textContent = target.label || 'Alvo';
    targetState.textContent = target.stateLabel || (state === 'available' ? 'Disponível' : (state === 'blocked' ? 'Bloqueado' : 'Indisponível'));
    targetState.className = `state-pill ${state}`;

    targetKeycap.textContent = target.controlHint || 'F';
    targetKeycap.classList.toggle('is-disabled', state !== 'available');

    targetAction.textContent = target.actionLabel || 'Interagir';
    targetDistance.textContent = target.distanceLabel || '';

    if (target.reason && state !== 'available') {
        targetReason.textContent = target.reason;
        targetReason.classList.remove('hidden');
    } else {
        targetReason.textContent = '';
        targetReason.classList.add('hidden');
    }
}

function showFeedback(data = {}) {
    if (feedbackTimer) {
        clearTimeout(feedbackTimer);
        feedbackTimer = null;
    }
    if (!data?.reason && !data?.message) {
        feedbackEl.classList.add('hidden');
        return;
    }
    feedbackEl.textContent = data.reason || data.message;
    feedbackEl.classList.remove('hidden');
    feedbackTimer = setTimeout(() => {
        feedbackEl.classList.add('hidden');
    }, 2400);
}

function openHud(data = {}) {
    if (data?.house) applyHouseTheme(data.house);
    hud.classList.remove('hidden');
    renderTarget(data?.target || null);
}

function closeHud() {
    hud.classList.add('hidden');
    renderTarget(null);
    showFeedback({});
}

window.addEventListener('viccs:ui:eye:open', (ev) => openHud(ev.detail || {}));
window.addEventListener('viccs:ui:eye:update', (ev) => {
    const data = ev.detail || {};
    if (data.house) applyHouseTheme(data.house);
    renderTarget(data.target || null);
});
window.addEventListener('viccs:ui:eye:feedback', (ev) => showFeedback(ev.detail || {}));
window.addEventListener('viccs:ui:eye:close', () => closeHud());
window.addEventListener('viccs:ui:theme', (ev) => applyHouseTheme(ev.detail?.house));

notifyClient('ready');
