// Lista de compras semanal: cadastro de itens por seção e uma lista por ciclo (terça → segunda).
// Substitui a aba "LISTA DE MERCADO SEMANAL" da planilha antiga.
// Cada prato principal pode dizer o que pede (ex.: Carré → Carré 4 kg); a semana nova já vem com isso somado
// a partir do cardápio, e os demais itens repetem a quantidade da semana anterior.

var SECOES_COMPRA_ = ['ACOUGUE', 'MERCEARIA', 'TEMPEROS', 'LIMPEZA', 'SACOLAO'];
var ITEM_COMPRA_NOME_MAX_ = 60;

// Itens da planilha antiga (Cardápio Novo.xlsm), com nomes corrigidos e sem repetição.
var ITENS_COMPRA_PADRAO_ = {
  ACOUGUE: ['Bacon', 'Carne moída', 'Carré', 'Filé de frango', 'Frango (bandeja)', 'Lagarto redondo', 'Linguiça calabresa',
    'Lombo', 'Patinho', 'Pé de porco', 'Peixe panga', 'Pernil suíno', 'Presunto', 'Queijo mussarela', 'Sobrecoxa'],
  MERCEARIA: ['Arroz 1 kg', 'Arroz 5 kg', 'Sal 1 kg', 'Vinagre de álcool', 'Filtro de café nº 103 c/30', 'Macarrão espaguete 1 kg',
    'Macarrão de lasanha', 'Leite', 'Batata frita (Bem Brasil)', 'Azeite', 'Margarina 1 kg', 'Farinha de rosca', 'Guaracamp',
    'Maionese', 'Mostarda', 'Ketchup', 'Fubá', 'Café', 'Adoçante pequeno', 'Lata de milho', 'Queijo ralado', 'Molho de tomate',
    'Creme de leite', 'Guaraná Zero', 'Leite condensado', 'Nescau (saco)', 'Chocolate em pó 50%', 'Farinha de trigo sem fermento',
    'Feijão 1 kg', 'Farinha crua Granfino', 'Açúcar', 'Batata palha grande', 'Coca Zero 2 L', 'Óleo', 'Palito de dente',
    'Papel alumínio grande', 'Ovos'],
  TEMPEROS: ['Orégano', 'Pimenta-do-reino', 'Colorau', 'Páprica', 'Lemon pepper', 'Chimichurri', 'Louro'],
  LIMPEZA: ['Fósforo', 'Detergente 1 L', 'Veja Power', 'Esponja c/4', 'Álcool 1 L', 'Detergente em pasta', 'Papel toalha c/2',
    'Limpa-vidro', 'Limpa-forno', 'Bom Ar', 'Inseticida SBP', 'Bombril', 'Luvas tam. G (par)', 'Cif original', 'Lustra-móveis',
    'Palha de aço', 'Escovinha', 'Água sanitária'],
  SACOLAO: ['Limão', 'Tomate', 'Cenoura', 'Chuchu', 'Couve-flor', 'Batata-doce', 'Abóbora', 'Brócolis', 'Aipim', 'Beterraba',
    'Cebola', 'Alho', 'Batata', 'Couve', 'Alface']
};

// Sugestão inicial do que cada principal pede, tirada dos pedidos ao açougue anotados na planilha antiga.
// Casamento por trecho do nome do prato (sem acentos); a primeira regra que casa vale. A responsável ajusta em Pratos.
var COMPRAS_PADRAO_PRATOS_ = [
  [['feijoada'], [['Bacon', '3 kg'], ['Pé de porco', '2 unid'], ['Linguiça calabresa', '4 tiras']]],
  [['parmegiana'], [['Filé de frango', '6 bandejas'], ['Queijo mussarela', '1 kg']]],
  [['lasanha'], [['Carne moída', '3 kg'], ['Queijo mussarela', '1 kg'], ['Presunto', '1 kg']]],
  [['carre'], [['Carré', '4 kg']]],
  [['pernil'], [['Pernil suíno', '6 kg']]],
  [['lombo'], [['Lombo', '3 kg']]],
  [['peixe'], [['Peixe panga', '4 kg']]],
  [['sobrecoxa'], [['Sobrecoxa', '6 bandejas']]],
  [['frango grelhado', 'frango em cubos', 'frango empanado', 'estrogonofe frango', 'panqueca de frango'], [['Filé de frango', '6 bandejas']]],
  [['escondidinho', 'rocambole'], [['Carne moída', '4 kg']]],
  [['estrogonofe de carne', 'picadinho'], [['Patinho', '4 kg']]],
  [['carne assada'], [['Lagarto redondo', '5 kg']]],
  [['linguica', 'linquica'], [['Linguiça calabresa', '6 tiras']]]
];

// ---------- Lógica pura (testada em Node) ----------

/** Itens padrão na ordem de exibição: [{ secao, nome, ordem }]. */
function itensCompraPadrao_() {
  var itens = [];
  SECOES_COMPRA_.forEach(function (secao) {
    (ITENS_COMPRA_PADRAO_[secao] || []).forEach(function (nome, i) { itens.push({ secao: secao, nome: nome, ordem: i + 1 }); });
  });
  return itens;
}

/** O que um principal pede por padrão: [{ item_id, quantidade }]. `itens`: cadastro com id e nome. */
function comprasPadraoDoPrato_(nomePrato, itens) {
  var nome = normalizarNome_(nomePrato);
  var porNome = {};
  itens.forEach(function (i) { if (i.situacao !== 'INATIVO') porNome[normalizarNome_(i.nome)] = i.id; });
  for (var r = 0; r < COMPRAS_PADRAO_PRATOS_.length; r++) {
    var regra = COMPRAS_PADRAO_PRATOS_[r];
    if (!regra[0].some(function (trecho) { return nome.indexOf(trecho) !== -1; })) continue;
    return regra[1]
      .filter(function (c) { return porNome[normalizarNome_(c[0])]; })
      .map(function (c) { return { item_id: porNome[normalizarNome_(c[0])], quantidade: c[1] }; });
  }
  return [];
}

var UNIDADES_ = {
  k: 'kg', kg: 'kg', kgs: 'kg', kilo: 'kg', kilos: 'kg', quilo: 'kg', quilos: 'kg',
  bandeja: 'bandeja', bandejas: 'bandeja', bandeija: 'bandeja', bandeijas: 'bandeja', bdj: 'bandeja',
  tira: 'tira', tiras: 'tira',
  un: 'unid', und: 'unid', unid: 'unid', unidade: 'unid', unidades: 'unid',
  pc: 'pacote', pct: 'pacote', pacote: 'pacote', pacotes: 'pacote',
  l: 'L', litro: 'L', litros: 'L'
};
var PLURAL_ = { bandeja: 'bandejas', tira: 'tiras', pacote: 'pacotes' };

/** "4k" → { n: 4, unidade: 'kg' }; "2" → { n: 2, unidade: '' }; texto sem número → null. */
function lerQuantidade_(texto) {
  var m = /^\s*(\d+(?:[.,]\d+)?)\s*([^\d]*?)\s*$/.exec(String(texto || ''));
  if (!m) return null;
  var bruta = normalizarNome_(m[2]).replace(/\.$/, '');
  return { n: parseFloat(m[1].replace(',', '.')), unidade: UNIDADES_[bruta] || bruta };
}

function escreverQuantidade_(n, unidade) {
  var num = String(Math.round(n * 100) / 100).replace('.', ',');
  if (!unidade) return num;
  return num + ' ' + (n !== 1 && PLURAL_[unidade] ? PLURAL_[unidade] : unidade);
}

/** Soma quantidades de mesma unidade: ["6 bandejas", "6 bandeijas"] → "12 bandejas"; unidades diferentes ficam lado a lado com "+". */
function somarQuantidades_(lista) {
  var somas = [];
  var porUnidade = {};
  var soltos = [];
  lista.forEach(function (t) {
    var q = lerQuantidade_(t);
    if (!q) { if (limparNome_(t)) soltos.push(limparNome_(t)); return; }
    if (porUnidade[q.unidade] === undefined) { porUnidade[q.unidade] = somas.length; somas.push({ unidade: q.unidade, n: 0 }); }
    somas[porUnidade[q.unidade]].n += q.n;
  });
  return somas.map(function (s) { return escreverQuantidade_(s.n, s.unidade); }).concat(soltos).join(' + ');
}

/** Quantidade vazia ou zero = não comprar. */
function quantidadeVale_(texto) {
  var t = limparNome_(texto);
  if (!t) return false;
  var q = lerQuantidade_(t);
  return !(q && q.n === 0);
}

/**
 * O que o cardápio da semana pede: { item_id: { quantidade, pratos: ['terça: Carré'] } }.
 * `dias`: [{ dia, rotulo, tipo, principal_id }]; `pratosPorId`: principais com `compras`.
 */
function sugestaoDoCardapio_(dias, pratosPorId) {
  var acum = {};
  dias.forEach(function (d) {
    var p = d.tipo === 'PRATO' ? pratosPorId[d.principal_id] : null;
    if (!p) return;
    (p.compras || []).forEach(function (c) {
      var a = acum[c.item_id] = acum[c.item_id] || { quantidades: [], pratos: [] };
      a.quantidades.push(c.quantidade);
      a.pratos.push(String(d.rotulo || d.dia).split('-')[0].toLowerCase() + ': ' + p.nome);
    });
  });
  var sugestao = {};
  Object.keys(acum).forEach(function (id) {
    sugestao[id] = { quantidade: somarQuantidades_(acum[id].quantidades), pratos: acum[id].pratos };
  });
  return sugestao;
}

/**
 * Quantidades com que a tela abre a semana.
 * Lista já salva → como foi salva. Senão: a semana anterior para mercearia, temperos, limpeza e sacolão,
 * e o açougue (mais o que os pratos pedirem de outras seções) a partir do cardápio.
 */
function montarListaSemana_(itens, salva, anterior, sugestao) {
  if (salva) return { origem: 'SALVA', quantidades: Object.assign({}, salva) };
  var porId = {};
  itens.forEach(function (i) { porId[i.id] = i; });
  var q = {};
  Object.keys(anterior || {}).forEach(function (id) {
    if (porId[id] && porId[id].secao !== 'ACOUGUE' && quantidadeVale_(anterior[id])) q[id] = anterior[id];
  });
  Object.keys(sugestao || {}).forEach(function (id) { if (porId[id] && sugestao[id].quantidade) q[id] = sugestao[id].quantidade; });
  return { origem: anterior ? 'ANTERIOR' : 'NOVA', quantidades: q };
}

/** Valida { item_id: texto } vindo da tela. Retorna { quantidades, erro } só com o que vale (sem vazios nem zeros). */
function validarQuantidades_(entrada, itensPorId) {
  if (!entrada || typeof entrada !== 'object' || Array.isArray(entrada)) return { erro: 'Lista inválida.' };
  var q = {};
  var ids = Object.keys(entrada);
  for (var i = 0; i < ids.length; i++) {
    var id = ids[i];
    var t = limparNome_(entrada[id]);
    if (!quantidadeVale_(t)) continue;
    var item = itensPorId[id];
    if (!item) return { erro: 'Item não encontrado. Recarregue a tela.' };
    var erro = erroTextoLivre_(t, QUANTIDADE_MAX_);
    if (erro) return { erro: item.nome + ': quantidade ' + erro + '.' };
    q[id] = t;
  }
  return { erro: '', quantidades: q };
}

function validarItemCompra_(entrada) {
  entrada = entrada || {};
  if (SECOES_COMPRA_.indexOf(entrada.secao) === -1) return { erro: 'Seção inválida.' };
  var nome = limparNome_(entrada.nome);
  var erro = erroTextoLivre_(nome, ITEM_COMPRA_NOME_MAX_);
  if (erro) return { erro: 'Nome: ' + erro + '.' };
  return { erro: '', item: { secao: entrada.secao, nome: nome } };
}

function itemCompraDaLinha_(l) {
  return { id: String(l.id), secao: String(l.secao), nome: String(l.nome), ordem: Number(l.ordem) || 0, situacao: String(l.situacao) };
}

function ordenarItensCompra_(itens) {
  return itens.slice().sort(function (a, b) {
    return SECOES_COMPRA_.indexOf(a.secao) - SECOES_COMPRA_.indexOf(b.secao) || a.ordem - b.ordem ||
      String(a.nome).localeCompare(String(b.nome), 'pt-BR', { sensitivity: 'base' });
  });
}

function lerObjeto_(json) {
  try { var v = JSON.parse(json || '{}'); return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; } catch (e) { return {}; }
}

// ---------- Integração com Apps Script ----------

function lerItensCompra_(ss) {
  return ordenarItensCompra_(lerTabela_(obterAba_(ss, 'ItensCompra')).linhas.map(itemCompraDaLinha_));
}

/** Configuração inicial: cadastra os itens padrão se a aba estiver vazia. Retorna quantos entraram. */
function garantirItensCompraPadrao_(ss) {
  var aba = obterAba_(ss, 'ItensCompra');
  var tabela = lerTabela_(aba);
  if (tabela.linhas.length) return 0;
  var ids = new Set();
  var agora = agoraIso_();
  var linhas = itensCompraPadrao_().map(function (i) {
    var id = novoIdUnico_('IC', ids);
    ids.add(id);
    return { id: id, secao: i.secao, nome: i.nome, ordem: String(i.ordem), situacao: 'ATIVO', criado_em: agora, atualizado_em: agora };
  });
  anexarLinhas_(aba, tabela.cabecalho, linhas);
  return linhas.length;
}

/** Migração única (quando a coluna Pratos.compras nasce): sugere o que cada principal pede. Retorna os nomes alterados. */
function aplicarComprasPadrao_(ss) {
  var itens = lerItensCompra_(ss);
  var aba = obterAba_(ss, 'Pratos');
  var tabela = lerTabela_(aba);
  var agora = agoraIso_();
  var alterados = [];
  tabela.linhas.forEach(function (l) {
    if (l.tipo !== 'PRINCIPAL' || lerLista_(l.compras).length) return;
    var compras = comprasPadraoDoPrato_(l.nome, itens);
    if (!compras.length) return;
    l.compras = JSON.stringify(compras);
    l.atualizado_em = agora;
    regravarPorId_(aba, tabela.cabecalho, l);
    alterados.push(String(l.nome));
  });
  return alterados;
}

function lerListasCompra_(ss) {
  var porSemana = {};
  lerTabela_(obterAba_(ss, 'ListasCompra')).linhas.forEach(function (l) { porSemana[String(l.id)] = l; });
  return porSemana;
}

// ---------- API administrativa ----------

/** Dados da aba Lista de compras. `terca` vazio → próximo ciclo. */
function adminObterListaCompras(terca) {
  exigirAdmin_();
  var hoje = hojeTexto_();
  terca = terca ? inicioDoCiclo_(String(terca)) : proximoCiclo_(hoje);
  var ss = abrirPlanilha_();
  var itens = lerItensCompra_(ss);
  var pratosPorId = {};
  lerPratos_(ss).forEach(function (p) { pratosPorId[p.id] = p; });
  var s = lerSemanaCompleta_(ss, terca);
  var dias = diasDoCiclo_(terca).map(function (c) {
    var l = s.porData[c.data];
    return {
      data: c.data, dia: c.dia, rotulo: c.rotulo, tipo: l ? String(l.tipo) : '', principal_id: l ? String(l.principal_id || '') : '',
      prato: l ? String(l.prato || '') : '', observacao: l ? String(l.observacao || '') : ''
    };
  });
  var listas = lerListasCompra_(ss);
  var salva = listas[terca];
  var anterior = listas[somarDias_(terca, -7)];
  var sugestao = sugestaoDoCardapio_(dias, pratosPorId);
  var lista = montarListaSemana_(itens, salva ? lerObjeto_(salva.quantidades) : null, anterior ? lerObjeto_(anterior.quantidades) : null, sugestao);
  return {
    terca: terca, hoje: hoje, anterior: somarDias_(terca, -7), proxima: somarDias_(terca, 7),
    datas: [dias[0].data, dias[dias.length - 1].data],
    cardapio_definido: dias.filter(function (d) { return d.tipo; }).length,
    // Cardápio salvo da semana, para a tela mostrar junto da lista (o retrato `prato` é o que os funcionários veem).
    cardapio: dias.map(function (d) {
      var p = pratosPorId[d.principal_id];
      return { data: d.data, dia: d.dia, tipo: d.tipo, prato: d.prato || (d.tipo === 'PRATO' && p ? p.nome : ''), observacao: d.observacao };
    }),
    origem: lista.origem,
    salva_em: salva ? String(salva.atualizado_em || '') : '',
    quantidades: lista.quantidades,
    // Quantidades gravadas na semana anterior: a tela mostra como dica quando a desta semana é diferente.
    semana_passada: anterior ? lerObjeto_(anterior.quantidades) : {},
    sugestao: sugestao,
    itens: itens
  };
}

/** Grava a lista da semana (substitui a anterior daquela semana). */
function adminSalvarListaCompras(terca, quantidades) {
  var email = exigirAdmin_();
  terca = inicioDoCiclo_(String(terca));
  return comLock_(function () {
    var ss = abrirPlanilha_();
    var porId = {};
    lerItensCompra_(ss).forEach(function (i) { porId[i.id] = i; });
    var v = validarQuantidades_(quantidades, porId);
    if (v.erro) throw new Error(v.erro);
    var aba = obterAba_(ss, 'ListasCompra');
    var tabela = lerTabela_(aba);
    var existente = tabela.linhas.filter(function (l) { return String(l.id) === terca; })[0];
    var linha = { id: terca, quantidades: JSON.stringify(v.quantidades), atualizado_em: agoraIso_(), atualizado_por: email };
    if (existente) regravarPorId_(aba, tabela.cabecalho, linha);
    else anexarLinhas_(aba, tabela.cabecalho, [linha]);
    registrarAuditoria_(ss, 'SALVAR_LISTA_COMPRAS', 'ListasCompra', terca, email, { itens: Object.keys(v.quantidades).length });
    return { itens: Object.keys(v.quantidades).length };
  });
}

/** Cria (sem id) ou renomeia (com id) um item do cadastro. */
function adminSalvarItemCompra(entrada) {
  var email = exigirAdmin_();
  var v = validarItemCompra_(entrada);
  if (v.erro) throw new Error(v.erro);
  return comLock_(function () {
    var ss = abrirPlanilha_();
    var aba = obterAba_(ss, 'ItensCompra');
    var tabela = lerTabela_(aba);
    var id = entrada && entrada.id ? String(entrada.id) : '';
    var chave = normalizarNome_(v.item.nome);
    if (tabela.linhas.some(function (l) { return l.id !== id && l.situacao === 'ATIVO' && normalizarNome_(l.nome) === chave; })) {
      throw new Error('Já existe um item ativo com esse nome.');
    }
    var agora = agoraIso_();
    if (!id) {
      var ordem = tabela.linhas.filter(function (l) { return l.secao === v.item.secao; })
        .reduce(function (m, l) { return Math.max(m, Number(l.ordem) || 0); }, 0) + 1;
      var novo = { id: novoIdUnico_('IC', tabela.linhas.map(function (l) { return l.id; })), secao: v.item.secao, nome: v.item.nome,
        ordem: String(ordem), situacao: 'ATIVO', criado_em: agora, atualizado_em: agora };
      anexarLinhas_(aba, tabela.cabecalho, [novo]);
      registrarAuditoria_(ss, 'ADICIONAR_ITEM_COMPRA', 'ItensCompra', novo.id, email, v.item);
      return itemCompraDaLinha_(novo);
    }
    var atual = tabela.linhas.filter(function (l) { return l.id === id; })[0];
    if (!atual) throw new Error('Item não encontrado.');
    var depois = Object.assign({}, atual, { nome: v.item.nome, atualizado_em: agora });
    regravarPorId_(aba, tabela.cabecalho, depois);
    registrarAuditoria_(ss, 'ALTERAR_ITEM_COMPRA', 'ItensCompra', id, email, { antes: atual.nome, depois: v.item.nome });
    return itemCompraDaLinha_(depois);
  });
}

function adminAlterarSituacaoItemCompra(id, situacao) {
  var email = exigirAdmin_();
  if (situacao !== 'ATIVO' && situacao !== 'INATIVO') throw new Error('Situação inválida.');
  return comLock_(function () {
    var ss = abrirPlanilha_();
    var aba = obterAba_(ss, 'ItensCompra');
    var tabela = lerTabela_(aba);
    var item = tabela.linhas.filter(function (l) { return l.id === String(id); })[0];
    if (!item) throw new Error('Item não encontrado.');
    if (item.situacao === situacao) return true;
    item.situacao = situacao;
    item.atualizado_em = agoraIso_();
    regravarPorId_(aba, tabela.cabecalho, item);
    registrarAuditoria_(ss, situacao === 'ATIVO' ? 'REATIVAR_ITEM_COMPRA' : 'INATIVAR_ITEM_COMPRA', 'ItensCompra', item.id, email, { nome: item.nome });
    return true;
  });
}
