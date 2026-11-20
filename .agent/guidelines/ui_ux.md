# UI/UX Guidelines — VICCS Accio HL Server

## Filosofia de Design

> A interface do VICCS Accio deve ser **imersiva** — como se fizesse parte do
> universo mágico de Hogwarts. Cada elemento de UI precisa parecer que pertence
> ao mundo bruxo, não a uma aplicação web genérica sobreposta ao jogo.

## Estética: "Wizarding Elegance"

### Paleta de Cores

```
Fundo Principal:     rgba(15, 12, 25, 0.92)     — Noite no castelo
Fundo Secundário:    rgba(28, 22, 45, 0.85)     — Pergaminho escuro
Fundo Cards:         rgba(40, 32, 65, 0.80)     — Púrpura profundo
Bordas:              rgba(180, 155, 100, 0.40)   — Ouro envelhecido
Bordas Hover:        rgba(220, 190, 120, 0.70)   — Ouro brilhante
Texto Principal:     #E8DCC8                      — Pergaminho claro
Texto Secundário:    #A89880                      — Tinta desbotada
Accent Primário:     #C9A84C                      — Ouro mágico
Accent Sucesso:      #4CAF7C                      — Verde esmeralda
Accent Erro:         #CF4A4A                      — Vermelho carmesim
Accent Info:         #5B8FCF                      — Azul safira

Cores das Casas:
  Grifinória:        #9C1B28 (vermelho) + #D4A844 (ouro)
  Sonserina:         #1A6B3C (verde) + #A0A0A0 (prata)
  Corvinal:          #0B4F8A (azul) + #946B2D (bronze)
  Lufa-Lufa:         #D4A844 (amarelo) + #2D2D2D (preto)
```

### Tipografia

```
Fonte UI:            'Crimson Text', serif (títulos)
                     'Inter', sans-serif (corpo/dados)
                     'JetBrains Mono', monospace (valores numéricos, IDs)
Tamanhos:
  Título grande:     24px, weight 700
  Título seção:      18px, weight 600
  Corpo:             14px, weight 400
  Label:             12px, weight 500, uppercase, letter-spacing 1px
  Small:             11px, weight 400
```

### Efeitos Visuais

```css
/* Glassmorphism mágico para painéis */
.viccs-panel {
    background: rgba(15, 12, 25, 0.88);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(180, 155, 100, 0.25);
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5),
                inset 0 1px 0 rgba(180, 155, 100, 0.1);
}

/* Brilho mágico sutil nos botões */
.viccs-btn:hover {
    box-shadow: 0 0 15px rgba(201, 168, 76, 0.3);
    border-color: rgba(220, 190, 120, 0.7);
}

/* Transições suaves */
.viccs-transition {
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
```

## Princípios de UI

### 1. Imersão Primeiro
- Nenhum elemento deve parecer "HTML genérico"
- Bordas arredondadas suaves (8-12px), nunca cantos vivos
- Uso de backdrop-filter para integrar com o cenário do jogo
- Ícones customizados com temática mágica

### 2. Hierarquia Clara
- Cada tela tem UMA ação primária visualmente destacada
- Informação secundária em tamanho/opacidade menor
- Agrupamento lógico com espaçamento generoso

### 3. Feedback Instantâneo
- Hover states em TODOS os elementos interativos
- Animações de entrada/saída para menus e notificações
- Sons de feedback (integrados com hmp-audio) para ações
- Loading states para operações assíncronas

### 4. Acessibilidade Mágica
- Contraste mínimo 4.5:1 para texto sobre fundo
- Hit targets mínimos de 44x44px para mobile/controller
- Suporte a navegação por teclado
- Texto legível mesmo com o jogo de fundo

## Componentes Padrão

Todos os resources DEVEM usar os componentes do `viccs-ui`:

```
Notifications    → Toast flutuante canto superior direito
Dialogs          → Modal central com overlay escuro
Context Menus    → Menu flutuante próximo ao cursor
Tooltips         → Popup compacto ao hover
Progress Bars    → Barra com brilho animado
Input Fields     → Campos com borda dourada no focus
Buttons          → Primary (ouro), Secondary (outline), Danger (carmesim)
Cards            → Containers glassmorphism com header
Lists            → Items com hover highlight dourado
Tabs             → Navegação com indicador animado
```

## Regras Inegociáveis

1. **NUNCA** use componentes HTML nativos sem estilização VICCS
2. **SEMPRE** anime entrada/saída de elementos de UI
3. **NUNCA** bloqueie a visão do jogo mais que 60% da tela
4. **SEMPRE** permita fechar qualquer painel com ESC
5. **SEMPRE** mantenha a paleta de cores consistente
6. **NUNCA** use fontes do sistema — sempre as fontes definidas
7. **SEMPRE** teste a legibilidade contra cenários claros e escuros do jogo

