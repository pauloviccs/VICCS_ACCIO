# Regras de Implementação da Experiência Imersiva

> **Tipo:** arquivo de contexto para agentes e implementadores.  
> **Escopo:** sistemas de jogador e fluxos in-game do VICCS Accio.  
> **Compatibilidade:** complementa o contexto, as convenções e os sistemas existentes; não os substitui.

## Objetivo

Toda implementação voltada ao jogador deve oferecer uma experiência interativa, contextualizada e conectada dentro do jogo. Telas administrativas, planilhas ou registros podem apoiar a operação, mas não substituem o fluxo jogável. A gamificação é requisito de implementação: usar escolhas, respostas, transições, cenas, telas diegéticas, fades, loading screens e áudio quando esses elementos ajudarem o jogador a entender e viver a ação.

## Prioridade das instruções

1. Preservar o Arcane MP como framework, runtime e base do front-end.
2. Respeitar as APIs, eventos, exports, dependências e convenções reais do Arcane MP e dos recursos HMP/VICCS existentes.
3. Aplicar este arquivo como requisito adicional de experiência do jogador.
4. Se houver conflito, não substituir silenciosamente um contrato existente: registrar o conflito e escolher uma extensão compatível com o Arcane MP.

Este documento não autoriza substituir o Arcane MP, reconstruir seu front-end ou criar uma implementação paralela dos sistemas que já existem.

## Princípios de experiência

- **O jogador conduz o fluxo.** Para cada sistema, definir o que ele vê, o que pode fazer, como o jogo responde e como conclui ou recupera a ação.
- **As telas têm continuidade.** Uma transição deve preservar contexto, progresso e identidade visual, deixando claro o que está acontecendo e qual é o próximo passo.
- **A imersão tem função.** Cenas, animações, fades e loading screens devem contextualizar chegada, mudança de etapa ou resultado. Devem ser curtos, controláveis e não bloquear o jogador sem necessidade.
- **Autonomia por controles simples.** Evitar depender de comandos de chat ou telas administrativas para ações comuns do personagem.
- **A interface dá retorno.** Toda ação deve confirmar sucesso, indisponibilidade, espera, cancelamento ou falha de modo claro e apropriado ao jogo.
- **Acessibilidade faz parte do fluxo.** Manter foco visível, navegação por teclado, alvos confortáveis, alternativas a sinais somente visuais ou sonoros e respeito a movimento reduzido.

## Contrato dos controles

### Alt — Olho Mágico

- Ativar o Olho Mágico pelo `Alt` e apresentar um ícone/retículo discreto no centro da tela, semelhante a uma mira.
- Usar a mira para identificar objetos, personagens e pontos próximos que possuam uma interação registrada e válida.
- Apresentar o nome do alvo, a ação disponível e o controle para confirmá-la. Exibir somente opções válidas para distância, estado e permissões do jogador.
- Permitir confirmar ou cancelar a ação sem abrir o menu geral. Ao desativar o Olho Mágico, limpar o alvo e devolver o controle ao jogo.
- Validar a interação novamente no servidor antes de alterar estado ou conceder resultados. A interface cliente não é autoridade para permissões ou persistência.
- Atualizar a mira de forma eficiente, sem consultas pesadas a cada quadro nem notificações repetidas.

### Esc — Livro do Jogador

- Usar `Esc` para abrir o Livro do Jogador, a entrada principal dos sistemas pessoais do personagem.
- O Livro reúne páginas para aulas, evolução, magias e os demais sistemas integrados e disponíveis ao personagem.
- Cada página informa o estado atual, a próxima ação e os requisitos pertinentes. Os dados devem refletir o progresso mais recente.
- Não usar o Olho Mágico como menu geral: `Alt` é para observar/interagir com o mundo; `Esc` é para consultar/navegar sistemas do jogador.
- Coordenar foco, captura e liberação de controles com as APIs de entrada do Arcane MP. Evitar que teclas sejam processadas duas vezes por interfaces sobrepostas. O fechamento deve restaurar o controle ao jogo.

## Entrada, spawn e onboarding

- O spawn técnico não deve ser apresentado como uma chegada brusca sem contexto. Quando o runtime permitir, cobrir a transição com fade, cena de chegada ou tela temática e iniciar a etapa jogável com retorno claro.
- Conectar as etapas relevantes em uma sequência coerente: chegada, vínculo/identidade quando necessário, criação ou confirmação do personagem, cerimônia do Chapéu Seletor, revelação da casa, aplicação das vestes e apresentação do Livro e do Olho Mágico.
- Não repetir etapas já concluídas. Restaurar o estado persistido após reconexões e conduzir o jogador à próxima etapa apropriada.
- Mostrar o motivo de uma espera. Em falha ou indisponibilidade, oferecer uma recuperação segura ou nova tentativa e nunca deixar o jogador preso indefinidamente.
- Não expor teleporte, personagem sem controle ou mudança de etapa sem feedback quando a transição puder ser apresentada de forma compatível com o cliente.

## Chapéu Seletor, casa e vestes

- Tratar a cerimônia como uma experiência dentro do jogo, com etapas narrativas, escolhas claras, feedback e revelação final. Uma tela pode apresentar as escolhas, mas o fluxo não deve parecer apenas o preenchimento de um formulário estático.
- Manter o motor de pontuação e as regras do resultado independentes da interface. Não alterar pontuação, persistência ou regras anti-reroll apenas para acomodar animações.
- Persistir o resultado oficial e a etapa concluída conforme os contratos existentes, associando a casa ao personagem correto.
- Depois que a casa for confirmada, aplicar as vestes correspondentes usando recursos e APIs disponíveis no Arcane MP/Hogwarts Legacy. Confirmar visualmente a mudança e restaurá-la de forma consistente após reconexão.
- Se a aplicação visual falhar, preservar o resultado persistido, explicar o estado ao jogador e permitir uma reaplicação segura. Não sobrescrever silenciosamente itens ou dados.
- Respeitar as regras existentes para escolha, desempate, Hatstall, elegibilidade e prevenção contra repetição não autorizada.

## Livro do Jogador

- Ser a porta de entrada única para informações e sistemas pessoais, acessível pelo Esc.
- Exibir somente páginas disponíveis ao personagem, incluindo aulas, evolução, magias e demais sistemas integrados. Cada página deve indicar estado, próxima ação e requisitos.
- Encaminhar para os recursos HMP/VICCS existentes por interfaces e eventos documentados. Evitar recriar sistemas funcionais dentro do Livro ou manter estados concorrentes.
- Atualizar o conteúdo quando eventos de progresso ocorrerem e mostrar dados atuais ao reabrir.

## Olho Mágico e objetos interativos

- A mira central deve consultar interações registradas nos recursos existentes e validar distância/linha de visão quando disponível.
- Distinguir alvo disponível, indisponível, bloqueado e sem interação. Informar brevemente a razão quando for útil, sem spammar notificações.
- Validar a ação novamente no servidor antes de alterar estado ou conceder resultados.
- Atualizar o alvo com frequência controlada, limpar estado ao desativar Alt e evitar consultas pesadas a cada quadro.

## Identidade visual, áudio e transições

- Reutilizar tokens, molduras, fontes locais, ornamentos, temas de casa e componentes compartilhados definidos pelo front-end atual do Arcane MP/VICCS.
- Fazer cada tela explicar visualmente de onde veio e para onde vai. Usar fades e loading screens para mudanças de cena, não como substituto de estado ou feedback.
- Usar eventos sonoros existentes de forma breve. Interromper cues anteriores quando necessário, limitar duração e impedir loops em ações contínuas.
- Respeitar movimento reduzido e permitir fechar ou cancelar interfaces quando a etapa permitir.

## Limites de arquitetura e compatibilidade

- Antes de implementar, verificar APIs, exports, eventos, dependências e comportamento real do runtime Arcane MP. Não presumir APIs inexistentes.
- Adicionar comportamento nos recursos VICCS ou em adaptadores compatíveis. Preservar o framework e o front-end Arcane MP; não manter uma cópia paralela.
- Se um módulo opcional estiver ausente, preservar o controle do jogador e apresentar um estado compreensível. Não falhar o spawn por indisponibilidade de sistema secundário.
- O servidor valida identidade, casa, permissões, progresso e efeitos persistentes. O cliente apresenta a experiência e solicita ações.
- Manter formatos existentes e migrações compatíveis. Não sobrescrever decisões persistidas sem regra explícita.

## Critérios de aceite

Uma implementação está pronta quando:

- o jogador entende o que está acontecendo e qual ação pode executar;
- Alt mostra o Olho Mágico central e oferece somente interações válidas;
- Esc abre o Livro do Jogador com sistemas disponíveis e dados atuais;
- o fluxo conecta spawn, cerimônia, casa, vestes e apresentação dos controles sem ruptura injustificada;
- casa, etapa concluída e vestes permanecem coerentes após reconexão;
- espera, falha, cancelamento e indisponibilidade têm retorno e recuperação compreensíveis;
- foco e controles são liberados corretamente em todas as saídas do fluxo;
- o Arcane MP e seu front-end continuam sendo a base da implementação;
- o cliente real foi conferido quanto a enquadramento, leitura, tema, áudio, transições e conflitos de entrada.

## Perguntas obrigatórias antes de implementar

1. O que o jogador verá e fará em cada etapa?
2. Como o jogo responderá a cada ação e indicará a conclusão?
3. Como o jogador cancela ou recupera uma falha sem perder estado válido?
4. Qual dado precisa persistir e qual serviço é sua autoridade?
5. Qual API, evento ou recurso existente do Arcane MP fornece o ponto de integração?
6. Como a implementação preserva o front-end e evita duplicar sistemas?

Se essas respostas ainda não estiverem definidas, o fluxo de experiência precisa ser especificado antes de considerar o sistema concluído.
