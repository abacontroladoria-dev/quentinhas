// Registro de operações na aba Auditoria (sem segredos).

var DETALHES_MAX_ = 2000;

/** Serializa os detalhes em JSON curto. */
function detalhesAuditoria_(detalhes) {
  if (detalhes === undefined || detalhes === null || detalhes === '') return '';
  var json = typeof detalhes === 'string' ? detalhes : JSON.stringify(detalhes);
  return json.length > DETALHES_MAX_ ? json.slice(0, DETALHES_MAX_ - 1) + '…' : json;
}

/**
 * Acrescenta um registro à aba Auditoria. Deve ser chamado dentro de comLock_.
 * `responsavel`: e-mail do admin, 'FUNC:<id>' ou 'SISTEMA'.
 */
function registrarAuditoria_(ss, operacao, entidade, registroId, responsavel, detalhes) {
  registrarAuditoriaLote_(ss, [{
    operacao: operacao, entidade: entidade, registroId: registroId, responsavel: responsavel, detalhes: detalhes
  }]);
}

/** Vários registros com uma única leitura e uma única gravação. Deve ser chamado dentro de comLock_. */
function registrarAuditoriaLote_(ss, registros) {
  if (!registros.length) return;
  var aba = obterAba_(ss, 'Auditoria');
  var tabela = lerTabela_(aba);
  var ids = new Set(tabela.linhas.map(function (l) { return l.id; }));
  var agora = agoraIso_();
  anexarLinhas_(aba, tabela.cabecalho, registros.map(function (r) {
    var id = novoIdUnico_('A', ids);
    ids.add(id);
    return {
      id: id,
      data_hora: agora,
      operacao: r.operacao,
      entidade: r.entidade,
      registro_id: r.registroId || '',
      responsavel: r.responsavel,
      detalhes: detalhesAuditoria_(r.detalhes)
    };
  }));
}
