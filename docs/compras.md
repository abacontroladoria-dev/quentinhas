# Lista de compras semanal

Substitui a aba `LISTA DE MERCADO SEMANAL` da planilha `Cardápio Novo.xlsm`. Fica em **Quentinhas → Administração → Lista de compras**.

## Como era a planilha

- Uma tabela com o item (coluna B) e a quantidade da semana (coluna C, texto livre: `3`, `5k`, `1k`; `0` = não comprar). Sem fórmulas nem macros.
- Seções implícitas pela ordem: mercearia, temperos, limpeza, carnes e "Sacolão" (o único com título).
- Nas colunas H e I, blocos com o pedido de cada semana ao açougue (`Carré 4k`, `Filé de frango 6 bandejas`…), que correspondem aos pratos daquela semana.

## Como ficou

- **Itens** (`ItensCompra`): cadastrados uma vez por seção (Açougue, Mercearia, Temperos, Limpeza, Sacolão). A configuração inicial carrega os itens da planilha antiga, com nomes corrigidos e sem as repetições (Batata e Abóbora apareciam duas vezes). "Editar itens" permite renomear, remover e acrescentar.
- **O que cada prato pede** (`Pratos.compras`): em Pratos → "Para comprar" (ex.: Carré → Carré 4 kg). A configuração inicial sugere com base nos pedidos anotados na planilha; a responsável confere e ajusta.
- **Lista da semana** (`ListasCompra`, uma por ciclo terça → segunda):
  - Semana ainda não salva: mercearia, temperos, limpeza e sacolão repetem a semana anterior; o açougue (e o que mais os pratos pedirem) vem do cardápio da semana.
  - Pratos que pedem o mesmo item somam: 6 bandejas + 4 bandejas = 10 bandejas; unidades diferentes ficam lado a lado (`3 kg + 2 unid`).
  - Cada item pedido pelo cardápio mostra de onde veio (`terça: Carré`) e avisa quando a quantidade digitada é diferente.
  - "Preencher pelo cardápio" refaz esses itens depois de mudar o cardápio.
  - Vazio ou 0 = não comprar. Enter desce para o próximo item.
- **Copiar para o WhatsApp**: só o que vai ser comprado, por seção, com títulos em negrito. Se o diálogo bloquear a área de transferência, o texto aparece selecionado para Ctrl+C; há também um link que abre o WhatsApp com a lista.
