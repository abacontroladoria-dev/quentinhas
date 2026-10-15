// Acesso ao Google Sheets: abertura da planilha, criação das abas, leitura/gravação em lote por nome de cabeçalho.

var FUSO_ = 'America/Sao_Paulo';

// Abas e colunas (ordem de criação). Ver docs/modelo-dados.md.
var ESQUEMA_ = {
  Funcionarios: ['id', 'nome', 'situacao', 'criado_em', 'atualizado_em'],
  Pratos: ['id', 'tipo', 'nome', 'categoria', 'so_sexta', 'acompanhamentos', 'situacao', 'criado_em', 'atualizado_em', 'sem_fixos', 'compras'],
  Semanas: ['id', 'data_inicio', 'data_fim', 'situacao', 'publicada_em', 'publicada_por', 'atualizado_em'],
  Cardapio: ['id', 'semana_id', 'data', 'dia_semana', 'tipo', 'principal_id', 'acompanhamento_ids', 'prato', 'itens', 'observacao', 'criado_em', 'atualizado_em'],
  Pedidos: ['id', 'funcionario_id', 'data', 'semana_id', 'situacao', 'tipo', 'retirados', 'revisao', 'criado_em', 'atualizado_em', 'atualizado_por'],
  Configuracoes: ['chave', 'valor', 'descricao'],
  Auditoria: ['id', 'data_hora', 'operacao', 'entidade', 'registro_id', 'responsavel', 'detalhes'],
  ItensCompra: ['id', 'secao', 'nome', 'ordem', 'situacao', 'criado_em', 'atualizado_em'],
  ListasCompra: ['id', 'quantidades', 'atualizado_em', 'atualizado_por']
};

// Colunas numéricas; todas as outras são formatadas como texto (@) para evitar conversão automática.
var COLUNAS_NUMERICAS_ = {};

var CONFIG_PADRAO_ = [
  ['PRAZO_HORA', '09:30', 'Horário-limite (HH:mm) para alterar o pedido de um dia'],
  ['PRAZO_DIAS_ANTES', '0', '0 = no próprio dia; 1 = na véspera'],
  ['COZINHA_ATUALIZACAO_SEG', '60', 'Intervalo de atualização automática do painel da cozinha (segundos)'],
  ['ITENS_FIXOS', 'Arroz; Feijão; Farofa', 'Itens que vêm todo dia (separados por ;). Cada prato principal pode dispensar alguns']
];

var LOCK_TIMEOUT_MS_ = 10000;

// ---------- Lógica pura (testada em Node) ----------

/**
 * Compara o cabeçalho existente com o esperado. Colunas extras são toleradas.
 * Aba sem dados (só cabeçalho) com cabeçalho diferente → 'RECRIAR' (nada é perdido).
 * Aba com dados e colunas faltando → 'ACRESCENTAR' as que faltam à direita (as colunas são lidas pelo nome).
 */
function verificarCabecalho_(existente, esperado, temDados) {
  var atual = existente.map(function (c) { return String(c).trim(); });
  if (atual.every(function (c) { return c === ''; })) {
    return { acao: 'CRIAR', faltando: esperado.slice() };
  }
  var faltando = esperado.filter(function (c) { return atual.indexOf(c) === -1; });
  if (!faltando.length) return { acao: 'OK', faltando: [] };
  return { acao: temDados ? 'ACRESCENTAR' : 'RECRIAR', faltando: faltando };
}

/** Converte o resultado de getValues() (linha 1 = cabeçalho) em { cabecalho, linhas }. Linhas vazias são ignoradas. */
function tabelaDeValores_(valores) {
  if (!valores.length) return { cabecalho: [], linhas: [] };
  var cabecalho = valores[0].map(function (c) { return String(c).trim(); });
  var linhas = [];
  for (var i = 1; i < valores.length; i++) {
    var v = valores[i];
    if (v.every(function (x) { return x === '' || x === null; })) continue;
    var obj = {};
    for (var j = 0; j < cabecalho.length; j++) {
      if (cabecalho[j]) obj[cabecalho[j]] = v[j];
    }
    linhas.push(obj);
  }
  return { cabecalho: cabecalho, linhas: linhas };
}

/** Monta uma linha na ordem do cabeçalho; campos ausentes viram ''. */
function linhaDeObjeto_(cabecalho, obj) {
  return cabecalho.map(function (c) {
    return c && obj[c] !== undefined && obj[c] !== null ? obj[c] : '';
  });
}

/** Gera `<prefixo>-<12 hex>` que não esteja em `existentes` (Set ou array). */
function novoIdUnico_(prefixo, existentes) {
  var usados = existentes instanceof Set ? existentes : new Set(existentes || []);
  for (var t = 0; t < 20; t++) {
    var id = prefixo + '-' + Utilities.getUuid().replace(/-/g, '').slice(0, 12).toLowerCase();
    if (!usados.has(id)) return id;
  }
  throw new Error('Não foi possível gerar um ID único para ' + prefixo + '.');
}

// ---------- Integração com Apps Script ----------

function agoraIso_() {
  return Utilities.formatDate(new Date(), FUSO_, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

function abrirPlanilha_() {
  var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (id) return SpreadsheetApp.openById(id);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Planilha não configurada. Execute Quentinhas → Configuração inicial.');
  return ss;
}

function obterAba_(ss, nome) {
  var aba = ss.getSheetByName(nome);
  if (!aba) throw new Error('Aba "' + nome + '" não encontrada. Execute Quentinhas → Configuração inicial.');
  return aba;
}

function lerTabela_(aba) {
  return tabelaDeValores_(aba.getDataRange().getValues());
}

/** Acrescenta objetos ao fim da aba com um único setValues. */
function anexarLinhas_(aba, cabecalho, objetos) {
  if (!objetos.length) return;
  var linhas = objetos.map(function (o) { return linhaDeObjeto_(cabecalho, o); });
  aba.getRange(aba.getLastRow() + 1, 1, linhas.length, cabecalho.length).setValues(linhas);
}

/** Regrava a linha cujo `id` coincide com obj.id (dentro do lock). O número da linha é usado só aqui, transitoriamente. */
function regravarPorId_(aba, cabecalho, obj) {
  var colId = cabecalho.indexOf('id');
  var ids = aba.getRange(1, colId + 1, aba.getLastRow(), 1).getValues();
  for (var r = 1; r < ids.length; r++) {
    if (ids[r][0] === obj.id) {
      aba.getRange(r + 1, 1, 1, cabecalho.length).setValues([linhaDeObjeto_(cabecalho, obj)]);
      return;
    }
  }
  throw new Error('Registro ' + obj.id + ' não encontrado.');
}

/** Aba Configuracoes como { chave: valor } (texto). */
function lerConfiguracoes_(ss) {
  var mapa = {};
  lerTabela_(obterAba_(ss, 'Configuracoes')).linhas.forEach(function (l) {
    mapa[String(l.chave).trim()] = String(l.valor).trim();
  });
  return mapa;
}

/** Executa fn dentro do lock do script. */
function comLock_(fn) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_TIMEOUT_MS_)) {
    throw new Error('Sistema ocupado no momento. Tente novamente em alguns segundos.');
  }
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

/**
 * Garante que a aba exista com o cabeçalho esperado e formatação de texto.
 * Retorna { estado: 'CRIADA' | 'CABECALHO' | 'COLUNAS' | 'OK', acrescentadas: [colunas novas em aba com dados] }.
 */
function garantirAba_(ss, nome, colunas) {
  var aba = ss.getSheetByName(nome);
  var resultado = 'OK';
  if (!aba) {
    aba = ss.insertSheet(nome);
    resultado = 'CRIADA';
  }
  var larguraAtual = Math.max(aba.getLastColumn(), 1);
  var existente = aba.getRange(1, 1, 1, larguraAtual).getValues()[0];
  var verif = verificarCabecalho_(existente, colunas, aba.getLastRow() > 1);
  if (verif.acao === 'ACRESCENTAR') {
    var n = verif.faltando.length;
    if (aba.getMaxColumns() < larguraAtual + n) aba.insertColumnsAfter(aba.getMaxColumns(), larguraAtual + n - aba.getMaxColumns());
    aba.getRange(1, larguraAtual + 1, aba.getMaxRows(), n).setNumberFormat('@');
    aba.getRange(1, larguraAtual + 1, 1, n).setValues([verif.faltando]).setFontWeight('bold');
    return { estado: 'COLUNAS', acrescentadas: verif.faltando };
  }
  if (verif.acao === 'RECRIAR') aba.getRange(1, 1, 1, larguraAtual).clearContent();
  if (verif.acao === 'CRIAR' || verif.acao === 'RECRIAR') {
    if (resultado === 'OK') resultado = 'CABECALHO';
    if (aba.getMaxColumns() < colunas.length) {
      aba.insertColumnsAfter(aba.getMaxColumns(), colunas.length - aba.getMaxColumns());
    }
    var numericas = COLUNAS_NUMERICAS_[nome] || [];
    colunas.forEach(function (c, i) {
      aba.getRange(1, i + 1, aba.getMaxRows(), 1).setNumberFormat(numericas.indexOf(c) === -1 ? '@' : '0');
    });
    aba.getRange(1, 1, 1, colunas.length).setValues([colunas]).setFontWeight('bold');
    aba.setFrozenRows(1);
  }
  return { estado: resultado, acrescentadas: [] };
}

/** Insere as chaves de CONFIG_PADRAO_ que ainda não existem. Retorna as chaves inseridas. */
function garantirConfiguracoesPadrao_(ss) {
  var aba = obterAba_(ss, 'Configuracoes');
  var tabela = lerTabela_(aba);
  var existentes = tabela.linhas.map(function (l) { return String(l.chave).trim(); });
  var novas = CONFIG_PADRAO_
    .filter(function (c) { return existentes.indexOf(c[0]) === -1; })
    .map(function (c) { return { chave: c[0], valor: c[1], descricao: c[2] }; });
  anexarLinhas_(aba, tabela.cabecalho, novas);
  return novas.map(function (n) { return n.chave; });
}

/** Proteção "somente aviso" em todas as abas de dados (edição direta não passa pela validação). */
function protegerAbas_(ss) {
  Object.keys(ESQUEMA_).forEach(function (nome) {
    var aba = ss.getSheetByName(nome);
    if (!aba) return;
    var jaProtegida = aba.getProtections(SpreadsheetApp.ProtectionType.SHEET).length > 0;
    if (!jaProtegida) {
      aba.protect()
        .setDescription('Dados do Quentinhas — prefira editar pelo menu Quentinhas')
        .setWarningOnly(true);
    }
  });
}

/** Remove a aba padrão vazia criada junto com a planilha ("Página1"/"Sheet1"). */
function removerAbaPadraoVazia_(ss) {
  ['Página1', 'Sheet1', 'Planilha1'].forEach(function (nome) {
    var aba = ss.getSheetByName(nome);
    if (aba && aba.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(aba);
  });
}
