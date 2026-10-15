// Cadastro de funcionários e lista de ativos para seleção no web app.

var NOME_MAX_ = 60;
// Começa com letra (impede fórmulas como "=..."); depois letras, espaço, ponto, apóstrofo e hífen.
var NOME_VALIDO_ = /^\p{L}[\p{L}\p{M} .'-]*$/u;

// ---------- Lógica pura (testada em Node) ----------

/** Remove espaços extras. */
function limparNome_(nome) {
  return String(nome === undefined || nome === null ? '' : nome).replace(/\s+/g, ' ').trim();
}

/** Chave de comparação: sem acentos, minúsculas, espaços normalizados. */
function normalizarNome_(nome) {
  return limparNome_(nome).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Retorna a mensagem de erro do nome, ou '' se válido. Espera nome já limpo. */
function erroNome_(nome) {
  if (!nome) return 'nome vazio';
  if (nome.length > NOME_MAX_) return 'mais de ' + NOME_MAX_ + ' caracteres';
  if (!NOME_VALIDO_.test(nome)) return 'use apenas letras, espaços, ponto, apóstrofo ou hífen';
  return '';
}

/**
 * Decide quais nomes de um texto (um por linha) podem ser incluídos.
 * `existentes`: [{ nome, situacao }]. Retorna { novos: [nome], ignorados: [{ nome, motivo }] }.
 */
function planejarInclusao_(texto, existentes) {
  var porChave = {};
  existentes.forEach(function (f) { porChave[normalizarNome_(f.nome)] = f.situacao; });
  var novos = [];
  var ignorados = [];
  String(texto || '').split(/\r?\n/).forEach(function (bruto) {
    var nome = limparNome_(bruto);
    if (!nome) return;
    var erro = erroNome_(nome);
    if (erro) { ignorados.push({ nome: nome, motivo: erro }); return; }
    var chave = normalizarNome_(nome);
    var situacao = porChave[chave];
    if (situacao === 'ATIVO') { ignorados.push({ nome: nome, motivo: 'já cadastrado' }); return; }
    if (situacao === 'INATIVO') { ignorados.push({ nome: nome, motivo: 'cadastrado como inativo — reative na lista' }); return; }
    if (situacao === 'NOVO') { ignorados.push({ nome: nome, motivo: 'repetido na lista colada' }); return; }
    porChave[chave] = 'NOVO';
    novos.push(nome);
  });
  return { novos: novos, ignorados: ignorados };
}

/** Verifica se `nome` conflita com outro funcionário ativo (ignorando `idProprio`). */
function nomeConflitaComAtivo_(nome, funcionarios, idProprio) {
  var chave = normalizarNome_(nome);
  return funcionarios.some(function (f) {
    return f.id !== idProprio && f.situacao === 'ATIVO' && normalizarNome_(f.nome) === chave;
  });
}

function ordenarPorNome_(lista) {
  return lista.slice().sort(function (a, b) {
    return String(a.nome).localeCompare(String(b.nome), 'pt-BR', { sensitivity: 'base' });
  });
}

// ---------- Integração com Apps Script ----------

/** Lista {id, nome} dos ativos, em ordem alfabética (usada pelo web app). */
function listarFuncionariosAtivos_() {
  var tabela = lerTabela_(obterAba_(abrirPlanilha_(), 'Funcionarios'));
  return ordenarPorNome_(tabela.linhas
    .filter(function (f) { return f.situacao === 'ATIVO'; })
    .map(function (f) { return { id: String(f.id), nome: String(f.nome) }; }));
}

/** Localiza um funcionário pelo ID; retorna { tabela, funcionario }. */
function localizarFuncionario_(aba, id) {
  var tabela = lerTabela_(aba);
  var funcionario = tabela.linhas.filter(function (f) { return f.id === id; })[0];
  if (!funcionario) throw new Error('Funcionário não encontrado.');
  return { tabela: tabela, funcionario: funcionario };
}

// ---------- API administrativa (chamada pelo diálogo Admin.html) ----------

function adminListarFuncionarios() {
  exigirAdmin_();
  var tabela = lerTabela_(obterAba_(abrirPlanilha_(), 'Funcionarios'));
  return ordenarPorNome_(tabela.linhas.map(function (f) {
    return { id: String(f.id), nome: String(f.nome), situacao: String(f.situacao) };
  }));
}

function adminAdicionarFuncionarios(texto) {
  var email = exigirAdmin_();
  if (typeof texto !== 'string' || texto.length > 20000) throw new Error('Lista inválida.');
  return comLock_(function () {
    var ss = abrirPlanilha_();
    var aba = obterAba_(ss, 'Funcionarios');
    var tabela = lerTabela_(aba);
    var plano = planejarInclusao_(texto, tabela.linhas);
    var ids = new Set(tabela.linhas.map(function (f) { return f.id; }));
    var agora = agoraIso_();
    var novos = plano.novos.map(function (nome) {
      var id = novoIdUnico_('F', ids);
      ids.add(id);
      return { id: id, nome: nome, situacao: 'ATIVO', criado_em: agora, atualizado_em: agora };
    });
    anexarLinhas_(aba, tabela.cabecalho, novos);
    registrarAuditoriaLote_(ss, novos.map(function (f) {
      return { operacao: 'ADICIONAR_FUNCIONARIO', entidade: 'Funcionarios', registroId: f.id, responsavel: email, detalhes: { nome: f.nome } };
    }));
    return { adicionados: plano.novos, ignorados: plano.ignorados };
  });
}

function adminRenomearFuncionario(id, nome) {
  var email = exigirAdmin_();
  nome = limparNome_(nome);
  var erro = erroNome_(nome);
  if (erro) throw new Error('Nome inválido: ' + erro + '.');
  return comLock_(function () {
    var ss = abrirPlanilha_();
    var aba = obterAba_(ss, 'Funcionarios');
    var loc = localizarFuncionario_(aba, String(id));
    var f = loc.funcionario;
    if (nomeConflitaComAtivo_(nome, loc.tabela.linhas, f.id)) throw new Error('Já existe um funcionário ativo com esse nome.');
    var anterior = f.nome;
    f.nome = nome;
    f.atualizado_em = agoraIso_();
    regravarPorId_(aba, loc.tabela.cabecalho, f);
    registrarAuditoria_(ss, 'RENOMEAR_FUNCIONARIO', 'Funcionarios', f.id, email, { antes: anterior, depois: nome });
    return true;
  });
}

function adminAlterarSituacaoFuncionario(id, situacao) {
  var email = exigirAdmin_();
  if (situacao !== 'ATIVO' && situacao !== 'INATIVO') throw new Error('Situação inválida.');
  return comLock_(function () {
    var ss = abrirPlanilha_();
    var aba = obterAba_(ss, 'Funcionarios');
    var loc = localizarFuncionario_(aba, String(id));
    var f = loc.funcionario;
    if (f.situacao === situacao) return true;
    if (situacao === 'ATIVO' && nomeConflitaComAtivo_(f.nome, loc.tabela.linhas, f.id)) {
      throw new Error('Já existe um funcionário ativo com esse nome. Renomeie um deles antes de reativar.');
    }
    var anterior = f.situacao;
    f.situacao = situacao;
    f.atualizado_em = agoraIso_();
    regravarPorId_(aba, loc.tabela.cabecalho, f);
    registrarAuditoria_(ss, situacao === 'ATIVO' ? 'REATIVAR_FUNCIONARIO' : 'INATIVAR_FUNCIONARIO',
      'Funcionarios', f.id, email, { antes: anterior, depois: situacao });
    return true;
  });
}
