# Cardápio: banco de pratos e montagem da semana

Substitui a planilha `Cardápio Novo.xlsm` usada antes do sistema (abas Meals, Cardapio_Semanal e Registro, com as macros `GerarCardapio` e `RegistrarCardapio`). A aba "LISTA DE MERCADO SEMANAL" daquela planilha ficou fora do escopo.

Tudo é feito em **Quentinhas → Administração**, sem importar arquivos.

## Banco de pratos (aba "Pratos" do diálogo)

Dois tipos, alternados no topo da lista:

- **Principais** — nome, categoria (Carne, Frango, Peixe, Porco, Linguiça, Fígado, Outro), "só sexta" e **acompanhamentos de costume** (já vêm marcados quando o principal é escolhido num dia).
- **Acompanhamentos** — só o nome (Batata Frita, Salada de alface e tomate…).
- **Itens de todo dia** — Arroz, Feijão e Farofa (aba `Configuracoes`, chave `ITENS_FIXOS`). Entram automaticamente em toda marmita. Cada principal pode dispensar alguns em "Vem com" — os estrogonofes vêm só com arroz. Se um acompanhamento tiver o mesmo nome de um item de todo dia (ex.: Farofa), ele aparece uma vez só.

**Colar do Excel**: copiar as colunas Prato · Tag · Categoria da aba Meals e colar.

- O trecho antes da primeira `/` é o principal; os demais são acompanhamentos de costume.
  `Carré/Pure de batata/ Farofa` → principal `Carré` com `Pure de batata` e `Farofa`.
- `c/` não separa: `Picadinho de Carne c/ Aipim` é um principal só.
- Tag `Sexta` → só sexta. Categoria vazia ou desconhecida → `OUTRO`.
- Acompanhamentos com o mesmo nome (ignorando maiúsculas/acentos) viram um só.
- Principal repetido (ex.: `Frango Grelhado` aparece com duas saladas) → fica a primeira combinação; a linha repetida é listada como ignorada.

## Montagem da semana (aba "Cardápio da semana")

1. A tela abre no próximo ciclo (terça a segunda). As setas navegam entre ciclos.
2. Para cada dia: escolher o **principal** (os acompanhamentos de costume entram automaticamente), tirar (×) ou acrescentar acompanhamentos, ou marcar **Sem almoço** (com observação, ex.: "Feriado").
3. **Sugerir dias vazios** reproduz a macro `GerarCardapio` para o principal:
   - sexta usa principais "só sexta" (se não houver, usa os demais); os outros dias usam os que não são só de sexta;
   - não repete principal na semana;
   - evita frango em dias seguidos (inclusive sexta → segunda);
   - prefere principais que não saíram nos 2 ciclos anteriores (melhoria em relação à macro);
   - completa com os acompanhamentos de costume;
   - mantém dias já escolhidos, combinações ajustadas à mão e dias sem almoço.
4. **Salvar rascunho** grava sem mostrar aos funcionários. **Publicar** exige os 5 dias definidos.
5. Avisos (não bloqueiam): principal repetido, frango em dias seguidos, prato de sexta em outro dia, dia sem acompanhamento.

O histórico (antiga aba Registro) passa a ser as próprias abas `Semanas` e `Cardapio`. O histórico anterior ao sistema não foi importado: a aba Registro não tem as datas de cada linha.

## No pedido

O funcionário recebe a combinação do dia e pode desmarcar qualquer item (principal ou acompanhamento). A cozinha vê `SEM <item>` por pessoa.

## Alterações após publicar

- Mudar a combinação de um dia marca os pedidos confirmados daquele dia como **revisão pendente** e registra em `Auditoria`.
- Mudar só a observação não afeta pedidos.
- Editar o banco não altera semanas já publicadas até a semana ser salva de novo. Ao salvar, os itens são recalculados; só acrescentar itens (ex.: os de todo dia) não marca pedidos para revisão.
