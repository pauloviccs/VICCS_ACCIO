// ═══════════════════════════════════════════════════════════════
// VICCS Accio — Parchment Diegetic Modal (CEF)
// Arquivo: ui/parchment/app.js
// ═══════════════════════════════════════════════════════════════

'use strict';

const overlay = document.getElementById('overlay');
const card = document.getElementById('parchment-card');
const emblem = document.getElementById('house-emblem');
const eyebrow = document.getElementById('parchment-eyebrow');
const titleEl = document.getElementById('parchment-title');
const bodyEl = document.getElementById('parchment-body');
const sigEl = document.getElementById('parchment-signature');
const dividerSlot = document.getElementById('divider-slot');
const btnClose = document.getElementById('btn-close');

let isOpen = false;

dividerSlot.appendChild(window.ViccsOrnaments.createDivider('parchment-divider'));

function send(eventName, payload = {}) {
    try {
        if (typeof callEvent === 'function') {
            callEvent(eventName, JSON.stringify(payload));
        }
    } catch (_) {}
}

function renderParchment(data = {}) {
    if (data.house) {
        window.ViccsOrnaments.applyHouseTheme(data.house);
        emblem.src = window.ViccsOrnaments.houseEmblemUrl(data.house);
        emblem.alt = `Brasão ${data.house}`;
        emblem.classList.remove('hidden');
    } else {
        emblem.classList.add('hidden');
    }

    eyebrow.textContent = data.eyebrow || 'Correspondência Oficial de Hogwarts';
    titleEl.textContent = data.title || 'Pergaminho Ministerial';
    sigEl.textContent = data.signature || 'Diretoria de Hogwarts — ACCIO Roleplay';
    btnClose.textContent = data.closeLabel || 'Guardar Pergaminho';

    bodyEl.replaceChildren();
    const paragraphs = Array.isArray(data.paragraphs)
        ? data.paragraphs
        : String(data.body || '').split('\n').filter(Boolean);

    for (const text of paragraphs) {
        const p = document.createElement('p');
        p.textContent = String(text);
        bodyEl.appendChild(p);
    }
}

function openParchment(data) {
    renderParchment(data || {});
    isOpen = true;
    card.style.animation = 'parchmentArrive 0.36s var(--ease-sheet) forwards';
    overlay.classList.remove('hidden');
    setTimeout(() => btnClose.focus(), 0);
}

function closeParchment(notifyClient = true) {
    if (!isOpen) return;
    isOpen = false;
    card.style.animation = 'parchmentLeave 0.2s var(--ease-arcane) forwards';
    setTimeout(() => {
        overlay.classList.add('hidden');
        card.style.animation = '';
        if (notifyClient) send('close');
    }, 200);
}

window.addEventListener('viccs:ui:parchment:open', (event) => openParchment(event.detail));
window.addEventListener('viccs:ui:parchment:close', () => closeParchment(false));

btnClose.addEventListener('click', () => closeParchment(true));
window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isOpen) {
        event.preventDefault();
        closeParchment(true);
    }
});

send('ready');

