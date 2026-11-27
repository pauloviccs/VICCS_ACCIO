# Skill: Imersão Diegética, Adapter & Arquitetura Testável

> **Fonte:** `server/.agent/scripting/hogwarts-rp-gdd.md` (§0, §1, §2, §4.3, §5.1, §5.4, §6.1, §10) reconciliado com `server/resources/hmp-*` (`v0.12.0`) e ArcaneMP `1.15.1`.

---

## Quando Usar
Ao projetar ou implementar qualquer novo resource `viccs-*` — especialmente `viccs-core`, `viccs-ui`, `viccs-immersion` e integrações com APIs nativas do host ou locais ausentes no mapa base.

---

## 1. Arquitetura em Camadas (Regras Puras vs Adapter)

Para evitar que mudanças de build do ArcaneMP quebrem a lógica do servidor e para permitir testes unitários fora do jogo:

```text
viccs-{nome}/
├── package.json
├── config/default.json          # Defaults parametrizados (override em server/data/viccs-{nome}.json)
├── server/
│   ├── main.js                  # Entry point + Exports.register('status', ...)
│   ├── service.js               # Regras puras (ZERO dependência de Events/PlayerManager/host)
│   ├── handlers.js              # Ponte entre Events / Imports.get() / adapter e service.js
│   ├── database.js              # Migrations via MySQL.migrate('viccs-{nome}', [...])
│   └── commands.js              # Roteador Hmp.command.createRouter(...)
└── client/ / ui/                # Apresentação CEF + Hmp.input
```

* **Regra de Ouro:** toda matemática, validação de estado, máquina de estados e regra de lore vive em `service.js` puro (testável em Node.js sem subir o `ArcaneMPServer.exe`).
* **Ponte Centralizada (`viccs-core` / `adapter`):** chamadas diretas a APIs voláteis do host (ex.: `World.*`, `NPC.*`, `Doors.*`, `Spells.define`, `Nametags`, `Audio.setDialoguePolicy`) ficam encapsuladas em wrappers versionados e verificados nos `.d.ts` reais de `server/resources/hmp-*/types.d.ts` e na documentação `https://docs.arcane.mp`.
* **Degradação Graciosa:** módulos secundários são acessados via `safeImport('viccs-...')` (`try/catch` em `Imports.get`), e nunca via `require` cruzado.

---

## 2. Contrato de Imersão Diegética (Pilar P1)

> O jogador deve viver o mundo bruxo sem ser lembrado a todo momento que está em um servidor/jogo.

1. **Zero UI "de videogame" desnecessária:**
   * Sempre que possível, entregas narrativas chegam por **carta de coruja** (`viccs-social` / `mailRead`), **pergaminho CEF** (*Wizarding Elegance* / Dark Academia) ou **feedback no mundo** (ampulhetas das Casas, NPCs, sinos), em vez de mensagens técnicas cruas.
   * Nunca exibir pontuação oculta, chances de loot, gabaritos ou textos de debug ao jogador.
2. **Separação IC / OOC & Voz:**
   * Chat padrão é **In-Character (IC)**; OOC tem canal/prefixo explícito e discreto.
   * Alcances de voz (normal, sussurro, grito) e políticas de diálogo configuráveis via `config/`.
3. **Reconhecimento Progressivo (Anti-Metagame):**
   * Jogadores não devem enxergar automaticamente nomes completos sobre a cabeça de desconhecidos; identidade visual imediata vem de vestes/gravata (`player.house`) e apresentação RP, liberando nomes conhecidos via registro/relações.
4. **Higiene de Prompts Nativos & Input:**
   * Suprimir prompts nativos do jogo em inglês que quebrem o clima quando o servidor fornecer prompts próprios em PT-BR (`hmp-interact`).
   * Toda cena que toma controle do jogador (Chapéu Seletor, diálogo cinematográfico, minigame) **DEVE** adquirir lock nominal via `Hmp.input.controls.acquire({ resource, id })` e liberar em `finally`, `resourceStop` e `playerDisconnect`.
5. **Idioma:**
   * Textos visíveis ao jogador em **Português (Brasil)**, tom clássico e imersivo; identificadores de código, eventos e chaves de config em **inglês**.

---

## 3. Escada de Fidelidade (L0 → L1 → L2)

Locais icônicos que não existem prontos no mapa de *Hogwarts Legacy* (King's Cross / Plataforma 9¾, Beco Diagonal, Ministério da Magia, campo funcional de Quadribol) devem seguir progressão incremental de custo:

| Nível | Estratégia | Quando Usar |
| :---: | :--- | :--- |
| **L0** | **Moment 2D Interativo (CEF)** com hotspots ilustrados, áudio e recompensas server-side | MVP rápido para locais ausentes no mapa (ex.: embarque em King's Cross, visita ao cofre de Gringotts, audiência no Ministério). |
| **L1** | **Reskin / Reaproveitamento 3D** de áreas existentes (`hmp-npcs`, `hmp-doors`, `hmp-interact`, `WorldObjects`, Virtual Worlds) | Hogsmeade, salas de aula, cabanas e trechos internos do castelo. |
| **L2** | **Blueprints / Mapas de Mod / Objetos Físicos** carregados pelo ArcaneMP | Campo completo de Quadribol, arenas e expansões dedicadas em fases posteriores. |

---

## 4. Segurança, Auditoria & Idempotência

* Todo comando/evento vindo do client (`Events.onClient`) passa por **`Hmp.rateLimit`** + **`Hmp.validation`**.
* Toda mutação relevante (pontos de casa, economia, punição, mudança de casa/ano) gera registro de auditoria (`actor`, `action`, `before`, `after`, `reason`, `timestamp`).
* Handlers de eventos e transações críticas devem ser **idempotentes** (usar `reference` único em ledger de pontos/moedas como já faz `hmp-houses.points` e `hmp-banking`).

