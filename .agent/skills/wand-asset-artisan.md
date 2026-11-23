# Skill: Artesão de Varinhas & Assets Hogwarts Legacy (Wand Asset Artisan)

## Propósito & Quando Usar
Esta skill define o padrão de consistência visual absoluta para a criação, modelagem, curadoria e geração de assets visuais de **Varinhas Mágicas e Cabos de Varinha** para o **ACCIO Roleplay (Hogwarts Legacy / Arcane MP)**.
Use esta skill sempre que:
1. Precisar gerar novos assets 2D/3D ou ilustrações de varinhas e cabos que devam parecer **idênticos aos originais de Hogwarts Legacy**.
2. Criar ilustrações para o Guia de Campo (Field Guide sketches), cartas ministeriais ou fichas em PDF.
3. Especificar prompts de geração visual (Midjourney, Imagen 3, Stable Diffusion XL) mantendo a estética canônica do Wizarding World e do framework Arcane MP.

---

## 1. As 11 Famílias Canônicas de Cabos de Varinha

A partir da análise detalhada dos 83 assets de referência extraídos diretamente de *Hogwarts Legacy* (`website/.agent/assets/references/wands`), catalogamos as 11 famílias de cabos, seus materiais, geometrias e acabamentos:

| Família | Geometria Central | Materiais & Texturas | Paleta de Cores | Pomo (Pommel) |
| :--- | :--- | :--- | :--- | :--- |
| **1. Arrow (Flecha)** | Fustes afilados com ranhuras em chevron angular (penas de flecha). | Madeira de carvalho escuro, ébano polido ou resina marmorizada; anéis metálicos finos. | Black (Ébano puro), Brown (Nogueira quente), Pink Swirl (Mármore rosa perolado). | Pomo cônico biselado com anel de latão polido. |
| **2. Avian (Aviário)** | Fuste curvado organicamente simulando o pescoço e plumagem de aves de rapina. | Madeira clara de freixo, osso envelhecido ou granito cinza polido; anéis de bronze fosco. | Beige (Marfim/Osso), Brown (Cerejeira tostada), Grey (Pedra pomes/grafite). | Cabeça de águia ou falcão esculpida em bico curvado majestoso. |
| **3. Basketweave (Cesto Trançado)** | Padrão entrelaçado tipo cestaria ou couro trançado em relevo 3D. | Tiras de couro curtido, teca lavrada ou vime com fecho metálico rebites. | Black (Couro negro), Blue (Couro tingido cobalto), Red (Couro escarlate curtido). | Terminal cilíndrico reto com colar de sustentação em bronze gótico. |
| **4. Botanical (Botânico)** | Gavinhas e folhagens de acanto esculpidas envolvendo o cabo em espiral fluida. | Banho de folhas metálicas sobre madeira de faia ou cerejeira antiga. | Bronze Leaf (Bronze antigo), Gold Leaf (Ouro polido), Silver Leaf (Prata élfica). | Folha recurvada que abraça a base da mão do conjurador. |
| **5. Celestial (Celestial)** | Anéis astronômicos concêntricos, esferas armilares e marcações de fases lunares. | Metal cinzelado, esmalte azul safira, prata estelar e incrustações de meteorito. | Blue (Azul safira celestial), Light Grey (Pewter estelar), Dark Grey (Ferro meteórico). | Globo oco com anel orbital móvel em latão estelar. |
| **6. Checkerboard (Xadrez/Marchetaria)** | Mosaico geométrico xadrez de alta precisão em incrustação de pedras e madeiras. | Marchetaria de ébano e marfim, ou malaquita turquesa com tília nobre. | Blue (Lápis-lazúli), Brown (Mogno e bétula), Teal (Turquesa e cobre martelado). | Bloco cúbico facetado com cantos chanfrados em ouro velho. |
| **7. Column (Coluna Clássica)** | Caneluras verticais profundas inspiradas em colunas gregas (Jônica / Dórica). | Madeira nobre de tília, nogueira ou mármore entalhado; capitéis de latão. | Beige (Calcário antigo/creme), Dark Brown (Nogueira escura envernizada). | Capitel clássico com anéis circulares graduados. |
| **8. Corkscrew (Saca-Rolha/Espiral)** | Dupla ou tripla hélice esculpida formando fendas anatômicas para os dedos. | Madeira de teixo ou acácia torneada em torno manual, entalhes profundos. | Brown (Carvalho tostado), Light & Dark Brown (Bicolor), Teal Blue (Pátina azulada). | Espiral afilada contínua terminando em gota cônica. |
| **9. Imperial (Imperial)** | Cabo de cetro real barroco com arabescos dourados e relevos opulentos. | Bronze cinzelado à mão, ouro antigo envelhecido e madeira nobre encerada. | Brown & Gold (Mogno real e ouro 24k), Grey & Bronze (Ferro forjado e bronze). | Pomo em coroa real ou flor-de-lis estilizada. |
| **10. Orbicular (Orbicular)** | Segmentação em esferas empilhadas de tamanho decrescente com colares torneados. | Madeira maciça de sequoia, castanheiro e contas de metal polido. | Brown (Castanha polida), Gold (Esferas banhadas a ouro antigo). | Esfera perfeita de 25mm equilibrando o centro de massa da varinha. |
| **11. Regal (Régio)** | Faixas heráldicas nobres com relevo em filigrana e sulcos esmaltados. | Liga de estanho e prata imperial com esmalte vítreo azul royal. | Blue (Azul ultramarino com ouro velho). | Selo heráldico gravado em baixo relevo. |

---

## 2. Padrões Canônicos de Apresentação Visual (Pipeline de 3 Formatos)

Toda varinha no ecossistema do servidor deve obedecer a três apresentações gráficas coordenadas:

### A. Ícone 3D Isométrico (3D Macro View)
* **Formato:** PNG com canal alfa (transparência real) ou WebP.
* **Resolução:** 512×512 px ou 1024×1024 px.
* **Enquadramento:** Diagonal de 45 graus, mostrando o cabo e a junção com o fuste de madeira.
* **Iluminação:** Luz de tocha quente principal (Key Light `#FFD580`) a 45º superior, Rim Light dourada suave (`#EEBA30`) nas bordas do relevo e oclusão de ambiente suave no contato.

### B. Perfil Lateral em Macro (Wand Handle Profile)
* **Enquadramento:** Horizontal perfeito (cabo à esquerda, fuste iniciando à direita).
* **Foco:** Detalhes de marchetaria, ranhuras de desgaste, reflexo especular nos metais e textura da madeira.
* **Fundo:** Fundo escuro aveludado (`#100303`) ou pergaminho queimado com vinheta sutil.

### C. Esboço do Guia de Campo (Field Guide Parchment Sketch)
* **Estilo:** Desenho manual à bico de pena com tinta sépia e nanquim sobre pergaminho envelhecido do século XIX.
* **Técnica:** Hachuras cruzadas (*cross-hatching*), sombras pontilhadas (*stippling*), linhas guias de construção arquitetônica e anotações mágicas em latão/ouro desbotado.
* **Fundo:** Textura de papel de linho antigo com manchas de chá/tempo, bordas ligeiramente escuras e sem reflexos modernos.

---

## 3. Matriz de Prompts para Geração de Assets com IA

Quando for necessário expandir o catálogo de varinhas, use rigorosamente as seguintes estruturas de prompt:

### Template 1: Esboço do Guia de Campo (Field Guide Sketch)
```text
Hogwarts Legacy Field Guide sketch of a custom wand handle, [NOME_DA_FAMÍLIA] style, [MATERIAIS], authentic 19th-century wizarding architectural illustration, sepia ink and charcoal on antique weathered parchment, intricate cross-hatching shading, technical quill drawing, elegant antique linework, Victorian botanical field notes, no modern elements, masterwork, high resolution, 8k --ar 1:1 --no 3d render, photo, photorealistic, plastic, blur
```

### Template 2: Render 3D do Cabo de Varinha (Hogwarts Legacy Asset)
```text
Hogwarts Legacy official gear asset, wand handle close-up view, [NOME_DA_FAMÍLIA] handle style made of [MATERIAIS], attached to a polished [TIPO_DE_MADEIRA] wand shaft, Unreal Engine 5 cinematic render, dramatic warm torchlight illumination, dark atmospheric Hogwarts background, realistic wood grain texture, aged metal patina, volumetric soft shadows, 8k, hyper-detailed --ar 16:9
```

### Template 3: Ícone Transparente para UI (Game Icon)
```text
Isolated 3D game asset icon of a magical wand handle, [NOME_DA_FAMÍLIA], [CORES_E_METAIS], angled perspective, studio wizarding rim lighting, clean edges, dark fantasy RPG inventory icon, high quality, 4k --no background, white background, floor, shadow on ground
```

---

## 4. Regras Rígidas de Consistência
1. **Sem Estética Moderna:** Nenhuma varinha pode ter elementos tecnológicos, luzes neon de LED, plástico, fibra de carbono ou formatos de sabre de luz. Tudo deve remeter a marcenaria fina, metalurgia vitoriana/medieval e alquimia.
2. **Proporções Ergonômicas:** O cabo possui entre 3.5 e 4.5 polegadas (aproximadamente 9 a 11.5 cm), permitindo uma pegada confortável de mão única, enquanto o comprimento total da varinha varia de 9½ a 14½ polegadas.
3. **Pátina de Uso:** Materiais mágicos têm história; os metais devem apresentar pátina sutil nos recessos e brilho polido nas cristas onde os dedos do bruxo repousam.

