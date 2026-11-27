// ═══════════════════════════════════════════════════════════════
// VICCS Accio — Character Sheet CEF App
// Arquivo: ui/app.js
// ═══════════════════════════════════════════════════════════════

'use strict';

const overlay = document.getElementById('overlay');
const panel = document.getElementById('sheet-panel');
const emblem = document.getElementById('house-emblem');
const dividerSlot = document.getElementById('divider-slot');
const tabButtons = document.querySelectorAll('.tab-btn');
const modeButtons = document.querySelectorAll('.mode-pill');
const wandVisual = document.getElementById('wand-visual');

let isOpen = false;
let currentVm = null;
let wandMode = 'macro';

window.ViccsOrnaments.injectFrameCorners(panel);
dividerSlot.appendChild(window.ViccsOrnaments.createDivider('sheet-divider'));

function send(eventName, payload = {}) {
    try {
        if (typeof callEvent === 'function') callEvent(eventName, JSON.stringify(payload));
    } catch (_) {}
}

function setActiveTab(tab) {
    const target = tab === 'wand' ? 'wand' : 'sheet';
    document.getElementById('tab-sheet').classList.toggle('hidden', target !== 'sheet');
    document.getElementById('tab-wand').classList.toggle('hidden', target !== 'wand');
    tabButtons.forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === target));
}

function updateWandImage() {
    if (!currentVm?.wand) return;
    wandVisual.src = wandMode === 'sketch' ? currentVm.wand.sketchUrl : currentVm.wand.cutoutUrl;
    modeButtons.forEach((btn) => btn.classList.toggle('active', btn.dataset.mode === wandMode));
}

function renderSheet(vm) {
    currentVm = vm || {};
    if (vm.house) {
        window.ViccsOrnaments.applyHouseTheme(vm.house);
        emblem.src = window.ViccsOrnaments.houseEmblemUrl(vm.house);
        emblem.classList.remove('hidden');
    } else {
        window.ViccsOrnaments.applyHouseTheme('gryffindor');
        emblem.classList.add('hidden');
    }

    document.getElementById('char-name').textContent = vm.characterName || 'Bruxo';
    document.getElementById('char-subtitle').textContent = `${vm.houseLabel || ''} · ${vm.academicYear || 1}º Ano`;
    document.getElementById('val-house').textContent = vm.houseLabel || '-';
    document.getElementById('val-year').textContent = `${vm.academicYear || 1}º Ano`;
    document.getElementById('val-blood').textContent = vm.bloodStatusLabel || '-';
    document.getElementById('val-birth').textContent = vm.birthPlace || '-';
    document.getElementById('val-patronus').textContent = vm.patronus || 'Não manifestado';
    document.getElementById('val-id').textContent = `#${String(vm.characterId || 0).padStart(4, '0')}`;
    document.getElementById('val-backstory').textContent = vm.backstoryExcerpt || '-';

    const wand = vm.wand || {};
    document.getElementById('wand-wood').textContent = wand.wood || '-';
    document.getElementById('wand-core').textContent = wand.core || '-';
    document.getElementById('wand-length').textContent = wand.length || '-';
    document.getElementById('wand-flex').textContent = wand.flexibility || '-';
    document.getElementById('wand-family').textContent = `${wand.handleFamily || ''} (${wand.colorName || ''})`;
    document.getElementById('wand-handle-title').textContent = wand.handleName || '';

    setActiveTab(vm.initialTab || 'sheet');
    updateWandImage();
}

function openSheet(vm) {
    renderSheet(vm || {});
    isOpen = true;
    panel.style.animation = 'magicPanelIn 0.32s var(--ease-sheet) forwards';
    overlay.classList.remove('hidden');
}

function closeSheet(notifyClient = true) {
    if (!isOpen) return;
    isOpen = false;
    panel.style.animation = 'magicPanelOut 0.2s var(--ease-arcane) forwards';
    setTimeout(() => {
        overlay.classList.add('hidden');
        panel.style.animation = '';
        if (notifyClient) send('close');
    }, 200);
}

tabButtons.forEach((btn) => btn.addEventListener('click', () => setActiveTab(btn.dataset.tab)));
modeButtons.forEach((btn) => btn.addEventListener('click', () => {
    wandMode = btn.dataset.mode === 'sketch' ? 'sketch' : 'macro';
    updateWandImage();
}));

document.getElementById('btn-x').addEventListener('click', () => closeSheet(true));
window.addEventListener('viccs:characters:sheet:open', (event) => openSheet(event.detail));
window.addEventListener('viccs:characters:sheet:close', () => closeSheet(false));
window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isOpen) {
        event.preventDefault();
        closeSheet(true);
    }
});

send('ready');

