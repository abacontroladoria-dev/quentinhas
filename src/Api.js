// API JSON para o site no GitHub Pages.
// O site envia POST com corpo texto {"acao": "<função>", "args": [...]} (texto puro evita preflight de CORS)
// e recebe {"ok": true, "dados": ...} ou {"ok": false, "erro": "mensagem"}.
// Só as funções desta lista podem ser chamadas; cada uma faz a própria validação.

var ACOES_API_ = {
  apiInicio: function () { return apiInicio(); },
  apiPedidosDoFuncionario: function (a) { return apiPedidosDoFuncionario(a[0]); },
  apiSalvarPedidos: function (a) { return apiSalvarPedidos(a[0], a[1]); },
  apiCozinha: function (a) { return apiCozinha(a[0], a[1]); },
  apiAdmin: function (a) { return apiAdmin(a[0], a[1], a[2]); }
};

// Página de administração do site (admin.html?k=<token>): as mesmas funções do diálogo da planilha.
var ACOES_ADMIN_ = {
  adminObterSemana: function (a) { return adminObterSemana(a[0]); },
  adminValidarSemana: function (a) { return adminValidarSemana(a[0], a[1]); },
  adminSugerirSemana: function (a) { return adminSugerirSemana(a[0], a[1], a[2]); },
  adminSalvarSemana: function (a) { return adminSalvarSemana(a[0], a[1], a[2]); },
  adminDespublicarSemana: function (a) { return adminDespublicarSemana(a[0]); },
  adminObterListaCompras: function (a) { return adminObterListaCompras(a[0]); },
  adminSalvarListaCompras: function (a) { return adminSalvarListaCompras(a[0], a[1]); },
  adminSalvarItemCompra: function (a) { return adminSalvarItemCompra(a[0]); },
  adminAlterarSituacaoItemCompra: function (a) { return adminAlterarSituacaoItemCompra(a[0], a[1]); },
  adminListarPratos: function () { return adminListarPratos(); },
  adminSalvarPrato: function (a) { return adminSalvarPrato(a[0]); },
  adminImportarPratos: function (a) { return adminImportarPratos(a[0]); },
  adminAlterarSituacaoPrato: function (a) { return adminAlterarSituacaoPrato(a[0], a[1]); },
  adminListarFuncionarios: function () { return adminListarFuncionarios(); },
  adminAdicionarFuncionarios: function (a) { return adminAdicionarFuncionarios(a[0]); },
  adminRenomearFuncionario: function (a) { return adminRenomearFuncionario(a[0], a[1]); },
  adminAlterarSituacaoFuncionario: function (a) { return adminAlterarSituacaoFuncionario(a[0], a[1]); },
  adminLinks: function () { return adminLinks(); },
  adminTrocarLink: function (a) { return adminTrocarLink(a[0]); },
  adminConfigurar: function () { return adminConfigurar(); }
};

/** Confere o token do link e executa a função administrativa como "LINK_ADMIN" (é o que aparece na Auditoria). */
function apiAdmin(token, acao, args) {
  exigirTokenAdmin_(token);
  if (typeof acao !== 'string' || !Object.prototype.hasOwnProperty.call(ACOES_ADMIN_, acao)) throw new Error('Ação inválida.');
  ADMIN_PELO_LINK_ = 'LINK_ADMIN';
  try {
    return ACOES_ADMIN_[acao](Array.isArray(args) ? args : []);
  } finally {
    ADMIN_PELO_LINK_ = '';
  }
}

// A importação de pratos colados do Excel aceita até 50 kB de texto.
var CORPO_MAX_ = 60000;

/** Interpreta o corpo e executa a ação. Puro em relação ao transporte (testado em Node). */
function executarApi_(texto, acoes) {
  try {
    if (typeof texto !== 'string' || texto.length > CORPO_MAX_) throw new Error('Requisição inválida.');
    var corpo;
    try { corpo = JSON.parse(texto || '{}'); } catch (erroJson) { throw new Error('Requisição inválida.'); }
    var nome = corpo && corpo.acao;
    if (typeof nome !== 'string' || !Object.prototype.hasOwnProperty.call(acoes, nome)) throw new Error('Ação inválida.');
    var args = Array.isArray(corpo.args) ? corpo.args : [];
    return { ok: true, dados: acoes[nome](args) };
  } catch (e) {
    return { ok: false, erro: e && e.message ? e.message : String(e) };
  }
}

function doPost(e) {
  var texto = e && e.postData ? e.postData.contents : '';
  var resposta = executarApi_(texto, ACOES_API_);
  return ContentService.createTextOutput(JSON.stringify(resposta)).setMimeType(ContentService.MimeType.JSON);
}
