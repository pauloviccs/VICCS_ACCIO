# Skill: Sistema do Chapéu Seletor (Sorting Hat Engine — Fail-Proof)

> **Fontes:** `server/.agent/implementation-plans/especifica_o_t_cnica_sistema_chap_u_seletor.md` e `server/.agent/scripting/hogwarts-rp-gdd.md` (§6.2.4, §8.6).  
> **Integração ArcaneMP `1.15.1`:** `hmp-houses` (`membership`, `points`, `commonRooms`), `hmp-core` (`characters`, `metadata`), `hmp-lib` (`config`, `rateLimit`, `validation`, `input`), `hmp-mysql` (`migrate`, `transaction`).

---

## Quando Usar
Sempre que implementar ou expandir a Cerimônia de Seleção de Casas (`viccs-sorting` in-game via CEF ou módulo equivalente no portal web), garantindo algoritmo anti-manipulação (*Fail-Proof*), detecção de *Hatstall*, persistência de sessão e cascata de eventos no ecossistema.

---

## 1. Requisitos Inegociáveis (*Fail-Proof*)

1. **Zero Respostas Óbvias:** nenhuma alternativa mapeia `1:1` para uma casa. Toda opção distribui peso primário, secundário e residual entre múltiplas casas.
2. **Autoridade 100% Server-Side:** `scores`, `weights`, IDs reveladores de casa e cálculo de *Hatstall* **nunca** vão para o client (`clientScripts` ou DOM do CEF). O client recebe apenas o enunciado e as 4 opções embaralhadas com **tokens opacos de uso único**.
3. **Sessão Persistida (Anti-Reroll):** salvar a sessão no MariaDB (`viccs_sorting_sessions` via `MySQL.migrate`) para que desconectar/reconectar retome exatamente a mesma pergunta sorteada — impedindo farm de perguntas.
4. **Um Sorteio por Personagem:** sem botão livre de reiniciar no jogo; re-seleção apenas auditada por `viccs-admin` / `hmp-admin` ou arco narrativo autorizado.
5. **Imersão Total:** zero pontuação parcial, barra de afinidade ou indicador de tendência visível durante o quiz.

---

## 2. Estruturas de Dados & Contratos

```javascript
// Identificadores canônicos do motor -> mapeamento para hmp-houses
// 'G' -> 'gryffindor' | 'R' -> 'ravenclaw' | 'H' -> 'hufflepuff' | 'S' -> 'slytherin'

/**
 * @typedef {'G' | 'R' | 'H' | 'S'} HouseKey
 * @typedef {'INTRO' | 'IN_PROGRESS' | 'HATSTALL' | 'DELIBERATING' | 'COMPLETED'} SortingStatus
 */
```

* **Tabela MySQL (`viccs_sorting_sessions` via `hmp-mysql` `migrate`):**
  * `id`, `character_id` (UNIQUE para fluxo padrão), `status`, `question_ids_json`, `option_tokens_json` (mapa token opaco → índice real da opção na pergunta atual), `current_index`, `scores_json` (apenas server), `hatstall` (TINYINT), `primary_house`, `secondary_house`, `score_diff`, `started_at`, `completed_at`.

---

## 3. Regras de Negócio do Motor Puro (`server/service.js`)

### 3.1 Embaralhamento Fisher-Yates (Obrigatório)
Proibido usar `.sort(() => Math.random() - 0.5)`. Usar sempre Fisher-Yates:

```javascript
function shuffleArray(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}
```

### 3.2 Matriz de Pesos Psicológicos (`config/default.json` + override em `server/data/viccs-sorting.json`)
Cada alternativa deve somar aproximadamente `3.4` a `3.6`:
* **Peso Primário (`2.1` a `2.4`):** motivação central da escolha.
* **Peso Secundário (`0.6` a `1.3`):** nuance compartilhada (ex.: coragem calculada em `G` + `S`; justiça analítica em `R` + `H`).
* **Peso Residual (`0.0` a `0.4`):** evita zeros absolutos rígidos.

### 3.3 Máquina de Estados & Regra de *Hatstall*
1. **Início (`startCeremony`):**
   * Zera `scores = { G: 0, R: 0, H: 0, S: 0 }`.
   * Sorteia `8` perguntas distintas do banco (`QUESTION_BANK.length >= 12`) e embaralha suas `options` com Fisher-Yates.
2. **Processamento (`submitAnswer`):**
   * Valida o token opaco contra a pergunta atual + aplica `Hmp.rateLimit` no jogador.
   * Soma os pesos no servidor e avança `currentIndex`.
3. **Avaliação ao Fim da 8ª Pergunta:**
   * Ordena as 4 casas por pontuação decrescente: `[first, second, third, fourth]`.
   * Calcula `diff = first.score - second.score`.
   * **Hatstall:** se `!isHatstallTriggered && diff < 1.6` (valor parametrizado em `config.hatstallThreshold`), define `isHatstallTriggered = true`, `status = 'HATSTALL'` e anexa `HATSTALL_QUESTION` (embaralhada) como 9ª pergunta de desempate (que também respeita a escolha/bússola do aluno, conforme o cânone).
4. **Deliberação & Veredito (`DELIBERATING` → `COMPLETED`):**
   * Após a última resposta, entra em `DELIBERATING` por `2200–2600 ms` exibindo sussurro dinâmico citando `secondaryHouse` antes de anunciar `primaryHouse`.

---

## 4. Banco de Conteúdo Base (12 Perguntas + Desempate)

Armazenar em `config/default.json` (editável sem tocar em código, mantendo os pesos calibrados):

1. **Instinto & Reação** — tapeçaria no corredor ao anoitecer (`{ G:2.4, S:0.7, R:0.2, H:0.1 }`, `{ S:2.1, R:1.1, G:0.2, H:0.1 }`, `{ R:2.3, S:0.8, H:0.2, G:0.1 }`, `{ H:2.4, G:0.8, R:0.2, S:0.0 }`).
2. **Natureza & Contemplação** — 4 paisagens (`{ R:1.9, G:1.3, S:0.2, H:0.1 }`, `{ H:2.3, G:0.6, R:0.4, S:0.1 }`, `{ S:2.2, R:1.0, H:0.2, G:0.1 }`, `{ G:2.2, R:0.7, S:0.4, H:0.2 }`).
3. **Dilema Moral** — segredo de amigo vs inocente (`{ G:2.1, H:1.2, R:0.2, S:0.0 }`, `{ S:2.0, H:1.1, R:0.5, G:0.1 }`, `{ H:2.2, S:0.7, R:0.4, G:0.2 }`, `{ R:2.3, S:0.7, H:0.3, G:0.1 }`).
4. **Artefatos Antigos** — ampulheta, adaga, anel, cálice (`{ R:2.2, S:0.9, H:0.2, G:0.1 }`, `{ G:2.3, S:0.8, H:0.1, R:0.2 }`, `{ S:2.3, G:0.6, R:0.4, H:0.1 }`, `{ H:2.3, G:0.6, R:0.3, S:0.2 }`).
5. **O Espelho da Mente** — poção única na vida (`{ R:2.4, S:0.7, H:0.2, G:0.1 }`, `{ H:1.9, G:1.1, S:0.5, R:0.1 }`, `{ S:2.3, G:0.8, R:0.3, H:0.0 }`, `{ G:2.4, S:0.6, H:0.3, R:0.1 }`).
6. **Conflito & Estratégia** — plano falhando em equipe (`{ G:2.3, S:0.7, H:0.2, R:0.2 }`, `{ S:2.3, R:0.9, G:0.2, H:0.1 }`, `{ R:2.3, S:0.7, H:0.3, G:0.1 }`, `{ H:2.4, G:0.7, R:0.2, S:0.1 }`).
7. **Memória & Legado** — o que dizem na sua ausência (`{ H:2.2, G:1.1, R:0.1, S:0.1 }`, `{ R:2.3, S:0.8, H:0.2, G:0.1 }`, `{ G:2.4, H:0.7, R:0.2, S:0.1 }`, `{ S:2.4, R:0.6, G:0.4, H:0.0 }`).
8. **O Caminho Bifurcado** — ponte sobre abismo vs enigma (`{ G:2.3, S:0.6, H:0.4, R:0.1 }`, `{ R:2.3, S:0.8, H:0.2, G:0.1 }`, `{ S:2.1, R:1.0, H:0.3, G:0.1 }`, `{ H:2.3, G:0.8, R:0.2, S:0.1 }`).
9. **Injustiça Silenciosa** — crédito roubado de colega (`{ G:2.3, H:0.9, R:0.2, S:0.0 }`, `{ H:2.1, R:1.0, G:0.4, S:0.1 }`, `{ S:2.2, R:0.8, H:0.4, G:0.1 }`, `{ R:2.2, H:0.8, S:0.4, G:0.1 }`).
10. **Horas Solitárias** — noite livre sem obrigações (`{ R:2.4, S:0.5, H:0.4, G:0.1 }`, `{ S:2.3, R:0.8, G:0.2, H:0.1 }`, `{ H:2.4, G:0.6, R:0.2, S:0.2 }`, `{ G:2.3, H:0.6, S:0.3, R:0.2 }`).
11. **A Caixa Lacrada** — "Pertence àquele que souber usá-la" (`{ R:2.3, S:0.7, H:0.2, G:0.2 }`, `{ G:2.1, S:1.0, R:0.3, H:0.0 }`, `{ S:2.3, R:0.7, G:0.3, H:0.1 }`, `{ H:2.4, G:0.6, R:0.3, S:0.1 }`).
12. **O Peso da Verdade** — o que mais incomoda nos outros (`{ G:2.4, H:0.7, S:0.2, R:0.1 }`, `{ R:2.4, H:0.6, S:0.3, G:0.1 }`, `{ H:2.3, G:0.8, S:0.2, R:0.1 }`, `{ S:2.3, G:0.7, R:0.4, H:0.0 }`).
* **Desempate (`HATSTALL_QUESTION`):** bússola para guiar a vida (`{ G:3.0, H:0.4, R:0.1, S:0.1 }`, `{ R:3.0, S:0.4, H:0.1, G:0.1 }`, `{ H:3.0, G:0.4, R:0.1, S:0.1 }`, `{ S:3.0, R:0.4, G:0.1, H:0.1 }`).
* *(O texto completo dos enunciados, opções, sussurros rotativos e metadados das casas reside em `server/.agent/implementation-plans/especifica_o_t_cnica_sistema_chap_u_seletor.md`.)*

---

## 5. Adaptação In-Game (ArcaneMP) & Cascata de Eventos

1. **Encenação no Salão Principal:**
   * Travar controles via `Hmp.input.controls.acquire({ resource: 'viccs-sorting', id: 'ceremony' })` (sempre liberar em `finally` / `resourceStop` / desconexão).
   * Perguntas e deliberações aparecem no CEF apenas como sussurros privados ao aluno; o veredito final é anunciado ao salão.
   * Estética Dark Academia (`#090b10`–`#131722` + `#d4af37`) e cartão final em pergaminho (`#f6eedc` → `#eadbc0`, `Cinzel` + `Crimson Pro`), sem `window.alert`/`confirm` e navegável por teclado.
2. **Ação Imediata pós-veredito:**
   * Chamar `Houses.membership.set(player, houseSlug, { resource: 'viccs-sorting', actor: player, reason: 'Sorting ceremony' })` no `hmp-houses` (atualiza `player.house`, vestes, grupo `house:*` e acesso à sala comunal).
   * Emitir evento universal no ecossistema:
     ```javascript
     Events.emit('viccs:sorting:completed', {
         characterId,
         playerId: player.id,
         primaryHouse: houseSlug,
         secondaryHouse: secondarySlug,
         hatstall: session.isHatstallTriggered,
         scoreDiff,
         timestamp: Date.now(),
     });
     ```
   * **Consumidores opcionais da cascata (via `Events.on`):**
     * `viccs-classes`: gera grade horária inicial e tutoria de Casa.
     * `viccs-social`: envia carta de boas-vindas do Diretor de Casa por correio coruja (com senha/regras da sala comunal).
     * `viccs-collectibles`: concede distintivo da Casa e card inicial de Sapo de Chocolate.
     * `viccs-prophet` / `viccs-director`: registra gancho narrativo se `hatstall === true`.

