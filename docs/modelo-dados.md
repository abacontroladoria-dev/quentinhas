# Modelo de dados (Google Sheets)

## Convenções

- **Linha 1 de cada aba = cabeçalho.** O código localiza colunas pelo nome do cabeçalho, não pela posição.
- **IDs estáveis**: `<prefixo>-<12 hex>` gerados com `Utilities.getUuid()` e verificados contra duplicidade dentro do lock. O número da linha nunca é identificador; só é usado transitoriamente, dentro do lock, para regravar uma linha já localizada pelo ID.
- **Datas de calendário** (`data`, `semana_id`) são texto `yyyy-MM-dd` (colunas formatadas como texto `@`) para evitar deslocamento de fuso.
- **Carimbos de data/hora** são texto ISO com fuso: `2026-10-14T09:31:05-03:00`.
- **Fuso** do projeto e da planilha: `America/Sao_Paulo`.
- **Listas** (itens de um prato) são gravadas como JSON: `["Frango Grelhado","Salada de alface com tomate"]`.
- **Leitura/gravação em lote**: cada operação lê a aba inteira uma vez (`getDataRange().getValues()`) e grava com um único `setValues` por bloco.
- Valores de domínio em MAIÚSCULAS sem acento (`ATIVO`, `SIM`, `SEM_ALMOCO`).

## Ciclo semanal

O cardápio é montado por **ciclo de terça a segunda seguinte**, como a planilha usada antes do sistema:
terça, quarta, quinta, sexta e a segunda seguinte (5 dias de almoço). O ciclo é identificado pela data da **terça**.
O ciclo "a preparar" é a próxima terça (ou hoje, se hoje for terça).

## Abas

### 1. `Funcionarios`

| Coluna | Tipo | Regra |
|---|---|---|
| `id` | texto `F-…` | único, imutável |
| `nome` | texto | obrigatório, até 60 caracteres, só letras/espaço/`.'-`, começando por letra; único entre ativos (sem diferenciar maiúsculas/acentos) |
| `situacao` | `ATIVO` \| `INATIVO` | inativos não aparecem na lista nem fazem pedidos; nunca são apagados (histórico) |
| `criado_em` / `atualizado_em` | data/hora | |

### 2. `Pratos` (banco de pratos)

Principais e acompanhamentos ficam na mesma aba, distinguidos por `tipo`. A responsável combina 1 principal + acompanhamentos ao montar cada dia.

| Coluna | Tipo | Regra |
|---|---|---|
| `id` | texto `PR-…` | único, imutável |
| `tipo` | `PRINCIPAL` \| `ACOMPANHAMENTO` | não muda depois de criado |
| `nome` | texto até 80 | único entre ativos do mesmo tipo (sem diferenciar maiúsculas/acentos) |
| `categoria` | `CARNE` \| `FRANGO` \| `PEIXE` \| `PORCO` \| `LINGUICA` \| `FIGADO` \| `OUTRO` | só principal; usada na regra "sem frango em dias seguidos" |
| `so_sexta` | `SIM` \| `NAO` | só principal (feijoada, lasanha…) |
| `acompanhamentos` | JSON (lista de IDs) | só principal: acompanhamentos **de costume**, até 5, que já vêm marcados ao escolher o principal |
| `sem_fixos` | JSON (lista de nomes) | só principal: itens de todo dia (`ITENS_FIXOS`) que **não** vêm com ele. Ex.: estrogonofe → `["Feijão","Farofa"]` (só arroz). Coluna acrescentada depois; fica à direita |
| `compras` | JSON (lista de `{item_id, quantidade}`) | só principal: o que o prato pede na lista de compras (ex.: Carré → `4 kg`), até 8. Coluna acrescentada depois; fica à direita |
| `situacao` | `ATIVO` \| `INATIVO` | inativos não aparecem para novos cardápios |
| `criado_em` / `atualizado_em` | data/hora | |

### 3. `Semanas`

| Coluna | Tipo | Regra |
|---|---|---|
| `id` | `yyyy-MM-dd` | data da **terça** que inicia o ciclo; único |
| `data_inicio` / `data_fim` | `yyyy-MM-dd` | terça / segunda seguinte |
| `situacao` | `RASCUNHO` \| `PUBLICADA` \| `FECHADA` | só `PUBLICADA` aceita pedidos de funcionários |
| `publicada_em` / `publicada_por` | data/hora / e-mail | |
| `atualizado_em` | data/hora | |
| `confirmar_ate` | `yyyy-MM-ddTHH:mm` (hora local) ou vazio | data limite das respostas da semana: depois dela, quem não respondeu um dia não pede mais; quem respondeu ajusta até o prazo do dia. Até a segunda do ciclo. Coluna acrescentada depois (criada sozinha ao salvar a semana) |

### 4. `Cardapio`

Uma linha por **dia** do ciclo.

| Coluna | Tipo | Regra |
|---|---|---|
| `id` | texto `C-…` | único, imutável |
| `semana_id` | ref. `Semanas.id` | |
| `data` | `yyyy-MM-dd` | um dos 5 dias do ciclo; única |
| `dia_semana` | `TERCA` … `SEXTA`, `SEGUNDA` | coerente com `data` |
| `tipo` | `PRATO` \| `SEM_ALMOCO` \| vazio | vazio = ainda não definido (só em rascunho) |
| `principal_id` | ref. `Pratos.id` (PRINCIPAL) | quando `tipo = PRATO` |
| `acompanhamento_ids` | JSON (lista de IDs de ACOMPANHAMENTO) | 0 a 5, sem repetição |
| `prato` / `itens` | texto / JSON | **retrato** da combinação no momento em que foi gravada: `"Frango Empanado / Batata Frita"` e `["Frango Empanado","Batata Frita","Arroz","Feijão","Farofa"]` (itens de todo dia incluídos, sem repetir). Recalculado a cada gravação da semana; editar o banco só chega aos funcionários quando a semana é salva de novo |
| `observacao` | texto até 60 | ex.: "Feriado" |
| `criado_em` / `atualizado_em` | data/hora | |

### 5. `Pedidos`

| Coluna | Tipo | Regra |
|---|---|---|
| `id` | texto `P-…` | único, imutável |
| `funcionario_id` | ref. `Funcionarios.id` | |
| `data` | `yyyy-MM-dd` | dia com `tipo = PRATO` em semana publicada |
| `semana_id` | ref. `Semanas.id` | |
| `situacao` | `CONFIRMADO` \| `CANCELADO` | "Não quero marmita neste dia" = `CANCELADO` |
| `tipo` | `COMPLETA` \| `PERSONALIZADA` | calculado no servidor: `PERSONALIZADA` se algum item foi retirado |
| `retirados` | JSON (lista de nomes) | itens da combinação do dia que o funcionário **não** quer, na ordem do cardápio (ex.: `["Batata Frita"]`). Não pode retirar todos — para isso existe "Não quero" |
| `revisao` | vazio \| `PENDENTE` | marcado quando o admin muda a combinação daquele dia após a publicação |
| `criado_em` / `atualizado_em` | data/hora | |
| `atualizado_por` | texto | `FUNCIONARIO` ou e-mail do admin |

**Chave única lógica:** (`funcionario_id`, `data`). Verificada dentro do `LockService` antes de inserir; se já existir, o pedido existente é atualizado. Funcionário sem linha em `Pedidos` para um dia = **não pediu**.

### 6. `Configuracoes`

Parâmetros **não sensíveis**, editáveis pelo admin.

| `chave` | `valor` (padrão) | `descricao` |
|---|---|---|
| `PRAZO_HORA` | `09:30` | horário-limite para alterar o pedido de um dia |
| `PRAZO_DIAS_ANTES` | `0` | 0 = no próprio dia; 1 = na véspera |
| `COZINHA_ATUALIZACAO_SEG` | `60` | intervalo de atualização automática do painel |
| `ITENS_FIXOS` | `Arroz; Feijão; Farofa` | itens que vêm todo dia, separados por `;`. Entram nos itens de cada dia (o funcionário pode retirar), menos os que o principal dispensa |

### 7. `Auditoria`

| Coluna | Tipo |
|---|---|
| `id` | texto `A-…` |
| `data_hora` | data/hora |
| `operacao` | ex.: `CONFIGURACAO_INICIAL`, `ADICIONAR_FUNCIONARIO`, `ADICIONAR_PRATO`, `SALVAR_CARDAPIO`, `PUBLICAR_SEMANA`, `ALTERAR_CARDAPIO_PUBLICADO`, `SALVAR_PEDIDO` |
| `entidade` | nome da aba |
| `registro_id` | ID afetado |
| `responsavel` | e-mail do admin, `FUNC:<id>` ou `SISTEMA` |
| `detalhes` | JSON curto (antes/depois). **Nunca** contém tokens ou outros segredos. |

### 8. `ItensCompra`

Cadastro da lista de compras (substitui a aba LISTA DE MERCADO SEMANAL da planilha antiga, de onde vieram os itens iniciais). Ver [compras.md](compras.md).

| Coluna | Tipo | Regra |
|---|---|---|
| `id` | texto `IC-…` | único, imutável |
| `secao` | `ACOUGUE` \| `MERCEARIA` \| `TEMPEROS` \| `LIMPEZA` \| `SACOLAO` | |
| `nome` | texto até 60 | único entre ativos (sem diferenciar maiúsculas/acentos) |
| `ordem` | número (texto) | posição dentro da seção; item novo vai para o fim |
| `situacao` | `ATIVO` \| `INATIVO` | removido na tela = inativo; listas antigas não mudam |
| `criado_em` / `atualizado_em` | data/hora | |

### 9. `ListasCompra`

Uma linha por ciclo.

| Coluna | Tipo | Regra |
|---|---|---|
| `id` | `yyyy-MM-dd` | terça do ciclo (mesmo id de `Semanas`, mas não depende dela) |
| `quantidades` | JSON `{item_id: "texto"}` | só os itens que vão ser comprados; texto livre até 30 (`4 kg`, `6 bandejas`). Vazio ou zero não é gravado |
| `atualizado_em` / `atualizado_por` | data/hora / e-mail | |

### Script Properties (fora da planilha)

| Chave | Conteúdo |
|---|---|
| `SPREADSHEET_ID` | ID da planilha (gravado pela configuração inicial) |
| `COZINHA_TOKEN` | token do link da cozinha (rotacionável) |
| `ADMIN_EMAILS` | lista de e-mails autorizados a administrar |

## Regras de integridade

1. No máximo um pedido por (`funcionario_id`, `data`).
2. Pedido só pode ser criado/alterado por funcionário se: funcionário `ATIVO`, semana `PUBLICADA`, dia com `tipo = PRATO` e antes do prazo. O prazo do dia vem de `PRAZO_HORA`/`PRAZO_DIAS_ANTES` (editáveis em Administração → Configurações); a primeira resposta de cada dia também precisa vir antes de `Semanas.confirmar_ate`, se houver.
3. Os itens retirados de um pedido pertencem ao retrato do cardápio daquele dia. Se a combinação mudar depois (revisão pendente), itens que não existem mais são desconsiderados.
4. Pedidos `CANCELADO` não entram em nenhum total.
5. Publicar uma semana nunca altera nem remove dados de outras semanas.
6. Publicar exige os 5 dias definidos (prato ou sem almoço). Após publicação, mudar a combinação de um dia (principal ou acompanhamentos) ou retirar um item que existia marca os pedidos confirmados daquele dia com `revisao=PENDENTE` e gera registro em `Auditoria`. Nenhum pedido é alterado silenciosamente.
7. Totais da cozinha são sempre calculados a partir de `Pedidos` + `Cardapio`, nunca armazenados.
8. Toda gravação ocorre dentro de `LockService.getScriptLock()`.
9. A configuração inicial só reescreve o cabeçalho de uma aba se ela não tiver dados; com dados, acrescenta as colunas que faltam à direita (as colunas são lidas pelo nome).
