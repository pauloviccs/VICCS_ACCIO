# Skill: Loops Pottermore, Sinergias & Definition of Done

> **Fonte:** `server/.agent/scripting/hogwarts-rp-gdd.md` (§4, §6.2–6.7, §7, §9.2) integrado aos módulos base `hmp-*` (`v0.12.0`).

---

## Quando Usar
Ao projetar sistemas de engajamento contínuo (**Taça das Casas**, **Moments**, **Disciplina/Detenção**, **Colecionáveis**, **O Profeta Diário**, **Quadribol** e **Narrador/Director**) e antes de declarar qualquer resource `viccs-*` concluído.

---

## 1. Loops de Gameplay em 3 Escalas

1. **Micro (minutos) — "Explorar & Descobrir":**
   * Explorar o castelo → encontrar *Moment* / passagem secreta / ingrediente → ganhar item colecionável ou contribuição de Casa → abrir nova pista.
2. **Sessão (30–120 min) — "O Dia do Estudante":**
   * Acordar no dormitório → café no Salão Principal → aulas (`viccs-classes`) → almoço / *Moments* → atividade da tarde (duelo, voo, estufa, criaturas) → jantar com anúncio nas ampulhetas → noite na sala comunal (RP, estudo) → risco/recompensa do **toque de recolher**.
3. **Macro (semanas) — "O Ano Letivo":**
   * Expresso → Seleção → aulas e provas → Halloween → Natal → Quadribol → NOMs/NIEMs/exames finais → Banquete & Taça das Casas → transição de ano.

---

## 2. Sinergias Obrigatórias do Ecossistema

Nenhum sistema deve ser uma ilha. Toda ação relevante emite evento `viccs:{resource}:{ação}` para gerar reação em cadeia:

| Ação do Jogador | Cadeia de Eventos no Ecossistema |
| :--- | :--- |
| **Colher erva na estufa** | `viccs:herbology:harvested` → abastece `viccs-potions` → gera nota em `viccs-classes` → concede pontos via `hmp-houses.points` → alimenta manchete em `viccs-prophet`. |
| **Quebrar toque de recolher** | `viccs:discipline:ruleBroken` → alerta patrulha NPC (`hmp-npcs`) / monitores → dedução auditada em `hmp-houses.points` → gera detenção diegética na Floresta (`viccs-beasts` / `viccs-quests`). |
| **Vencer duelo formal** | `hmp-duels` / `viccs:combat:duelEnded` → atualiza ranking do Clube → pontos limitados (teto diário anti-farm) → rumor em `viccs-prophet`. |
| **Capturar o Pomo / Gol** | `viccs:quidditch:matchEnded` → +150 pts na Taça de Quadribol → impacto na Taça das Casas → card comemorativo em `viccs-collectibles`. |
| **Completar um Moment** | `viccs:moments:completed` → entrega card/Galeão (`hmp-inventory` / `hmp-banking`) → progresso de descoberta em `viccs-quests`. |

---

## 3. Especificação dos Sistemas-Chave

### 3.1 `viccs-housecup` (Sobre `hmp-houses.points`)
* **Não duplicar banco:** usar `Imports.get('hmp-houses').points` (`award`, `deduct`, `adjust`, `standings`, `history`, `recover`), que já grava ledger transacional e sincroniza as ampulhetas do saguão.
* **Regras anti-farm:** toda concessão exige `reference` idempotente única, `reason` diegético em PT-BR, limite diário por papel (`professor > monitor > evento`) e teto por ação repetitiva.

### 3.2 `viccs-moments` (Assinatura Pottermore)
* Engine genérica de cenas ilustradas (CEF com hotspots clicáveis) ou zonas 3D (`hmp-interact`) ligada ao `EraGate`.
* Cada *Moment* define em JSON: `momentId`, `era`, `hotspots` (recompensas validadas **no servidor**, nunca confie em clique de ID arbitrário no client), estado de conclusão por personagem e eventos emitidos (`viccs:moments:completed`).

### 3.3 `viccs-discipline` (Toque de Recolher, Seção Reservada & Detenção)
* Zonas monitoradas por horário (`viccs-clock`) + permissões por ano/autorização (ex.: Hogsmeade somente `3º+ ano`, Seção Reservada somente com bilhete de professor, Floresta Proibida restrita).
* Contramedidas legítimas de RP (ex.: feitiço `Disillusionment` / furtividade) são avaliadas no servidor antes de disparar patrulha/infração.

### 3.4 `viccs-collectibles` & `viccs-prophet` & `viccs-director`
* **Colecionáveis:** cards de Sapos de Chocolate (por conjuntos), Feijõezinhos de Todos os Sabores e distintivos sobre `hmp-inventory`.
* **O Profeta Diário:** consolida eventos públicos do servidor (`points`, `quidditch`, `sorting` com Hatstall, `arcs`) em edições periódicas armazenadas em banco, revisáveis por staff.
* **Narrador (`viccs-director`):** agenda arcos de mistério com *beats* por data/população, emitindo `viccs:director:arcAdvanced`; qualquer uso de IA/geração textual fica restrito à revisão humana ou guard-rails sobre dados do `viccs-canon` (desligado por padrão em runtime).

### 3.5 Progressão Multi-Eixo (Sem "Nível Numérico Cru")
Manter eixos independentes visíveis de forma diegética (cartas, notas `O/E/A/P/D/T`, convites, autorizações de área):
1. Ano Letivo (`1–7`)
2. Domínio de Feitiços (aprendeu → praticou → dominou)
3. Perícias (Poções, Herbologia, Criaturas, Voo)
4. Reputação (Casa, Professores)
5. Coleção (*Moments*, Sapos de Chocolate, Segredos)

---

## 4. Definition of Done (DoD) para Todo Resource VICCS

Antes de considerar qualquer script `viccs-*` finalizado:
- [ ] `package.json` declara `mafiahub.exports`, `resourceDependencies` reais (ex.: `hmp-lib`, `hmp-mysql`, `hmp-core`, `viccs-core`), `errorBehavior: "stop"` e `priority` coerente (`>= 20`).
- [ ] `config/default.json` segue `$schema: "viccs-config"` com `featureToggles`, unidades/limites documentados e suporte a override em `server/data/viccs-{nome}.json`.
- [ ] Regras puras isoladas em `server/service.js` e testáveis fora do `ArcaneMPServer.exe`; zero chamada direta de outro resource fora de `Imports.get()` / `Events`.
- [ ] Autoridade 100% no servidor; `Hmp.rateLimit` + `Hmp.validation` em todo `Events.onClient`; zero segredo em `client/` ou `ui/`.
- [ ] Persistência via `MySQL.migrate('viccs-{nome}', [...])` (`hmp-mysql`) usando `character_id` do `hmp-core`, com auditoria em mutações sensíveis e idempotência.
- [ ] Exporta `status()` para diagnóstico universal do ecossistema e degrada graciosamente quando integrações opcionais não estiverem carregadas.
- [ ] Respeita imersão diegética (PT-BR original, sem `window.alert`/`confirm`, controle de foco/teclas via `Hmp.input`) e `EraGate`.
- [ ] Testado com reinício real do servidor (release behavior), desconexão no meio de fluxos e atualizado na documentação do Cortex (`.agent/`).

