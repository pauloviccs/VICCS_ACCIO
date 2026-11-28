# Active Task — VICCS Accio RP

## Estado Atual
- **Nenhuma implementação pendente em aberto** — ciclo de correções da **Fase 2 (Imersão, Controles `Alt`/`Esc`, Vestes Iniciais e Salão Principal)** concluído, versionado (`eb29533` / `v.0.1.a`) e sincronizado no Cortex `.agent/`.
- **Verificações Recentes:** `31/31` testes em `node --test`, `33/33` `.js` (`viccs-*`) aprovados no `node --check`, `39/39` JSONs válidos e `tsc --noEmit` limpo em `website/`.
- **Ambiente local:** `0.0.0.0:27016` (`download-url: ""` em `server/server.json`), `34` resources JS ativos (`30` `hmp-*` + `4` `viccs-*`), MariaDB `hogwartsmp` em `127.0.0.1:3306`.

## Última Entrega Verificada
- Corrigidos no runtime real do ArcaneMP `1.15.1` / `hmp-lib`:
  - Assinatura `handler(physicalKey, state)` e suporte a `alt`/`lalt`/`ralt` com debounce (`80ms`) no Olho Mágico (`viccs-ui/client/main.js`).
  - Erro `attachCorners` → `injectFrameCorners` no Livro do Jogador (`viccs-ui/ui/book/app.js` + alias em `ornaments.js`) e pré-aquecimento das WebViews ocultas no `worldReady`.
  - Substituição global de `PlayerManager.byId` inexistente por `PlayerManager.getById` (`resolveOnlinePlayer`) em `viccs-ui`, `viccs-characters` e `viccs-sorting`.
  - Vestes escolares neutras (`Unaffiliated`: `Outfit_001_Basic` + `Back_001_Basic`) antes da Seleção e aplicação via `player.inventory.patch` (`give`) + `player.gear.equip` (`variation`).
  - Teleporte automático para o Salão Principal (`FT_HW_GreatHall` via `player.fastTravel` + `playerFastTravelComplete`, ou `coordinates` configuráveis) antes da abertura automática do Chapéu Seletor.

## Próxima Ação
1. Validar o fluxo completo ao vivo no cliente ArcaneMP conectado em `127.0.0.1:27016` (`ONE TWO` ou novo personagem → vestes iniciais → Salão Principal → Chapéu Seletor → Ficha/Varinha → `Alt` e `Esc`).
2. Quando aprovado ao vivo, iniciar a **Fase 3 (`viccs-houses` / `viccs-spells`)**.
