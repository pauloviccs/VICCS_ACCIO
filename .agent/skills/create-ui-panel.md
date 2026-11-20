# Skill: Criar UI Panel (CEF)

## Quando Usar
Sempre que um resource precisar de uma interface visual renderizada sobre o jogo:
menus, inventários, diálogos, HUDs, formulários, etc.

## Pré-Requisitos
1. Ler `.agent/guidelines/ui_ux.md` — OBRIGATÓRIO
2. O resource deve ter `"files": ["ui/**/*"]` no package.json
3. O resource deve depender de `viccs-ui` para componentes base

## Arquitetura UI no Arcane MP

```
┌─────────────────────────────────────────┐
│          Jogo (Hogwarts Legacy)          │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │      CEF Overlay (Chromium)       │  │
│  │                                   │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │    UI Panel (HTML/CSS/JS)   │  │  │
│  │  │                             │  │  │
│  │  │  Renderizado como webpage   │  │  │
│  │  │  Transparente por padrão    │  │  │
│  │  └─────────────────────────────┘  │  │
│  │                                   │  │
│  └───────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

## Estrutura de Arquivos UI

```
viccs-{nome}/
└── ui/
    ├── index.html          # Estrutura HTML
    ├── styles.css          # Estilos (Wizarding Elegance)
    ├── app.js              # Lógica e comunicação
    └── assets/             # (Opcional) Imagens, ícones
        ├── icons/
        └── images/
```

## Template HTML Base

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VICCS — {Nome do Painel}</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <!-- Container principal — começa hidden -->
    <div id="viccs-panel" class="viccs-panel hidden">

        <!-- Header do painel -->
        <div class="viccs-panel-header">
            <h2 class="viccs-panel-title">{Título}</h2>
            <button class="viccs-btn-close" onclick="closePanel()">✕</button>
        </div>

        <!-- Conteúdo -->
        <div class="viccs-panel-content">
            <!-- Conteúdo específico do resource -->
        </div>

        <!-- Footer (opcional) -->
        <div class="viccs-panel-footer">
            <button class="viccs-btn viccs-btn-primary" onclick="handleAction()">
                Confirmar
            </button>
            <button class="viccs-btn viccs-btn-secondary" onclick="closePanel()">
                Cancelar
            </button>
        </div>

    </div>

    <script src="app.js"></script>
</body>
</html>
```

## Template CSS Base

```css
/* ═══════════════════════════════════════════════════════════════
   VICCS Accio — {Nome do Resource} UI
   Estilo: Wizarding Elegance (ver guidelines/ui_ux.md)
   ═══════════════════════════════════════════════════════════════ */

/* ─── Reset & Base ────────────────────────────────────────── */

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    background: transparent;
    font-family: 'Inter', 'Segoe UI', sans-serif;
    color: #E8DCC8;
    overflow: hidden;
    user-select: none;
}

/* ─── Panel Container ────────────────────────────────────── */

.viccs-panel {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 480px;
    max-height: 70vh;
    background: rgba(15, 12, 25, 0.92);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(180, 155, 100, 0.25);
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6),
                inset 0 1px 0 rgba(180, 155, 100, 0.08);
    display: flex;
    flex-direction: column;
    animation: panelFadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.viccs-panel.hidden {
    display: none;
}

/* ─── Header ─────────────────────────────────────────────── */

.viccs-panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid rgba(180, 155, 100, 0.15);
}

.viccs-panel-title {
    font-family: 'Crimson Text', serif;
    font-size: 20px;
    font-weight: 700;
    color: #C9A84C;
}

/* ─── Content ────────────────────────────────────────────── */

.viccs-panel-content {
    padding: 20px;
    overflow-y: auto;
    flex: 1;
}

/* ─── Footer ─────────────────────────────────────────────── */

.viccs-panel-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 16px 20px;
    border-top: 1px solid rgba(180, 155, 100, 0.15);
}

/* ─── Buttons ────────────────────────────────────────────── */

.viccs-btn {
    padding: 10px 20px;
    border-radius: 6px;
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    border: 1px solid transparent;
}

.viccs-btn-primary {
    background: rgba(201, 168, 76, 0.2);
    color: #C9A84C;
    border-color: rgba(201, 168, 76, 0.4);
}

.viccs-btn-primary:hover {
    background: rgba(201, 168, 76, 0.35);
    box-shadow: 0 0 15px rgba(201, 168, 76, 0.2);
}

.viccs-btn-secondary {
    background: rgba(255, 255, 255, 0.05);
    color: #A89880;
    border-color: rgba(255, 255, 255, 0.1);
}

.viccs-btn-secondary:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #E8DCC8;
}

.viccs-btn-close {
    background: none;
    border: none;
    color: #A89880;
    font-size: 18px;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    transition: all 0.2s;
}

.viccs-btn-close:hover {
    color: #CF4A4A;
    background: rgba(207, 74, 74, 0.1);
}

/* ─── Animations ─────────────────────────────────────────── */

@keyframes panelFadeIn {
    from {
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.95);
    }
    to {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
    }
}

@keyframes panelFadeOut {
    from {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
    }
    to {
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.95);
    }
}

/* ─── Scrollbar Custom ───────────────────────────────────── */

::-webkit-scrollbar {
    width: 6px;
}

::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 3px;
}

::-webkit-scrollbar-thumb {
    background: rgba(180, 155, 100, 0.3);
    border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
    background: rgba(180, 155, 100, 0.5);
}
```

## Template JavaScript Base

```javascript
// ═══════════════════════════════════════════════════════════════
// VICCS Accio — {Nome do Resource} UI
// Arquivo: ui/app.js
// Descrição: Lógica do painel UI e comunicação com client script
// ═══════════════════════════════════════════════════════════════

'use strict';

// ─── State ───────────────────────────────────────────────────

const state = {
    isOpen: false,
    data: null,
};

// ─── DOM References ──────────────────────────────────────────

const panel = document.getElementById('viccs-panel');

// ─── Panel Control ───────────────────────────────────────────

function openPanel(data) {
    state.isOpen = true;
    state.data = data;
    panel.classList.remove('hidden');
    renderContent(data);
}

function closePanel() {
    state.isOpen = false;
    panel.style.animation = 'panelFadeOut 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
    setTimeout(() => {
        panel.classList.add('hidden');
        panel.style.animation = '';
        // Notificar client script que o painel fechou
        if (window.mp) {
            mp.trigger('viccs:{nome}:panelClosed');
        }
    }, 200);
}

// ─── Rendering ───────────────────────────────────────────────

function renderContent(data) {
    const content = panel.querySelector('.viccs-panel-content');
    // Implementar renderização específica
    content.innerHTML = `<p>Conteúdo aqui</p>`;
}

// ─── Communication with Client Script ────────────────────────

// Receber dados do client script
if (window.mp) {
    mp.events.add('viccs:{nome}:open', (jsonData) => {
        const data = JSON.parse(jsonData);
        openPanel(data);
    });

    mp.events.add('viccs:{nome}:close', () => {
        closePanel();
    });

    mp.events.add('viccs:{nome}:update', (jsonData) => {
        const data = JSON.parse(jsonData);
        state.data = { ...state.data, ...data };
        renderContent(state.data);
    });
}

// ─── Keyboard Shortcuts ──────────────────────────────────────

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.isOpen) {
        closePanel();
    }
});

// ─── Action Handlers ─────────────────────────────────────────

function handleAction() {
    if (window.mp) {
        mp.trigger('viccs:{nome}:action', JSON.stringify(state.data));
    }
    closePanel();
}
```

## Comunicação UI ↔ Client Script ↔ Server

```
┌──────────────┐    mp.trigger()    ┌──────────────┐    Events.emit()    ┌──────────────┐
│   UI Panel   │ ───────────────► │ Client Script │ ───────────────── │    Server    │
│  (HTML/JS)   │                   │   (V8 Sandbox) │                    │  (Node.js)   │
│              │ ◄─────────────── │               │ ◄───────────────── │              │
│              │   mp.events.add() │               │   Events.emit()    │              │
└──────────────┘                   └──────────────┘                    └──────────────┘
```

## Regras Inegociáveis

1. **NUNCA** acesse APIs ou banco de dados direto do UI/client — sempre via server
2. **SEMPRE** use `JSON.stringify/parse` para passar dados entre camadas
3. **SEMPRE** anime entrada/saída dos painéis (fadeIn/fadeOut)
4. **SEMPRE** suporte fechar com ESC
5. **SEMPRE** siga a paleta "Wizarding Elegance" definida em ui_ux.md
6. **NUNCA** use frameworks pesados (React, Vue) — vanilla JS/HTML/CSS apenas
7. **SEMPRE** teste com fundos claros e escuros do jogo para garantir legibilidade

