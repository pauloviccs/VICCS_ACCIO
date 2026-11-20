# Regras Globais — VICCS Accio HL Server

## Regras Absolutas (NUNCA quebre essas)

### 1. Server-Authoritative SEMPRE
O servidor é a **única fonte de verdade**. O client renderiza e envia requests,
mas NUNCA toma decisões de gameplay. Toda ação do jogador é uma SOLICITAÇÃO
que o server VALIDA antes de aplicar.

### 2. Config-Driven Development
Nenhum valor de gameplay é hardcoded no código. Tudo — dano de magias, preços de
items, timers de cooldown, XP por ação — vem de arquivos JSON em `config/`.
Mudar o comportamento do servidor deve ser possível editando apenas configs.

### 3. Namespace de Eventos
Todo evento emitido por resources VICCS segue o formato:
```
viccs:{resource}:{ação}
```
Eventos sem namespace são PROIBIDOS em resources VICCS.

### 4. Zero Acoplamento Direto
Resources NUNCA importam código de outros resources via require/import.
Comunicação é APENAS via Event Bus ou exports.

### 5. Consistência de Código
Todo arquivo segue `.agent/guidelines/code_style.md` sem exceções.
Indentação, naming, estrutura, comments — tudo padronizado.

### 6. UI Imersiva
Todo elemento visual segue `.agent/guidelines/ui_ux.md`.
Estética "Wizarding Elegance", paleta de cores definida, glassmorphism.
Nenhum HTML/CSS genérico.

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

