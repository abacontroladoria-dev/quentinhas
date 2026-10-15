// Banco de pratos: principais (categoria, "só sexta", acompanhamentos de costume) e acompanhamentos.

var TIPOS_PRATO_ = ['PRINCIPAL', 'ACOMPANHAMENTO'];
var CATEGORIAS_ = ['CARNE', 'FRANGO', 'PEIXE', 'PORCO', 'LINGUICA', 'FIGADO', 'OUTRO'];
var PRATO_NOME_MAX_ = 80;
var ACOMPANHAMENTOS_MAX_ = 5;
var FIXOS_MAX_ = 6;

// ---------- Lógica pura (testada em Node) ----------

/** Itens de todo dia a partir de Configuracoes.ITENS_FIXOS ("Arroz; Feijão; Farofa"). */
function itensFixos_(texto) {
  var vistos = {};
  return String(texto || '').split(/[;,\n]/)
    .map(limparNome_)
    .filter(function (i) {
      var k = normalizarNome_(i);
      if (!i || vistos[k] || erroTextoLivre_(i, PRATO_NOME_MAX_)) return false;
      vistos[k] = true;
      return true;
    })
    .slice(0, FIXOS_MAX_);
}

/** Itens fixos que acompanham o principal (todos, menos os que ele dispensa). */
function fixosDoPrincipal_(principal, fixos) {
  var dispensados = ((principal && principal.sem_fixos) || []).map(normalizarNome_);
  return fixos.filter(function (f) { return dispensados.indexOf(normalizarNome_(f)) === -1; });
}

/** Texto livre seguro: não vazio, até `max`, sem caracteres de controle e sem começar como fórmula. */
function erroTextoLivre_(texto, max) {
  if (!texto) return 'vazio';
  if (texto.length > max) return 'mais de ' + max + ' caracteres';
  if (/[\u0000-\u001f\u007f]/.test(texto)) return 'caractere inválido';
  if (/^[=+\-@]/.test(texto)) return 'não pode começar com = + - ou @';
  return '';
}

/**
 * Separa um nome da planilha antiga pelas barras: o 1º trecho é o principal, os demais são acompanhamentos.
 * "c/" (com) não separa: "Picadinho de Carne c/ Aipim" é um principal só.
 */
function partesDoNome_(nome) {
  return limparNome_(nome)
    .replace(/\b([cC])\s*\/\s*/g, '$1\u0001')
    .split('/')
    .map(function (p) { return limparNome_(p.replace(/\u0001/g, '/ ')); })
    .filter(function (p) { return p; });
}

/** Aceita "Frango", "frango", "FRANGO"…; vazio ou desconhecido → OUTRO. */
function normalizarCategoria_(texto) {
  var c = normalizarNome_(texto).toUpperCase();
  return CATEGORIAS_.indexOf(c) === -1 ? 'OUTRO' : c;
}

/**
 * Valida e normaliza um prato vindo do diálogo. Retorna { prato, erro }.
 * Acompanhamento ignora categoria/sexta/acompanhamentos.
 */
function validarPrato_(entrada) {
  entrada = entrada || {};
  if (TIPOS_PRATO_.indexOf(entrada.tipo) === -1) return { erro: 'Tipo inválido.' };
  var nome = limparNome_(entrada.nome);
  var erro = erroTextoLivre_(nome, PRATO_NOME_MAX_);
  if (erro) return { erro: 'Nome: ' + erro + '.' };
  if (entrada.tipo === 'ACOMPANHAMENTO') {
    return { erro: '', prato: { tipo: 'ACOMPANHAMENTO', nome: nome, categoria: '', so_sexta: 'NAO', acompanhamentos: [], sem_fixos: [] } };
  }
  if (CATEGORIAS_.indexOf(entrada.categoria) === -1) return { erro: 'Categoria inválida.' };
  var acomp = (Array.isArray(entrada.acompanhamentos) ? entrada.acompanhamentos : []).map(String);
  if (acomp.some(function (a, i) { return acomp.indexOf(a) !== i; })) return { erro: 'Acompanhamento repetido.' };
  if (acomp.length > ACOMPANHAMENTOS_MAX_) return { erro: 'No máximo ' + ACOMPANHAMENTOS_MAX_ + ' acompanhamentos.' };
  var semFixos = (Array.isArray(entrada.sem_fixos) ? entrada.sem_fixos : []).map(limparNome_);
  if (semFixos.length > FIXOS_MAX_ || semFixos.some(function (f) { return erroTextoLivre_(f, PRATO_NOME_MAX_); })) {
    return { erro: 'Itens de todo dia inválidos.' };
  }
  return {
    erro: '',
    prato: {
      tipo: 'PRINCIPAL', nome: nome, categoria: entrada.categoria, so_sexta: entrada.so_sexta === 'SIM' ? 'SIM' : 'NAO',
      acompanhamentos: acomp, sem_fixos: semFixos
    }
  };
}

/**
 * Interpreta linhas coladas da aba Meals: Prato <TAB> Tag <TAB> Categoria.
 * "Frango Empanado / Batata Frita" → principal "Frango Empanado" com acompanhamento de costume "Batata Frita".
 * Retorna { principais: [{ nome, categoria, so_sexta, acompanhamentos: [nomes] }], acompanhamentos: [nomes novos], ignorados }.
 */
function interpretarColagemPratos_(texto, existentes) {
  var principaisVistos = {};
  var acompVistos = {};
  existentes.forEach(function (p) {
    if (p.situacao !== 'ATIVO') return;
    if (p.tipo === 'PRINCIPAL') principaisVistos[normalizarNome_(p.nome)] = 'EXISTENTE';
    else acompVistos[normalizarNome_(p.nome)] = 'EXISTENTE';
  });
  var principais = [];
  var acompanhamentos = [];
  var ignorados = [];
  String(texto || '').split(/\r?\n/).forEach(function (linha) {
    var cols = linha.split('\t');
    var original = limparNome_(cols[0]);
    if (!original || normalizarNome_(original) === 'prato') return;
    var partes = partesDoNome_(original);
    var invalida = partes.map(function (p) { return erroTextoLivre_(p, PRATO_NOME_MAX_); }).filter(function (e) { return e; })[0];
    if (!partes.length || invalida) { ignorados.push({ nome: original, motivo: invalida || 'vazio' }); return; }
    var chave = normalizarNome_(partes[0]);
    if (principaisVistos[chave] === 'EXISTENTE') { ignorados.push({ nome: original, motivo: 'principal "' + partes[0] + '" já cadastrado' }); return; }
    if (principaisVistos[chave] === 'NOVO') { ignorados.push({ nome: original, motivo: 'principal "' + partes[0] + '" repetido — mantida a primeira combinação' }); return; }
    principaisVistos[chave] = 'NOVO';
    var acomp = partes.slice(1).slice(0, ACOMPANHAMENTOS_MAX_);
    acomp.forEach(function (a) {
      var k = normalizarNome_(a);
      if (!acompVistos[k]) { acompVistos[k] = 'NOVO'; acompanhamentos.push(a); }
    });
    principais.push({
      nome: partes[0],
      categoria: normalizarCategoria_(cols[2]),
      so_sexta: normalizarNome_(cols[1]) === 'sexta' ? 'SIM' : 'NAO',
      acompanhamentos: acomp
    });
  });
  return { principais: principais, acompanhamentos: acompanhamentos, ignorados: ignorados };
}

/** Converte a linha da aba em objeto para o cliente. */
function pratoDaLinha_(l) {
  return {
    id: String(l.id), tipo: String(l.tipo), nome: String(l.nome), categoria: String(l.categoria || ''),
    so_sexta: String(l.so_sexta || 'NAO'), acompanhamentos: lerLista_(l.acompanhamentos),
    sem_fixos: lerLista_(l.sem_fixos), situacao: String(l.situacao)
  };
}

function linhaDoPrato_(p) {
  return {
    tipo: p.tipo, nome: p.nome, categoria: p.categoria, so_sexta: p.so_sexta,
    acompanhamentos: JSON.stringify(p.acompanhamentos || []), sem_fixos: JSON.stringify(p.sem_fixos || [])
  };
}

/** Lista JSON gravada numa célula; vazio ou inválido → []. */
function lerLista_(json) {
  try { var v = JSON.parse(json || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; }
}

function conflitoDeNome_(linhas, tipo, nome, idProprio) {
  var chave = normalizarNome_(nome);
  return linhas.some(function (l) {
    return l.id !== idProprio && l.tipo === tipo && l.situacao === 'ATIVO' && normalizarNome_(l.nome) === chave;
  });
}

// ---------- Integração com Apps Script ----------

function lerPratos_(ss) {
  return lerTabela_(obterAba_(ss, 'Pratos')).linhas.map(pratoDaLinha_);
}

function lerItensFixos_(ss) {
  return itensFixos_(lerConfiguracoes_(ss).ITENS_FIXOS);
}

/**
 * Migração única (configuração inicial, quando a coluna sem_fixos é criada):
 * principais com "estrogonofe" no nome dispensam todos os fixos, menos o arroz.
 * Retorna os nomes alterados.
 */
function aplicarPadraoEstrogonofe_(ss) {
  var fixos = lerItensFixos_(ss);
  var dispensar = fixos.filter(function (f) { return normalizarNome_(f) !== 'arroz'; });
  if (!dispensar.length) return [];
  var aba = obterAba_(ss, 'Pratos');
  var tabela = lerTabela_(aba);
  var agora = agoraIso_();
  var alterados = [];
  tabela.linhas.forEach(function (l) {
    if (l.tipo !== 'PRINCIPAL' || normalizarNome_(l.nome).indexOf('estrogonofe') === -1 || lerLista_(l.sem_fixos).length) return;
    l.sem_fixos = JSON.stringify(dispensar);
    l.atualizado_em = agora;
    regravarPorId_(aba, tabela.cabecalho, l);
    alterados.push(String(l.nome));
  });
  return alterados;
}

// ---------- API administrativa ----------

function adminListarPratos() {
  exigirAdmin_();
  return ordenarPorNome_(lerPratos_(abrirPlanilha_()));
}

/** Cria (sem id) ou atualiza (com id) um principal ou acompanhamento. */
function adminSalvarPrato(entrada) {
  var email = exigirAdmin_();
  var v = validarPrato_(entrada);
  if (v.erro) throw new Error(v.erro);
  return comLock_(function () {
    var ss = abrirPlanilha_();
    var aba = obterAba_(ss, 'Pratos');
    var tabela = lerTabela_(aba);
    var id = entrada.id ? String(entrada.id) : '';
    if (conflitoDeNome_(tabela.linhas, v.prato.tipo, v.prato.nome, id)) {
      throw new Error('Já existe ' + (v.prato.tipo === 'PRINCIPAL' ? 'um principal' : 'um acompanhamento') + ' ativo com esse nome.');
    }
    var porId = {};
    tabela.linhas.forEach(function (l) { porId[l.id] = l; });
    v.prato.acompanhamentos.forEach(function (a) {
      if (!porId[a] || porId[a].tipo !== 'ACOMPANHAMENTO') throw new Error('Acompanhamento não encontrado.');
    });
    var agora = agoraIso_();
    var dados = Object.assign(linhaDoPrato_(v.prato), { atualizado_em: agora });
    if (!id) {
      var novo = Object.assign({ id: novoIdUnico_('PR', tabela.linhas.map(function (l) { return l.id; })), situacao: 'ATIVO', criado_em: agora }, dados);
      anexarLinhas_(aba, tabela.cabecalho, [novo]);
      registrarAuditoria_(ss, 'ADICIONAR_PRATO', 'Pratos', novo.id, email, v.prato);
      return novo.id;
    }
    var atual = porId[id];
    if (!atual) throw new Error('Prato não encontrado.');
    if (atual.tipo !== v.prato.tipo) throw new Error('Não é possível mudar o tipo de um prato já cadastrado.');
    regravarPorId_(aba, tabela.cabecalho, Object.assign({}, atual, dados));
    registrarAuditoria_(ss, 'ALTERAR_PRATO', 'Pratos', id, email, { antes: pratoDaLinha_(atual), depois: v.prato });
    return id;
  });
}

/** Importa a aba Meals colada: cria acompanhamentos novos e principais com seus acompanhamentos de costume. */
function adminImportarPratos(texto) {
  var email = exigirAdmin_();
  if (typeof texto !== 'string' || texto.length > 50000) throw new Error('Texto inválido.');
  return comLock_(function () {
    var ss = abrirPlanilha_();
    var aba = obterAba_(ss, 'Pratos');
    var tabela = lerTabela_(aba);
    var plano = interpretarColagemPratos_(texto, tabela.linhas);
    var ids = new Set(tabela.linhas.map(function (l) { return l.id; }));
    var agora = agoraIso_();
    var novaLinha = function (p) {
      var id = novoIdUnico_('PR', ids);
      ids.add(id);
      return Object.assign({ id: id, situacao: 'ATIVO', criado_em: agora, atualizado_em: agora }, linhaDoPrato_(p));
    };

    // Acompanhamentos (novos + existentes ativos) indexados pelo nome normalizado.
    var idAcomp = {};
    tabela.linhas.forEach(function (l) {
      if (l.tipo === 'ACOMPANHAMENTO' && l.situacao === 'ATIVO') idAcomp[normalizarNome_(l.nome)] = l.id;
    });
    var linhasAcomp = plano.acompanhamentos.map(function (nome) {
      var l = novaLinha({ tipo: 'ACOMPANHAMENTO', nome: nome, categoria: '', so_sexta: 'NAO', acompanhamentos: [] });
      idAcomp[normalizarNome_(nome)] = l.id;
      return l;
    });
    var linhasPrin = plano.principais.map(function (p) {
      return novaLinha({
        tipo: 'PRINCIPAL', nome: p.nome, categoria: p.categoria, so_sexta: p.so_sexta,
        acompanhamentos: p.acompanhamentos.map(function (a) { return idAcomp[normalizarNome_(a)]; })
      });
    });
    var todas = linhasAcomp.concat(linhasPrin);
    anexarLinhas_(aba, tabela.cabecalho, todas);
    registrarAuditoriaLote_(ss, todas.map(function (l) {
      return { operacao: 'ADICIONAR_PRATO', entidade: 'Pratos', registroId: l.id, responsavel: email, detalhes: { tipo: l.tipo, nome: l.nome } };
    }));
    return {
      principais: plano.principais.length,
      acompanhamentos: plano.acompanhamentos.length,
      ignorados: plano.ignorados
    };
  });
}

function adminAlterarSituacaoPrato(id, situacao) {
  var email = exigirAdmin_();
  if (situacao !== 'ATIVO' && situacao !== 'INATIVO') throw new Error('Situação inválida.');
  return comLock_(function () {
    var ss = abrirPlanilha_();
    var aba = obterAba_(ss, 'Pratos');
    var tabela = lerTabela_(aba);
    var p = tabela.linhas.filter(function (l) { return l.id === String(id); })[0];
    if (!p) throw new Error('Prato não encontrado.');
    if (p.situacao === situacao) return true;
    if (situacao === 'ATIVO' && conflitoDeNome_(tabela.linhas, p.tipo, p.nome, p.id)) {
      throw new Error('Já existe um prato ativo com esse nome.');
    }
    p.situacao = situacao;
    p.atualizado_em = agoraIso_();
    regravarPorId_(aba, tabela.cabecalho, p);
    registrarAuditoria_(ss, situacao === 'ATIVO' ? 'REATIVAR_PRATO' : 'INATIVAR_PRATO', 'Pratos', p.id, email, { tipo: p.tipo, nome: p.nome });
    return true;
  });
}
