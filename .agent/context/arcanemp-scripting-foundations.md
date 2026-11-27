# ArcaneMP 1.15.1 & HMP Foundations v0.12.0 — Mapa de Scripting

> Referência técnica baseada na documentação oficial do **ArcaneMP** (`https://arcane.mp/scripting`) e na inspeção direta dos 30 resources base instalados em `server/resources/hmp-*` (`v0.12.0`).
> **Princípio VICCS:** Os scripts base `hmp-*` são o ponto de partida e aprendizado; os resources `viccs-*` devem **consumir, estender e expandir** essas APIs sem duplicar tabelas ou competir com o estado nativo.

---

## 1. Primitivas Reais do Runtime ArcaneMP (`1.15.1` / Framework `44.1.1`)

### Manifesto (`package.json`)
Baseado nos manifests reais em `server/resources/hmp-*/package.json`:

```json
{
  "name": "viccs-exemplo",
  "version": "1.0.0",
  "author": "VICCS Team",
  "description": "Descrição do resource",
  "mafiahub": {
    "serverScripts": ["server/main.js"],
    "clientScripts": ["client/main.js"],
    "files": ["client/main.js", "ui/**/*"],
    "exports": ["apiName"],
    "resourceDependencies": [
      { "name": "hmp-lib", "version": "0.12.0" },
      { "name": "hmp-core", "version": "0.12.0" }
    ],
    "errorBehavior": "stop",
    "priority": 20
  }
}
```

* `serverScripts`: executados no runtime **Node.js** do servidor.
* `clientScripts`: enviados e executados no runtime **V8 sandboxed** do cliente (precisam também estar listados em `files` ou acessíveis ao empacotamento quando aplicável).
* `files`: assets estáticos entregues ao cliente (HTML/CSS/JS de WebViews CEF, fontes, ícones `.png` de magias, etc.).
* `exports` + `Exports.register(name, value)`: publica namespaces/funções para outros resources.
* `Imports.get("<resource>")`: importa os exports registrados de outro resource já carregado.

### Globals e APIs Observadas nos Resources Base

* **Server-side:**
  * `Events.on(event, handler)` / `Events.onClient(event, (player, payload) => ...)` / `Events.emit(...)`: barramento de eventos (`resourceStart`, `resourceStop`, `playerConnecting`, `playerConnect`, `playerDisconnect`, `playerFastTravelComplete`, `playerTeleportComplete`, `chatCommand`, eventos `hmp:*` e eventos customizados `viccs:*`).
  * `Exports.register(name, api)` e `Imports.get(resourceName)`.
  * `PlayerManager.getById(id)` e `PlayerManager.getAll()`: resolução e listagem de jogadores conectados (**nota:** `PlayerManager.byId` não existe no runtime).
  * `ExecutionEnvironment`: versão do mod/host (ex.: `ExecutionEnvironment.modVersion`).
  * APIs nativas do host consumidas pelos módulos base e verificadas nos binários: `player.house`, `player.connected` (booleano no handle `Player`), `player.commonRooms`, `player.setFastTravelUnlocked(id, true)` / `player.fastTravel(destinationId)` (ex.: `FT_HW_GreatHall`), `player.inventory.patch(ops, {}, cb)` (aceita apenas `give`, `remove` e `move` — **nunca `equip`**), `player.gear.equip(itemId, { variation }, cb)`, `player.sendChat(...)`, `player.kick(...)`, `Spells.define(...)` e `Storage` (key/value nativo), entre outras descritas em `server/resources/hmp-*/types.d.ts`.
* **Client-side (V8 + CEF):**
  * `Web`: `createView`, `focusView`, `hideView`, `destroyView`, `emit` (painéis HTML/CSS/JS sobre o jogo).
  * `Events` (`Events.emitServer(...)`, `Events.on(...)`), `Game`, `Imports`, `Exports`, `Creator`, `CreatorPreview`, `Portrait`.
  * Controle de inputs e atalhos seguros via `Imports.get("hmp-lib").input`: `shortcuts.register` invoca `handler(physicalKey, state)` recebendo **duas strings** (ex.: `'alt'`/`'lalt'`, `'down'`/`'up'`), e não um objeto `{ state }`.

---

## 2. Inventário Completo do HMP Foundations `v0.12.0` (`server/resources/`)

| Resource | Priority | Exports Registrados | Papel & Como Expandir com `viccs-*` |
| :--- | :---: | :--- | :--- |
| `hmp-mysql` | `-1000` | `query`, `prepare`, `single`, `scalar`, `insert`, `update`, `transaction`, `migrate`, `ready`, `status` | Pool MySQL/MariaDB + `MySQL.migrate("viccs-...", [...])` com lock e `hmp_schema_migrations`. |
| `hmp-lib` | `-900` | `text`, `number`, `position`, `validation`, `rateLimit`, `locale`, `logger`, `input`, `config`, `player`, `command` | Utilitários padrão: logger `[viccs-*]`, rate limiter, validação, carregamento de config JSON e parsing de comandos/alvos. |
| `hmp-audio` | `-875` | `sounds`, `catalog`, `banks`, `dialogue`, `status` | Playback de áudio via Wwise e catálogo de efeitos sonoros/diálogos. |
| `hmp-ui` | `-850` | `notify`, `alert`, `input`, `context`, `progress`, `close`, `status` | Primitivas UI estilo `ox_lib` (notificações, diálogos, menus de contexto, barras de progresso) + base para painéis CEF customizados em `viccs-ui`. |
| `hmp-core` | `-800` | `status`, `identity`, `accounts`, `sessions`, `characters`, `groups`, `metadata`, `tickets` | Espinha dorsal de contas, sessões, personagens, grupos (`hmp_account_groups`/`hmp_character_groups`), metadata JSON e **Join Tickets** (`hogwartsmp://host:port?ticket=...`) para ponte com o website. |
| `hmp-pvp` | `-790` | `policy`, `mode`, `vitals`, `status` | Política PvP e vitais; ponto de partida para `viccs-combat`. |
| `hmp-houses` | `-750` | `membership`, `points`, `commonRooms`, `status` | Casa do personagem (`player.house`), projeção de grupo `house:*`, acesso a salas comunais (`player.commonRooms`) e ledger auditado da Taça das Casas. |
| `hmp-inventory` | `-725` | `items`, `inventory`, `containers`, `transfers`, `native`, `ui`, `status` | Inventário persistente, containers, transferências atômicas e 1.848 definições nativas (`hmp_inventory_native`). |
| `hmp-characters` | `-700` | `ui`, `appearance` | Seletor/criador headless (`Creator`/`CreatorPreview`/`Portrait`), aparência JSON, dormitório Witch/Wizard e transmog. |
| `hmp-spawn` | `-600` | `locations`, `ui`, `spawn`, `status` | Pontos de spawn e persistência de localização. |
| `hmp-blips` | `-475` | `markers`, `players`, `waypoints`, `status` | Marcadores de mapa/minimapa e waypoints dinâmicos. |
| `hmp-banking` | `-450` | `accounts`, `organizations`, `currencies`, `transactions`, `cash`, `providers`, `ui`, `status` | Contas bancárias, organizações, moedas e transações; base ideal para **Gringotts** (Galeões, Sicles e Knuts) em `viccs-economy`. |
| `hmp-interact` | `-450` | `register`, `unregister`, `get`, `list`, `trigger`, `sync`, `setEnabled`, `status` | Zonas e prompts de interação 3D; base para NPCs, aulas, caldeirões, portas e quests. |
| `hmp-activities` | `-440` | `definitions`, `sessions`, `invitations`, `status` | Sessões de atividades e convites em grupo (base para aulas, clubes e eventos). |
| `hmp-doors` | `-425` | `policy`, `grants`, `status` | Políticas e permissões de acesso em portas do castelo. |
| `hmp-world` | `-420` | `environment`, `policy`, `status` | Controle autoritativo de ambiente, clima e tempo (`viccs-world`). |
| `hmp-express` | `-418` | `train`, `status` | Lógica do Expresso de Hogwarts; conectável com o Bilhete de Embarque da plataforma web. |
| `hmp-worldstate` | `-415` | `state`, `systems`, `breakables`, `status` | Estado persistente do mundo e objetos destrutíveis. |
| `hmp-loot` | `-412` | `lootables`, `status` | Baús/itens coletáveis no mundo com persistência em `hmp_loot_takes`. |
| `hmp-beasts` | `-411` | `bag`, `menu`, `status` | Bolsa e menu base de criaturas mágicas (`viccs-beasts`). |
| `hmp-emotes` | `-410` | `emotes`, `aliases`, `favorites`, `ui`, `activities`, `status` | Animações, aliases e favoritos sociais (`viccs-social`). |
| `hmp-npcs` | `-410` | `catalog`, `spawn`, `destroy`, `clear`, `get`, `list`, `status`, `movement`, `setVirtualWorld` | Spawn, movimento e virtual worlds de NPCs (`viccs-npc`). |
| `hmp-shops` | `-400` | `shops`, `currencies`, `transactions`, `stock`, `status` | Lojas, moedas e estoque persistente. |
| `hmp-progression` | `-395` | `progression`, `talents`, `flooFlames`, `status` | Talentos, Chamas de Flu e progressão nativa (`viccs-classes`). |
| `hmp-spells` | `-390` | `catalog`, `policy`, `rules`, `providers`, `definitions`, `grants`, `lessons`, `loadouts`, `status`, ... | Desbloqueios, regras por grupo, **definições customizadas (`Spells.define`)**, lições de traçado e loadouts (`viccs-spells`). |
| `hmp-duels` | `-380` | `challenge`, `accept`, `decline`, `cancel`, `forfeit`, `status` | Fluxo formal de desafio/duelo (`viccs-combat`). |
| `hmp-jobs` | `-350` | `jobs`, `employment`, `duty`, `permissions`, `payroll`, `ui`, `audit`, `status` | Empregos, serviço (`duty`), folha de pagamento e permissões (ex.: Aurores, Professores, Ministério). |
| `hmp-business` | `-325` | `businesses`, `shops`, `offers`, `stock`, `books`, `ui`, `audit`, `status` | Negócios geridos por jogadores (Hogsmeade / Beco Diagonal). |
| `hmp-admin` | `-300` | `permissions`, `players`, `actions`, `moderation`, `audit`, `noclip`, `ui`, `status` | Moderação, bans, warnings, noclip e auditoria (`viccs-admin`). |
| `hmp-webhooks` | `-250` | `send`, `status` | Envio de webhooks server-side do servidor de jogo para o Discord. |

---

## 3. Eventos de Ciclo de Vida Já Emitidos pelo Foundations

Ao criar novos scripts `viccs-*`, conecte-se diretamente aos eventos existentes em vez de recriar hooks paralelos:

* **`hmp-core`:** `hmp:session:ready`, `hmp:session:ended`, `hmp:character:created`, `hmp:character:loading`, `hmp:character:loaded`, `hmp:character:unloading`, `hmp:character:unloaded`, `hmp:character:deleted`, `hmp:groups:changed`, `hmp:metadata:changed`.
* **`hmp-characters`:** `hmp:character:may-switch` (permite bloquear troca de personagem em combate/custódia via `payload.allow = false`), `hmp:character:selected`.
* **Contratos completos:** sempre consultar `server/resources/hmp-<nome>/types.d.ts` e `README.md` antes de implementar um novo `viccs-<nome>`.

