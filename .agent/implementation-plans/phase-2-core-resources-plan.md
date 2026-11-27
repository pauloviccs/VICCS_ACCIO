# Plano de Implementação — Fase 2: Core Resources & Chapéu Seletor (`viccs-*`)

> **Objetivo:** Construir sequencialmente e validar um por um os 4 primeiros scripts autorais do ecossistema **VICCS Accio** sobre **ArcaneMP `1.15.1`** + **HMP Foundations `v0.12.0`**, com 100% de aderência às skills do Cortex (`.agent/skills/`) e continuidade visual total com `website/`.
> **Ordem de Execução:** `1. viccs-core` → `2. viccs-ui` → `3. viccs-characters` → `4. viccs-sorting`.

---

## Princípios & Arquitetura Comum a Todos os 4 Scripts

1. **Ponte Real ArcaneMP `1.15.1` (`arcanemp-scripting-foundations.md`):**
   - Comunicação via `Exports.register(nome, api)`, `Imports.get('<resource>')`, `Events.on(...)`, `Events.emit(...)`, `Events.onClient(...)`, `Events.emitServer(...)`.
   - WebViews CEF via `Web.createView('fw://resources/<resource>/ui/index.html', ...)`, `Web.emit(view, ...)`, `Web.on(view, ...)` e `callEvent(...)` + `window.addEventListener(...)`.
   - Controles e inputs travados apenas via `Hmp.input.controls.acquire({ resource, id })` e liberados em `finally`, `playerDisconnect` e `resourceStop`.
2. **Modularidade, Config-Driven & Degradação Graciosa:**
   - Todo resource lê `config/default.json` + override opcional em `server/data/viccs-{nome}.json` (com modelo versionado `server/data/viccs-{nome}.example.json`) via `Hmp.config.load` / `Hmp.config.merge`.
   - Todo resource exporta `status()` e usa `safeImport()` para integrações opcionais.
3. **Separação Testável (`service.js` puro):**
   - Regras de negócio puras isoladas em `server/service.js` e validadas com o runner nativo `node --test` antes mesmo de subir o `ArcaneMPServer.exe`.
4. **Identidade Visual Única (`visual-consistency-and-magic-motion.md`):**
   - Tokens CSS idênticos ao `website/src/index.css` (`#090e17`, `#0a0f19`, `#c9b07a`, `[data-house-theme]`), cantoneiras SVG `.frame-corner`, `ArcaneDivider`, botões chanfrados `--bevel`, fontes locais empacotadas em `viccs-ui/ui/fonts/`, assets de `website/public/` (emblemas/varinhas) e sons Wwise via `hmp-audio`.

---

## Passo 1 — `viccs-core` (`priority: 20`)

**Propósito:** Espinha dorsal do ecossistema VICCS: registro de saúde dos módulos, `EraGate` (anos 2000 / Diretor Aurelian Vale Diggory por padrão), ticker global do servidor, auditoria centralizada (`viccs_audit`) e helpers universais (`safeImport`, carregamento de configs).

### Arquivos a Criar
- `server/resources/viccs-core/package.json` (`resourceDependencies`: `hmp-mysql`, `hmp-lib`, `hmp-core`, `hmp-houses`; `exports`: `["status", "registry", "era", "audit", "config", "safeImport"]`)
- `server/resources/viccs-core/config/default.json` (toggles, `canonEra` anos 2000, `tickIntervalMs`, `auditRetentionDays`)
- `server/data/viccs-core.example.json`
- `server/resources/viccs-core/server/service.js` (`createEraGate`, `createRegistry`, `mergeConfigWithDefaults`, `sanitizeAuditEntry`)
- `server/resources/viccs-core/server/database.js` (`MySQL.migrate('viccs-core', [...])` criando `viccs_audit` e `viccs_era_state`)
- `server/resources/viccs-core/server/events.js` (ponte com `hmp:session:ready`, `hmp:character:loaded`, `hmp:character:unloaded`, re-emitindo `viccs:core:playerReady`, `viccs:core:characterLoaded`, `viccs:core:serverTick`)
- `server/resources/viccs-core/server/commands.js` (`/viccsstatus` restrito a grupo `admin` via `hmp-core.groups`)
- `server/resources/viccs-core/server/main.js`
- `server/resources/viccs-core/test/service.test.js`

### Critério de Conclusão (DoD Passo 1)
- [ ] `node --test server/resources/viccs-core/test/service.test.js` passa 100%.
- [ ] Servidor sobe via `Accio_Server_Manager.bat`, aplica migration `viccs-core` em `hogwartsmp` (`hmp_schema_migrations`) e `/viccsstatus` lista saúde da base + `viccs-core`.

---

## Passo 2 — `viccs-ui` (`priority: 25`)

**Propósito:** Kit visual e sonoro compartilhado do servidor em CEF, replicando com fidelidade o `website/` e o visual ArcaneMP + assets nativos de Hogwarts Legacy (`hmp-audio`, `hmp-inventory`, emblemas e varinhas).

### Arquivos a Criar
- `server/resources/viccs-ui/package.json` (`resourceDependencies`: `hmp-lib`, `hmp-ui`, `hmp-audio`, `hmp-houses`, `viccs-core`; `files`: `["client/main.js", "ui/**/*"]`; `exports`: `["notify", "parchment", "houseTheme", "audioCue", "status"]`)
- `server/resources/viccs-ui/config/default.json` (toggles de áudio Wwise, mapeamento de sons padrão como `UI_Menu_Select`, durações de animação, tema padrão)
- `server/data/viccs-ui.example.json`
- `server/resources/viccs-ui/ui/fonts/` (cópia local de `Cinzel-Variable.ttf`, `Spectral-Regular.ttf` e licenças OFL de `hmp-ui/dist/fonts/`)
- `server/resources/viccs-ui/ui/assets/emblemas/` (4 PNGs de `website/public/assets/emblemas/`)
- `server/resources/viccs-ui/ui/assets/wands/` (11 PNGs transparentes de `website/public/wands/cutouts/` + sketches principais)
- `server/resources/viccs-ui/ui/tokens.css` (CSS compartilhado via `fw://resources/viccs-ui/ui/tokens.css`: paleta `#090e17`, `[data-house-theme]`, `.frame`, `.frame-corner`, `.divider`, `--bevel`, `--ease-arcane`, `titleGlint`)
- `server/resources/viccs-ui/ui/ornaments.js` (helpers reutilizáveis para montar cantoneiras SVG, divisor, `AccioEmblem` e pergaminho seguro sem XSS)
- `server/resources/viccs-ui/ui/parchment/index.html`, `styles.css`, `app.js` (modal diegético de Carta de Hogwarts / Avisos em pergaminho `#f6eedc -> #eadbc0` com animação suave)
- `server/resources/viccs-ui/server/service.js`, `server/main.js`, `client/main.js`
- `server/resources/viccs-ui/test/service.test.js`

### Critério de Conclusão (DoD Passo 2)
- [ ] Testes unitários passam (`node --test`).
- [ ] Abertura do modal diegético de pergaminho no cliente exibe fontes locais, emblema da casa correta (`[data-house-theme]`), animações suaves, som Wwise e fecha com `ESC` liberando `Hmp.input.controls`.

---

## Passo 3 — `viccs-characters` (`priority: 30`)

**Propósito:** Estender `hmp-characters` (sem duplicar seu seletor/criador) com metadados de roleplay (linhagem, varinha completa com família de cabo, ano letivo, patrono), ponte opcional com fichas aprovadas do **Supabase (`ACCIO_Rp`)** e Ficha Diegética in-game com retrato ao vivo (`Portrait` API) + visualização da varinha.

### Arquivos a Criar
- `server/resources/viccs-characters/package.json` (`resourceDependencies`: `hmp-mysql`, `hmp-lib`, `hmp-core`, `hmp-characters`, `hmp-houses`, `viccs-core`, `viccs-ui`; `exports`: `["profiles", "wands", "sync", "status"]`)
- `server/resources/viccs-characters/config/default.json` (catálogo das 11 famílias de varinha, madeiras/núcleos/flexibilidades canônicas, `supabaseSync` desligado por padrão com endpoint/timeout configuráveis, ano letivo inicial)
- `server/data/viccs-characters.example.json`
- `server/resources/viccs-characters/server/service.js` (normalização de ficha Supabase → perfil VICCS, validação de varinha e formatação segura da ficha)
- `server/resources/viccs-characters/server/database.js` (`MySQL.migrate('viccs-characters', [...])` criando `viccs_character_profiles` e `viccs_character_wands` indexadas por `character_id`)
- `server/resources/viccs-characters/server/supabaseBridge.js` (cliente HTTP nativo Node.js `fetch` server-only, opcional via config/env, sem vazar chaves)
- `server/resources/viccs-characters/server/handlers.js` & `commands.js` (`/ficha` e `/varinha` via `Hmp.command.createRouter`)
- `server/resources/viccs-characters/server/main.js`
- `server/resources/viccs-characters/client/main.js` & `ui/` (`index.html`, `styles.css`, `app.js` usando `fw://resources/viccs-ui/ui/tokens.css`, retrato ao vivo via `Portrait`, recorte + sketch da varinha e botão `--bevel`)
- `server/resources/viccs-characters/test/service.test.js`

### Critério de Conclusão (DoD Passo 3)
- [ ] Testes unitários da normalização de ficha/varinha e validação passam (`node --test`).
- [ ] Ao carregar personagem no jogo (`hmp:character:loaded`), perfil VICCS é criado/carregado automaticamente e `/ficha` / `/varinha` abrem a UI diegética com tema da Casa e assets de varinha.

---

## Passo 4 — `viccs-sorting` (`priority: 35`)

**Propósito:** Cerimônia oficial do **Chapéu Seletor** in-game (*Fail-Proof* + CEF Dark Academia/Pergaminho), 100% autoritativa no servidor, persistida contra re-roll por desconexão e disparando a cascata oficial sobre `hmp-houses` e o ecossistema.

### Arquivos a Criar
- `server/resources/viccs-sorting/package.json` (`resourceDependencies`: `hmp-mysql`, `hmp-lib`, `hmp-core`, `hmp-houses`, `hmp-audio`, `viccs-core`, `viccs-ui`, `viccs-characters`; `exports`: `["ceremony", "status"]`)
- `server/resources/viccs-sorting/config/default.json` (12 perguntas do banco + `HATSTALL_QUESTION` + pesos calibrados + textos das casas + `hatstallThreshold: 1.6` + `deliberationMs: 2400` + `questionsPerSession: 8`)
- `server/data/viccs-sorting.example.json`
- `server/resources/viccs-sorting/server/service.js` (motor puro: `shuffleArray` Fisher-Yates, emissão de tokens opacos por alternativa, soma server-side, detecção de *Hatstall*, máquina de estados `INTRO -> IN_PROGRESS -> HATSTALL -> DELIBERATING -> COMPLETED`)
- `server/resources/viccs-sorting/server/database.js` (`MySQL.migrate('viccs-sorting', [...])` criando `viccs_sorting_sessions`)
- `server/resources/viccs-sorting/server/handlers.js` (`Hmp.rateLimit`, `Hmp.validation`, retomada exata ao reconectar, integração com `Houses.membership.set`, atualização do perfil em `viccs-characters`, áudio Wwise e emissão de `viccs:sorting:completed`)
- `server/resources/viccs-sorting/server/commands.js` (`/chapeu` para iniciar/retomar; `/resorting <alvo>` restrito a admin com registro em `viccs_audit`)
- `server/resources/viccs-sorting/server/main.js`
- `server/resources/viccs-sorting/client/main.js` & `ui/` (`index.html`, `styles.css`, `app.js`: sussurros rotativos no topo, zero pontuação parcial no DOM, navegação por teclado `1-4`/`Tab`/`Enter`, animação `DELIBERATING` citando a segunda casa e carta final de pergaminho com brasão oficial)
- `server/resources/viccs-sorting/test/service.test.js` (testa Fisher-Yates, ausência de vazamento de pesos no payload do cliente, disparo de Hatstall quando `diff < 1.6`, idempotência/anti-reroll)

### Critério de Conclusão (DoD Passo 4)
- [ ] `node --test server/resources/viccs-sorting/test/service.test.js` valida embaralhamento, tokens opacos, Hatstall (`diff < 1.6`) e máquina de estados.
- [ ] Teste completo no servidor local (`127.0.0.1:27016`): iniciar `/chapeu`, desconectar no meio da 3ª pergunta, reconectar e confirmar que retoma a mesma 3ª pergunta; concluir cerimônia, validar mudança real em `hmp-houses` (`player.house`, vestes, acesso à sala comunal), recebimento do pergaminho final via `viccs-ui` e disparo de `viccs:sorting:completed`.



---

## Passo 5: Polimento Imersivo, Separação de Controles (`Alt` vs `Esc`), Vestes & Recuperação

Regras aplicadas a partir de `server/.agent/scripting/regras-de-implementacao-experiencia-imersiva-accio.md`:

### Respostas às 6 Perguntas Obrigatórias (Fase 2)

| Sistema | 1. Objetivo | 2. Info em 3s | 3. Ação principal | 4. Entrada/Saída sem conflito | 5. Falha/Requisito ausente | 6. Coerência/Lore/Som |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Olho Mágico (`Alt`)** | Mirar e inspecionar alvos válidos no mundo | Nome do alvo, ação, `[F]` e estado (`Disponível`/`Indisponível`/`Bloqueado`) | Confirmar interação válida (`[F]`/`Enter`) | `Alt` liga/desliga retícula sem travar câmera; `Esc` fecha antes do Livro | Mostra motivo curto em português; servidor bloqueia execução inválida | Retícula central translúcida dourada + Wwise one-shot discreto |
| **Livro do Jogador (`Esc`)** | Hub único pessoal do bruxo | Personagem, Casa, Vestes, Varinha, Aulas/Magias disponíveis | Abrir sistema disponível ou ver próximo passo | `Esc` abre quando não há modal/Olho ativo; `Esc` fecha e restaura controle; botão para configurações nativas | Oculta sistemas indisponíveis da fase ou explica requisito mínimo; permite reaplicar vestes com segurança | Tomo canônico com paleta da Casa, navegação por teclado e alvos >= 44px |
| **Onboarding & Chapéu** | Guiar vínculo -> criador -> Chapéu -> Vestes -> Varinha | Passo atual, progresso salvo e próximo comando | Responder Chapéu / confirmar etapa | Pausar Chapéu com `Esc` sem perder perguntas nem sortear outra casa; retomar no Livro/reconnect | Mensagens legíveis com tentar novamente; vínculo nunca prende jogador se opcional | Pergaminho, corte breve em fade e revelação da Casa/Varinha |

### Entregas Adicionais da Fase 2

1. **`viccs-core`:**
   - Snapshot consolidado para o Livro do Jogador (`ecosystem.getPlayerBookSnapshot`) cobrindo `hmp-houses`, `hmp-inventory` (incl. `native`), `hmp-spells`, `hmp-progression` e estado de onboarding/vestes sem quebrar `getPlayerContext`.
   - Atalho de serviço `'book'` e `'reapply-robes'` em `ecosystem.openService`.
2. **`viccs-ui`:**
   - `Alt` = **Olho Mágico** exclusivamente como retícula central de mundo (não bloqueia controles/câmera e não exibe menus pessoais); revalidação no servidor; provedor extensível `eye.registerTargetProvider` para Fases 3–6.
   - `Esc` = **Livro do Jogador** substituindo o Field Guide nativo (`Game.setPauseMenuEnabled(false)`), exibindo apenas páginas disponíveis, atualizando por eventos reais e extensível via `book.registerPageProvider`.
3. **`viccs-characters` & `viccs-sorting`:**
   - Pré-preenchimento correto de `first_name` / `last_name` no criador (`hmp-characters`).
   - Aplicação automática e não-destrutiva do uniforme escolar / vestes da Casa após a seleção no Chapéu (`robes_house` / `robes_applied` em `viccs_character_profiles`) + botão seguro **"Reaplicar Vestes da Casa"** no Livro do Jogador.
   - Pausa/retomada segura do Chapéu Seletor sem reroll, continuidade após falhas/reconexões sem repetir etapas concluídas e tela final apresentando `[ESC]` Livro do Jogador e `[ALT]` Olho Mágico.
