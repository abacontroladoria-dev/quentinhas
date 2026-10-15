// API JSON para o site no GitHub Pages.
// O site envia POST com corpo texto {"acao": "<função>", "args": [...]} (texto puro evita preflight de CORS)
// e recebe {"ok": true, "dados": ...} ou {"ok": false, "erro": "mensagem"}.
// Só as funções desta lista podem ser chamadas; cada uma faz a própria validação.

var ACOES_API_ = {
  apiInicio: function () { return apiInicio(); },
  apiPedidosDoFuncionario: function (a) { return apiPedidosDoFuncionario(a[0]); },
  apiSalvarPedidos: function (a) { return apiSalvarPedidos(a[0], a[1]); },
  apiCozinha: function (a) { return apiCozinha(a[0], a[1]); }
};

var CORPO_MAX_ = 20000;

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
