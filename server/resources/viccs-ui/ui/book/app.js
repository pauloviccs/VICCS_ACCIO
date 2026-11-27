'use strict';

const overlay = document.getElementById('book-overlay');
const panel = document.getElementById('book-panel');
const emblemEl = document.getElementById('book-emblem');
const titleEl = document.getElementById('book-title');
const subtitleEl = document.getElementById('book-subtitle');
const navEl = document.getElementById('book-nav');
const alertsEl = document.getElementById('book-alerts');
const pageEyebrow = document.getElementById('page-eyebrow');
const pageTitle = document.getElementById('page-title');
const pageBadge = document.getElementById('page-badge');
const pageStatus = document.getElementById('page-status');
const pageMissing = document.getElementById('page-missing');
const pageStats = document.getElementById('page-stats');
const pageStandings = document.getElementById('page-standings');
const pageTags = document.getElementById('page-tags');
const pageActions = document.getElementById('page-actions');
const feedbackEl = document.getElementById('book-feedback');

let isOpen = false;
let currentData = null;
let activePageId = null;
let feedbackTimer = null;

if (window.ViccsOrnaments) {
    window.ViccsOrnaments.injectFrameCorners(panel);
    document.getElementById('book-divider').appendChild(
        window.ViccsOrnaments.createDivider('book-divider'),
    );
}

function send(eventName, payload = {}) {
    try {
        if (typeof callEvent === 'function') {
            callEvent(eventName, JSON.stringify(payload));
        }
    } catch (_) {}
}

function applyHouseTheme(house) {
    if (!house) return;
    document.documentElement.setAttribute('data-house-theme', String(house).toLowerCase());
}

function setFeedback(text) {
    if (feedbackTimer) {
        clearTimeout(feedbackTimer);
        feedbackTimer = null;
    }
    if (!text) {
        feedbackEl.textContent = '';
        feedbackEl.classList.add('hidden');
        return;
    }
    feedbackEl.textContent = text;
    feedbackEl.classList.remove('hidden');
    feedbackTimer = setTimeout(() => {
        feedbackEl.classList.add('hidden');
    }, 3400);
}

function triggerBookAction(actionSpec) {
    if (!actionSpec) return;
    if (actionSpec.serviceTarget === 'reapply-robes') {
        setFeedback('Sincronizando vestes escolares com segurança...');
    }
    send('action', {
        id: actionSpec.id || null,
        action: actionSpec.action || 'open-service',
        serviceTarget: actionSpec.serviceTarget || null,
        providerId: actionSpec.providerId || null,
        payload: actionSpec.payload || {},
    });
}

function renderAlerts(recommendations = []) {
    alertsEl.replaceChildren();
    if (!Array.isArray(recommendations) || recommendations.length === 0) {
        alertsEl.classList.add('hidden');
        return;
    }
    alertsEl.classList.remove('hidden');

    for (const rec of recommendations) {
        const card = document.createElement('div');
        card.className = 'alert-card';

        const copy = document.createElement('div');
        copy.className = 'alert-copy';
        const strong = document.createElement('strong');
        strong.textContent = rec.title || '';
        const span = document.createElement('span');
        span.textContent = rec.detail || '';
        copy.append(strong, span);

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn-primary btn-action';
        btn.textContent = rec.actionLabel || 'Resolver';
        btn.addEventListener('click', () => triggerBookAction({
            id: rec.id,
            action: 'open-service',
            serviceTarget: rec.serviceTarget,
        }));

        card.append(copy, btn);
        alertsEl.appendChild(card);
    }
}

function renderActivePage() {
    const pages = Array.isArray(currentData?.pages) ? currentData.pages : [];
    const page = pages.find((p) => p.id === activePageId) || pages[0];
    if (!page) return;
    activePageId = page.id;

    for (const btn of navEl.querySelectorAll('.nav-tab')) {
        const selected = btn.dataset.pageId === page.id;
        btn.classList.toggle('active', selected);
        btn.setAttribute('aria-selected', selected ? 'true' : 'false');
    }

    pageEyebrow.textContent = page.eyebrow || '';
    pageTitle.textContent = page.title || '';
    if (page.badge) {
        pageBadge.textContent = page.badge;
        pageBadge.classList.remove('hidden');
    } else {
        pageBadge.classList.add('hidden');
    }

    pageStatus.textContent = page.statusText || '';
    if (page.missingRequirement) {
        pageMissing.textContent = page.missingRequirement;
        pageMissing.classList.remove('hidden');
    } else {
        pageMissing.textContent = '';
        pageMissing.classList.add('hidden');
    }

    pageStats.replaceChildren();
    for (const stat of Array.isArray(page.stats) ? page.stats : []) {
        const card = document.createElement('div');
        card.className = 'stat-card';
        if (stat.highlight === 'warn') card.classList.add('is-warn');
        if (stat.highlight === 'ok') card.classList.add('is-ok');

        const label = document.createElement('span');
        label.textContent = stat.label || '';
        const val = document.createElement('strong');
        val.textContent = stat.value ?? '-';
        card.append(label, val);
        pageStats.appendChild(card);
    }

    pageStandings.replaceChildren();
    if (Array.isArray(page.standings) && page.standings.length > 0) {
        pageStandings.classList.remove('hidden');
        const heading = document.createElement('p');
        heading.className = 'standings-title';
        heading.textContent = 'Taça das Casas';
        pageStandings.appendChild(heading);

        for (const item of page.standings) {
            const row = document.createElement('div');
            row.className = 'standings-row';
            const houseName = document.createElement('span');
            houseName.textContent = item.label || item.house || '';
            const pts = document.createElement('strong');
            pts.textContent = `${item.points || 0} pts`;
            row.append(houseName, pts);
            pageStandings.appendChild(row);
        }
    } else {
        pageStandings.classList.add('hidden');
    }

    pageTags.replaceChildren();
    if (Array.isArray(page.tags) && page.tags.length > 0) {
        pageTags.classList.remove('hidden');
        for (const tag of page.tags) {
            const pill = document.createElement('span');
            pill.className = 'spell-tag';
            pill.textContent = String(tag);
            pageTags.appendChild(pill);
        }
    } else {
        pageTags.classList.add('hidden');
    }

    pageActions.replaceChildren();
    for (const actionSpec of Array.isArray(page.actions) ? page.actions : []) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `${actionSpec.kind === 'primary' ? 'btn-primary' : 'btn-secondary'} btn-action`;
        btn.textContent = actionSpec.label || 'Abrir';
        if (actionSpec.hint) btn.title = actionSpec.hint;
        btn.addEventListener('click', () => triggerBookAction(actionSpec));
        pageActions.appendChild(btn);
    }
}

function renderBook(data, preservePage = false) {
    currentData = data || {};
    applyHouseTheme(currentData.house);

    const char = currentData.character || {};
    titleEl.textContent = char.name || 'Livro do Jogador';
    subtitleEl.textContent = `${char.houseLabel || 'Sem Casa'} · ${char.academicYearLabel || '1º Ano'}`;

    const houseKey = String(currentData.house || '').toLowerCase();
    if (['gryffindor', 'slytherin', 'ravenclaw', 'hufflepuff'].includes(houseKey) && char.houseLabel !== 'Sem Casa') {
        emblemEl.src = `fw://resources/viccs-ui/ui/assets/emblemas/${houseKey}.png`;
        emblemEl.classList.remove('hidden');
    } else {
        emblemEl.classList.add('hidden');
    }

    renderAlerts(currentData.recommendations || []);

    const pages = Array.isArray(currentData.pages) ? currentData.pages : [];
    if (!preservePage || !pages.some((p) => p.id === activePageId)) {
        activePageId = currentData.activePage || pages[0]?.id || 'character';
    }

    navEl.replaceChildren();
    for (const page of pages) {
        const tab = document.createElement('button');
        tab.type = 'button';
        tab.className = 'nav-tab';
        tab.role = 'tab';
        tab.dataset.pageId = page.id;

        const title = document.createElement('span');
        title.className = 'nav-tab-title';
        title.textContent = page.title || page.id;

        const meta = document.createElement('span');
        meta.className = 'nav-tab-meta';
        meta.textContent = page.badge || page.eyebrow || '';

        tab.append(title, meta);
        tab.addEventListener('click', () => {
            activePageId = page.id;
            renderActivePage();
        });
        navEl.appendChild(tab);
    }

    renderActivePage();
}

function openBook(data) {
    isOpen = true;
    setFeedback('');
    renderBook(data, false);
    overlay.classList.remove('hidden');
}

function closeBook(notifyClient = true) {
    if (!isOpen) return;
    isOpen = false;
    overlay.classList.add('hidden');
    if (notifyClient) send('close');
}

document.getElementById('btn-book-close').addEventListener('click', () => closeBook(true));

window.addEventListener('keydown', (event) => {
    if (!isOpen) return;
    if (event.key === 'Escape') {
        event.preventDefault();
        closeBook(true);
        return;
    }

    const pages = Array.isArray(currentData?.pages) ? currentData.pages : [];
    if (!pages.length) return;
    const idx = pages.findIndex((p) => p.id === activePageId);
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        if (document.activeElement?.closest('#book-nav')) {
            event.preventDefault();
            const delta = event.key === 'ArrowDown' ? 1 : -1;
            const next = pages[(idx + delta + pages.length) % pages.length];
            activePageId = next.id;
            renderActivePage();
            const nextBtn = navEl.querySelector(`[data-page-id="${next.id}"]`);
            nextBtn?.focus();
        }
    }
});

window.addEventListener('viccs:ui:book:open', (ev) => openBook(ev.detail || {}));
window.addEventListener('viccs:ui:book:update', (ev) => {
    if (!isOpen) return;
    renderBook(ev.detail || {}, true);
});
window.addEventListener('viccs:ui:book:feedback', (ev) => {
    if (ev.detail?.message) setFeedback(ev.detail.message);
});
window.addEventListener('viccs:ui:book:close', () => closeBook(false));
window.addEventListener('viccs:ui:theme', (ev) => applyHouseTheme(ev.detail?.house));

send('ready');

