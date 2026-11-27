# Skill: Criar UI Panel (CEF — ArcaneMP + Visual ACCIO)

## Quando Usar
Sempre que um resource precisar de uma interface visual renderizada sobre o jogo:
menus, inventários, grimórios, Chapéu Seletor, cartas, HUDs, formulários, Moments 2D, etc.

## Pré-Requisitos
1. Ler `.agent/guidelines/ui_ux.md` e `.agent/skills/visual-consistency-and-magic-motion.md` — **OBRIGATÓRIO**
2. O resource deve declarar `"files": ["client/main.js", "ui/**/*"]` no `package.json`
3. O resource deve depender de `hmp-lib` (para `input.controls` e foco seguro) e `viccs-ui` (tokens/fontes/ornamentos compartilhados)

## Arquitetura UI Real no ArcaneMP (`1.15.1`)

```text
┌──────────────────────────────────────────────────────────────────────┐
│                      Jogo (Hogwarts Legacy)                          │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  CEF Overlay (`fw://resources/viccs-{nome}/ui/index.html`)     │  │
│  │  • Recebe dados: `window.addEventListener(event, e => e.detail)`│  │
│  │  • Envia eventos: `callEvent(event, JSON.stringify(payload))`  │  │
│  └──────────────────────────▲─────────────────────────┬───────────┘  │
│                             │ Web.emit(view, ...)     │ Web.on(view) │
│  ┌──────────────────────────┴─────────────────────────▼───────────┐  │
│  │  Client Script (`client/main.js` no V8 Sandbox)                │  │
│  │  • `Web.createView` / `showView` / `focusView` / `hideView`    │  │
│  │  • `Hmp.input.controls.acquire({ resource, id })`              │  │
│  └──────────────────────────▲─────────────────────────┬───────────┘  │
│                             │ Events.on(...)          │ Events.emitServer(...)
│  ┌──────────────────────────┴─────────────────────────▼───────────┐  │
│  │  Server Script (`server/` em Node.js Autoritativo)             │  │
│  │  • `Hmp.rateLimit` + `Hmp.validation` + `hmp-audio` (Wwise)    │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

## Estrutura de Arquivos UI

```text
viccs-{nome}/
├── client/
│   └── main.js             # Gerencia Web.createView, Hmp.input.controls e ponte com server
└── ui/
    ├── index.html          # Estrutura HTML (tokens ArcaneMP + ACCIO + SVG corners)
    ├── styles.css          # Estilos (paleta #090e17, [data-house-theme], --bevel, animações)
    ├── app.js              # Lógica CEF (window.addEventListener + callEvent)
    └── assets/             # Fontes locais (ou via fw://resources/viccs-ui/ui/fonts/) e ícones
```

## Template Client Script (`client/main.js`)

```javascript
// ═══════════════════════════════════════════════════════════════
// VICCS Accio — {Nome do Resource} (Client UI Bridge)
// Arquivo: client/main.js
// ═══════════════════════════════════════════════════════════════

'use strict';

const Hmp = Imports.get('hmp-lib');
const VIEW_URL = 'fw://resources/viccs-{nome}/ui/index.html';
const LEASE_OWNER = { resource: 'viccs-{nome}', id: 'panel' };

let view = -1;
let ready = false;
let focused = false;
let controlLease = null;
let pendingOpen = null;

function ensureView() {
    if (view >= 0) return true;

    view = Web.createView(VIEW_URL, { visible: false, focus: false, zIndex: 210 });
    if (view < 0) return false;

    Web.on(view, 'ready', () => {
        ready = true;
        if (pendingOpen) {
            const data = pendingOpen;
            pendingOpen = null;
            openPanel(data);
        }
    });

    Web.on(view, 'close', () => closePanel());

    Web.on(view, 'action', (raw) => {
        try {
            const payload = typeof raw === 'string' ? JSON.parse(raw) : raw;
            Events.emitServer('viccs:{nome}:action', JSON.stringify(payload));
        } catch (_) {
            // Ignora payload malformado
        }
    });

    return true;
}

function openPanel(data) {
    if (!ensureView() || !ready) {
        pendingOpen = data;
        return;
    }

    if (!focused) {
        controlLease = Hmp.input.controls.acquire(LEASE_OWNER);
        Web.showView(view);
        Web.focusView(view);
        focused = true;
    }

    Web.emit(view, 'viccs:open', data || {});
}

function closePanel() {
    if (view >= 0) {
        Web.emit(view, 'viccs:close', {});
        Web.hideView(view);
    }
    if (focused) {
        focused = false;
        controlLease?.release();
        controlLease = null;
    }
}

Events.on('viccs:{nome}:open', (raw) => {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    openPanel(data);
});

Events.on('viccs:{nome}:close', () => closePanel());

Events.on('resourceStop', (name) => {
    if (!name || name === 'viccs-{nome}') {
        closePanel();
        if (view >= 0) Web.destroyView(view);
        view = -1;
        ready = false;
    }
});
```

## Template HTML Base (`ui/index.html`)

```html
<!doctype html>
<html lang="pt-BR" data-house-theme="gryffindor">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ACCIO — {Nome do Painel}</title>
    <link rel="stylesheet" href="styles.css" />
</head>
<body>
    <div id="overlay" class="overlay hidden" role="dialog" aria-modal="true">
        <section id="viccs-panel" class="frame panel">
            <!-- 4 Cantoneiras Filigrana ArcaneMP -->
            <svg class="frame-corner frame-corner-tl" viewBox="0 0 40 40" aria-hidden="true">
                <path d="M.75 40V.75H40" stroke-width="1.5" />
                <path d="M6 40V16Q6 6 16 6h24" opacity=".55" />
                <path d="M14 10l4 4-4 4-4-4z" fill="currentColor" stroke="none" />
            </svg>
            <svg class="frame-corner frame-corner-tr" viewBox="0 0 40 40" aria-hidden="true">
                <path d="M.75 40V.75H40" stroke-width="1.5" />
                <path d="M6 40V16Q6 6 16 6h24" opacity=".55" />
                <path d="M14 10l4 4-4 4-4-4z" fill="currentColor" stroke="none" />
            </svg>
            <svg class="frame-corner frame-corner-bl" viewBox="0 0 40 40" aria-hidden="true">
                <path d="M.75 40V.75H40" stroke-width="1.5" />
                <path d="M6 40V16Q6 6 16 6h24" opacity=".55" />
                <path d="M14 10l4 4-4 4-4-4z" fill="currentColor" stroke="none" />
            </svg>
            <svg class="frame-corner frame-corner-br" viewBox="0 0 40 40" aria-hidden="true">
                <path d="M.75 40V.75H40" stroke-width="1.5" />
                <path d="M6 40V16Q6 6 16 6h24" opacity=".55" />
                <path d="M14 10l4 4-4 4-4-4z" fill="currentColor" stroke="none" />
            </svg>

            <header class="panel-header">
                <div>
                    <p class="eyebrow">{Subtítulo Diegético}</p>
                    <h2 class="title panel-title">{Título}</h2>
                </div>
                <button type="button" class="btn-close" id="btn-close" aria-label="Fechar">✕</button>
            </header>

            <svg class="divider" viewBox="0 0 240 14" aria-hidden="true">
                <path d="M100 7H0M140 7h100" />
                <path fill="currentColor" d="M104 7l4-4 4 4-4 4zM128 7l4-4 4 4-4 4z" opacity=".6" />
                <path d="M120 1l6 6-6 6-6-6z" />
            </svg>

            <div id="panel-content" class="panel-content"></div>

            <footer class="panel-footer">
                <button type="button" class="btn-secondary btn-sm" id="btn-cancel">Fechar</button>
                <button type="button" class="btn-primary btn-sm" id="btn-confirm">Confirmar</button>
            </footer>
        </section>
    </div>
    <script src="app.js"></script>
</body>
</html>
```

## Template CSS Base (`ui/styles.css` — Espelho do `website/src/index.css`)

```css
@font-face {
    font-family: "Cinzel";
    src: url("fw://resources/viccs-ui/ui/fonts/Cinzel-Variable.ttf") format("truetype");
    font-display: swap;
}

:root {
    --font-display: "Marcellus", "Cinzel", Georgia, serif;
    --font-sans: "Source Sans 3", system-ui, sans-serif;
    --font-mono: "JetBrains Mono", monospace;
    --color-base: #090e17;
    --color-surface: #0a0f19;
    --color-ink: #ece7da;
    --color-muted: #b6bbc5;
    --hair: rgba(201, 176, 122, 0.32);
    --hair-soft: rgba(201, 176, 122, 0.14);
    --bevel: polygon(12px 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 12px 100%, 0 50%);
    --ease-arcane: cubic-bezier(0.22, 1, 0.36, 1);
    --ease-sheet: cubic-bezier(0.16, 1, 0.3, 1);
    --house-accent: #ead6a6;
    --house-accent-secondary: #ffc34f;
    --house-border: rgba(201, 176, 122, 0.34);
    --house-glow: rgba(201, 176, 122, 0.34);
    --house-grad-start: #f6ead0;
    --house-grad-mid: #dcc28d;
    --house-grad-end: #b39257;
    --house-btn-start: #efdcab;
    --house-btn-mid: #cdae6a;
    --house-btn-end: #a8874c;
    --house-btn-text: #17130b;
}

/* Copiar blocos [data-house-theme="gryffindor|slytherin|ravenclaw|hufflepuff"] de website/src/index.css */

* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: 100%; height: 100%; background: transparent; color: var(--color-ink); font-family: var(--font-sans); overflow: hidden; user-select: none; }

.overlay { position: fixed; inset: 0; display: grid; place-items: center; padding: 24px; background: radial-gradient(ellipse at 50% 25%, rgba(201, 176, 122, 0.08), transparent 60%), rgba(5, 8, 15, 0.72); }
.overlay.hidden { display: none; }

.frame { isolation: isolate; position: relative; border: 1px solid var(--house-border); background: rgba(10, 15, 25, 0.94); backdrop-filter: blur(22px); padding: 28px 32px; width: min(560px, 92vw); max-height: 78vh; display: flex; flex-direction: column; box-shadow: 0 28px 70px rgba(0, 0, 0, 0.65); animation: magicPanelIn 0.32s var(--ease-sheet) forwards; }
.frame::before { content: ""; position: absolute; inset: 5px; border: 1px solid var(--hair-soft); pointer-events: none; z-index: 1; }
.frame-corner { position: absolute; z-index: 2; width: 34px; height: 34px; color: var(--house-accent-secondary); fill: none; stroke: currentColor; stroke-width: 1.25px; pointer-events: none; }
.frame-corner-tl { top: -1px; left: -1px; }
.frame-corner-tr { top: -1px; right: -1px; scale: -1 1; }
.frame-corner-bl { bottom: -1px; left: -1px; scale: 1 -1; }
.frame-corner-br { bottom: -1px; right: -1px; scale: -1; }

.eyebrow { letter-spacing: 0.22em; text-transform: uppercase; color: var(--house-accent-secondary); font-size: 11px; font-weight: 600; margin-bottom: 4px; }
.title { font-family: var(--font-display); text-transform: uppercase; letter-spacing: 0.045em; font-weight: 400; font-size: 24px; line-height: 1.15; -webkit-text-fill-color: transparent; background-image: linear-gradient(105deg, transparent 44%, rgba(255, 250, 236, 0.95) 50%, transparent 56%), linear-gradient(var(--house-grad-start) 10%, var(--house-grad-mid) 55%, var(--house-grad-end) 95%); background-size: 300% 100%, 100% 100%; background-repeat: no-repeat; -webkit-background-clip: text; background-clip: text; animation: titleGlint 2.4s var(--ease-arcane) 0.2s 1 both; }
.divider { width: 220px; height: 14px; margin: 14px auto; color: var(--house-accent-secondary); fill: none; stroke: currentColor; stroke-width: 1px; display: block; }
.panel-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
.panel-content { overflow-y: auto; flex: 1; color: var(--color-muted); line-height: 1.6; }
.panel-footer { display: flex; justify-content: flex-end; gap: 12px; margin-top: 20px; }

.btn-primary, .btn-secondary { min-height: 44px; padding: 0 22px; border: none; clip-path: var(--bevel); letter-spacing: 0.14em; text-transform: uppercase; font-size: 12px; font-weight: 600; cursor: pointer; transition: filter 0.2s, transform 0.2s, background-color 0.2s; }
.btn-primary { color: var(--house-btn-text); background: linear-gradient(var(--house-btn-start), var(--house-btn-mid) 55%, var(--house-btn-end)); }
.btn-primary:hover { filter: brightness(1.1); box-shadow: 0 0 18px var(--house-glow); }
.btn-secondary { position: relative; isolation: isolate; color: var(--house-accent); background: rgba(201, 176, 122, 0.6); }
.btn-secondary::before { content: ""; position: absolute; inset: 1px; z-index: -1; clip-path: var(--bevel); background: #0b111c; transition: background-color 0.2s; }
.btn-secondary:hover::before { background: #172033; }
.btn-close { min-width: 44px; min-height: 44px; background: transparent; border: 1px solid var(--hair-soft); color: var(--color-muted); cursor: pointer; transition: color 0.2s, border-color 0.2s; }
.btn-close:hover { color: var(--house-accent); border-color: var(--house-border); }

@keyframes magicPanelIn { from { opacity: 0; transform: scale(0.95) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
@keyframes magicPanelOut { from { opacity: 1; transform: scale(1) translateY(0); } to { opacity: 0; transform: scale(0.96) translateY(6px); } }
@keyframes titleGlint { from { background-position: 0 0, 0 0; } to { background-position: 100% 0, 0 0; } }
```

## Template JavaScript CEF (`ui/app.js`)

```javascript
'use strict';

const overlay = document.getElementById('overlay');
const panel = document.getElementById('viccs-panel');
const content = document.getElementById('panel-content');
let isOpen = false;
let currentData = null;

function send(eventName, payload = {}) {
    try {
        if (typeof callEvent === 'function') {
            callEvent(eventName, JSON.stringify(payload));
        }
    } catch (_) {}
}

function applyHouseTheme(house) {
    if (house) {
        document.documentElement.setAttribute('data-house-theme', String(house).toLowerCase());
    }
}

function openPanel(data) {
    currentData = data || {};
    applyHouseTheme(currentData.house);
    isOpen = true;
    panel.style.animation = 'magicPanelIn 0.32s var(--ease-sheet) forwards';
    overlay.classList.remove('hidden');
    content.textContent = currentData.message || '';
}

function closePanel(notifyClient = true) {
    if (!isOpen) return;
    isOpen = false;
    panel.style.animation = 'magicPanelOut 0.2s var(--ease-arcane) forwards';
    setTimeout(() => {
        overlay.classList.add('hidden');
        panel.style.animation = '';
        if (notifyClient) send('close');
    }, 200);
}

window.addEventListener('viccs:open', (event) => openPanel(event.detail));
window.addEventListener('viccs:close', () => closePanel(false));

document.getElementById('btn-close').addEventListener('click', () => closePanel(true));
document.getElementById('btn-cancel').addEventListener('click', () => closePanel(true));
document.getElementById('btn-confirm').addEventListener('click', () => {
    send('action', { confirmed: true });
    closePanel(true);
});

window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isOpen) {
        event.preventDefault();
        closePanel(true);
    }
});

send('ready');
```

## Regras Inegociáveis

1. **NUNCA** acesse APIs privilegiadas ou banco de dados direto do CEF/client — sempre valide no server.
2. **SEMPRE** use o protocolo real do ArcaneMP (`Web.createView`, `Web.emit`, `Web.on`, `callEvent`, `window.addEventListener`), nunca APIs de outros mods (`mp.trigger`).
3. **SEMPRE** adquira e libere `Hmp.input.controls` com owner único (`{ resource, id }`), inclusive em `resourceStop` e em rotas de erro (`try/finally`).
4. **SEMPRE** mantenha os tokens, `[data-house-theme]`, moldura `.frame`, `--bevel` e animações mágicas suaves idênticas ao `website/`.
5. **NUNCA** use frameworks pesados (React/Vue) dentro de WebViews in-game leves — HTML/CSS/JS vanilla é instantâneo e mantém 60+ FPS no jogo.
6. **SEMPRE** aproveite assets reais do HL/ArcaneMP (`hmp-inventory` icons, `hmp-characters` `Portrait`, `hmp-audio` Wwise) e `website/public/` (emblemas, varinhas).
7. **SEMPRE** respeite a separação rígida de controles:
   - `Alt` = **Olho Mágico** (apenas retícula central no mundo em modo de observação, **sem** travar controles/câmera e **sem** abrir menu geral de sistemas).
   - `Esc` = **Livro do Jogador** via `viccs-ui` (`book.registerPageProvider`), mantendo `Game.setPauseMenuEnabled(false)` em gameplay livre e protegendo modais abertos de sobreposição.
8. **SEMPRE** garanta acessibilidade básica: alvos mínimos de `44x44px`, navegação por teclado (`Tab`, `Enter`, `Escape`), contraste legível e suporte a `@media (prefers-reduced-motion: reduce)`.
9. **SEMPRE** responda às **6 Perguntas Obrigatórias de Imersão & UX** antes de criar ou expandir qualquer interface (ver `server/.agent/scripting/regras-de-implementacao-experiencia-imersiva-accio.md`):
   1. Qual é o único objetivo claro deste recurso/tela?
   2. Que informação precisa estar visível em até 3 segundos?
   3. Qual é a ação principal e por qual controle ela acontece?
   4. Como o jogador entra, confirma e sai sem conflito de tecla?
   5. O que acontece se falhar, faltar dado ou o jogador não tiver requisito?
   6. Esse visual, texto e som estão coerentes, legíveis e respeitando a era/lore?

## Integração no Livro do Jogador (`Esc`) e Olho Mágico (`Alt`)

- Sistemas pessoais (Varinha, Aulas, Magias, Grimório, Trabalho, Criaturas, etc.) das Fases 2 a 6 devem expor uma página/resumo no **Livro do Jogador** usando `viccsUi.book.registerPageProvider({ id, title, group, order, resolve(context) })` em vez de criar menus ou atalhos concorrentes.
- Interações no mundo (objetos, NPCs, portais, quadros) devem aparecer no **Olho Mágico (`Alt`)** registrando um provedor via `viccsUi.eye.registerTargetProvider({ id, resolveTargets(player, context) })` e revalidando estado (`available` / `unavailable` / `blocked`) no servidor antes da execução.

