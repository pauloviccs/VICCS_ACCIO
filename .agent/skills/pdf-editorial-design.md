# Skill: Design Editorial & Formatação de PDF (GitHub Best Practices)

> **Fontes & Referências de Engenharia:** `anthropics/skills` (`pdf-official` / `reference.md` / `scripts/convert_pdf_to_images.py`), `slapash/weasyprint-pdf-skill`, `CSlawyer1985/html-to-pdf-skill` e `fulgur-rs/agent-skills`.

## 1. Princípios Fundamentais de Qualidade Editorial

1. **Nunca cortar, sobrepor ou fatiar texto:**
   - É **terminantemente proibido** usar `max-height` + `overflow: hidden` ou truncamento destrutivo (`.substring(...)`) em textos narrativos que devem compor o dossiê oficial.
   - Todo texto dinâmico deve ser **medido antes de ser desenhado** (`splitTextToSize` no `jsPDF` ou cálculo equivalente de bounding box) para determinar a altura exata do container antes de renderizar bordas, fundos ou elementos subsequentes.
2. **Alinhamento & Centralização Matemáticos:**
   - Em geração web → PDF, `html2canvas` frequentemente desloca textos verticais dentro de containers `flex`/`inline-flex` (especialmente ao lado de SVGs ou quando combinado com Tailwind Preflight).
   - **Padrão preferencial para documentos oficiais multi-página:** usar **motor vetorial `jsPDF`** com fontes `.ttf` embarcadas via `addFileToVFS`/`addFont` e imagens pré-decodificadas via `<canvas>`, mantendo texto selecionável, nítido em qualquer zoom e arquivo leve (abaixo de `2 MB`, respeitando limites de storage como `10 MB` no Supabase).
3. **Hierarquia Tipográfica & Medida de Leitura:**
   - **Títulos / Display:** `Cinzel` (ou `Marcellus`), espaçamento controlado e alinhamento pelo eixo geométrico exato (`align: 'center'` no centro do bloco).
   - **Corpo / Crônica:** `Crimson Pro` / `Spectral` com tamanho entre `10 pt` e `11.5 pt`, entrelinha `1.45`–`1.55`, medida confortável (`55` a `75` caracteres por linha, via margens A4 entre `16 mm` e `22 mm`).
   - **Metadados & Códigos:** Monoespaçado ou `tabular` alinhado à grade.
4. **Paginação Inteligente (Zero Órfãs/Viúvas):**
   - Toda nova seção ou parágrafo passa por `ensureSpace(neededHeightMm)`.
   - **Regra anti-órfãs e anti-viúvas (`orphans: 3`, `widows: 3`):** Nunca deixar 1–2 linhas isoladas no final de uma página nem no topo da seguinte; se restarem menos de `3` linhas viáveis, mover ou dividir o bloco em ponto limpo com mínimo de `3` linhas em cada lado.
   - **Cabeçalhos protegidos (`break-after: avoid`):** Um título de seção nunca fica sozinho no rodapé de uma página sem pelo menos 3 linhas do conteúdo seguinte.
   - **Blocos atômicos (`break-inside: avoid`):** Cards de metadados, painel da varinha e bloco de selo/assinaturas são indivisíveis.
   - **Páginas de continuação:** Todas as páginas subsequentes mantêm moldura consistente, marca d'água sutil, cabeçalho corrente (`TÍTULO · PERSONAGEM`) e rodapé paginado (`Protocolo · Página X de Y`).
5. **Assets Offline & Determinísticos:**
   - Imagens externas (selos, brasões, varinhas) devem ser armazenadas localmente (`website/public/assets/...`), pré-carregadas com `img.decode()` e convertidas para PNG/JPEG compatível via `<canvas>` (incluindo conversão de `.webp` para PNG no browser).
   - Nunca depender de fontes do sistema operacional não embarcadas para acentuação PT-BR (`ã`, `ç`, `é`, `ê`, `ó`, `—`, `•`).

## 2. Checklist Obrigatório de QA Visual (Pós-Geração)

Antes de concluir qualquer alteração em geradores de PDF:
1. Gerar um PDF de teste real usando um caso extremo (ex.: crônica completa com **3.000+ palavras**, acentos, parágrafos longos e sem quebras manuais).
2. Converter **todas as páginas** do PDF gerado em PNG (`pdf-official/scripts/convert_pdf_to_images.py` ou `pypdfium2`) e inspecionar visualmente cada página.
3. Confirmar que:
   - Nenhuma palavra ou linha está cortada vertical ou horizontalmente;
   - Todos os textos dentro de pílulas, selos, cards e linhas de assinatura estão centralizados e com respiro adequado;
   - A crônica completa está legível da primeira à última palavra;
   - O tamanho final do PDF é compatível com o bucket `character_sheets` (`<= 10 MB`).

