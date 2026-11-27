# Skill: Consistência Visual ArcaneMP + ACCIO & Animações Mágicas

> **Fontes Reais do Projeto:** `website/src/index.css`, `website/src/components/ArcaneOrnaments.tsx`, `website/index.html`, `website/public/` e `server/resources/hmp-ui|hmp-characters|hmp-inventory|hmp-audio|hmp-spells/`.  
> **Mandato:** Todo script novo (`viccs-*`) que possua interface CEF, HUD, tela de seleção, carta, grimório, loja, inventário ou interação visual **DEVE** seguir esta skill para manter continuidade visual absoluta entre o **Website (`website/`)**, o **Portal ArcaneMP (`https://arcane.mp/`)** e os **Assets Nativos de Hogwarts Legacy**.

---

## Quando Usar
**SEMPRE** ao criar ou alterar qualquer painel CEF, HUD, overlay, componente do `viccs-ui`, override de UI do `hmp-inventory`/`hmp-ui`, ou sistema com feedback visual/sonoro em `server/resources/viccs-*`.

---

## 1. DNA Visual Único (`website/` = ArcaneMP = In-Game CEF)

### 1.1 Tokens de Cor Base (Sidecar Visual ArcaneMP + ACCIO)
Manter exatamente os mesmos CSS Custom Properties do `website/src/index.css`:

```css
:root {
    --color-base: #090e17;
    --color-surface: #0a0f19;
    --color-surface-elevated: #0d1422;
    --color-ink: #ece7da;
    --color-muted: #b6bbc5;
    --color-subtle: #8b93a1;
    --color-gold: #c9b07a;
    --color-gold-bright: #ead6a6;
    --color-gold-deep: #9c7f4a;

    --hair: rgba(201, 176, 122, 0.32);
    --hair-soft: rgba(201, 176, 122, 0.14);
    --bevel: polygon(12px 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 12px 100%, 0 50%);
    --ease-arcane: cubic-bezier(0.22, 1, 0.36, 1);
    --ease-sheet: cubic-bezier(0.16, 1, 0.3, 1);
}
```

### 1.2 Motor Reativo das 4 Casas (`[data-house-theme]`)
Sempre aplicar `document.documentElement.setAttribute('data-house-theme', houseSlug)` (`gryffindor`, `slytherin`, `ravenclaw`, `hufflepuff`) no root da UI CEF com transição suave (`0.5s–0.7s`), usando os mesmos tokens do `website/src/index.css`:
* **Grifinória (`gryffindor`):** `--house-primary: #b5675e`, `--house-secondary: #5b1009`, `--house-accent: #ead6a6`, `--house-accent-secondary: #ffc34f`, `--house-bg-radial: #1c1318`.
* **Sonserina (`slytherin`):** `--house-primary: #6e9e81`, `--house-secondary: #123524`, `--house-accent: #9fd3b4`, `--house-bg-deep: #080f14`, `--house-bg-radial: #0e1e1c`.
* **Corvinal (`ravenclaw`):** `--house-primary: #7e98bd`, `--house-secondary: #112442`, `--house-accent: #b6cbe8`, `--house-bg-deep: #070d18`, `--house-bg-radial: #101c33`.
* **Lufa-Lufa (`hufflepuff`):** `--house-primary: #c7ac63`, `--house-secondary: #2e2410`, `--house-accent: #ead6a6`, `--house-bg-deep: #0c0d12`, `--house-bg-radial: #1f1b12`.
* **Cartas / Pergaminhos Diegéticos** (ex.: Carta de Hogwarts, veredito do Chapéu, Jornal/Profeta): papel clássico `#f6eedc` → `#eadbc0` com tinta escura e tipografia `Crimson Pro` + `Cinzel`.

### 1.3 Tipografia & Offline-Safety no CEF
* **Display / Títulos:** `'Marcellus', 'Cinzel', Georgia, serif` (`text-transform: uppercase`, `letter-spacing: 0.045em`, gradiente metálico + `title-glint`).
* **Corpo / Interface:** `'Source Sans 3', system-ui, sans-serif` (ou `'Spectral'` em textos literários/HMP).
* **Narrativa / Pergaminhos:** `'Crimson Pro', Georgia, serif`.
* **Dados / Contadores / Códigos:** `'JetBrains Mono', monospace` com `font-variant-numeric: tabular-nums`.
* **Regra Obrigatória de CEF:** empacotar fontes locais em `viccs-ui/ui/fonts/` (ou referenciar fontes locais do resource via `files` / `fw://resources/viccs-ui/ui/fonts/...`), pois jogadores podem estar sem acesso a CDN externa dentro do CEF.

### 1.4 Geometria Assinatura ArcaneMP (`ArcaneOrnaments`)
Todo container, modal e CTA principal de scripts `viccs-*` deve reutilizar a gramática geométrica do `website/`:
1. **Moldura Dupla (`.frame` + `.frame-corner`):** borda externa `1px solid var(--house-border)`, borda interna `inset: 5px` com `var(--hair-soft)` e **4 cantoneiras SVG `CornerBracket`** nos vértices com losango `45°` no canto (`frame-corner-tl/tr/bl/br`).
2. **Divisor Ornamental (`.divider` / `ArcaneDivider`):** traço fino `240×14` com losangos laterais e diamante vazado central.
3. **Botões Chanfrados Hexagonais (`.btn-primary`, `.btn-secondary`):** recorte `--bevel`, letras em `uppercase` com `letter-spacing: 0.14em`, preenchimento metálico dourado (`--house-btn-start/mid/end`) para ação primária e vidro escuro com contorno `--hair` para secundária.
4. **Eyebrow & Indicador Vivo:** `.eyebrow` (`0.22em` uppercase) acompanhado de losango `45°` e `.live-dot` (`live-pulse`) para estados ativos em tempo real.

---

## 2. Uso Máximo de Assets Nativos do Hogwarts Legacy & ArcaneMP

Nunca invente placeholders genéricos quando o jogo ou o projeto já oferece o asset real:

| Tipo de Asset | Fonte Real no Ecossistema | Como Consumir nos Scripts `viccs-*` |
| :--- | :--- | :--- |
| **Ícones & Itens Nativos (1.848 itens)** | `hmp-inventory` (`native:*`, `fw://resources/hmp-inventory/dist/icons/...`) | Reaproveitar ícones oficiais de poções, ervas, gear e consumíveis do HL no CEF e inventário. |
| **Retratos Dinâmicos do Avatar** | `hmp-characters` (`Portrait`, `CreatorPreview`) | Renderizar o rosto/vestes reais do personagem em tempo real em fichas, diálogos e cartões. |
| **Emblemas, Brasão & Varinhas** | `website/public/assets/emblemas/*.png`, `AccioEmblem`, `website/public/wands/` | Compartilhar via `viccs-ui/ui/assets/` para manter 100% de paridade entre site e jogo (11 famílias + Guia de Campo). |
| **Áudio Mágico Nativo (Wwise)** | `hmp-audio` (~6.300 eventos Wwise: `UI_Menu_Select`, `accio_cast`, `Dueling_Round_Start_Play`, `Amb3D_*`) | Disparar feedback tátil sonoro via `Audio.sounds.playForPlayer` / `playAt` sincronizado com animações da UI e eventos de mundo. |
| **Magias & Lições Customizadas** | `hmp-spells` (`Spells.define`, `SpellLessonDefinition`, `tint`) | Ícones customizados `<resource>/ui/assets/spells/<id>.png` no mesmo padrão do grimório e traçado 1024×1024 suave. |
| **Casas, Portas & Mundo** | `hmp-houses` (`player.house`, ampulhetas, `commonRooms`), `hmp-world`, `hmp-express` | Vestes, brasões, iluminação, clima e Expresso sincronizados com o estado visual das interfaces. |

---

## 3. Coreografia de Animações Mágicas (Suaves, Intuitivas & Premium)

Toda animação deve parecer **magia orgânica fluida** — nunca brusca, travada ou excessiva:

1. **Curvas & Durações Padrão:**
   * Movimento arcano elegante: `var(--ease-arcane)` (`cubic-bezier(0.22, 1, 0.36, 1)`), `280ms–450ms` para entradas/hovers, `500ms–700ms` para trocas de tema de Casa.
   * Modais / folhas estilo Apple: `var(--ease-sheet)` (`cubic-bezier(0.16, 1, 0.3, 1)`), `300ms–380ms` (`scale(0.95) translateY(8px)` → `1`).
2. **Assinaturas Animadas Obrigatórias:**
   * **`title-glint`:** feixe luminoso sutil atravessando títulos `.title` na abertura de painéis importantes.
   * **Micro-interações de Hover:** elevação leve (`translateY(-2px)`), brilho dourado contido (`box-shadow: 0 0 18px var(--house-glow)`), e zoom cinematográfico lento (`scale(1.045)` em `1.4s`) em retratos/cards (`.frame-zoom`).
   * **Atmosfera Sutil (Opt-in por contexto):** névoa etérea (`castle-mist-drift`), faíscas douradas leves em Canvas 2D (respeitando budget de FPS no CEF — pausar quando oculto!), e perspectiva 3D (`perspective: 1200px; preserve-3d`) em cartas, livros e cards colecionáveis.
   * **Transições Encadeadas Sem Piscar:** em fluxos multi-etapas (ex.: Chapéu Seletor, Criação de Personagem, Lojas), manter o backdrop contínuo e animar apenas o conteúdo interno (como faz `hmp-ui` em `transitionGraceMs`).
3. **Acessibilidade & Performance no CEF:**
   * Animar apenas propriedades compositadas (`transform`, `opacity`, `filter`) — evitar animar `width`/`height`/`top`/`left` em loops contínuos.
   * Respeitar `@media (prefers-reduced-motion: reduce)` e **desligar loops de Canvas/requestAnimationFrame** quando a View estiver escondida (`Web.hideView`).
   * Sempre acompanhar aberturas/confirmações importantes com som Wwise sutil via `hmp-audio` (ex.: `UI_Menu_Select`) e liberar controles (`Hmp.input.controls`) no fechamento.

