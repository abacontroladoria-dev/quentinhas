---
name: Quentinhas
description: Pedidos semanais de marmita, da escolha do funcionário ao total da cozinha.
colors:
  azul-petroleo: "#1E5A6E"
  azul-petroleo-escuro: "#154452"
  azul-petroleo-claro: "#E4EEF1"
  verde-confirmacao: "#2D7A4B"
  verde-confirmacao-escuro: "#1F5A37"
  verde-confirmacao-claro: "#E5F2EA"
  ambar-alerta: "#7E520A"
  ambar-fundo: "#FBF1DC"
  ambar-marco: "#C9922E"
  vermelho-sem: "#A8322D"
  vermelho-sem-fundo: "#FBECEA"
  branco-gelo: "#F5F7F7"
  superficie: "#FFFFFF"
  trilho-claro: "#E8EEEF"
  tinta: "#18292F"
  tinta-suave: "#566A71"
  linha: "#DCE4E6"
  linha-forte: "#B9C8CC"
typography:
  display:
    fontFamily: "Atkinson Hyperlegible Next, Atkinson Hyperlegible, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "2.125rem"
    fontWeight: 700
    lineHeight: 1.12
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
  headline:
    fontFamily: "Atkinson Hyperlegible Next, Atkinson Hyperlegible, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1.625rem"
    fontWeight: 800
    lineHeight: 1
    fontFeature: "tnum"
  title:
    fontFamily: "Atkinson Hyperlegible Next, Atkinson Hyperlegible, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.25
    fontFeature: "tnum"
  body-lg:
    fontFamily: "Atkinson Hyperlegible Next, Atkinson Hyperlegible, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.45
    fontFeature: "tnum"
  body:
    fontFamily: "Atkinson Hyperlegible Next, Atkinson Hyperlegible, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.45
    fontFeature: "tnum"
  label:
    fontFamily: "Atkinson Hyperlegible Next, Atkinson Hyperlegible, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.3
    fontFeature: "tnum"
rounded:
  marcador: "8px"
  controle: "10px"
  painel: "14px"
  pilula: "999px"
spacing:
  xs: "6px"
  sm: "12px"
  md: "16px"
  lg: "22px"
components:
  button-primary:
    backgroundColor: "{colors.azul-petroleo}"
    textColor: "{colors.superficie}"
    rounded: "{rounded.controle}"
    padding: "10px 18px"
    height: "48px"
  button-primary-active:
    backgroundColor: "{colors.azul-petroleo-escuro}"
    textColor: "{colors.superficie}"
  button-secondary:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.controle}"
    padding: "10px 18px"
    height: "48px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.azul-petroleo}"
    rounded: "{rounded.controle}"
    padding: "10px 10px"
  segmented-selected:
    backgroundColor: "{colors.azul-petroleo}"
    textColor: "{colors.superficie}"
    height: "46px"
  deslizante-trilho:
    backgroundColor: "{colors.trilho-claro}"
    textColor: "{colors.tinta-suave}"
    rounded: "{rounded.pilula}"
    height: "54px"
  deslizante-quero:
    backgroundColor: "{colors.verde-confirmacao}"
    textColor: "{colors.superficie}"
    rounded: "{rounded.pilula}"
  deslizante-nao-quero:
    backgroundColor: "{colors.tinta-suave}"
    textColor: "{colors.superficie}"
    rounded: "{rounded.pilula}"
  input-busca:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.pilula}"
    height: "46px"
  dia-faixa:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.controle}"
    height: "74px"
  painel-dia:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.painel}"
    padding: "16px"
  item-marmita:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.tinta}"
    height: "50px"
    padding: "9px 14px"
  item-marmita-retirado:
    backgroundColor: "#FAFBFB"
    textColor: "{colors.vermelho-sem}"
  etiqueta:
    backgroundColor: "{colors.azul-petroleo-claro}"
    textColor: "{colors.azul-petroleo-escuro}"
    rounded: "{rounded.pilula}"
    padding: "2px 9px"
  aviso-ok:
    backgroundColor: "{colors.azul-petroleo-claro}"
    textColor: "{colors.azul-petroleo-escuro}"
    rounded: "{rounded.controle}"
    padding: "11px 14px"
  aviso-alerta:
    backgroundColor: "{colors.ambar-fundo}"
    textColor: "{colors.ambar-alerta}"
    rounded: "{rounded.controle}"
    padding: "11px 14px"
  aviso-erro:
    backgroundColor: "{colors.vermelho-sem-fundo}"
    textColor: "{colors.vermelho-sem}"
    rounded: "{rounded.controle}"
    padding: "11px 14px"
  toast:
    backgroundColor: "{colors.azul-petroleo-escuro}"
    textColor: "{colors.superficie}"
    rounded: "{rounded.controle}"
    padding: "11px 18px"
---

# Design System: Quentinhas

## Overview

**Creative North Star: "O Quadro da Semana"**

Quentinhas é a semana de terça a segunda pendurada num quadro: cinco dias lado a lado, cada um com um marco que diz a situação num relance — confirmado, recusado, pendente, sem almoço. O funcionário vê a semana como uma faixa de cinco casas; a administração monta a semana sobre um trilho vertical que liga terça à segunda, com um trecho tracejado onde fica o fim de semana; a cozinha percorre o quadro dia a dia, com o total em destaque. A mesma gramática de marcos e linhas atravessa as três telas.

O tom é calmo e discreto. A base é branco-gelo, superfícies brancas e linhas finas cinza-azuladas; a cor só aparece onde há decisão. O azul-petróleo é a voz do sistema (marca, ação principal, navegação, o que a administração já definiu); o verde só confirma uma escolha do funcionário; o âmbar marca o que mudou ou ainda falta; o vermelho só diz "sem". Nada decora: não há imagens, gradientes nem ilustração. Uma única família tipográfica, de alta legibilidade, com números tabulares em tudo, carrega a hierarquia por tamanho e peso.

A densidade muda com o lugar de uso. As telas de celular (pedido e cozinha) são espaçosas, com alvos de toque de 48px ou mais e uma coluna estreita. A administração, usada no computador, é mais densa: corpo de 15px, controles mais baixos, tabelas e grade de duas colunas.

**Key Characteristics:**
- Semana como faixa ou trilho de cinco dias, cada dia com um marco circular de situação.
- Plano: superfícies brancas sobre branco-gelo, separadas por linhas de 1px e contornos de 1,5px; sombra só no que flutua.
- Cor por significado, nunca por enfeite: petróleo = sistema, verde = confirmado, âmbar = mudou/falta, vermelho = sem.
- Uma família (Atkinson Hyperlegible Next), números grandes e pesados para datas e totais.
- Mobile-first nas telas de funcionário e cozinha; administração densa no desktop.
- Folha impressa A4 da cozinha em preto e branco puro.

## Colors

Paleta contida e fria, quase toda neutra, com quatro cores de significado usadas com parcimônia.

### Primary
- **Azul-Petróleo** (azul-petroleo): a voz do sistema. Marca "Quentinhas" no cabeçalho, botão principal (Salvar, Publicar), aba ativa, seletor segmentado escolhido, contagem de marmitas da cozinha, iniciais da lista de chamada, marco de dia definido no cardápio, contorno de foco. A variante escura serve para estado pressionado, texto sobre fundo claro de petróleo e o toast; a clara é fundo de etiqueta, aviso de sucesso e chip.

### Secondary
- **Verde-Confirmação** (verde-confirmacao): exclusivo das escolhas do funcionário. Pílula do "Quero", marcador redondo de item mantido na marmita, marco do dia confirmado na faixa da semana. Variantes escura e clara existem no tema para estados de seleção.

### Tertiary
- **Âmbar-Alerta** (ambar-alerta sobre ambar-fundo): o que mudou ou ainda falta. Dia pendente na faixa, painel do dia alterado e não salvo, nota de atenção, etiqueta "rascunho", aviso de revisão pendente na cozinha. **Âmbar-Marco** (ambar-marco) é o tom mais vivo, usado só no marco do dia alterado no trilho da administração, com halo de âmbar-fundo.
- **Vermelho-Sem** (vermelho-sem sobre vermelho-sem-fundo): item retirado e erro. Nada mais.

### Neutral
- **Branco-Gelo** (branco-gelo): fundo de todas as telas e das barras fixas de topo.
- **Superfície** (superficie): painéis, listas, campos, botões secundários.
- **Trilho-Claro** (trilho-claro): fundo do seletor deslizante Quero / Não quero.
- **Tinta** (tinta): texto principal, verde-petróleo quase preto.
- **Tinta-Suave** (tinta-suave): texto secundário, prazos, rótulos, dias encerrados, pílula do "Não quero".
- **Linha** (linha): divisórias de 1px, contorno de campos e cartões.
- **Linha-Forte** (linha-forte): contorno de botões e controles (1,5px), marco vazio, trecho tracejado do fim de semana.

### Named Rules
**A Regra do Verde que Confirma.** Verde aparece somente quando o funcionário escolheu algo. Ação do sistema, navegação ou estado definido pela administração usa petróleo, nunca verde.

**A Regra do Vermelho-Sem.** Vermelho significa "sai da marmita" ou "deu erro". Item retirado é sempre vermelho com tachado de 2px, o mesmo sinal na tela do funcionário e no painel da cozinha.

**A Regra das Duas Folhas.** Os valores vivem em dois arquivos com nomes diferentes: `src/Tema.html` (pedido e cozinha, nomes em português: `--petroleo`, `--papel`…) e `src/Styles.html` (administração: `--accent`, `--bg`…). Qualquer mudança de cor entra nos dois.

## Typography

**Display Font:** Atkinson Hyperlegible Next (com Atkinson Hyperlegible, system-ui, -apple-system, Segoe UI, sans-serif)
**Body Font:** a mesma
**Label/Mono Font:** a mesma; números sempre tabulares (`font-variant-numeric: tabular-nums`)

**Character:** Uma família só, desenhada para legibilidade, com letras bem diferenciadas e números firmes. A hierarquia vem de tamanho e peso (400 a 800) e de tracking negativo nos números grandes, não de troca de fonte.

### Hierarchy
Escala base 16: 13 · 15 · 17 · 20 · 26 · 34.
- **Display** (700, 34px, 1.12, -0.02em): título da tela ("Quem é você?", "Olá, …"); na cozinha, a contagem de marmitas do dia em 800 e petróleo. Na administração, o número do dia no trilho usa o mesmo tamanho em 800 com -0.035em.
- **Headline** (800, 26px, 1): inicial grande da lista de chamada, em petróleo.
- **Title** (700, 20px, 1.25): número do dia na faixa, nome da pessoa na checklist da cozinha. Em 400, o nome do prato do dia e os nomes na lista de chamada.
- **Body-lg** (400–600, 17px, 1.45): corpo das telas de celular — introduções, itens da marmita (600), linhas da cozinha, marca no cabeçalho (800).
- **Body** (400, 15px, 1.45): corpo da administração; texto secundário nas telas de celular (observação, situação de dia encerrado). Na administração os títulos de seção ficam em ~17,6px (1.1rem) e o título da semana em ~20,8px 700.
- **Label** (400, 13px): abreviatura do dia na faixa, prazo do dia, notas curtas. Na administração, rótulos e cabeçalhos de tabela em 13–14px 600 tinta-suave.

### Named Rules
**A Regra do Número Grande.** Datas e totais são os elementos mais pesados da tela (800, tracking negativo). O que se conta precisa ser lido de longe, num tablet apoiado na bancada.

**A Regra dos Números Tabulares.** Todo número usa algarismos tabulares, para que totais, horários e datas fiquem alinhados em colunas.

## Layout

Coluna única centralizada, com margem lateral de 16px. Larguras máximas por tela: pedido 560px, cozinha 760px, administração 1120px. A administração usa grade de duas colunas (1fr / 1.4fr) e lista de compras em duas colunas, que viram uma abaixo de 720px.

Ritmo vertical solto nas telas de celular: 6px entre as casas da faixa, 12px entre os dias, 18–22px entre blocos. Barras fixas: no pedido, a barra Desfazer / Salvar fica presa embaixo, respeitando a área segura do iPhone; na cozinha, a barra do dia (‹ dia ›) fica presa em cima; na administração, as abas ficam presas em cima e o rodapé de ações da semana, embaixo.

Dias encerrados ou sem almoço colapsam numa linha só; o dia aberto vira painel. A lista de nomes agrupa por inicial numa grade de duas colunas (inicial de 2,6rem + nomes).

### Named Rules
**A Regra do Polegar.** Nas telas de celular, todo alvo de toque tem pelo menos 46–48px de altura (itens e nomes 50px, seletor Quero 54px, Salvar 52px).

## Elevation & Depth

Sistema plano. A profundidade vem de camadas tonais (branco-gelo → superfície branca) e de linhas, não de sombras. Sombra existe só em elementos que flutuam sobre o conteúdo ou se movem.

### Shadow Vocabulary
- **Pílula do deslizante** (`box-shadow: 0 1px 2px rgba(24,41,47,.14), 0 4px 10px rgba(31,90,55,.22)`; no "Não quero", o segundo termo vira `rgba(24,41,47,.18)`): dá peso à pílula que corre entre Quero e Não quero.
- **Toast** (`box-shadow: 0 6px 20px rgba(21,68,82,.25)`): confirmação flutuante após salvar.
- **Lista suspensa** (`box-shadow: 0 10px 28px rgba(24,41,47,.16)`): opções da busca de pratos na administração.
- **Halo do marco alterado** (`box-shadow: 0 0 0 4px` âmbar-fundo): anel em volta do marco âmbar no trilho; não é elevação, é sinal.

### Named Rules
**A Regra do Plano.** Cartões, painéis e listas não têm sombra. Se algo precisa se destacar em repouso, usa contorno ou cor de significado.

## Shapes

Cantos suavemente arredondados e consistentes: 10px nos controles (botões, campos, casas da faixa, avisos), 14px nos painéis (dia aberto, folha da semana, seções da lista de compras), 8px na caixa da checklist da cozinha, pílula (999px) na busca, no deslizante, nas etiquetas e nos chips. Contornos de 1,5px em controles e painéis; divisórias internas de 1px.

O círculo é a forma de situação: marcos de 14–18px na faixa e no trilho, marcador de 26px nos itens da marmita. Cheio = definido/confirmado, só contorno = vazio/não, tracejado = sem almoço.

## Components

### Buttons
Decididos, sem enfeite.
- **Shape:** cantos de 10px; contorno de 1,5px linha-forte; peso 600.
- **Primary:** fundo petróleo, texto branco, altura mínima 48px (52px na barra de salvar). Pressionado/hover: petróleo-escuro.
- **Secondary:** fundo branco, texto tinta, contorno linha-forte. Na administração, hover escurece o contorno para tinta-suave.
- **Ghost (discreto):** sem contorno nem fundo, texto petróleo; na administração ganha fundo petróleo-claro no hover.
- **Administração:** mesma forma, mais baixa (padding ~7px 14px) e variante pequena (13–14px) para ações em tabela. Ações que tiram algo (Inativar, Remover, Trocar link) são neutras em repouso e só ficam vermelho-sem no estado "Confirmar?".
- **Disabled:** opacidade 0,5.
- **Focus:** contorno de 3px petróleo com afastamento de 2px (1px na administração).

### Chips
- **Etiqueta:** pílula petróleo-claro com texto petróleo-escuro, 12px 600. "Rascunho" em âmbar; "inativo" e "Não salva" em linha/tinta-suave; "Só sexta" em contorno petróleo (atributo do prato, não estado); "Fechada" em contorno neutro.
- **Chip de acompanhamento** (administração): pílula petróleo-claro com botão × no fim.
- **Marcador da cozinha:** retângulo de 6px de canto, âmbar sobre âmbar-fundo, para revisão pendente.

### Cards / Containers
- **Corner Style:** 14px.
- **Background:** superfície branca sobre branco-gelo.
- **Shadow Strategy:** nenhuma (ver A Regra do Plano).
- **Border:** 1,5px linha; vira âmbar quando o dia tem alteração não salva.
- **Internal Padding:** 16px.

### Inputs / Fields
- **Style:** fundo branco, contorno 1,5px linha, cantos de 10px; busca de nomes em pílula de 46px com lupa à esquerda e × para limpar.
- **Focus:** contorno de 3px petróleo.
- **Checkbox:** cor de destaque petróleo.

### Navigation
- **Administração:** abas em linha, texto tinta-suave; aba ativa em tinta 600 com sublinhado de 2px petróleo. Presas no topo sobre branco-gelo.
- **Cozinha:** barra do dia com botões ‹ › de 48px nas pontas e título centralizado com a data em label.
- **Semanas (administração):** setas circulares de 36px ao lado do título da semana.

### Faixa da Semana (assinatura)
Cinco casas iguais de 74px de altura, uma por dia: abreviatura (label), número do dia (title 700) e marco circular de 18px. Verde cheio com ✓ = quero; contorno tinta-suave = não quero; âmbar cheio com casa de contorno âmbar = falta responder; tracejado = sem almoço; casa transparente com número esmaecido = encerrado. Tocar uma casa leva ao dia.

### Trilho do Cardápio (assinatura)
Na administração, a semana é uma folha branca com um trilho vertical de 2px à esquerda ligando terça a segunda; o trecho antes da segunda é tracejado (fim de semana). Cada dia tem data grande à esquerda e um marco de 14px no trilho: petróleo = definido, tracejado = sem almoço, âmbar com halo (contorno âmbar-alerta) = alterado depois de publicar. No rascunho o marco nunca fica âmbar; o "não salvo" fica no rodapé.

Na semana publicada, cada dia aparece em leitura, como os funcionários veem: prato em title 700, acompanhamentos e itens de todo dia numa linha secundária, e à direita a contagem ("2 pedidos" em 700; "nenhum pedido" em tinta-suave) com "Alterar este dia". O dia aberto ganha "Fechar" ou "Desfazer mudanças".

### Seletor Deslizante Quero / Não quero
Trilho em pílula de 54px (trilho-claro) com uma pílula que corre até a opção escolhida: verde no "Quero", tinta-suave no "Não quero", texto branco na opção ativa. Movimento de 0,28s com `cubic-bezier(.3,.8,.3,1)`; aceita arrastar na horizontal.

### Itens da Marmita
Lista contornada (1,5px, 10px), um item por linha de 50px, peso 600, marcador redondo de 26px à direita: verde com ✓ quando mantido; quando retirado, marcador vira só contorno, fundo quase branco e o nome fica vermelho-sem, tachado de 2px, peso 500.

### Checklist da Cozinha
Linhas com caixa de 28px (8px de canto) à esquerda, nome da pessoa em title 700 e itens em body-lg, com os retirados em vermelho tachado. Marcada: caixa petróleo e texto esmaecido. O progresso fica só no aparelho.

### Folha Impressa
A cozinha imprime o dia em A4 (margens de 14mm), preto puro sobre branco: topo com dia e total separados por régua de 1,5pt, tabela de quantidades e checklist com quadrados de 11pt. "SEM" em preto 800, sem cor.

## Do's and Don'ts

### Do:
- **Do** usar petróleo (#1E5A6E) para tudo que é do sistema e verde (#2D7A4B) só para a escolha do funcionário.
- **Do** marcar item retirado sempre do mesmo jeito: vermelho-sem (#A8322D), tachado de 2px.
- **Do** mostrar a situação de cada dia com o marco circular (cheio, contorno, âmbar, tracejado), na faixa e no trilho.
- **Do** manter alvos de toque de 48px ou mais nas telas de pedido e cozinha.
- **Do** usar números tabulares e peso 800 para datas grandes e totais.
- **Do** atualizar `src/Tema.html` e `src/Styles.html` juntos quando um valor mudar.
- **Do** respeitar `prefers-reduced-motion`: as telas zeram transições e animações.

### Don't:
- **Don't** pôr sombra em cartões, painéis ou listas em repouso; sombra só no que flutua (toast, lista suspensa, pílula do deslizante).
- **Don't** usar verde para ações do sistema nem vermelho para qualquer coisa além de retirado e erro.
- **Don't** introduzir uma segunda família tipográfica.
- **Don't** usar cor na folha impressa da cozinha; ela é preto e branco.
- **Don't** colorir por decoração: sem gradientes, ilustrações ou fundos de cor fora dos avisos e etiquetas.
