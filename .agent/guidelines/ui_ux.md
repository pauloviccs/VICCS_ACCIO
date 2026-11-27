# UI/UX Guidelines — VICCS Accio HL Server

> **Referência Obrigatória Complementar:** `.agent/skills/visual-consistency-and-magic-motion.md` e `website/src/index.css` / `website/src/components/ArcaneOrnaments.tsx`.

## Filosofia de Design

> Toda interface in-game (CEF) e web do VICCS Accio compartilha **exatamente a mesma identidade visual** do portal (`website/`) e do **ArcaneMP** (`https://arcane.mp/`), unindo elegância arcana sombria (*Wizarding Elegance*), elementos diegéticos de pergaminho e assets nativos de *Hogwarts Legacy*.

## Identidade Visual Oficial (ArcaneMP + ACCIO)

### Paleta Base & Motor Dinâmico de Casas (`[data-house-theme]`)

```css
/* Base Universal ArcaneMP + ACCIO (website/src/index.css) */
--color-base: #090e17;             /* Fundo abissal noturno */
--color-surface: #0a0f19;          /* Superfície padrão de molduras (.frame) */
--color-surface-elevated: #0d1422; /* Pills, wells e cabeçalhos elevados */
--color-ink: #ece7da;              /* Texto principal (marfim quente) */
--color-muted: #b6bbc5;            /* Texto secundário */
--color-subtle: #8b93a1;           /* Metadados e rodapés */
--color-gold: #c9b07a;             /* Ouro ArcaneMP */
--color-gold-bright: #ead6a6;      /* Ouro brilhante / foco */
--color-gold-deep: #9c7f4a;        /* Ouro envelhecido */
--hair: rgba(201, 176, 122, 0.32); /* Borda hairline padrão */
--hair-soft: rgba(201, 176, 122, 0.14); /* Borda interna (.frame::before) */

/* Temas Reativos das 4 Casas via [data-house-theme] */
/* gryffindor: #b5675e / #5b1009 / #ead6a6 / #ffc34f */
/* slytherin:  #6e9e81 / #123524 / #9fd3b4 */
/* ravenclaw:  #7e98bd / #112442 / #b6cbe8 */
/* hufflepuff: #c7ac63 / #2e2410 / #ead6a6 */

/* Pergaminho Clássico (Cartas, Chapéu, Profeta Diário) */
/* Gradiente #f6eedc -> #eadbc0 com tinta escura e ouro #d4af37 */
```

### Tipografia

```css
--font-display: 'Marcellus', 'Cinzel', Georgia, serif;   /* Títulos uppercase + title-glint */
--font-sans: 'Source Sans 3', system-ui, sans-serif;     /* Interface e corpo */
--font-crimson: 'Crimson Pro', Georgia, serif;           /* Cartas, crônicas e pergaminhos */
--font-mono: 'JetBrains Mono', monospace;                /* Números tabulares, IDs, Galeões */
```
*(No CEF in-game, empacotar arquivos `.ttf`/`.woff2` locais em `ui/fonts/` via `files` no `package.json` para não depender de internet.)*

### Geometria, Ornamentos & Efeitos Visuais

```css
/* Moldura Dupla ArcaneMP (.frame + 4x SVG CornerBracket) */
.frame {
    isolation: isolate;
    position: relative;
    border: 1px solid var(--house-border);
    background: var(--color-surface);
    padding: 1.75rem;
}
.frame::before {
    content: "";
    position: absolute;
    inset: 5px;
    border: 1px solid var(--hair-soft);
    pointer-events: none;
}

/* Botões Hexagonais Chanfrados (--bevel) */
.btn-primary, .btn-secondary {
    clip-path: polygon(12px 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 12px 100%, 0 50%);
    letter-spacing: 0.14em;
    text-transform: uppercase;
    transition: filter 0.2s, transform 0.2s, background-color 0.2s;
}
```

## Princípios de UI & Animações Mágicas

### 1. Continuidade Site ↔ Jogo + Assets HL
- Toda tela CEF usa `.frame`, cantoneiras `CornerBracket`, `ArcaneDivider`, `.eyebrow`, `.title` e botões `--bevel` idênticos ao `website/`.
- Reaproveitar assets nativos do jogo (`hmp-inventory` ícones nativos, `hmp-characters` `Portrait` ao vivo, `hmp-audio` eventos Wwise) e os emblemas/varinhas de `website/public/`.

### 2. Animações Suaves, Intuitivas e Premium
- Curvas padrão: `--ease-arcane: cubic-bezier(0.22, 1, 0.36, 1)` e `--ease-sheet: cubic-bezier(0.16, 1, 0.3, 1)`.
- Entrada/saída animada em todo painel (`appleScaleIn`, `title-glint`, glow contido no hover, `.frame-zoom`), animando somente `transform`/`opacity`/`filter`.
- Pausar partículas/timers em `Canvas 2D` quando a WebView estiver oculta e respeitar `prefers-reduced-motion`.

### 3. Feedback Instantâneo & Áudio
- Hover/focus visíveis (`:focus-visible` com outline `--color-gold-bright`) em TODOS os controles interativos.
- Integrar ações relevantes com `hmp-audio` (Wwise) e estados de carregamento claros.

### 4. Acessibilidade & Visão do Jogo
- Contraste mínimo 4.5:1 (WCAG AA) contra fundos claros e escuros do castelo.
- Hit targets confortáveis (`>= 44px`), navegação completa por teclado e fechamento garantido via `ESC` com liberação do lease `Hmp.input.controls`.

## Contrato de Controles & Hubs In-Game (`Alt` vs `Esc`)

> **Regra Obrigatória (`server/.agent/scripting/regras-de-implementacao-experiencia-imersiva-accio.md`):**
- **`Alt` — Olho Mágico (Observação & Interação com o Mundo):**
  - Exibe retículo central discreto **sem bloquear a visão nem abrir menu geral**.
  - Identifica objetos, personagens e pontos próximos registrados (`hmp-interact`, `World.lineTrace`, provedores server-side), distinguindo claramente `Disponível`, `Indisponível` e `Bloqueado` (com motivo breve).
  - Confirma ou cancela a interação focada sem consultas pesadas por frame; servidor revalida distância, estado e permissões antes de executar.
- **`Esc` — Livro do Jogador (Sistemas Pessoais):**
  - Porta de entrada única para os sistemas pessoais do personagem (Casa/Vestes, Ficha, Varinha, Aulas, Evolução, Magias e serviços integrados).
  - Coordena `Game.setPauseMenuEnabled(false)` e `Hmp.input.controls` para que `Esc` feche primeiro qualquer painel aberto e só abra o Livro quando não houver sobreposição ativa.
  - Novos sistemas das Fases 3–6 devem registrar páginas/seções no Livro via `viccs-ui` em vez de criar menus soltos ou comandos de chat obrigatórios.

## Componentes Padrão (`viccs-ui` + `hmp-ui`)

- **Primitivas rápidas:** usar `Imports.get('hmp-ui')` (`notify`, `alert`, `input`, `context`, `progress`) quando o fluxo for utilitário.
- **Painéis ricos/diegéticos:** construir em `viccs-ui` / `viccs-{nome}/ui/` seguindo exatamente os tokens, molduras e animações acima:
  - `ArcaneFrame` (`.frame` + 4 cantoneiras SVG), `ArcaneDivider`, `Eyebrow`, `BevelButton` (`.btn-primary`/`.btn-secondary`), `HouseBadge`, `ParchmentCard`, `LiveDot`.

## Regras Inegociáveis

1. **NUNCA** use HTML/CSS genérico fora dos tokens do `website/` e ArcaneMP.
2. **SEMPRE** anime entrada, transição e saída de elementos de UI com suavidade (`--ease-arcane`).
3. **NUNCA** bloqueie a visão do jogo mais que o necessário em HUDs passivos (manter transparência/glassmorphism e `pointer-events: none` no overlay quando ocioso).
4. **SEMPRE** permita fechar painéis interativos com `ESC` liberando `Hmp.input.controls`.
5. **SEMPRE** reaja ao `[data-house-theme]` da casa do personagem (`hmp-houses`).
6. **SEMPRE** use fontes empacotadas localmente no CEF (`ui/fonts/`) e teste contra cenários claros e escuros do jogo.

