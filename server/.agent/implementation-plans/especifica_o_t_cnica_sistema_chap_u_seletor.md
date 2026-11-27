# Contexto de Implementação: Sistema "Chapéu Seletor" (Sorting Hat Engine)

> **Objetivo do Documento:** Este arquivo serve como especificação arquitetural, funcional e de regras de negócio para agentes de engenharia de software (Antigravity, Gemini, Claude, Cursor) implementarem o sistema completo do **Chapéu Seletor** em uma aplicação web.

---

## 1. Visão Geral & Propósito

O sistema simula a experiência clássica e imersiva da cerimônia de seleção de casas inspirada na era original do Pottermore (2011–2012), porém projetada com um **motor de decisão à prova de manipulação (*Fail-Proof*)**.

### Requisitos Fundamentais (Non-Negotiable)
1. **Zero Respostas Óbvias:** Nenhuma alternativa deve mapear `1:1` para uma única casa. Toda escolha distribui pesos primários e secundários entre múltiplas casas.
2. **Sessão Dinâmica e Imprevisível:** A cada nova tentativa, um subconjunto aleatório de perguntas é sorteado de um banco maior, e a ordem das alternativas é embaralhada via algoritmo *Fisher-Yates*.
3. **Detecção de *Hatstall* (Empate Técnico):** Quando a diferença entre a 1ª e a 2ª casa mais pontuadas estiver abaixo de um limiar (`threshold < 1.6`), o sistema interrompe a finalização e injeta uma pergunta decisiva de desempate antes de revelar o resultado.
4. **Imersão & Mistério:** Durante o quiz, nenhuma pontuação parcial, barra de afinidade por casa ou indicador de tendência pode ser exibido no DOM ou exposto visualmente ao usuário.

---

## 2. Arquitetura de Dados & Estruturas

### 2.1. Identificadores das Casas (`HouseKey`)
```typescript
export type HouseKey = 'G' | 'R' | 'H' | 'S';
// G = Grifinória | R = Corvinal | H = Lufa-Lufa | S = Sonserina
```

### 2.2. Interfaces Principais
```typescript
export interface HouseWeights {
  G: number;
  R: number;
  H: number;
  S: number;
}

export interface QuizOption {
  id?: string;
  text: string;
  weights: HouseWeights;
}

export interface QuizQuestion {
  id: string;
  category: string;
  text: string;
  options: QuizOption[];
}

export interface HouseMetadata {
  key: HouseKey;
  name: string;
  motto: string;
  crest: string;
  theme: {
    primaryHex: string;
    secondaryHex: string;
    accentHex: string;
  };
  welcomeTitle: string;
  letterParagraphs: string[];
}

export interface SortingSessionState {
  status: 'INTRO' | 'IN_PROGRESS' | 'HATSTALL' | 'DELIBERATING' | 'COMPLETED';
  questions: QuizQuestion[];
  currentIndex: number;
  scores: HouseWeights;
  isHatstallTriggered: boolean;
  result: {
    primaryHouse: HouseKey;
    secondaryHouse: HouseKey;
    scoreDiff: number;
  } | null;
}
```

---

## 3. Regras de Negócio do Motor *Fail-Proof*

### 3.1. Algoritmo de Embaralhamento (Fisher-Yates)
O agente **não deve** usar `.sort(() => Math.random() - 0.5)` devido ao viés estatístico. Deve implementar *Fisher-Yates*:
```typescript
export function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
```

### 3.2. Matriz de Pesos Psicológicos (Anti-Gaming)
Cada alternativa deve somar aproximadamente `3.4` a `3.6` pontos distribuídos entre motivações primárias e secundárias:
- **Peso Primário (`2.1` a `2.4`):** Reflete a motivação central da atitude.
- **Peso Secundário (`0.6` a `1.3`):** Reflete a nuance compartilhada com outra casa (ex.: *Coragem calculada* pontua em `G` e `S`; *Justiça analítica* pontua em `R` e `H`).
- **Peso Residual (`0.0` a `0.4`):** Evita zeros absolutos rígidos e cria curvas naturais de pontuação.

### 3.3. Máquina de Estados & Regra de *Hatstall*
1. **Inicialização (`startCeremony`):**
   - Zera `scores = { G: 0, R: 0, H: 0, S: 0 }`.
   - Sorteia `8` perguntas distintas do `QUESTION_BANK` (mínimo de 12 perguntas no banco).
   - Embaralha o array `options` de cada uma das 8 perguntas sorteadas.
2. **Processamento de Resposta (`submitAnswer`):**
   - Soma `option.weights` em `state.scores`.
   - Incrementa `currentIndex`.
   - Se `currentIndex < questions.length`, avança para a próxima pergunta.
3. **Avaliação de Empate Técnico (ao fim da 8ª pergunta):**
   - Ordena `scores` de forma decrescente: `[first, second, third, fourth]`.
   - Calcula `diff = first.score - second.score`.
   - **Condição de Hatstall:** Se `!isHatstallTriggered && diff < 1.6`:
     - Define `isHatstallTriggered = true` e `status = 'HATSTALL'`.
     - Anexa `HATSTALL_QUESTION` (com alternativas embaralhadas) ao final de `questions`.
     - Exibe aviso narrativo sutil do Chapéu Seletor deliberando entre duas forças equivalentes.
4. **Deliberação e Veredito:**
   - Após a última resposta (8ª normal ou 9ª de desempate), entra em estado `DELIBERATING` por `2200ms–2600ms` com mensagens dinâmicas citando a `secondaryHouse` antes de anunciar a `primaryHouse`.

---

## 4. Banco de Conteúdo Base (Dados Canônicos)

O agente deve incluir o banco completo de dilemas situacionais e metadados das casas abaixo:

### 4.1. Perguntas do Banco Principal (`QUESTION_BANK`)

1. **Instinto & Reação**
   - *Enunciado:* "Ao caminhar por um corredor deserto ao anoitecer, você ouve passos apressados e um sussurro tenso vindo de trás de uma tapeçaria. Qual é sua reação imediata?"
   - *Opções:*
     - "Afasto a tapeçaria sem hesitar para confrontar quem está ali antes que fuja." → `{ G: 2.4, S: 0.7, R: 0.2, H: 0.1 }`
     - "Fico imóvel nas sombras e escuto em silêncio para descobrir o assunto antes de agir." → `{ S: 2.1, R: 1.1, G: 0.2, H: 0.1 }`
     - "Observo o padrão das pegadas e a acústica do corredor para deduzir quantas pessoas são." → `{ R: 2.3, S: 0.8, H: 0.2, G: 0.1 }`
     - "Pergunto em voz calma se alguém precisa de ajuda ou está perdido." → `{ H: 2.4, G: 0.8, R: 0.2, S: 0.0 }`

2. **Natureza & Contemplação**
   - *Enunciado:* "Entre estas quatro paisagens silenciosas, qual delas desperta uma sensação imediata de pertencimento em você?"
   - *Opções:*
     - "O topo de um penhasco varrido pelo vento, onde o horizonte parece infinito." → `{ R: 1.9, G: 1.3, S: 0.2, H: 0.1 }`
     - "Uma clareira iluminada pelo sol da manhã, cercada por árvores antigas e tranquilas." → `{ H: 2.3, G: 0.6, R: 0.4, S: 0.1 }`
     - "As profundezas de um lago escuro e calmo, onde a luz mal toca a superfície." → `{ S: 2.2, R: 1.0, H: 0.2, G: 0.1 }`
     - "Uma floresta densa e selvagem ao entardecer, cheia de trilhas desconhecidas." → `{ G: 2.2, R: 0.7, S: 0.4, H: 0.2 }`

3. **Dilema Moral**
   - *Enunciado:* "Um amigo próximo cometeu um erro grave que pode prejudicar outra pessoa inocente, mas pede que você guarde segredo absoluto. O que você faz?"
   - *Opções:*
     - "Convenço meu amigo a assumir a responsabilidade junto comigo, custe o que custar." → `{ G: 2.1, H: 1.2, R: 0.2, S: 0.0 }`
     - "Mantenho o segredo dele, mas intervenho discretamente para impedir que o inocente sofra." → `{ S: 2.0, H: 1.1, R: 0.5, G: 0.1 }`
     - "Não traio a confiança do meu amigo diretamente, mas busco uma solução justa para reparar o dano." → `{ H: 2.2, S: 0.7, R: 0.4, G: 0.2 }`
     - "Analiso todas as consequências lógicas antes de decidir qual princípio deve prevalecer." → `{ R: 2.3, S: 0.7, H: 0.3, G: 0.1 }`

4. **Artefatos Antigos**
   - *Enunciado:* "Sobre uma mesa de pedra antiga repousam quatro objetos sem qualquer inscrição. Qual chama sua atenção primeiro?"
   - *Opções:*
     - "Uma ampulheta cuja areia parece subir lentamente em vez de cair." → `{ R: 2.2, S: 0.9, H: 0.2, G: 0.1 }`
     - "Uma adaga de prata embainhada, marcada por sinais de antigas batalhas." → `{ G: 2.3, S: 0.8, H: 0.1, R: 0.2 }`
     - "Um anel pesado com uma pedra escura que parece aquecer ao se aproximar." → `{ S: 2.3, G: 0.6, R: 0.4, H: 0.1 }`
     - "Um cálice simples de bronze polido pelo toque de muitas gerações." → `{ H: 2.3, G: 0.6, R: 0.3, S: 0.2 }`

5. **O Espelho da Mente**
   - *Enunciado:* "Se você pudesse beber apenas uma poção única na vida, qual efeito escolheria?"
   - *Opções:*
     - "A clareza absoluta para compreender qualquer enigma ou verdade oculta." → `{ R: 2.4, S: 0.7, H: 0.2, G: 0.1 }`
     - "A capacidade de inspirar confiança e unir pessoas em torno de um propósito." → `{ H: 1.9, G: 1.1, S: 0.5, R: 0.1 }`
     - "A determinação inabalável para realizar sua maior ambição sem jamais vacilar." → `{ S: 2.3, G: 0.8, R: 0.3, H: 0.0 }`
     - "A audácia pura para enfrentar o impossível sem sentir medo." → `{ G: 2.4, S: 0.6, H: 0.3, R: 0.1 }`

6. **Conflito & Estratégia**
   - *Enunciado:* "Durante uma competição difícil em equipe, você percebe que o plano atual vai falhar. Como você age?"
   - *Opções:*
     - "Assumo a linha de frente e improviso uma jogada ousada para virar o jogo." → `{ G: 2.3, S: 0.7, H: 0.2, R: 0.2 }`
     - "Reorganizo silenciosamente os papéis do grupo para explorar a fraqueza do adversário." → `{ S: 2.3, R: 0.9, G: 0.2, H: 0.1 }`
     - "Aponto a falha lógica no plano e proponho uma alternativa mais eficiente." → `{ R: 2.3, S: 0.7, H: 0.3, G: 0.1 }`
     - "Garanto que ninguém desanime e cubro as falhas dos colegas para mantermos o ritmo." → `{ H: 2.4, G: 0.7, R: 0.2, S: 0.1 }`

7. **Memória & Legado**
   - *Enunciado:* "Quando pessoas que convivem com você falam ao seu respeito quando você não está presente, o que você mais gostaria que dissessem?"
   - *Opções:*
     - "Que você nunca abandonou alguém quando as coisas ficaram difíceis." → `{ H: 2.2, G: 1.1, R: 0.1, S: 0.1 }`
     - "Que você sempre enxergava soluções que ninguém mais conseguia ver." → `{ R: 2.3, S: 0.8, H: 0.2, G: 0.1 }`
     - "Que você teve coragem de fazer o que era certo mesmo estando sozinho." → `{ G: 2.4, H: 0.7, R: 0.2, S: 0.1 }`
     - "Que você sabia exatamente onde queria chegar e conquistou seu lugar." → `{ S: 2.4, R: 0.6, G: 0.4, H: 0.0 }`

8. **O Caminho Bifurcado**
   - *Enunciado:* "Você está diante de duas portas fechadas: uma exige resolver um enigma complexo; a outra exige atravessar uma ponte estreita sobre um abismo. Qual você escolhe?"
   - *Opções:*
     - "A ponte — prefiro confiar nos meus próprios passos a ficar parado pensando." → `{ G: 2.3, S: 0.6, H: 0.4, R: 0.1 }`
     - "O enigma — não há motivo para arriscar a vida se a mente pode abrir o caminho." → `{ R: 2.3, S: 0.8, H: 0.2, G: 0.1 }`
     - "Examino ambas primeiro para descobrir qual delas leva ao destino mais seguro e vantajoso." → `{ S: 2.1, R: 1.0, H: 0.3, G: 0.1 }`
     - "Escolho aquela em que eu possa ajudar quem estiver comigo a atravessar melhor." → `{ H: 2.3, G: 0.8, R: 0.2, S: 0.1 }`

9. **Injustiça Silenciosa**
   - *Enunciado:* "Você descobre que alguém recebeu crédito por um trabalho brilhante que na verdade foi feito por um colega tímido. O que você faz?"
   - *Opções:*
     - "Exponho a verdade publicamente na primeira oportunidade, sem me importar com o clima." → `{ G: 2.3, H: 0.9, R: 0.2, S: 0.0 }`
     - "Apoio o colega e o ajudo a apresentar provas concretas de que o trabalho é dele." → `{ H: 2.1, R: 1.0, G: 0.4, S: 0.1 }`
     - "Uso a informação com cautela para virar a situação a favor do verdadeiro autor no momento certo." → `{ S: 2.2, R: 0.8, H: 0.4, G: 0.1 }`
     - "Documento os fatos com precisão para que a verdade se sustente por si mesma." → `{ R: 2.2, H: 0.8, S: 0.4, G: 0.1 }`

10. **Horas Solitárias**
    - *Enunciado:* "Você tem uma noite inteira livre, sem obrigações ou distrações. Como ela tende a passar?"
    - *Opções:*
      - "Mergulhado em um livro, projeto ou ideia que prende toda a minha curiosidade." → `{ R: 2.4, S: 0.5, H: 0.4, G: 0.1 }`
      - "Planejando meus próximos passos e organizando metas pessoais importantes." → `{ S: 2.3, R: 0.8, G: 0.2, H: 0.1 }`
      - "Conversando, cozinhando ou criando um ambiente acolhedor para pessoas queridas." → `{ H: 2.4, G: 0.6, R: 0.2, S: 0.2 }`
      - "Saindo para explorar algum lugar novo ou praticando algo que exija energia." → `{ G: 2.3, H: 0.6, S: 0.3, R: 0.2 }`

11. **A Caixa Lacrada**
    - *Enunciado:* "Você encontra uma caixa antiga com um bilhete: 'Pertence àquele que souber usá-la'. Qual é seu primeiro pensamento?"
    - *Opções:*
      - "Quero descobrir o mecanismo interno e o propósito original de quem a construiu." → `{ R: 2.3, S: 0.7, H: 0.2, G: 0.2 }`
      - "Abro para ver o que há dentro — oportunidades assim não aparecem duas vezes." → `{ G: 2.1, S: 1.0, R: 0.3, H: 0.0 }`
      - "Avalio se o conteúdo pode ser útil para meus objetivos antes de decidir o que fazer." → `{ S: 2.3, R: 0.7, G: 0.3, H: 0.1 }`
      - "Tento descobrir se alguém a perdeu e está procurando por ela." → `{ H: 2.4, G: 0.6, R: 0.3, S: 0.1 }`

12. **O Peso da Verdade**
    - *Enunciado:* "O que mais irrita ou incomoda você no comportamento das outras pessoas?"
    - *Opções:*
      - "A covardia de quem foge quando precisa defender aquilo em que diz acreditar." → `{ G: 2.4, H: 0.7, S: 0.2, R: 0.1 }`
      - "A arrogância de quem se recusa a aprender ou ouvir argumentos racionais." → `{ R: 2.4, H: 0.6, S: 0.3, G: 0.1 }`
      - "A deslealdade de quem usa os outros e depois vira as costas." → `{ H: 2.3, G: 0.8, S: 0.2, R: 0.1 }`
      - "A falta de visão de quem desperdiça potencial por medo de arriscar." → `{ S: 2.3, G: 0.7, R: 0.4, H: 0.0 }`

### 4.2. Pergunta de Desempate (`HATSTALL_QUESTION`)
- **Categoria:** `"Deliberação Final do Chapéu"`
- **Enunciado:** `"Vejo duas forças equilibradas em sua mente. Se você precisasse escolher apenas uma bússola para guiar toda a sua vida, qual seria?"`
- **Opções:**
  - `"Agir com coragem e integridade mesmo quando tudo parece perdido."` → `{ G: 3.0, H: 0.4, R: 0.1, S: 0.1 }`
  - `"Buscar a verdade e a compreensão profunda acima de qualquer convenção."` → `{ R: 3.0, S: 0.4, H: 0.1, G: 0.1 }`
  - `"Permanecer fiel às pessoas e construir algo justo e duradouro."` → `{ H: 3.0, G: 0.4, R: 0.1, S: 0.1 }`
  - `"Moldar o próprio destino com inteligência, astúcia e determinação."` → `{ S: 3.0, R: 0.4, G: 0.1, H: 0.1 }`

---

## 5. Diretrizes de UI/UX & Estética

- **Direção Visual:** Dark Academia / Misticismo Clássico.
  - Fundo principal em tons profundos (`#090b10` a `#131722`) com detalhes em ouro envelhecido (`#d4af37`).
  - Cartão final de resultado estilizado como **pergaminho clássico** (`#f6eedc` → `#eadbc0`) com tipografia serifada (`Cinzel` para títulos e `Crimson Pro` para narrativa).
- **Paleta Temática das Casas (Tela Final):**
  - **Grifinória (`G`):** Escarlate (`#5c1015` / `#8b1e24`) + Ouro (`#eab308`)
  - **Corvinal (`R`):** Azul Meia-Noite (`#102542` / `#1d3f72`) + Bronze/Prata Azul (`#93c5fd`)
  - **Lufa-Lufa (`H`):** Âmbar Escuro (`#423306` / `#785d0b`) + Amarelo Ouro (`#facc15`)
  - **Sonserina (`S`):** Verde Esmeralda Profundo (`#0b2e1e` / `#165237`) + Prata Esmeralda (`#6ee7b7`)
- **Feedback Narrativo:** Exibir sussurros rotativos do Chapéu Seletor no topo do card durante o progresso (ex.: *"Hmm... interessante..."*, *"Vejo mais do que você deixa transparecer..."*) para reforçar a sensação de avaliação psicológica em tempo real.

---

## 6. Instruções de Implementação para Agentes de IA

Ao receber este arquivo de contexto para integrar em um projeto existente (Next.js, React, Vue, Svelte ou Vanilla JS):

1. **Separação de Responsabilidades:**
   - Isole o motor de pontuação e embaralhamento em um módulo puro (ex.: `lib/sorting-hat-engine.ts` ou `utils/sortingEngine.js`) sem dependências de UI.
   - Mantenha o banco de perguntas em um arquivo de dados dedicado (`data/sorting-questions.ts`).
   - Construa o componente visual desacoplado consumindo apenas os estados expostos pela máquina de estados.
2. **Segurança & Integridade (Opcional para Backend):**
   - Se o website possuir autenticação de usuários e persistência de perfil, o cálculo de `scores` e a detecção de `Hatstall` devem rodar preferencialmente em uma **Server Action / API Route** para impedir inspeção de pesos no cliente (`DevTools`).
3. **Acessibilidade & Responsividade:**
   - Todas as alternativas devem ser `<button type="button">` navegáveis via teclado (`Tab` / `Enter` / `Space`), com contraste mínimo WCAG AA tanto no tema escuro quanto no card de pergaminho.
   - Evitar uso de `window.alert()` ou `window.confirm()`; usar feedback inline/toast para ações como copiar resultado.

---

## 7. Checklist de Validação (Definition of Done)

- [ ] Cada execução sorteia 8 perguntas diferentes e embaralha a ordem das 4 opções.
- [ ] Nenhuma alternativa possui peso `0` em todas as outras casas ou rótulo explícito da casa no texto.
- [ ] O fluxo de *Hatstall* dispara automaticamente quando `score[0] - score[1] < 1.6`.
- [ ] A tela de deliberação exibe animação e menciona a segunda casa mais próxima antes do anúncio final.
- [ ] O resultado final apresenta a carta personalizada da casa, análise do perfil e opção de copiar/reiniciar sessão.