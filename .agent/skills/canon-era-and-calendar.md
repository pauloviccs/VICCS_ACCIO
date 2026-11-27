# Skill: Cânone, EraGate & Relógio Canônico (`viccs-canon` & `viccs-clock`)

> **Fonte:** `server/.agent/scripting/hogwarts-rp-gdd.md` (§3, §6.1, §8, §11) integrada ao contexto do servidor **VICCS Accio**.

---

## Quando Usar
Sempre que criar conteúdo narrativo (cartas, NPCs, matérias, feitiços, eventos sazonais, jornais) ou qualquer mecânica que dependa de **ano letivo, calendário escolar, clima/feriados ou fidelidade ao Wizarding World**.

---

## 1. Política de Cânone & Anti-Alucinação

### Hierarquia de Fontes
| Tier | Fonte | Regra de Uso |
| :---: | :--- | :--- |
| **A** | Os 7 livros principais | Verdade absoluta para regras do mundo mágico e cronologia base. |
| **B** | Escritos autorais complementares (Pottermore / Wizarding World) | Cânone complementar (varinhas, Hatstall, lore de casas). |
| **C** | Livros-texto escolares (*Animais Fantásticos*, *Quadribol*, *Beedle*) | Apoio para criaturas (escala `X–XXXXX`), esporte e folclore. |
| **D** | Filmes / *Cursed Child* / outros jogos | Fora por padrão; só entra se explicitamente aprovado em config/canon. |
| **E** | *Hogwarts Legacy* | **Referência mecânica e visual** (castelo, Hogsmeade, combate), nunca fonte soberana de lore quando conflitar com A/B. |
| **F** | Wikis de fã | Nunca como fonte única; apenas pista para localizar fonte A/B/C. |
| **SERVER** | Conteúdo original do servidor VICCS | Permitido para preencher lacunas ou avançar a linha do tempo pós-1998 sem contradizer A/B. |

### Regras Inegociáveis para Agentes e Scripts
1. **Rastreabilidade:** todo registro em catálogos canônicos (`config/canon-*.json`) carrega `{ source: { tier, note }, needsReview?: boolean }`. Itens com `needsReview: true` **não entram em produção**.
2. **Zero Cópia Literal:** **nunca** copiar trechos literais dos livros, poemas ou a letra da canção do Chapéu Seletor. Escrever textos **originais** em PT-BR inspirados no tom clássico.
3. **Adaptações de Design Explícitas:** mapeamentos mecânicos que não existem prontos nos livros (ex.: lista "feitiço → ano escolar" ou preços de itens) devem ser marcados com `source.tier = "SERVER"` e documentados no config.

---

## 2. `EraGate` & Reconciliação da Era do Servidor

> **Nota Importante de Contexto:**  
> * No portal web (`website/`) e no `README.md`, a ambientação oficial do **VICCS Accio** está situada nos **anos 2000** (pós-Batalha de Hogwarts de 1998, sob a diretoria de **Aurelian Vale Diggory**).  
> * O `hogwarts-rp-gdd.md` propõe uma arquitetura *era-aware* (`EraGate`) que suporta tanto arcos clássicos (1991–1998) quanto avanços temporais.

**Regra Arquitetural:** Nunca hardcode nomes de diretores, professores (ex.: DADA anual) ou eventos históricos diretamente no código. Todo conteúdo temporal declara janela `availableFrom` / `availableUntil` e é filtrado por `EraGate` lido de `config/default.json` (com override em `server/data/viccs-core.json`):

```json
{
  "canonEra": {
    "eraId": "post-war-2000s",
    "academicYearStart": 2000,
    "headmaster": "Aurelian Vale Diggory",
    "enforceEraGate": true
  }
}
```

Assim, o servidor roda nativamente nos anos 2000 conforme o portal de pré-registro, mas mantém suporte limpo caso o staff habilite arcos temáticos, flashbacks ou avanço de anos letivos.

---

## 3. Relógio Canônico (`viccs-clock` / `viccs-world`)

Mapeia o tempo real do servidor para o **calendário escolar canônico** via `timeScale` configurável em JSON, sem depender do fuso horário individual do jogador:

* **Marcos Anuais Padrão:**
  * `01/09`: Partida do Expresso de Hogwarts (11h) + Banquete de Abertura + Cerimônia de Seleção.
  * **Sinos & Grade Diária:** blocos de aula matutinos/vespertinos e **toque de recolher** noturno (alimentam `viccs-classes`, `viccs-npc` e `viccs-discipline`).
  * **Outubro / Dezembro / Páscoa:** Halloween, férias de Natal (decoração sazonal + opção de permanecer no castelo), janela de **fins de semana em Hogsmeade** (3º+ ano) e temporada de **Quadribol**.
  * **Junho:** Provas finais (`O`, `E`, `A` / `P`, `D`, `T`, NOMs no 5º ano, NIEMs no 7º) + Banquete de Encerramento + entrega da **Taça das Casas** + transição de ano letivo.
* **Eventos Universais Emitidos:**
  * `viccs:clock:hourChanged` `{ hour, isCurfew, timestamp }`
  * `viccs:clock:dayChanged` `{ canonDate, weekday, term, timestamp }`
  * `viccs:clock:termChanged` `{ term, academicYear, timestamp }`
  * `viccs:clock:holidayStarted` `{ holidayId, name, timestamp }`
* **Integração ArcaneMP `1.15.1`:** sincronizar horário/clima/decorações por cima de `hmp-world` (`environment`) e trens por `hmp-express` (`train`), mantendo todas as escalas de tempo ajustáveis em `config/`.

