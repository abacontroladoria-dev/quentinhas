// Pedidos dos funcionários: leitura da semana com o pedido de cada dia, prazo e gravação com LockService.
// Funções sem "_" (api*) são chamadas pelo web app anônimo: validam tudo no servidor.

var ALTERACOES_MAX_ = 10;
var HORA_RE_ = /^([01]\d|2[0-3]):[0-5]\d$/;

// ---------- Lógica pura (testada em Node) ----------

/** Prazo a partir da aba Configuracoes, com valores padrão se estiver inválido. */
function configPrazo_(config) {
  var hora = HORA_RE_.test(config.PRAZO_HORA || '') ? config.PRAZO_HORA : '09:30';
  var dias = parseInt(config.PRAZO_DIAS_ANTES, 10);
  return { hora: hora, diasAntes: dias >= 0 && dias <= 6 ? dias : 0 };
}

/** Limite para pedir/alterar o dia, em hora local: 'yyyy-MM-ddTHH:mm'. */
function limiteDoDia_(data, prazo) {
  return somarDias_(data, -prazo.diasAntes) + 'T' + prazo.hora;
}

/** `agoraLocal` no mesmo formato ('yyyy-MM-ddTHH:mm'); comparação de texto basta. */
function dentroDoPrazo_(data, agoraLocal, prazo) {
  return agoraLocal < limiteDoDia_(data, prazo);
}

/**
 * Valida a alteração de um dia e calcula o que gravar.
 * `dia`: linha do cardápio já interpretada ({ tipo, itens }); `alt`: { quer, retirados }.
 * Retorna { situacao, tipo, retirados } ou lança erro.
 */
function planejarPedido_(dia, alt) {
  if (dia.tipo !== 'PRATO') throw new Error('Não há almoço neste dia.');
  if (alt.quer !== true && alt.quer !== false) throw new Error('Pedido inválido.');
  if (!alt.quer) return { situacao: 'CANCELADO', tipo: '', retirados: [] };
  var retirados = Array.isArray(alt.retirados) ? alt.retirados.map(String) : [];
  if (retirados.length > dia.itens.length) throw new Error('Pedido inválido.');
  retirados.forEach(function (r, i) {
    if (dia.itens.indexOf(r) === -1) throw new Error('O cardápio deste dia mudou. Recarregue a página.');
    if (retirados.indexOf(r) !== i) throw new Error('Pedido inválido.');
  });
  if (retirados.length === dia.itens.length) throw new Error('Você tirou todos os itens. Para não pedir, escolha "Não quero".');
  // Mantém a ordem do cardápio, para leitura fácil na planilha.
  retirados = dia.itens.filter(function (i) { return retirados.indexOf(i) !== -1; });
  return { situacao: 'CONFIRMADO', tipo: retirados.length ? 'PERSONALIZADA' : 'COMPLETA', retirados: retirados };
}

/** Ciclos que interessam ao funcionário hoje: o atual e o seguinte. */
function ciclosVisiveis_(hoje) {
  var atual = inicioDoCiclo_(hoje);
  return [atual, somarDias_(atual, 7)];
}

// ---------- Integração com Apps Script ----------

function agoraLocal_() {
  return Utilities.formatDate(new Date(), FUSO_, "yyyy-MM-dd'T'HH:mm");
}

/** Funcionário ativo pelo ID, ou erro. */
function exigirFuncionarioAtivo_(ss, id) {
  if (typeof id !== 'string' || !/^F-[0-9a-f]{12}$/.test(id)) throw new Error('Funcionário inválido.');
  var f = lerTabela_(obterAba_(ss, 'Funcionarios')).linhas.filter(function (l) { return l.id === id; })[0];
  if (!f || f.situacao !== 'ATIVO') throw new Error('Funcionário não encontrado. Escolha seu nome novamente.');
  return f;
}

/** Dias das semanas publicadas visíveis: { data: { semana_id, rotulo, tipo, prato, itens, observacao } }. */
function diasPublicados_(ss, ciclos) {
  var publicadas = lerTabela_(obterAba_(ss, 'Semanas')).linhas.filter(function (s) {
    return s.situacao === 'PUBLICADA' && ciclos.indexOf(s.id) !== -1;
  }).map(function (s) { return s.id; });
  var porData = {};
  lerTabela_(obterAba_(ss, 'Cardapio')).linhas.forEach(function (l) {
    if (publicadas.indexOf(l.semana_id) === -1) return;
    porData[l.data] = { semana_id: l.semana_id, tipo: String(l.tipo), prato: String(l.prato || ''), itens: lerLista_(l.itens), observacao: String(l.observacao || '') };
  });
  return { semanas: publicadas.sort(), porData: porData };
}

// ---------- API pública do web app (anônima) ----------

/** Lista de nomes para o funcionário se identificar. */
function apiInicio() {
  return { funcionarios: listarFuncionariosAtivos_() };
}

/** Semana(s) publicada(s) com o pedido do funcionário em cada dia. */
function apiPedidosDoFuncionario(funcionarioId) {
  var ss = abrirPlanilha_();
  var f = exigirFuncionarioAtivo_(ss, funcionarioId);
  var prazo = configPrazo_(lerConfiguracoes_(ss));
  var agora = agoraLocal_();
  var pub = diasPublicados_(ss, ciclosVisiveis_(agora.slice(0, 10)));
  var pedidos = {};
  lerTabela_(obterAba_(ss, 'Pedidos')).linhas.forEach(function (p) {
    if (p.funcionario_id === f.id && pub.porData[p.data]) pedidos[p.data] = p;
  });

  return {
    funcionario: { id: f.id, nome: String(f.nome) },
    prazo: prazo,
    semanas: pub.semanas.map(function (terca) {
      return {
        terca: terca,
        dias: diasDoCiclo_(terca).filter(function (c) { return pub.porData[c.data]; }).map(function (c) {
          var d = pub.porData[c.data];
          var p = pedidos[c.data];
          return {
            data: c.data, rotulo: c.rotulo, tipo: d.tipo, prato: d.prato, itens: d.itens, observacao: d.observacao,
            editavel: d.tipo === 'PRATO' && dentroDoPrazo_(c.data, agora, prazo),
            limite: limiteDoDia_(c.data, prazo),
            pedido: p ? {
              situacao: String(p.situacao),
              // itens que não existem mais (cardápio alterado) não contam
              retirados: lerLista_(p.retirados).filter(function (r) { return d.itens.indexOf(r) !== -1; }),
              revisao: String(p.revisao || ''),
              atualizado_em: String(p.atualizado_em || ''),
              atualizado_por: String(p.atualizado_por || '')
            } : null
          };
        })
      };
    })
  };
}

/**
 * Grava as alterações do funcionário: [{ data, quer, retirados }].
 * Tudo ou nada: se um dia for inválido (prazo, cardápio mudou…), nada é gravado.
 */
function apiSalvarPedidos(funcionarioId, alteracoes) {
  if (!Array.isArray(alteracoes) || !alteracoes.length || alteracoes.length > ALTERACOES_MAX_) throw new Error('Nada para salvar.');
  return comLock_(function () {
    var ss = abrirPlanilha_();
    var f = exigirFuncionarioAtivo_(ss, funcionarioId);
    var prazo = configPrazo_(lerConfiguracoes_(ss));
    var agora = agoraLocal_();
    var pub = diasPublicados_(ss, ciclosVisiveis_(agora.slice(0, 10)));
    var aba = obterAba_(ss, 'Pedidos');
    var tabela = lerTabela_(aba);
    var existentes = {};
    tabela.linhas.forEach(function (p) { if (p.funcionario_id === f.id) existentes[p.data] = p; });
    var ids = new Set(tabela.linhas.map(function (p) { return p.id; }));
    var carimbo = agoraIso_();
    var vistas = {};

    // 1) valida tudo antes de gravar qualquer coisa
    var planos = alteracoes.map(function (alt) {
      alt = alt || {};
      var data = String(alt.data || '');
      var dia = pub.porData[data];
      if (!dia) throw new Error('Dia ' + data + ' não está em um cardápio publicado.');
      if (vistas[data]) throw new Error('Dia repetido.');
      vistas[data] = true;
      var rotulo = dataCurta_(data);
      if (!dentroDoPrazo_(data, agora, prazo)) throw new Error('O prazo para ' + rotulo + ' já encerrou.');
      try {
        return { data: data, dia: dia, plano: planejarPedido_(dia, alt) };
      } catch (e) {
        throw new Error(rotulo + ': ' + e.message);
      }
    });

    // 2) grava
    var novos = [];
    var auditoria = [];
    planos.forEach(function (x) {
      var atual = existentes[x.data];
      var dados = {
        funcionario_id: f.id, data: x.data, semana_id: x.dia.semana_id,
        situacao: x.plano.situacao, tipo: x.plano.tipo, retirados: JSON.stringify(x.plano.retirados),
        revisao: '', atualizado_em: carimbo, atualizado_por: 'FUNCIONARIO'
      };
      if (atual) {
        regravarPorId_(aba, tabela.cabecalho, Object.assign({}, atual, dados));
      } else {
        dados.id = novoIdUnico_('P', ids);
        ids.add(dados.id);
        dados.criado_em = carimbo;
        novos.push(dados);
      }
      auditoria.push({
        operacao: 'SALVAR_PEDIDO', entidade: 'Pedidos', registroId: atual ? atual.id : dados.id, responsavel: 'FUNC:' + f.id,
        detalhes: { data: x.data, situacao: x.plano.situacao, retirados: x.plano.retirados }
      });
    });
    anexarLinhas_(aba, tabela.cabecalho, novos);
    registrarAuditoriaLote_(ss, auditoria);
    return { salvos: planos.length, atualizado_em: carimbo };
  });
}
