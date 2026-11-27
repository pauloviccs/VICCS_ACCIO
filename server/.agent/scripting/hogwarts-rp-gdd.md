---
name: hogwarts-rp-gdd
description: Game Design Document + skill para construir, em ArcaneMP (mod multiplayer de Hogwarts Legacy), um servidor de roleplay canônico do Wizarding World. Use SEMPRE que for criar, alterar ou revisar qualquer resource/script do servidor (hw-*), decidir arquitetura, eventos entre sistemas, fidelidade à lore ou gameplay loop. Define a árvore de scripts, contratos de eventos, política de cânone e specs por sistema.
---

# Hogwarts RP — Game Design Document & Skill de Implementação

> **Público:** agentes de IA de programação (Claude Code, Gemini, Cursor, Antigravity etc.) e o dono do servidor (Paulo).
> **Idioma do projeto:** textos in-game e documentação em português do Brasil; identificadores de código, nomes de resources e eventos em inglês.
> **Status:** v0.1 — documento vivo. Decisões em aberto estão na seção 11.

---

## 0. Como o agente deve usar este arquivo

1. **Leia as seções 1–5 inteiras antes de escrever qualquer código.** Elas são as regras do ecossistema.
2. Localize na seção 4 o resource que você vai tocar e leia sua spec na seção 6 (e o **contrato de eventos** na seção 5.3). Nunca crie um evento, tabela ou resource novo sem registrá-lo aqui.
3. **Nunca chame a API do ArcaneMP direto de um sistema de gameplay.** Toda chamada passa pelo resource `hw-adapter` (seção 5.1). Motivo: a API muda a cada release (1.13.0 em 12/11/2026, e há quebras de compatibilidade documentadas), e só o adapter deve precisar mudar.
4. **Antes de usar qualquer função do ArcaneMP, confirme a assinatura nos arquivos de declaração gerados** (`hogwartsmp-server.d.ts`, `hogwartsmp-client.d.ts`, pacote `@hogwartsmp/types`) e em https://docs.arcane.mp. Este GDD cita nomes de API confirmados apenas na documentação pública de alto nível (landing de scripting e changelog). Onde a assinatura exata não foi confirmada, o texto marca **[VERIFICAR .d.ts]**. **Não invente assinaturas.**
5. **Cânone:** siga a política da seção 3. Dado de lore sem fonte no `hw-canon` não entra no jogo.
6. Ao terminar uma tarefa, rode o checklist de **Definition of Done** (seção 9.2) e atualize este arquivo se mudou contrato, evento, tabela ou decisão.

### Template de prompt para delegar uma tarefa a um agente

```
Contexto: leia hogwarts-rp-gdd.md (seções 0–5 e a spec do resource <hw-xxx>).
Tarefa: implementar/alterar <hw-xxx>.
Restrições: usar só hw-adapter para API do ArcaneMP; autoridade no servidor; eventos conforme 5.3;
dados canônicos só via hw-canon; sem reproduzir texto literal dos livros.
Entregáveis: package.json do resource, server/, client/ (se houver), ui/ (se houver),
migrations, testes de contrato do adapter, atualização do GDD.
```

---

## 1. Visão e pilares

**Fantasia central:** o jogador *vive* uma vida de estudante (e, mais tarde, de bruxo adulto) no mundo dos livros de J.K. Rowling — recebe a carta, compra a varinha, é selecionado, estuda, compete, descobre segredos — sem nunca ser lembrado de que está em um jogo.

**Inspiração direta:**
- **Pottermore (2011–2012, abertura pública em 14/04/2012):** jogo em torno dos livros com "Moments" (ilustrações interativas com itens escondidos), Sorting Hat com perguntas escritas por Rowling, Wand Chooser, Diagon Alley, poções, duelos, Copa das Casas e baú com cards de Sapos de Chocolate e Galeões. O 1º livro foi o primeiro disponível.
- **Hogwarts Legacy:** castelo, Hogsmeade, voo, poções, herbologia, criaturas, Sala Precisa, duelos, feitiços — que o ArcaneMP já expõe ao servidor via script.

### Pilares (ordem de prioridade em caso de conflito)

| # | Pilar | Regra prática |
|---|-------|---------------|
| P1 | **Imersão inquebrável** | Interface diegética (carta de coruja, pergaminho, mapa). Nada de barras de status "de jogo", pontuação parcial do Chapéu, textos de debug ou prompts em inglês cru. |
| P2 | **Cânone dos livros** | Livros 1–7 são a fonte de verdade. Tudo que o servidor afirma sobre o mundo deve ser rastreável. |
| P3 | **Ecossistema, não features soltas** | Cada sistema consome e produz eventos de outros. Um ato (ex.: ser selecionado) tem consequências em cascata. |
| P4 | **Servidor autoritativo** | O cliente expressa intenção; o servidor decide. Segredos (pesos do Chapéu, loot, regras) nunca vão para o cliente. |
| P5 | **Loop sempre satisfatório** | Em qualquer minuto o jogador tem algo significativo a fazer (seção 7). |
| P6 | **Extensível por agentes** | Contratos claros, adapter único, specs padronizadas. |

---

## 2. Base técnica: o que o ArcaneMP oferece (verificado em docs públicas)

Fontes: https://arcane.mp/scripting , https://arcane.mp/changelog , https://docs.arcane.mp (referência de API **gerada a partir das declarações do runtime**; as páginas de referência detalhadas não puderam ser abertas na pesquisa que gerou este documento — consulte-as diretamente).

### 2.1 Modelo de resources

- Resource = pasta com `package.json`. A chave do manifest é **`mafiahub`**:

```json
{
  "name": "hw-sorting",
  "version": "0.1.0",
  "mafiahub": {
    "serverScripts": ["server/main.js"],
    "clientScripts": ["client/main.js"],
    "sharedScripts": [],
    "files": ["ui/**"],
    "resourceDependencies": ["hw-core", "hw-adapter", "hw-persist"],
    "priority": 30,
    "errorBehavior": "stop"
  }
}
```

| Chave | Papel |
|---|---|
| `serverScripts` | Node.js, autoritativo, **não** enviado ao cliente. |
| `clientScripts` | V8 sandboxed, enviado na conexão. Apresentação e input. |
| `sharedScripts` | Roda nos dois lados e **é entregue ao cliente** (nunca ponha regra secreta aqui). |
| `files` | Arquivos de cliente (HTML/CSS/JS de CEF, imagens), aceita glob. |
| `resourceDependencies` | Resources que devem carregar antes. Declare **todos**. |
| `priority` | Maior valor = carrega depois. Controla ordem, não se roda. |
| `errorBehavior` | `stop` (padrão), `restart` ou `continue` se o resource lançar erro. |

- **Build de release exige reinício do servidor** para recarregar resources (file watcher é só de debug). Planeje testes com build idêntico ao de produção.
- **Barramento:** o bus público é `Events` (não `Core.Events`). Exemplo oficial: `Events.on("playerConnect", (player) => { player.sendChat(...) })`; `player.nickname` existe.
- **Estado replicado (state bags)** vale só durante a sessão e **não é persistência**. O antigo storage chave/valor **foi removido na 1.3.0**.
- **Persistência durável:** o **Foundation** (base suportada para servidores públicos) usa **MySQL/MariaDB**. Dono de personagem, inventário, dinheiro e administração. **Dois resources não podem ser donos do mesmo comando/estado.** Leia os contratos de resource do Foundation antes de ligar empregos, lojas ou sistemas de RP ao dado dele **[VERIFICAR docs do Foundation]**.
- **UI:** painéis HTML/CSS/JS via **CEF** no cliente.

### 2.2 Capacidades relevantes confirmadas (por release)

Tudo abaixo é citado do changelog público (até 1.13.0, 12/11/2026; construído sobre Framework 41.3.0). As assinaturas exatas ficam em **[VERIFICAR .d.ts]**.

| Área | Capacidades |
|---|---|
| **Casas / Copa** | Pontos de casa **do servidor** (1.6.0), refletidos nas ampulhetas do Reception Hall. Acesso a salas comunais de outras casas e escadas do dormitório feminino para jogadores escolhidos (1.11/1.12). |
| **Mundo** | `World.hogwartsExpress` (trem sincronizado), `World.setMeal` (refeições do Salão Principal), relógio do mundo e clima (cliente), decoração de feriado, escritório do Diretor fixável, banners do Salão Principal (cliente), mapas carregáveis (inclusive de mod), pontos de spawn/respawn, desligar fast travel. |
| **Entidades** | `NPC.create` (opções), `Character.create` (fantasmas, elfos-domésticos, goblins, centauros, **Chapéu Seletor** etc.), seguir alvo, andar por locomoção nativa ou caminho autoral, escala, visibilidade, invulnerabilidade, adereços na mão, rótulos de texto, `Nametags`. |
| **Aparência** | Looks em JSON (1.6.0), cor `#rrggbb`, barba, formas animais (gato, kneazle, niffler, fênix; depois rato, lebre, cervo, coruja, acromântula, trasgo, lobo), poses/expressões/clips servidos pelo servidor (1.13.0). |
| **Combate/PvP** | Regras, pares, flags e times (1.9.0); `Pvp.getVitals`; magias customizadas e aulas de feitiço customizadas (1.10.0); eventos `spellCast`, `colliderSpellHit`, `npcDied`. |
| **Mundo vivo** | Acampamentos e eventos de mundo do servidor; loot do servidor (baús, moonstones, foragables); arena de ondas do Overland; luzes, colisores e espelhos (1.12.0); zonas com eventos de entrada/saída; `WorldObjects` com física, animação, Blueprints (suficiente "para rodar um campo de Quadribol"). |
| **Criaturas** | Captura com Nab-Sack arbitrada pelo servidor; vivário em salas da Sala Precisa com rosters, comedouros, subprodutos, colheita e criação (1.11.0). |
| **Sala Precisa** | Salas de propriedade de jogadores carregadas por id, porta compartilhada, troca de sala, trancas (1.9.0). |
| **Progressão/ofícios** | `Progression.getLevelBounds`, `Brewing`, `Herbology` (tipos declarados em 1.11.1). |
| **Interação** | `objectInteracted` (tecla F em prompts do jogo; servidor pode listar/desligar prompts), `mailRead`, `Doors.allowUnlock` (minigame real de lockpicking), travas/portões por jogador ou globais. |
| **Atividades visíveis** | Pipa, banda, fogos, nuvem de chuva, perseguir pomo, abrir Berrador / livro vivo, cartas, Pepper-Up. |
| **Voz/Áudio** | Alcances normal/sussurro/grito configurados pelo servidor (1.6.0); `Audio.setDialoguePolicy`; falas e legendas do jogador remoto. |
| **Input** | `LocalPlayer.stopPlayerInput`/`restorePlayerInput` seguram input **por resource** (1.10.0). |
| **Servidor** | 128 jogadores por padrão, até 512 (1.11.0). |

### 2.3 Restrições que moldam o design

- **Cliente nunca guarda segredo ou regra.** Scripts de cliente/shared são entregues aos jogadores.
- **Inimigos só vêm do servidor** (spawners nativos desligados, 1.10.0) — o servidor monta toda a ameaça.
- **Mudanças de API quebram:** antes de portar código de build antigo, leia o changelog. Exemplos reais: `Broom.setMaxSpeed` removido; `Core.Events` → `Events`; storage K/V removido; Creator.open/close/isOpen removidos (o Foundation traz seu próprio criador).
- **Hogwarts Legacy se passa nos anos 1890; os livros, em 1991–1998.** Isso gera descompasso de assets, NPCs e história — ver seção 3.2 e 10.
- Projeto de fã, não comercial; marcas pertencem à Warner Bros. Não monetizar de forma que afete o gameplay.

---

## 3. Política de cânone

### 3.1 Hierarquia de fontes

| Tier | Fonte | Uso |
|---|---|---|
| **A** | Os 7 livros principais | Verdade absoluta. |
| **B** | Escritos de J.K. Rowling (Pottermore/Wizarding World): ex. critérios do Chapéu, Hatstall, esclarecimentos de casas e varinhas | Cânone complementar. Registrar fonte. |
| **C** | Animais Fantásticos (livro-texto escolar), Quadribol Através dos Séculos, Contos de Beedle, o Bardo | Cânone de apoio para criaturas, esporte, folclore. |
| **D** | Filmes, *Cursed Child*, jogos | **Fora por padrão.** Só entra por decisão explícita registrada em `hw-canon`. |
| **E** | **Hogwarts Legacy** | Referência **mecânica e visual**, nunca de lore. Ambientado em ~1890. |
| **F** | Wikis de fã | Nunca como fonte única; só pista para achar a fonte A/B. |

### 3.2 Era do servidor (decisão central — ver seção 11)

Todo conteúdo é **era-aware**: `availableFrom` / `availableUntil` (ano letivo). O resource `hw-core` expõe `EraGate`. Exemplos de conteúdo que depende de era:

| Conteúdo | Era (cânone) |
|---|---|
| Professor de Defesa Contra as Artes das Trevas muda a cada ano | 91–92 Quirrell · 92–93 Lockhart · 93–94 Lupin · 94–95 "Moody" (impostor) · 95–96 Umbridge · 96–97 Snape · 97–98 Amycus Carrow |
| Clube de Duelos | 1992 (Lockhart) |
| Dementadores em Hogwarts / aula do Patrono (Lupin) | 1993–94 |
| Torneio Tribruxo, Baile de Inverno | 1994–95 |
| Decretos Educacionais, Inquisitorial Squad, Armada de Dumbledore na Sala Precisa | 1995–96 |
| Slughorn volta a lecionar Poções | 1996–97 |
| Loja Weasleys' Wizard Wheezes | 1996 |
| Batalha de Hogwarts | 2 de maio de 1998 |

### 3.3 Anti-alucinação de lore (regras para agentes)

1. Todo registro do `hw-canon` tem `source: { tier, book?, chapter?, note }`. Sem fonte → campo `needsReview: true` e **não aparece em produção**.
2. Se não tem certeza de um fato, marque **(verificar)** e não o publique no jogo.
3. **Não reproduza trechos literais** dos livros, a letra da canção do Chapéu ou outros textos protegidos. Escreva texto **original** inspirado no tom. Perguntas do Chapéu, cartas e diálogos são autorais.
4. O que o cânone não define, o servidor pode definir — mas em `hw-canon` com `tier: "SERVER"` (invenção explícita), sem contradizer A/B.
5. **Contradição entre Hogwarts Legacy e os livros: os livros vencem.** Ex.: Magia Antiga, Guardiões, política goblin do jogo são mecânica opcional, não lore do servidor.

---

## 4. Árvore de scripts (ecossistema)

### 4.1 Diagrama

```
hw-adapter ─────────────────────────────── única ponte para a API do ArcaneMP
└─ hw-core ────────────────────────────── registry, config, EraGate, logger, feature flags, contratos de eventos
   ├─ hw-canon ────────────────────────── dados canônicos com fonte (casas, staff, feitiços, itens, lugares)
   ├─ hw-persist ──────────────────────── camada de dados sobre Foundation/MySQL + migrations hw_*
   ├─ hw-clock ────────────────────────── Relógio Canônico: ano letivo, trimestres, sinos, feriados
   ├─ hw-ui-kit ───────────────────────── componentes CEF diegéticos (pergaminho, carta, Moment)
   ├─ hw-immersion ────────────────────── IC/OOC, reconhecimento por nome, política de HUD/voz/input
   └─ hw-admin ────────────────────────── ferramentas de GM, auditoria, overrides
      │
      ├── TIER 1 · IDENTIDADE ────────────────────────────────────────────────
      │   hw-letter → hw-wand → hw-express → hw-sorting → hw-houses
      │
      ├── TIER 2 · ACADÊMICO ─────────────────────────────────────────────────
      │   hw-curriculum ─┬─ hw-spells ─┬─ hw-dada (duelos)
      │                  │             └─ hw-flying
      │                  ├─ hw-potions
      │                  ├─ hw-herbology
      │                  ├─ hw-creatures
      │                  └─ hw-exams
      │
      ├── TIER 3 · CONVÍVIO E COMPETIÇÃO ─────────────────────────────────────
      │   hw-housecup · hw-discipline · hw-greathall · hw-quidditch · hw-duelclub
      │
      ├── TIER 4 · MUNDO E ECONOMIA ──────────────────────────────────────────
      │   hw-economy · hw-diagon · hw-hogsmeade · hw-owlpost · hw-collectibles · hw-prophet · hw-ministry
      │
      └── TIER 5 · NARRATIVA VIVA ────────────────────────────────────────────
          hw-moments · hw-secrets · hw-npcs · hw-director
```

**Regra de dependência:** um resource só depende de resources **acima ou no mesmo tier anterior**. Dependência circular é proibida; comunicação "para cima" é **só por evento**.

### 4.2 Prioridades de carregamento sugeridas

| Faixa `priority` | Resources |
|---|---|
| 5 | `hw-adapter` |
| 10 | `hw-core`, `hw-canon` |
| 15 | `hw-persist`, `hw-clock` |
| 20 | `hw-ui-kit`, `hw-immersion`, `hw-admin` |
| 30 | Tier 1 |
| 40 | Tier 2 |
| 50 | Tier 3 |
| 60 | Tier 4 |
| 70 | Tier 5 |

(Prioridade só ordena; a garantia real de ordem é `resourceDependencies`.)

### 4.3 Estrutura de pastas por resource

```
resources/hw-<nome>/
├─ package.json
├─ README.md               # spec resumida + eventos emitidos/consumidos
├─ server/                 # lógica autoritativa
│  ├─ main.js
│  ├─ service.js           # regras puras, testáveis sem ArcaneMP
│  └─ handlers.js          # liga Events/adapter ao service
├─ client/                 # apresentação e input
├─ ui/                     # CEF (HTML/CSS/JS)
├─ migrations/             # SQL versionado (hw_<resource>_NNN.sql)
└─ test/                   # testes das regras puras
```

> **Regra de ouro:** a regra de negócio vive em `service.js` puro (sem import do ArcaneMP) → testável fora do jogo. `handlers.js` é a única ponte para eventos/adapter.

---

## 5. Contratos transversais

### 5.1 `hw-adapter`

Camada fina que encapsula **toda** chamada ao ArcaneMP. Cada função tem:
- assinatura estável própria (`adapter.players.sendChat(playerId, text)`),
- uma nota `// ArcaneMP: <API> @ build <versão>`,
- um teste de contrato que falha se o `.d.ts` mudar.

Grupos: `players`, `houses`, `world`, `npcs`, `doors`, `loot`, `pvp`, `spells`, `mail`, `ui`, `input`, `audio`, `zones`, `objects`, `creatures`, `db`.
Qualquer função cujo nome real não esteja confirmado nasce com `throw new Error("NOT_VERIFIED")` até ser conferida.

### 5.2 Convenções de autoridade e dados

- **Dado durável** → MySQL/MariaDB (via `hw-persist`/Foundation). **Dado de sessão** → state bag. Nunca confundir.
- Tabelas próprias com prefixo `hw_` e coluna `character_id` apontando para o personagem do **Foundation** (não duplicar dono de personagem).
- Toda mutação de progresso/pontos/dinheiro gera **linha de auditoria** (`hw_audit`: quem, o quê, antes/depois, motivo, timestamp).
- Toda requisição do cliente passa por **validação + rate limit** no servidor (testar requisições repetidas e desconexão no meio de fluxos — recomendação oficial do ArcaneMP).
- **Idempotência:** handlers de eventos devem tolerar entrega duplicada.

### 5.3 Catálogo de eventos do ecossistema

Convenção de nome: `hw:<domínio>:<verbo-no-passado>`. Payload sempre inclui `characterId` e `ts`.
**[VERIFICAR .d.ts]** se `Events` permite eventos customizados entre resources; se não, `hw-core` implementa um bus interno em memória no servidor (e canal cliente↔servidor via o mecanismo oficial de eventos de rede).

| Evento | Produtor | Consumidores principais | Payload (resumo) |
|---|---|---|---|
| `hw:letter:received` | hw-letter | hw-wand, hw-owlpost, hw-prophet | `{ year, letterId }` |
| `hw:wand:chosen` | hw-wand | hw-spells, hw-duelclub, hw-collectibles | `{ wood, core, lengthIn, flex }` |
| `hw:express:boarded` / `:arrived` | hw-express | hw-clock, hw-greathall, hw-sorting | `{ direction }` |
| `hw:sorting:started` | hw-sorting | hw-greathall, hw-immersion, hw-npcs | `{ sessionId }` |
| `hw:sorting:hatstall` | hw-sorting | hw-greathall, hw-prophet (rumor), hw-director | `{ housePair }` |
| **`hw:sorting:completed`** | hw-sorting | **hw-houses, hw-housecup, hw-curriculum, hw-greathall, hw-owlpost, hw-npcs, hw-collectibles, hw-quidditch, hw-director** | `{ primaryHouse, secondaryHouse, hatstall, scoreDiff }` |
| `hw:house:changed` | hw-houses/hw-admin | hw-housecup, hw-quidditch, hw-economy | `{ from, to, reason }` |
| `hw:points:awarded` / `:deducted` | hw-housecup | hw-prophet, hw-greathall, hw-discipline | `{ house, delta, reason, byCharacterId }` |
| `hw:class:started` / `:ended` | hw-curriculum | todo o Tier 2, hw-immersion, hw-greathall | `{ subject, year, professorNpc }` |
| `hw:spell:learned` / `:mastered` | hw-spells | hw-exams, hw-duelclub, hw-curriculum | `{ spellId, level }` |
| `hw:potion:brewed` | hw-potions | hw-exams, hw-collectibles, hw-economy | `{ potionId, quality }` |
| `hw:exam:graded` | hw-exams | hw-curriculum, hw-housecup, hw-prophet | `{ exam, grade }` |
| `hw:rule:broken` | hw-discipline | hw-npcs (Filch), hw-housecup | `{ ruleId, severity }` |
| `hw:detention:served` | hw-discipline | hw-npcs, hw-creatures | `{ with }` |
| `hw:quidditch:match` (`started`/`scored`/`snitch`/`ended`) | hw-quidditch | hw-housecup, hw-prophet, hw-greathall | `{ houses, score }` |
| `hw:currency:changed` | hw-economy | hw-collectibles, hw-audit | `{ delta, balance }` |
| `hw:item:collected` | hw-collectibles/moments | hw-housecup, hw-prophet | `{ itemId, source }` |
| `hw:moment:completed` | hw-moments | hw-collectibles, hw-housecup | `{ momentId }` |
| `hw:calendar:day-changed` / `:term-changed` / `:holiday-started` | hw-clock | todos | `{ date, term, event? }` |
| `hw:arc:advanced` | hw-director | todos | `{ arcId, beat }` |

### 5.4 Contrato de imersão (obrigatório para todo resource)

1. **Sem UI de "jogo"**: notificações chegam como **carta de coruja** (aproveitar `mailRead`) ou **eco de pergaminho**; ganhos de pontos são anunciados por **NPC/ampulheta**, não por toast de sistema.
2. **IC/OOC**: chat in-character por padrão; OOC explícito e discreto. Alcances de voz normal/sussurro/grito configurados no servidor (1.6.0).
3. **Reconhecimento:** jogadores só veem o nome de quem já foi apresentado (`Nametags` **[VERIFICAR .d.ts]**); casa pode ser inferida só por vestes/gravata. Evita "metagame" por tag.
4. **Prompts nativos** do jogo em inglês que quebrem o clima: usar a listagem/desativação de prompts F do servidor (1.13.0).
5. **Input:** quando uma cena toma controle (Chapéu, aula), usar `stopPlayerInput` — lembre que é **por resource**; sempre restaurar em `finally`/desconexão.
6. **Nenhum número secreto no DOM** (pesos do Chapéu, probabilidade de loot, gabaritos).
7. Textos em PT-BR, tom de narrador clássico; sem anglicismos de interface.

---

## 6. Especificação dos sistemas

### 6.1 Tier 0 — Fundação

| Resource | Propósito | Lore / referência | ArcaneMP | Entregáveis-chave |
|---|---|---|---|---|
| `hw-adapter` | Encapsular API | — | Tudo | Wrappers + testes de contrato |
| `hw-core` | Registry, config (`CANON_ERA`, limiares), `EraGate`, logger, flags, bus | — | `Events` | `config/default.json`, `EraGate.isAvailable(entry)` |
| `hw-canon` | Dados canônicos com `source` | Seção 8 | — | JSON/JS versionado: casas, staff, feitiços, itens, lugares, calendário |
| `hw-persist` | Acesso a dados, migrations `hw_*`, auditoria | — | Foundation + MySQL/MariaDB | `hw_character_profile`, `hw_audit`, … (seção 6.8) |
| `hw-clock` | Relógio Canônico | Ano letivo: partida do Expresso em 1º de setembro, Halloween, Natal, Páscoa, exames em junho, banquete final e Copa das Casas | Relógio do mundo (pin), clima, decoração de feriado, `World.hogwartsExpress` | Mapeia tempo real → data canônica; emite eventos de calendário |
| `hw-ui-kit` | Componentes CEF diegéticos | Estética pergaminho/Dark Academia | CEF | Carta, pergaminho, painel de Moment, tipografia |
| `hw-immersion` | Política IC/OOC, reconhecimento, voz, HUD, input | — | Nametags, voz, input holds | Seção 5.4 como código |
| `hw-admin` | GM: re-sortear, dar pontos, disparar eventos, banir spoilers | Professores/Diretor como papéis | — | Comandos com auditoria obrigatória |

**`hw-clock` — detalhe:** definir `TIME_SCALE` (ex.: 1 semana real = 1 mês canônico — **decisão aberta, seção 11**). Gera: horário de aulas (sinos), fins de semana de Hogsmeade, janelas de partidas de Quadribol, feriados (muitos alunos ficam no Natal), exames, banquete final. Tudo em **horário canônico do servidor**, independente do fuso do jogador.

### 6.2 Tier 1 — Identidade (a "cascata" do Chapéu)

#### 6.2.1 `hw-letter` — A Carta de Hogwarts
- **Lore:** o aluno recebe a carta por coruja aos 11 anos, com lista de material e prazo de resposta (31 de julho no 1º livro).
- **Função:** onboarding diegético. Primeira conexão: cutscene mínima (o personagem acorda, a coruja chega), a carta é aberta (CEF), resposta confirma matrícula.
- **ArcaneMP:** spawn em ponto definido pelo servidor (1.10.0: não começar mais no dormitório), `Character.create`/NPC coruja **[VERIFICAR .d.ts]**, `mailRead`.
- **Emite:** `hw:letter:received`. **Dados:** `hw_character_profile.enrolled_at`.

#### 6.2.2 `hw-wand` — Ollivanders (Wand Chooser)
- **Lore:** "a varinha escolhe o bruxo"; Ollivander mede, faz perguntas estranhas; varinha = madeira + núcleo + comprimento + flexibilidade; três núcleos de Ollivander: pelo de unicórnio, corda de coração de dragão, pena de fênix. O Pottermore usava um conjunto de perguntas e dezenas de milhares de combinações (≈33 mil).
- **Função:** questionário **server-side** (mesma disciplina anti-gaming do Chapéu: sem alternativa óbvia, pesos ocultos, ordem embaralhada) → combinação determinística por perfil + fator aleatório controlado; cena na loja.
- **ArcaneMP:** objeto de varinha visual do jogo via looks/gear do Foundation **[VERIFICAR .d.ts]**; cor do brilho de conjuração por jogador (1.13.0 "tint wand's cast glow").
- **Emite:** `hw:wand:chosen`. **Consome:** `hw:letter:received`.
- **Dados:** `hw_wand` (wood, core, length_in, flexibility, chosen_at). Faixas válidas ficam em `hw-canon` **(verificar com fonte Tier B antes de fixar)**.

#### 6.2.3 `hw-express` — Plataforma 9¾ e Expresso de Hogwarts
- **Lore:** o trem parte de King's Cross às 11h do dia 1º de setembro; atravessar a barreira entre as plataformas 9 e 10; compartimentos; carrinho de doces.
- **ArcaneMP:** `World.hogwartsExpress` (mesmo trem para todos, com a timetable do jogo). Amostra oficial `hogwarts-express`.
- **Função:** viagem inaugural de cada ano; chat IC entre alunos; chegada a Hogsmeade Station → carruagens/barcos (primeiranistas atravessam o lago em barcos conduzidos por Hagrid — cânone dos livros).
- **Risco:** King's Cross **não existe** no jogo → cena de Moment (CEF) ou mapa de mod (seção 10).

#### 6.2.4 `hw-sorting` — **O Chapéu Seletor** (spec base: arquivo anexado `especifica_o_t_cnica_sistema_chap_u_seletor.md`)

**O arquivo anexado é a fonte de verdade das regras do motor, do banco de perguntas e dos pesos.** Mantenha uma cópia em `docs/specs/sorting-hat.md` do repositório. Este GDD só define **a adaptação ao ArcaneMP** e a **cascata**.

**Regras preservadas do anexo (não alterar sem decisão do dono):**
- `HouseKey = 'G' | 'R' | 'H' | 'S'`; sem alternativa 1:1 com casa; pesos primário/secundário/residual (soma ≈ 3,4–3,6).
- 8 perguntas sorteadas de um banco ≥ 12; **Fisher-Yates** nas alternativas; nunca `sort(() => Math.random() - 0.5)`.
- **Hatstall:** se `diff(1ª, 2ª) < 1.6` ao fim da 8ª pergunta → 9ª pergunta de desempate; depois `DELIBERATING` por 2200–2600 ms citando a 2ª casa.
- Zero pontuação parcial visível.

**Adaptações obrigatórias ao ArcaneMP:**

| Item do anexo (web) | Implementação no servidor RP |
|---|---|
| "Rodar preferencialmente em Server Action" (§6.2) | **Obrigatório:** todo o motor roda em `server/` do resource. O cliente recebe **apenas** o texto da pergunta e as alternativas já embaralhadas com **tokens opacos de uso único**; nunca `weights`, nunca `id` que revele a casa. |
| `SortingSessionState` em memória do componente | Sessão **persistida** (`hw_sorting_session`) para que **desconectar não permita re-sortear** perguntas até cair em um banco favorável. Reconexão retoma a mesma pergunta. |
| UI em página web | Painel **CEF** sobre a cena no Salão Principal, com sussurros do Chapéu **visíveis só ao sorteado**. |
| Resultado em "carta/pergaminho" | Carta personalizada **entregue por coruja** pós-cerimônia (`letterParagraphs` do anexo) + cartão de pergaminho em CEF. |
| Cópia/reiniciar | **Sem reinício livre.** Um sorteio por personagem; re-sorteio só via `hw-admin` (auditado) ou evento narrativo. |
| Sem alert/confirm | Idem (CEF inline). |

**Encenação (imersão):**
1. Convocação no banquete de abertura: a Profª McGonagall (NPC) chama os alunos em fila (ordem canônica: pela lista, não pelo "mais rápido").
2. O sorteado senta no banquinho; o Chapéu (`Character.create` classe Sorting Hat, **[VERIFICAR .d.ts]**) cobre a cabeça. `stopPlayerInput` **até o veredito**.
3. As perguntas aparecem como **pensamentos do Chapéu** (sussurro privado). O salão **não** ouve o raciocínio.
4. Na deliberação, a UI cita a 2ª casa (comportamento do anexo). Em Hatstall, o Chapéu "demora": o salão percebe o silêncio (NPCs murmuram via `Audio.setDialoguePolicy`/falas).
5. O veredito é **gritado ao salão** (fala/legenda para todos); mesa da casa aplaude; `restore input`.
6. Canon: o Chapéu leva em conta a **escolha** do aluno (um dos temas mais importantes da saga). A pergunta de desempate do anexo já codifica isso — mantenha.

**Cascata após `hw:sorting:completed` (ordem lógica):**

```
hw:sorting:completed
 ├─ hw-houses      → grava casa; aplica casa no jogo; dá acesso à sala comunal CERTA e ao dormitório;
 │                   define spawn/respawn no dormitório; troca vestes/gravata (looks); apresenta o fantasma da casa
 ├─ hw-housecup    → cria conta de pontos individual; liga ao placar da casa e às ampulhetas
 ├─ hw-greathall   → lugar à mesa da casa; banner de casa no salão
 ├─ hw-curriculum  → gera grade horária do ano 1; atribui Diretor(a) de Casa como tutor
 ├─ hw-owlpost     → carta do(a) Diretor(a) da Casa (+ senha da sala comunal, regras da casa)
 ├─ hw-collectibles→ distintivo de casa no baú; card de Sapo de Chocolate do Fundador
 ├─ hw-quidditch   → registra elegibilidade (3º+ ano? ver 6.5.3), cadastro de seleção
 ├─ hw-npcs        → monitor/prefeito da casa passa a "reconhecer" o novato
 └─ hw-director    → flag de arco (ex.: hatstall raro vira gancho de rumor)
```

**Dados:** `hw_sorting_session` (status, question_ids, current_index, scores, hatstall, started_at) e resultado em `hw_character_profile` (`house`, `secondary_house`, `hatstall`, `sorted_at`). `scores` **só no servidor**.

**DoD específico:** checklist da seção 7 do anexo **+** (a) nenhum peso trafega ao cliente (inspecionar rede/CEF); (b) desconectar/reconectar mantém as mesmas perguntas; (c) rate limit de respostas; (d) Hatstall e deliberação testados; (e) `hw:sorting:completed` dispara todos os consumidores da cascata.

#### 6.2.5 `hw-houses` — Casas, salas comunais, fantasmas, Diretores
Ver dados canônicos na seção 8.1. Responsabilidades: pertencimento, **controle de acesso por casa** às salas comunais, enigma da Corvinal, tradições, fantasma-residente (Nick, Frei Gorducho, Dama Cinzenta, Barão Sangrento — via `Character.create` ghosts), Diretor(a) de Casa, cores/escudos e mudança de casa (apenas admin/narrativa).

### 6.3 Tier 2 — Acadêmico

#### 6.3.1 `hw-curriculum` — Currículo, grade e aulas
- **Lore:** 7 anos; **1º ano**: Astronomia, Feitiços, Defesa Contra as Artes das Trevas, Herbologia, História da Magia, Poções, Transfiguração, mais **Voo** (aulas de Madame Hooch). **A partir do 3º ano**, optativas: Trato das Criaturas Mágicas, Adivinhação, Aritmancia, Estudos de Runas Antigas, Estudo dos Trouxas. **NOMs** (5º ano), **NIEMs** (7º). Aparatação é curso extra (idade 17 para a licença).
- **Função:** framework de **sessão de aula**: o jogador se matricula, o horário vem do `hw-clock`, o professor (NPC) chega na sala, aula tem fases (introdução → prática → avaliação/pontos). Cada matéria é um **plugin** que implementa a interface `ClassSession`:

```js
// contrato (pseudo-código)
ClassSession { subject, minYear, onStart(ctx), onPlayerAction(ctx, action), onEnd(ctx) => { grade, points } }
```
- **Presença:** faltar tem consequência diegética (detenção/ponto), não um "bloqueio" de sistema.
- **Emite:** `hw:class:started/ended`. **Dados:** `hw_enrollment`, `hw_attendance`, `hw_grade`.

#### 6.3.2 `hw-spells` — Grimório de Feitiços
- **Função:** registro de feitiços com `minYear`, `era`, pré-requisitos, dificuldade e **domínio** (aprendeu → praticou → dominou). Aprendizado por aulas (`Scripts podem conduzir aulas de feitiço do jogo` e **definir aulas e feitiços próprios**, 1.10.0).
- **ArcaneMP:** `spellCast`, spells customizados (a amostra oficial `spellcraft` inclui **quatro variantes de Expecto Patronum**), cooldowns, loadout validado (1.7.0).
- **Gating canônico:** feitiços de nível básico no 1º ano (Lumos, Nox, Alohomora, Wingardium Leviosa); duelo (Expelliarmus, Stupefy) só no contexto do clube/aula; **Patrono corpóreo = avançado** (1993–94 em diante, com Lupin). **Maldições Imperdoáveis**: bloqueadas por padrão para jogadores — canonicamente levam a prisão perpétua em Azkaban; só liberadas por decisão narrativa/staff (ver `hw-ministry`).
- **Aviso:** a tabela "feitiço → ano" é **adaptação de design**, não lista canônica oficial; registrar `source.note = "design"` quando não houver cena nos livros.

#### 6.3.3 `hw-dada` — Defesa Contra as Artes das Trevas
- **Lore:** professor muda todo ano (tabela 3.2); estilos de aula muito diferentes (Quirrell, Lockhart, Lupin com bicho-papão/Riddikulus, "Moody", Umbridge teórica).
- **ArcaneMP:** mesa de duelo da aula de DCAT (1.12.0), PvP com regras, pares e times.
- **Função:** aulas **dependentes da era**: o *tema do ano* altera atividades. Preparar as variantes só para as eras habilitadas.

#### 6.3.4 `hw-flying` — Aulas de Voo e Vassouras
- **Lore:** Madame Hooch; primeiranistas **não têm vassoura própria** (regra de Hogwarts); aula com vassouras da escola; "Para cima!".
- **ArcaneMP:** vassouras, multiplicador de velocidade e nível de upgrade definidos pelo servidor (1.9.0), mira com crosshair em voo (1.11.0), vassouras pintadas nas cores da casa.
- **Função:** licença de voo (progressão), arco de provas para o Quadribol.

#### 6.3.5 `hw-potions` — Poções (calabouços)
- **Lore:** Prof. Snape (ou Slughorn em 96–97); poções clássicas (Cura de Furúnculos, Sono, Esquecimento, Polissuco [2º ano], Felix Felicis [Slughorn]); ingredientes controlados — o armário privativo do Mestre de Poções é restrito; Veritaserum é regulado.
- **ArcaneMP:** API `Brewing` (tipos declarados em 1.11.1), inventário do servidor, loot de ingredientes (foragables/moonstones do servidor).
- **Função:** receita → ingredientes → qualidade → nota; **poções restritas** exigem autorização de professor/Ministério (por evento, não por menu).
- **Emite:** `hw:potion:brewed`.

#### 6.3.6 `hw-herbology` — Herbologia
- **Lore:** Estufas; Profª Sprout; Mandrágoras (2º ano), Visgo-do-diabo, Salgueiro Lutador.
- **ArcaneMP:** API `Herbology`, foragables com loot do servidor.
- **Função:** cultivo com cronograma do `hw-clock`; abastece `hw-potions`.

#### 6.3.7 `hw-creatures` — Trato das Criaturas Mágicas
- **Lore:** optativa do 3º ano; Hagrid (a partir de 93–94); classificação do Ministério em escala **X–XXXXX** para periculosidade.
- **ArcaneMP:** captura com **Nab-Sack** arbitrada pelo servidor, **vivário** da Sala Precisa (rosters, alimentação, byproducts, criação), cuidados nativos, formas animais, montarias.
- **Função:** cuidado diário, avaliação, regras de conservação (consequência por maus-tratos), fonte de ingredientes. Detenções na Floresta Proibida cruzam aqui.

#### 6.3.8 `hw-exams` — Provas
- **Lore:** conceitos **O (Ótimo), E (Excede Expectativas), A (Aceitável)** e **P (Péssimo), D (Deplorável), T (Trasgo)**; provas de fim de ano em junho; NOMs (5º ano) e NIEMs (7º).
- **Função:** consolida notas das aulas e provas práticas; gating para anos/optativas; emite `hw:exam:graded`.

### 6.4 Tier 3 — Convívio e competição

#### 6.4.1 `hw-housecup` — Taça das Casas (o coração do loop social)
- **Lore:** pontos concedidos por professores (e retirados por infrações); Taça entregue no banquete final com salão decorado nas cores da casa vencedora; as casas competem o ano todo (somando também a Taça de Quadribol, que é separada).
- **ArcaneMP:** **pontos de casa são do servidor** (1.6.0) e aparecem nas **ampulhetas**. Mantenha o ledger no `hw-housecup` e **sincronize** o placar do jogo via adapter.
- **Regras:** razão sempre **justificada** (`reason` diegético: "Pela poção impecável"); autoridade limitada por papel (professor > monitor > aluno); teto/ritmo por dia (anti-farm); nunca por pura quantidade de ações repetitivas.
- **Emite:** `hw:points:awarded/deducted`. **Consome:** quase tudo (aulas, poções, Moments, duelos, Quadribol, infrações).
- **Final de ano:** cerimônia com contagem e (cânone) reviravolta possível; entrega da Taça; reset.

#### 6.4.2 `hw-discipline` — Regras, Monitores, Detenção
- **Lore:** Argus Filch e a Sra. Nor-r-ris; toque de recolher; proibido magia em corredores; Seção Reservada da biblioteca só com bilhete de professor; Floresta Proibida; Hogsmeade apenas do 3º ano em diante e com autorização; monitores a partir do 5º ano; Monitor-Chefe no 7º.
- **Função:** infrações geram `hw:rule:broken`; NPCs patrulham (caminhos autorais) e reagem; detenção com Filch/Hagrid como missões diegéticas.
- **ArcaneMP:** zonas com eventos de entrada/saída (toque de recolher, Seção Reservada), Disillusionment e invisibilidade como contramedidas legítimas, NPC walk paths.

#### 6.4.3 `hw-greathall` — Salão Principal
- **Lore:** teto encantado refletindo o céu, ampulhetas das casas, quatro mesas, banquetes de início e fim de ano, Halloween; anúncios do Diretor.
- **ArcaneMP:** `World.setMeal`, banners do salão, relógio/clima, ampulhetas.
- **Função:** orquestra banquetes e cerimônias (Sorting, Taça, Halloween), coordena `hw-sorting`/`hw-housecup`.

#### 6.4.4 `hw-quidditch` — Quadribol
- **Lore:** 7 jogadores por time (3 Artilheiros, 2 Batedores, 1 Goleiro, 1 Apanhador); bolas: Goles, 2 Balaços, Pomo de Ouro (o Pomo vale 150 pontos; cada gol 10); jogos entre casas ao longo do ano; Madame Hooch como juíza; seleções conduzidas por capitães; a Taça de Quadribol é separada da Taça das Casas.
- **ArcaneMP:** **o jogo não tem Quadribol nativo** — `WorldObjects` com física/Blueprints "suficiente para rodar um campo de Quadribol" (1.9.0), atividade de perseguir pomo (1.11.0), vassouras com multiplicador de velocidade, aros como colisores/zonas.
- **Função:** seleção/teste (autoridade do capitão e da professora), partidas agendadas pelo `hw-clock`, árbitro NPC, narração ao vivo (comentarista NPC), placar → `hw-housecup`.
- **Regra de elegibilidade:** decidir política de ano mínimo (canon: primeiranistas não podem ter vassoura própria; exceções existem no cânone, como o caso de Harry em 1991) — **decisão aberta**.
- **Risco alto:** o mais caro de produzir. Fase 3 em diante.

#### 6.4.5 `hw-duelclub` — Clube de Duelos e PvP
- **Lore:** Clube de Duelos de 1992 (Lockhart), cerimônia de saudação, feitiços de desarme/atordoamento como padrão; Armada de Dumbledore (1995–96) na Sala Precisa.
- **ArcaneMP:** PvP com regras/pares/flags/times, **derrota ajoelhada**, **wand-link**, `Pvp.getVitals`, dano por parte do corpo.
- **Função:** duelos formais com regras (feitiços permitidos, rodadas), ranking opcional, pontos de casa **limitados** (anti-farm). Combate fora do clube só por narrativa/RP aprovado.

### 6.5 Tier 4 — Mundo e economia

| Resource | Propósito | Lore | ArcaneMP / observações |
|---|---|---|---|
| `hw-economy` | Moeda e cofres | 1 Galeão = 17 Sicles; 1 Sicle = 29 Nuques; Gringotts (goblins, cofres numerados) | **Foundation já é dono de dinheiro** → este resource **estende, não duplica** (**[VERIFICAR contratos do Foundation]**). Lojas por NPC. |
| `hw-diagon` | Beco Diagonal | Caldeirão Furado, Gringotts, Olivaras, Floreios e Borrões, Madame Malkin, Empório de Corujas Eeylops, Mercado de Poções/Boticário, Artigos de Qualidade para Quadribol, Sorveteria Florean Fortescue; Travessa do Tranco (Borgin e Burkes) | **Não existe no jogo** → ver "escada de fidelidade" (seção 10). |
| `hw-hogsmeade` | Hogsmeade | Dedosdemel, Zonko's, Três Vassouras, Cabeça de Javali, Agência de Correio, Gladrags, Scrivenshaft's, Dervish & Banges, Madame Puddifoot's; visitas só do 3º ano em diante | Hogsmeade **existe** no jogo; reskin de lojas via NPCs/objetos; `Doors`, loot, mapas. |
| `hw-owlpost` | Correio/Corujas | Coruja-correio entre alunos e do mundo exterior; Berrador | `mailRead`; atividades (abrir Berrador); cartas como UI principal do jogo (pilar P1). |
| `hw-collectibles` | Sapos de Chocolate, distintivos, baú | Cards dos Sapos de Chocolate (bruxos famosos); Feijõezinhos de Todos os Sabores | Itens do servidor (inventário). Inspirado no baú do Pottermore. Coleção por conjuntos → pontos/cosméticos. |
| `hw-prophet` | O Profeta Diário | Jornal do mundo bruxo | Gerado de eventos (`points`, `quidditch`, `arc`) + texto editorial; **agentes de IA ajudam no texto em tempo de produção**, com revisão de staff. |
| `hw-ministry` | Lei bruxa | Ministério da Magia; Departamento de Execução das Leis da Magia, Aurores; Estatuto de Sigilo; Maldições Imperdoáveis → Azkaban; St. Mungo's | Fora do jogo nativo → modelado como **correio e NPCs**, sem mapa. Controla permissões sensíveis (poções restritas, maldições). |

### 6.5.1 Convenções de economia
- Sinks e sources registrados; nada de dinheiro "do nada" sem `reason` canônico.
- Preços em Galeões/Sicles/Nuques sempre com **fonte de design** documentada.
- **Lista de material 1º ano** (cânone, dados no `hw-canon`): *O Livro Padrão de Feitiços (Grau 1)*, *Uma História da Magia*, *Teoria da Magia*, *Guia de Transfiguração para Principiantes*, *Mil Ervas e Fungos Mágicos*, *Poções e Beberagens Mágicas*, *Animais Fantásticos e Onde Habitam*, *As Forças das Trevas: um Guia de Autoproteção*; varinha, caldeirão de estanho, frascos de cristal ou vidro, telescópio, balança de latão; vestes pretas; uma coruja, gato **ou** sapo.

### 6.6 Tier 5 — Narrativa viva

#### 6.6.1 `hw-moments` — "Moments" (a assinatura do Pottermore)
- **Lore/Inspiração:** cenas interativas ilustradas dos livros, com itens escondidos (cards, Galeões, ingredientes, feijões) e informação nova de Rowling.
- **Função:** engine genérica de **cena com hot-spots** (CEF ou no mundo 3D via zonas + `objectInteracted`). Cada Moment: fonte canônica, hot-spots, recompensas, estado "visto/completo", gancho de eventos.
- **Papel estratégico:** **escada de fidelidade** — onde falta mapa (Beco Diagonal, King's Cross, Ministério), o Moment 2D entrega a experiência sem produção 3D.
- **Emite:** `hw:moment:completed`, `hw:item:collected`.

#### 6.6.2 `hw-secrets` — Passagens, Sala Precisa e mistérios
- **Lore:** 142 escadarias (algumas mudam de lugar), degraus que somem, passagens atrás de espelhos/estátuas, Sala Precisa (7º andar; aparece conforme a necessidade), Câmara Secreta, mapa do Maroto.
- **ArcaneMP:** salas da Sala Precisa por id, trancas de porta, `Doors.allowUnlock`, portões/runas, colisores, escritório do Diretor (gárgula fixável), escadas do dormitório, esconder objetos do mundo, mapa do jogador (waypoint/fog legível/restaurável).
- **Função:** descoberta como recompensa; rumores via Profeta/Director.

#### 6.6.3 `hw-npcs` — Elenco canônico
- **Função:** registro de NPCs (professores, fantasmas, Filch, Hagrid, Madame Pomfrey, Madame Pince, elfos-domésticos nas cozinhas, centauros), rotinas diárias vinculadas ao `hw-clock`, nome/cargo **por era** (`EraGate`).
- **ArcaneMP:** `NPC.create`/`Character.create`, caminhos autorais, follow, rotinas; limites de população.
- **Regra:** NPCs de assets do Hogwarts Legacy (1890s) **devem ser reskin/renomeados** ou ocultos quando conflitarem com a era.

#### 6.6.4 `hw-director` — O Narrador (Storyteller)
- **Função:** agenda de **arcos** (ex.: um mistério de ano letivo) com *beats* que disparam `hw:arc:advanced`; ajusta ritmo conforme população e engajamento; cria pressão narrativa sem quebrar o cânone (seção 3). **Não toma decisões de staff**: propõe, GM aprova.
- **IA em tempo de execução (opcional, desligada por padrão):** geração de manchetes/rumores/diálogos de NPC com LLM, sob **guard-rails**: contexto = apenas `hw-canon` da era; saída filtrada por checagem de cânone; cache; fallback offline; revisão humana em conteúdo que afeta o mundo.

### 6.7 Sistemas transversais de qualidade
- **Observabilidade:** logs estruturados por resource; painel GM de eventos recentes.
- **Anti-abuso:** rate limit, detecção de farm de pontos, auditoria de GM.
- **Moderação:** política de linguagem ofensiva e de temas sensíveis do universo (por ex. preconceito de sangue "puro"). Se "origem de sangue" for oferecida como background narrativo, **sem vantagem mecânica**, sem insultos como mecânica de jogo, com regras de moderação claras (**decisão do dono**, seção 11).

### 6.8 Esquema de dados inicial (propostas — validar com o Foundation)

| Tabela | Campos principais |
|---|---|
| `hw_character_profile` | `character_id` PK, `enrolled_at`, `house`, `secondary_house`, `hatstall`, `sorted_at`, `year_level`, `patronus` |
| `hw_wand` | `character_id`, `wood`, `core`, `length_in`, `flexibility`, `chosen_at` |
| `hw_sorting_session` | `session_id`, `character_id`, `status`, `question_ids`, `current_index`, `scores_json`, `hatstall`, `started_at` |
| `hw_house_points_ledger` | `id`, `house`, `character_id?`, `delta`, `reason`, `by_character_id`, `ts` |
| `hw_enrollment` / `hw_attendance` / `hw_grade` | currículo e notas |
| `hw_spell_mastery` | `character_id`, `spell_id`, `level`, `learned_at` |
| `hw_collectibles` | `character_id`, `item_id`, `source`, `ts` |
| `hw_audit` | `id`, `actor`, `action`, `before`, `after`, `reason`, `ts` |

---

## 7. Gameplay loops

### 7.1 Três escalas de tempo

**Micro (minutos) — "explorar e descobrir"**
`explorar o castelo → achar Moment/segredo/ingrediente → colecionar item → ponto de casa ou item raro → nova curiosidade`

**Sessão (30–120 min) — "o dia do estudante"**
`acordar no dormitório → café no Salão Principal → aulas (hw-curriculum) → almoço/Moments → atividade da tarde (duelo, voo, estufa, criaturas, treino) → jantar com anúncios da Taça → noite: sala comunal (RP, estudo, missões) → toque de recolher (risco/recompensa de infração)`

**Macro (semanas) — "o ano letivo"**
`Expresso → Cerimônia de Seleção → aulas e provas → Halloween → Natal → Quadribol → provas finais → banquete e Taça → viagem de volta → verão/evento especial → ano seguinte (progressão)`

### 7.2 Sinergias obrigatórias (o que faz o ecossistema "conversar")

| Ato do jogador | Efeito em cadeia |
|---|---|
| Colher ervas na estufa | → ingredientes de poção → nota de Poções → pontos de casa → manchete no Profeta |
| Ser pego fora da cama | → Filch/monitor → pontos retirados → detenção na Floresta → encontro com criaturas (Criaturas/Herbologia) → ingredientes raros |
| Vencer um duelo formal | → ranking do Clube → pontos limitados → rumor no Profeta → convite para equipe/time |
| Pegar o Pomo | → +150 no jogo → pontos na Taça de Quadribol → card de Sapo de Chocolate do herói da temporada → rumor |
| Ser selecionado em Hatstall | → rumor raro → gancho de arco do Director → carta do Diretor de Casa mais pessoal |

### 7.3 Progressão do jogador
- **Eixos independentes** (evitar "um número só"): Ano letivo · Domínio de feitiços · Perícia (poções/herbologia/criaturas/voo) · Reputação (casa, professores) · Coleção.
- **Sem níveis numéricos expostos:** progressão é anunciada por cartas, notas, convites, acesso (ex.: autorização de Hogsmeade, seção reservada).
- **Fim de ciclo:** cada ano letivo fecha com **provas + banquete**, e o ano seguinte desbloqueia novas áreas/optativas.

---

## 8. Referência rápida de lore (dados para o `hw-canon`; Tier A/B)

> Itens marcados **(verificar)** precisam de confirmação com fonte antes de entrar em produção.

### 8.1 As casas

| | Grifinória | Sonserina | Corvinal | Lufa-Lufa |
|---|---|---|---|---|
| Fundador | Godric Gryffindor | Salazar Slytherin | Rowena Ravenclaw | Helga Hufflepuff |
| Cores | escarlate e ouro | verde e prata | azul e bronze | amarelo e preto |
| Mascote | leão | serpente | águia | texugo |
| Atributos | coragem, ousadia, nobreza | ambição, astúcia, recursos, liderança | sabedoria, aprendizado, inteligência | trabalho, paciência, lealdade, justiça |
| Diretor(a) de Casa (livros) | Minerva McGonagall | Severus Snape | Filius Flitwick | Pomona Sprout |
| Fantasma | Nick Quase-Sem-Cabeça | Barão Sangrento | Dama Cinzenta | Frei Gorducho |
| Sala comunal | Torre da Grifinória, retrato da Mulher Gorda, senha | Masmorras (sob o lago), parede de pedra, senha | Torre da Corvinal, aldrava de bronze em forma de águia que faz **enigma** | Subsolo perto das cozinhas, atrás de barris; bater no barril certo no ritmo (**verificar** detalhes) |

### 8.2 Hogwarts (lugares-chave)
Salão Principal (teto encantado, ampulhetas), Saguão de Entrada, escadarias móveis, Ala Hospitalar (Madame Pomfrey), Biblioteca (Madame Pince, Seção Reservada), Torre de Astronomia, Corujal, cozinhas (elfos-domésticos), masmorras (Poções), estufas, campo de Quadribol, Floresta Proibida, Lago Negro (lula-gigante, sereianos), Salgueiro Lutador, cabana de Hagrid, escritório do Diretor (gárgula), Sala Precisa (7º andar), Câmara Secreta. **Hogsmeade:** visita só a partir do 3º ano.

### 8.3 Pessoas do mundo escolar (1991–92 como referência)
Diretor: Albus Dumbledore · Vice: McGonagall (Transfiguração) · Snape (Poções) · Flitwick (Feitiços) · Sprout (Herbologia) · Binns (História da Magia, fantasma) · Sinistra (Astronomia) · Hooch (Voo/Quadribol) · Pomfrey · Pince · Filch · Hagrid (guardião das chaves e terrenos). **Mudam por ano** — ver `EraGate`.

### 8.4 Moeda
1 Galeão de ouro = 17 Sicles de prata; 1 Sicle = 29 Nuques de bronze.

### 8.5 Linha do tempo que condiciona eras
31/10/1981 queda de Voldemort · 1991 Harry começa em Hogwarts · 1992 Câmara Secreta · 1993–94 Azkaban/Dementadores · 1994–95 Torneio Tribruxo, retorno de Voldemort (junho de 1995) · 1995–96 Umbridge · 1996–97 morte de Dumbledore · 2/05/1998 Batalha de Hogwarts.

### 8.6 Sorting Hat — o que o cânone sustenta
Faz a seleção por traços **e pela escolha** do aluno; tem casos raros de **Hatstall** (Pottermore define como seleção que dura bem mais que o normal — **verificar definição exata** com fonte Tier B antes de usar numericamente); a seleção inicia o ano com o Chapéu falando ao aluno em sua mente; o Chapéu canta uma canção a cada ano (**escreva original; não copie**).

---

## 9. Roadmap e Definition of Done

### 9.1 Fases

| Fase | Objetivo | Resources |
|---|---|---|
| **F0 · Fundação** | Esqueleto, contratos, dados | `hw-adapter`, `hw-core`, `hw-canon`, `hw-persist`, `hw-clock`, `hw-ui-kit`, `hw-immersion`, `hw-admin` |
| **F1 · Identidade** | Jogador entra, é selecionado, pertence | `hw-letter`, `hw-wand`, `hw-sorting`, `hw-houses`, `hw-express` (versão Moment) |
| **F2 · Loop acadêmico** | Estudar e evoluir | `hw-curriculum`, `hw-spells`, `hw-potions`, `hw-herbology`, `hw-housecup`, `hw-greathall` |
| **F3 · Convívio** | Regras, duelos, voo, criaturas, Quadribol | `hw-discipline`, `hw-dada`, `hw-duelclub`, `hw-flying`, `hw-creatures`, `hw-quidditch` |
| **F4 · Mundo** | Economia, lojas, correio, coleção | `hw-economy`, `hw-diagon`, `hw-hogsmeade`, `hw-owlpost`, `hw-collectibles`, `hw-prophet`, `hw-ministry` |
| **F5 · Narrativa** | Moments, segredos, Director | `hw-moments`, `hw-secrets`, `hw-npcs`, `hw-director`, `hw-exams` |
| **F6 · Expansão** | Aparatação, pós-Hogwarts, Torneio, eventos sazonais | a definir |

**Primeiro marco jogável (MVP):** F0 + F1 + um fragmento de F2 (uma aula, a Taça e o Salão). Meta: *jogador entra → carta → varinha → Seleção → acorda no dormitório certo → primeira aula → ponto de casa na ampulheta.*

### 9.2 Definition of Done (qualquer resource)
- [ ] Manifest com todas as `resourceDependencies` e `priority` corretos.
- [ ] Nenhuma chamada direta à API do ArcaneMP fora do `hw-adapter`.
- [ ] Autoridade no servidor; cliente só expressa intenção; sem segredo em `clientScripts`/`sharedScripts`/CEF.
- [ ] Dados persistentes em tabela `hw_*` com migration; estado de sessão separado.
- [ ] Eventos emitidos/consumidos registrados na seção 5.3.
- [ ] Rate limit, validação, idempotência, desconexão no meio do fluxo, falha na inicialização testados.
- [ ] Textos PT-BR originais; sem trechos literais de livros; fontes no `hw-canon`.
- [ ] Respeita `EraGate`.
- [ ] Respeita o contrato de imersão (5.4).
- [ ] Testado com **build de release** (reinício) e cliente/servidor na mesma versão.
- [ ] GDD atualizado.

---

## 10. Riscos e escada de fidelidade

| Risco | Impacto | Mitigação |
|---|---|---|
| **Hogwarts Legacy = 1890s vs. livros = 1990s** | Assets, NPCs, retratos e história divergem | `EraGate`, reskin/renomear NPCs, ocultar o que conflita; livros vencem |
| **Locais inexistentes no jogo** (Beco Diagonal, King's Cross, Ministério, Quadribol) | Quebra de imersão ou custo enorme | **Escada de fidelidade:** **L0** Moment 2D no CEF → **L1** reskin de local existente (Hogsmeade) → **L2** mapa de mod via CurseForge / mapas carregáveis do ArcaneMP |
| **API em movimento** (testing releases, quebras) | Retrabalho | `hw-adapter`, testes de contrato, leitura do changelog a cada release |
| **Estado vs. persistência** (state bag ≠ banco) | Perda de dados | Regra 5.2 |
| **Dois resources donos do mesmo sistema** (Foundation) | Conflito | Declarar dependências; estender, não duplicar |
| **IA gerando lore errada** | Cânone contaminado | Seção 3.3; revisão humana; `needsReview` |
| **Farming de pontos** | Taça sem sentido | Tetos, razão obrigatória, auditoria |
| **Temas sensíveis** (preconceito de sangue etc.) | Moderação | Política explícita antes de liberar |
| **IP / marca** | Risco jurídico | Projeto de fã sem fins lucrativos; sem textos literais; sem monetização que afete gameplay |

---

## 11. Decisões em aberto (o dono precisa decidir; agentes devem **perguntar**, não assumir)

1. **Era do servidor** (`CANON_ERA`): ano letivo fixo (ex.: 1991–92), ciclo anual rotativo ou calendário que avança? *Recomendação inicial: 1991–92 como "ano 1" do servidor, porque tem menos arcos de guerra e o mistério é fechado, com `EraGate` já pronto para avançar.*
2. **`TIME_SCALE`** do relógio canônico (quanto tempo real = um ano letivo).
3. **Política de Quadribol** (ano mínimo, vassoura própria).
4. **Origem de sangue** como background narrativo? Sim/não e regras de moderação.
5. **Maldições Imperdoáveis:** nunca / somente staff / por arco.
6. **Escopo adulto:** só alunos (7 anos) ou também professores/bruxos adultos (Ministério, Profeta, Auror)?
7. **TypeScript ou JavaScript** nos resources? (O runtime consome JS; tipos via `@hogwartsmp/types`. Recomendação: TS com build para JS.)
8. **IA em runtime** (seção 6.6.4): ligar ou manter só em produção de conteúdo?
9. **Quanto reaproveitar de Foundation vs. substituir** (personagem, inventário, dinheiro).
10. **Idioma de UI:** PT-BR integral?

---

## Apêndice A — Template de spec de resource

```md
# hw-<nome>
**Tier:** · **Dependências:** · **Fase:**
**Propósito (1 frase):**
**Base na lore (fonte):**
**Mapeamento ArcaneMP (APIs + [VERIFICAR .d.ts]):**
**Eventos emitidos:** · **Eventos consumidos:**
**Dados (tabelas/migrations):**
**Fluxos principais (passo a passo):**
**Regras anti-abuso / segurança:**
**Imersão (como o jogador percebe):**
**Casos de erro e desconexão:**
**Definition of Done específico:**
```

## Apêndice B — Fontes consultadas

- ArcaneMP — Scripting: https://arcane.mp/scripting
- ArcaneMP — Changelog (até 1.13.0, 12/11/2026): https://arcane.mp/changelog
- ArcaneMP — Scripting API (referência gerada do runtime): https://docs.arcane.mp
- Repositório do mod: https://github.com/hogwarts-mp (referência do site) · Framework: https://github.com/MafiaHub/Framework
- Pottermore (2011–2012): histórico de recursos (Moments, Sorting Hat, Wand Chooser, Diagon Alley, poções, duelos, Copa das Casas, baú/Sapos de Chocolate) conforme cobertura pública de abertura e guias da época.
- Especificação anexada pelo dono: `especifica_o_t_cnica_sistema_chap_u_seletor.md` (Sistema Chapéu Seletor).
- Lore dos livros e escritos de Rowling: compilada a partir do cânone Tier A/B; itens marcados **(verificar)** exigem confirmação de fonte antes de produção.
