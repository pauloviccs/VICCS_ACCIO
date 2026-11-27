# Regras Globais — VICCS Accio HL Server

## Regras Absolutas (NUNCA quebre essas)

### 1. Server-Authoritative SEMPRE
O servidor é a **única fonte de verdade**. O client renderiza e envia requests,
mas NUNCA toma decisões de gameplay. Toda ação do jogador é uma SOLICITAÇÃO
que o server VALIDA antes de aplicar.

### 2. Config-Driven Development (Fácil Manuseio & Override Seguro)
Nenhum valor de gameplay é hardcoded no código. Tudo — dano de magias, preços de
items, timers de cooldown, XP por ação — vem de `config/default.json` (com `featureToggles`,
unidades explícitas e limites claros) e aceita override em `server/data/viccs-{nome}.json`
via `Hmp.config.load`/`Hmp.config.merge`. Mudar o comportamento do servidor deve ser possível
editando apenas configs legíveis por humanos, sem mexer em código.

### 3. Namespace & Contratos Universais de Eventos
Todo evento emitido por resources VICCS segue o formato:
```
viccs:{resource}:{ação}
```
Eventos sem namespace são PROIBIDOS em resources VICCS. Payloads de eventos e exports
públicos DEVEM manter compatibilidade (campos aditivos opcionais, nunca quebrar assinaturas
existentes sem versão/fallback) e expor `status()` para diagnóstico universal.

### 4. Zero Acoplamento Direto & Degradação Graciosa
Resources NUNCA importam código de outros resources via require/import.
Comunicação é APENAS via Event Bus (`Events`) ou `Imports.get('<resource>')` / `Exports.register(...)`.
Dependências opcionais devem ser resolvidas com importação segura (`try/catch`), garantindo que
desabilitar um módulo secundário nunca quebre o servidor — apenas desabilite a integração.

### 5. Consistência de Código
Todo arquivo segue `.agent/guidelines/code_style.md` sem exceções.
Indentação, naming, estrutura, comments — tudo padronizado.

### 6. UI Imersiva, Experiência Jogável & Contrato de Controles (`Alt` vs `Esc`)
Todo elemento visual e fluxo de jogador (WebView CEF, HUD, sobreposição ou página web) DEVE seguir `server/.agent/scripting/regras-de-implementacao-experiencia-imersiva-accio.md`, `.agent/guidelines/ui_ux.md` e `.agent/skills/visual-consistency-and-magic-motion.md`:
- **Gamificação & Continuidade:** fluxos de jogador são experiências interativas dentro do jogo (escolhas, fades, cenas, áudio breve sem loop, recuperação segura de falhas), preservando o ArcaneMP e suas APIs reais sem duplicar sistemas.
- **Contrato Estrito de Controles:**
  - **`Alt` — Olho Mágico (Mundo):** ativa mira/retículo discreto no centro da tela para observar/identificar alvos e interações válidas no mundo (`Disponível`/`Indisponível`/`Bloqueado`) e confirmar/cancelar sem abrir menu geral.
  - **`Esc` — Livro do Jogador (Sistemas Pessoais):** porta de entrada única dos sistemas do personagem (ficha, casa/vestes, varinha, aulas, evolução, magias e serviços HMP/VICCS), com estado atual, próxima ação e requisitos. Nunca abrir sobre outro modal ativo; fechar sempre libera `Hmp.input.controls`.
- **Perguntas Obrigatórias (Fases 2–6):** nenhum sistema de jogador é considerado especificado/concluído sem definir o que o jogador vê/faz, resposta e conclusão, cancelamento/recuperação de falha, persistência autoritativa, ponto real de integração HMP/ArcaneMP e preservação do front-end.
- **Identidade Visual & Assets:** continuidade exata com `website/` e ArcaneMP (`#090e17`, `#c9b07a`, `[data-house-theme]`, molduras `.frame` + `.frame-corner`, botões chanfrados `--bevel`, tipografia `Marcellus`/`Cinzel` + `Source Sans 3` + `Crimson Pro`), fontes locais e animações `--ease-arcane`.

### 7. Logs Obrigatórios
Todo resource loga com prefixo `[viccs-{nome}]`.
Inicialização, erros, e ações críticas são SEMPRE logados.

### 8. Error Handling
Operações assíncronas SEMPRE têm try/catch.
Erros de banco de dados NUNCA são expostos ao client.
Falhas silenciosas são proibidas — sempre log o erro.

### 9. Segurança
- Dados do client NUNCA são confiáveis
- SQL sempre usa prepared statements (?)
- Senhas, tokens, chaves NUNCA no código ou logs
- Rate limiting em eventos client→server
- Audit log de ações administrativas

### 10. Modularidade
Cada funcionalidade é um resource independente.
Dependencies declaradas no package.json.
Remoção de um resource NÃO deve quebrar o servidor — apenas desabilitar a feature.

## Hierarquia de Prioridade

Quando houver conflito entre diretrizes:

1. **Segurança** > tudo (nunca comprometa segurança por conveniência)
2. **Consistência** > velocidade (melhor demorar e manter padrão)
3. **Config-driven** > hardcoded (mesmo que seja "mais rápido")
4. **Server authority** > client trust (mesmo que adicione latência)
5. **Modularidade** > monólito (mesmo que pareça "overhead")

