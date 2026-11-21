# Plano de Implementação — Carta de Hogwarts 3D, Zero Placeholders e Discord Gate Obrigatório

## 1. Visão Geral e Novas Diretrizes
Este plano atende às 3 correções críticas solicitadas:
1. **Banco Supabase 100% Funcional & Zero Placeholders:**
   - Remoção de qualquer dado mocado, fallbacks de "73 inscritos", botões com login simulado ("LordVoldy") ou timers fictícios.
   - Ambas as instâncias de banco no Supabase sincronizadas com as tabelas `profiles` e `character_applications` estruturadas e indexadas.
   - Contagem de inscritos e bilhetes alimentados exclusivamente pelas linhas reais do banco de dados PostgreSQL.
2. **Animação da Carta de Hogwarts (First-Visit Experience):**
   - Criação do componente `HogwartsLetterModal.tsx` com envelope realista, lacre de cera em relevo com o monograma "A", física de quebra de lacre com partículas mágicas e abertura da aba em perspectiva 3D.
   - Stack selecionada: **CSS 3D Transforms (`perspective`, `rotateX`, `preserve-3d`) + Spring Animations + HTML5 Canvas Confetti/Stardust**. Essa stack garante 120 FPS tanto em smartphones (iOS Metal / Android) quanto em desktops, sem o peso (bundle bloat) nem o atraso de inicialização de engines pesadas como Three.js.
3. **Pré-Registro com Gate Estrito via Discord OAuth:**
   - O formulário só pode ser aberto ou preenchido após autenticação real via Discord pelo Supabase Auth.
   - Se o usuário já tiver enviado uma ficha com aquele Discord ID, a aplicação carrega automaticamente o bilhete real cadastrado no banco.

---

## 2. A Stack Correta para a Animação da Carta

| Tecnologia | Função no Sistema | Por que é a escolha correta? |
|---|---|---|
| **CSS 3D Transforms (`perspective: 1200px`)** | Dobra e rotação da aba do envelope (`rotateX(-180deg)`) | Aceleração por hardware nativa pela GPU do dispositivo, sem lag de framerate. |
| **Spring Physics (CSS Transitions)** | Deslizamento suave da carta saindo do envelope | Curva de aceleração cúbica `cubic-bezier(0.16, 1, 0.3, 1)` idêntica à física de molas da Apple. |
| **Canvas Confetti & Stardust** | Efeito de quebra do selo de cera carmesim | Explosão de micro-partículas douradas e faíscas sem sobrecarregar o DOM com dezenas de `<div>`. |
| **LocalStorage State** | Persistência da visualização (`accio_letter_opened`) | Exibe automaticamente na 1ª visita; nas visitas seguintes abre direto no portal, mas mantém botão "Rever Carta" na Navbar. |

---

## 3. Limpeza Radical de Placeholders no Front-End

- **`App.tsx`:**
  - Remover contagem inicial fixa (`73`). Iniciar em `0` e carregar do `getTotalApplicationsCount()`.
  - Remover fallback de login mocado (`LordVoldy` / `mockId`). Erros de login do Discord agora são notificados de forma real e transparente.
- **`lib/supabase.ts`:**
  - Remover fallback numérico `67`. Se não houver dados ou der erro de rede, retorna `0` real.
- **`Hero.tsx`:**
  - Exibir a contagem real de linhas da tabela `character_applications`.
  - Timer regressivo calculado com base em uma data real de encerramento do 1º lote.
- **`WhitelistFormModal.tsx`:**
  - Campos em branco prontos para digitação real do usuário, sem valores pré-preenchidos artificiais.
  - Histórico de auto-save atrelado exclusivamente ao `discord_id` do usuário conectado.
- **`TicketModal.tsx`:**
  - Número do bilhete gerado pelo `registration_number` autêntico do PostgreSQL (`#ACCIO-0001`, `#ACCIO-0002`...).

---

## 4. Etapas de Execução do Código

1. **Sincronização do Supabase:** Garantir que o schema com `character_applications`, `profiles`, RLS e índices esteja executado e auditado via MCP em ambos os projetos.
2. **Construção do `HogwartsLetterModal.tsx`:**
   - Envelope em pergaminho escuro com cera em relevo e monograma "A".
   - Animação de quebra do lacre e desdobramento 3D.
   - Carta oficial de convocação com o botão "Aceitar Convocação com Discord".
3. **Refatoração de Limpeza em `src/App.tsx`, `src/lib/supabase.ts`, `src/components/Hero.tsx` e `src/components/WhitelistFormModal.tsx`:**
   - Eliminação de qualquer dado fictício.
   - Travamento rigoroso exigindo login do Discord para qualquer ação de pré-cadastro.
4. **Build & Verificação:** Compilação com `npm run build` e validação de responsividade mobile/desktop.

