// Painel da cozinha: totais do dia, quantidade por item, personalizações e quem não pediu.
// Acesso por token no link (somente leitura). Totais sempre calculados a partir de Pedidos + Cardapio.

// ---------- Lógica pura (testada em Node) ----------

/**
 * Resumo de um dia para a cozinha.
 * `dia`: { tipo, itens }; `pedidos`: linhas de Pedidos daquele dia; `ativos`: [{ id, nome }] em ordem alfabética;
 * `nomes`: { funcionario_id: nome } (inclui inativos, para pedidos antigos).
 */
function resumoCozinha_(dia, pedidos, ativos, nomes) {
  var porFunc = {};
  pedidos.forEach(function (p) { porFunc[p.funcionario_id] = p; });
  var confirmados = pedidos.filter(function (p) { return p.situacao === 'CONFIRMADO'; });
  var contagem = {};
  dia.itens.forEach(function (i) { contagem[i] = 0; });

  var pessoas = confirmados.map(function (p) {
    // Itens que não existem mais (cardápio alterado depois do pedido) são desconsiderados.
    var retirados = lerLista_(p.retirados).filter(function (r) { return dia.itens.indexOf(r) !== -1; });
    dia.itens.forEach(function (i) { if (retirados.indexOf(i) === -1) contagem[i]++; });
    return { id: String(p.funcionario_id), nome: nomes[p.funcionario_id] || '?', retirados: retirados, revisao: p.revisao === 'PENDENTE' };
  });
  pessoas.sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }); });

  return {
    total: confirmados.length,
    pessoas: pessoas,
    itens: dia.itens.map(function (i) { return { item: i, quantidade: contagem[i] }; }),
    personalizadas: pessoas.filter(function (x) { return x.retirados.length; }),
    completas: pessoas.filter(function (x) { return !x.retirados.length; }),
    naoQuerem: pedidos.filter(function (p) { return p.situacao === 'CANCELADO'; })
      .map(function (p) { return nomes[p.funcionario_id] || '?'; })
      .sort(function (a, b) { return a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }); }),
    semResposta: ativos.filter(function (f) { return !porFunc[f.id]; }).map(function (f) { return f.nome; })
  };
}

/** Dia mostrado ao abrir: hoje, se tiver cardápio; senão o próximo; senão o último. */
function diaPadraoCozinha_(datas, hoje) {
  var ordenadas = datas.slice().sort();
  for (var i = 0; i < ordenadas.length; i++) if (ordenadas[i] >= hoje) return ordenadas[i];
  return ordenadas.length ? ordenadas[ordenadas.length - 1] : '';
}

// ---------- Integração com Apps Script ----------

function exigirTokenCozinha_(token) {
  var certo = PropertiesService.getScriptProperties().getProperty('COZINHA_TOKEN');
  if (!tokensIguais_(token, certo)) throw new Error('Link da cozinha inválido. Peça o link atualizado ao administrador.');
}

// Site no GitHub Pages (telas de pedido e cozinha). Os dados vêm da API (Api.js), servida pelo
// servidor do VPS cujo endereço está em web/api.js.
var URL_SITE_ = 'https://abacontroladoria-dev.github.io/quentinhas/';

/** Link do painel da cozinha no site (usado pelo menu do administrador). */
function linkCozinha_() {
  var token = PropertiesService.getScriptProperties().getProperty('COZINHA_TOKEN');
  return token ? URL_SITE_ + 'cozinha.html?k=' + token : '';
}

// ---------- API pública do painel (token) ----------

/** Dados do painel para `data` (vazio = dia padrão). */
function apiCozinha(token, data) {
  exigirTokenCozinha_(token);
  var ss = abrirPlanilha_();
  var config = lerConfiguracoes_(ss);
  var prazo = configPrazo_(config);
  var agora = agoraLocal_();
  var hoje = agora.slice(0, 10);
  // Ciclo anterior também, para a cozinha consultar os últimos dias.
  var atual = inicioDoCiclo_(hoje);
  var pub = diasPublicados_(ss, [somarDias_(atual, -7), atual, somarDias_(atual, 7)]);
  var datas = Object.keys(pub.porData).filter(function (d) { return pub.porData[d].tipo === 'PRATO'; }).sort();
  data = datas.indexOf(String(data || '')) !== -1 ? String(data) : diaPadraoCozinha_(datas, hoje);
  var seg = parseInt(config.COZINHA_ATUALIZACAO_SEG, 10);
  var base = {
    datas: datas.map(function (d) { return { data: d, rotulo: rotuloDoDia_(d) }; }),
    atualizacaoSeg: seg >= 15 && seg <= 3600 ? seg : 60,
    geradoEm: agora
  };
  if (!data) return Object.assign(base, { data: '' });

  var dia = pub.porData[data];
  var funcionarios = lerTabela_(obterAba_(ss, 'Funcionarios')).linhas;
  var nomes = {};
  funcionarios.forEach(function (f) { nomes[f.id] = String(f.nome); });
  var ativos = ordenarPorNome_(funcionarios.filter(function (f) { return f.situacao === 'ATIVO'; })
    .map(function (f) { return { id: f.id, nome: String(f.nome) }; }));
  var pedidos = lerTabela_(obterAba_(ss, 'Pedidos')).linhas.filter(function (p) { return p.data === data; });

  return Object.assign(base, {
    data: data,
    rotulo: rotuloDoDia_(data),
    prato: dia.prato,
    observacao: dia.observacao,
    aberto: dentroDoPrazo_(data, agora, prazo),
    limite: limiteDoDia_(data, prazo),
    resumo: resumoCozinha_(dia, pedidos, ativos, nomes)
  });
}

function rotuloDoDia_(data) {
  var nomes = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  return nomes[lerData_(data).getUTCDay()];
}
