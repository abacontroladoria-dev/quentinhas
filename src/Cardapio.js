// Cardápio semanal (terça → segunda): montagem, sugestão automática, publicação e alterações controladas.
// Cada dia tem tipo PRATO (principal + acompanhamentos do banco) ou SEM_ALMOCO (feriado etc.).
// Tipo vazio = ainda não definido.

var TIPOS_DIA_ = ['', 'PRATO', 'SEM_ALMOCO'];
var OBSERVACAO_MAX_ = 60;
var SEMANAS_RECENTES_ = 2; // a sugestão evita principais usados nos ciclos anteriores, quando possível
var CICLOS_HISTORICO_ = 6; // a tela mostra quando cada principal saiu pela última vez nesses ciclos

// ---------- Lógica pura (testada em Node) ----------

/**
 * Nome exibido e itens (o que o funcionário pode retirar) da combinação do dia:
 * principal + acompanhamentos + itens de todo dia que o principal não dispensa, sem repetir nomes.
 * O nome exibido não repete os itens de todo dia (eles aparecem na lista de itens).
 */
function retratoDoDia_(dia, pratosPorId, fixos) {
  if (dia.tipo !== 'PRATO') return { prato: '', itens: [] };
  var principal = pratosPorId[dia.principal_id];
  var nomes = [dia.principal_id].concat(dia.acompanhamento_ids || []).map(function (id) {
    return pratosPorId[id] ? pratosPorId[id].nome : '';
  }).filter(function (n) { return n; });
  var itens = [];
  var vistos = {};
  nomes.concat(fixosDoPrincipal_(principal, fixos || [])).forEach(function (n) {
    var k = normalizarNome_(n);
    if (!vistos[k]) { vistos[k] = true; itens.push(n); }
  });
  return { prato: nomes.join(' / '), itens: itens };
}

/**
 * Problemas da semana. `dias`: [{ data, dia, rotulo, tipo, principal_id, acompanhamento_ids }].
 * Erros impedem a publicação; avisos só informam.
 * `porData[data]` repete cada problema sem o nome do dia, para a tela mostrá-lo junto do dia.
 */
function validarSemana_(dias, pratosPorId) {
  var erros = [];
  var avisos = [];
  var porData = {};
  var rotulo = function (d) { return (d.rotulo || d.dia) + ' (' + dataCurta_(d.data) + ')'; };
  var anotar = function (lista, d, geral, local) {
    lista.push(geral);
    var p = porData[d.data] = porData[d.data] || { erros: [], avisos: [] };
    p[lista === erros ? 'erros' : 'avisos'].push(local);
  };
  var principalDe = function (d) {
    var p = d && d.tipo === 'PRATO' ? pratosPorId[d.principal_id] : null;
    return p && p.tipo === 'PRINCIPAL' ? p : null;
  };
  var vistos = {};
  dias.forEach(function (d, i) {
    if (!d.tipo) { anotar(erros, d, rotulo(d) + ': escolha o prato ou marque "sem almoço".', 'Escolha o prato ou marque "sem almoço".'); return; }
    if (d.tipo !== 'PRATO') return;
    var p = principalDe(d);
    if (!p) { anotar(erros, d, rotulo(d) + ': escolha o prato principal.', 'Escolha o prato principal.'); return; }
    var acomp = d.acompanhamento_ids || [];
    if (acomp.some(function (a) { return !pratosPorId[a] || pratosPorId[a].tipo !== 'ACOMPANHAMENTO'; })) {
      anotar(erros, d, rotulo(d) + ': acompanhamento não encontrado.', 'Um acompanhamento não existe mais no banco. Tire-o e escolha outro.');
    }
    if (!acomp.length) anotar(avisos, d, rotulo(d) + ': sem acompanhamento.', 'Sem acompanhamento.');
    if (vistos[p.id]) anotar(avisos, d, p.nome + ' aparece mais de uma vez na semana.', 'Já está na ' + String(vistos[p.id].rotulo).toLowerCase() + '.');
    else vistos[p.id] = d;
    if (p.so_sexta === 'SIM' && d.dia !== 'SEXTA') anotar(avisos, d, rotulo(d) + ': ' + p.nome + ' costuma ser só de sexta.', 'Costuma ser só de sexta.');
    var pAnt = principalDe(dias[i - 1]);
    if (pAnt && pAnt.categoria === 'FRANGO' && p.categoria === 'FRANGO') {
      anotar(avisos, d, 'Frango em dias seguidos: ' + rotulo(dias[i - 1]) + ' e ' + rotulo(d) + '.', 'Frango em dias seguidos: a ' + String(dias[i - 1].rotulo).toLowerCase() + ' também é frango.');
    }
  });
  return { erros: erros, avisos: avisos, porData: porData };
}

/**
 * Preenche os dias sem principal, como a macro antiga:
 * sexta usa principais "só sexta"; demais dias usam os outros; não repete principal na semana;
 * evita frango em dias seguidos; prefere principais que não saíram nas semanas recentes.
 * Dia com principal e sem acompanhamentos recebe os acompanhamentos de costume do principal.
 * Dias "sem almoço" e escolhas já feitas são mantidos.
 * `evitar`: ids que não podem ser sorteados (ex.: o principal que a pessoa quer trocar).
 */
function sugerirSemana_(dias, pratos, recentes, aleatorio, evitar) {
  aleatorio = aleatorio || Math.random;
  recentes = recentes || new Set();
  var porId = {};
  pratos.forEach(function (p) { porId[p.id] = p; });
  var principais = pratos.filter(function (p) { return p.tipo === 'PRINCIPAL' && p.situacao === 'ATIVO'; });
  var res = dias.map(function (d) { return Object.assign({}, d, { acompanhamento_ids: (d.acompanhamento_ids || []).slice() }); });
  var usados = new Set(evitar || []);
  res.forEach(function (d) { if (d.tipo === 'PRATO' && d.principal_id) usados.add(d.principal_id); });
  var ehFrango = function (d) { return d && d.tipo === 'PRATO' && porId[d.principal_id] && porId[d.principal_id].categoria === 'FRANGO'; };
  var semCandidato = [];

  res.forEach(function (d, i) {
    if (d.tipo === 'SEM_ALMOCO') return;
    if (!(d.tipo === 'PRATO' && d.principal_id)) {
      var sexta = d.dia === 'SEXTA';
      var livres = principais.filter(function (p) { return !usados.has(p.id); });
      var base = livres.filter(function (p) { return (p.so_sexta === 'SIM') === sexta; });
      if (sexta && !base.length) base = livres.filter(function (p) { return p.so_sexta !== 'SIM'; });
      var vizinhoFrango = ehFrango(res[i - 1]) || ehFrango(res[i + 1]);
      var semFrango = vizinhoFrango ? base.filter(function (p) { return p.categoria !== 'FRANGO'; }) : base;
      var preferidos = semFrango.filter(function (p) { return !recentes.has(p.id); });
      var pool = preferidos.length ? preferidos : semFrango.length ? semFrango : base;
      if (!pool.length) { semCandidato.push(d.data); return; }
      var escolhido = pool[Math.min(pool.length - 1, Math.floor(aleatorio() * pool.length))];
      d.tipo = 'PRATO';
      d.principal_id = escolhido.id;
      usados.add(escolhido.id);
    }
    if (!d.acompanhamento_ids.length) d.acompanhamento_ids = acompanhamentosDeCostume_(porId[d.principal_id], porId);
  });
  return { dias: res, semCandidato: semCandidato };
}

/** Acompanhamentos de costume de um principal que continuam ativos. */
function acompanhamentosDeCostume_(principal, porId) {
  return ((principal && principal.acompanhamentos) || []).filter(function (a) {
    return porId[a] && porId[a].tipo === 'ACOMPANHAMENTO' && porId[a].situacao === 'ATIVO';
  });
}

/** Valida a estrutura enviada pelo diálogo e alinha com as datas do ciclo. */
function normalizarDiasEntrada_(terca, entrada) {
  var ciclo = diasDoCiclo_(terca);
  if (!Array.isArray(entrada) || entrada.length !== ciclo.length) throw new Error('Semana inválida.');
  return ciclo.map(function (c, i) {
    var e = entrada[i] || {};
    if (e.data !== c.data) throw new Error('Datas da semana não conferem. Recarregue a tela.');
    var tipo = String(e.tipo || '');
    if (TIPOS_DIA_.indexOf(tipo) === -1) throw new Error('Tipo de dia inválido.');
    var obs = limparNome_(e.observacao);
    if (obs) {
      var erro = erroTextoLivre_(obs, OBSERVACAO_MAX_);
      if (erro) throw new Error(c.rotulo + ' — observação: ' + erro + '.');
    }
    var acomp = tipo === 'PRATO' && Array.isArray(e.acompanhamento_ids) ? e.acompanhamento_ids.map(String) : [];
    if (acomp.some(function (a, j) { return acomp.indexOf(a) !== j; })) throw new Error(c.rotulo + ': acompanhamento repetido.');
    if (acomp.length > ACOMPANHAMENTOS_MAX_) throw new Error(c.rotulo + ': no máximo ' + ACOMPANHAMENTOS_MAX_ + ' acompanhamentos.');
    return {
      data: c.data, dia: c.dia, rotulo: c.rotulo, tipo: tipo,
      principal_id: tipo === 'PRATO' ? String(e.principal_id || '') : '',
      acompanhamento_ids: acomp,
      observacao: obs
    };
  });
}

// ---------- Integração com Apps Script ----------

function lerSemanaCompleta_(ss, terca) {
  var semanas = lerTabela_(obterAba_(ss, 'Semanas'));
  var cardapio = lerTabela_(obterAba_(ss, 'Cardapio'));
  var semana = semanas.linhas.filter(function (s) { return s.id === terca; })[0] || null;
  var porData = {};
  cardapio.linhas.forEach(function (l) { if (l.semana_id === terca) porData[l.data] = l; });
  return { semanas: semanas, cardapio: cardapio, semana: semana, porData: porData };
}

/** Última data em que cada principal saiu nos `ciclos` anteriores a `terca`: { principal_id: 'yyyy-MM-dd' }. */
function ultimaVezPorPrincipal_(cardapioLinhas, terca, ciclos) {
  var desde = somarDias_(terca, -7 * ciclos);
  var ultima = {};
  cardapioLinhas.forEach(function (l) {
    var data = String(l.data);
    if (l.tipo !== 'PRATO' || !l.principal_id || data < desde || data >= terca) return;
    if (!ultima[l.principal_id] || ultima[l.principal_id] < data) ultima[l.principal_id] = data;
  });
  return ultima;
}

/** Funcionários distintos com algum pedido (quero ou não quero) na semana. */
function pessoasQueResponderam_(pedidosLinhas, terca) {
  var pessoas = {};
  pedidosLinhas.forEach(function (p) { if (p.semana_id === terca && p.funcionario_id) pessoas[p.funcionario_id] = true; });
  return Object.keys(pessoas).length;
}

/**
 * Pedidos confirmados por dia da semana que ainda não estão em revisão: os que uma troca de combinação
 * marcaria (ver marcarRevisaoPedidos_). A tela mostra a conta antes de salvar.
 */
function pedidosPorDia_(pedidosLinhas, terca) {
  var porDia = {};
  pedidosLinhas.forEach(function (p) {
    if (p.semana_id === terca && p.situacao === 'CONFIRMADO' && p.revisao !== 'PENDENTE') porDia[p.data] = (porDia[p.data] || 0) + 1;
  });
  return porDia;
}

/** Todos os pedidos confirmados por dia da semana (inclusive os em revisão): a contagem que a tela mostra em cada dia. */
function confirmadosPorDia_(pedidosLinhas, terca) {
  var porDia = {};
  pedidosLinhas.forEach(function (p) {
    if (p.semana_id === terca && p.situacao === 'CONFIRMADO') porDia[p.data] = (porDia[p.data] || 0) + 1;
  });
  return porDia;
}

function pratosRecentes_(cardapioLinhas, terca) {
  var ciclos = [];
  for (var i = 1; i <= SEMANAS_RECENTES_; i++) ciclos.push(somarDias_(terca, -7 * i));
  var ids = new Set();
  cardapioLinhas.forEach(function (l) { if (ciclos.indexOf(l.semana_id) !== -1 && l.principal_id) ids.add(l.principal_id); });
  return ids;
}

/** Marca como PENDENTE de revisão os pedidos confirmados das datas alteradas. Uma gravação por coluna. */
function marcarRevisaoPedidos_(ss, datas) {
  if (!datas.length) return 0;
  var aba = obterAba_(ss, 'Pedidos');
  var valores = aba.getDataRange().getValues();
  var cab = valores[0].map(String);
  var cData = cab.indexOf('data');
  var cSit = cab.indexOf('situacao');
  var cRev = cab.indexOf('revisao');
  var marcados = 0;
  var coluna = [];
  for (var r = 1; r < valores.length; r++) {
    var rev = valores[r][cRev];
    if (datas.indexOf(valores[r][cData]) !== -1 && valores[r][cSit] === 'CONFIRMADO' && rev !== 'PENDENTE') {
      rev = 'PENDENTE';
      marcados++;
    }
    coluna.push([rev]);
  }
  if (marcados) aba.getRange(2, cRev + 1, coluna.length, 1).setValues(coluna);
  return marcados;
}

// ---------- API administrativa ----------

/** Dados para a tela de cardápio. `terca` vazio → próximo ciclo. */
function adminObterSemana(terca) {
  exigirAdmin_();
  var hoje = hojeTexto_();
  terca = terca ? inicioDoCiclo_(String(terca)) : proximoCiclo_(hoje);
  var ss = abrirPlanilha_();
  var s = lerSemanaCompleta_(ss, terca);
  var publicada = !!s.semana && s.semana.situacao === 'PUBLICADA';
  var pedidos = publicada ? lerTabela_(obterAba_(ss, 'Pedidos')).linhas : [];
  return {
    terca: terca,
    hoje: hoje,
    // Para a tela mostrar há quanto tempo cada principal não sai (ajuda a variar).
    ultima_vez: ultimaVezPorPrincipal_(s.cardapio.linhas, terca, CICLOS_HISTORICO_),
    anterior: somarDias_(terca, -7),
    proxima: somarDias_(terca, 7),
    situacao: s.semana ? String(s.semana.situacao) : 'NOVA',
    publicada_em: s.semana ? String(s.semana.publicada_em || '') : '',
    confirmar_ate: s.semana ? String(s.semana.confirmar_ate || '') : '',
    prazo: configPrazo_(lerConfiguracoes_(ss)),
    // Quantas pessoas já responderam (só despublica com zero).
    respostas: publicada ? pessoasQueResponderam_(pedidos, terca) : 0,
    // Por dia: pedidos que vão para revisão se a combinação daquele dia mudar.
    pedidos_por_dia: pedidosPorDia_(pedidos, terca),
    confirmados_por_dia: confirmadosPorDia_(pedidos, terca),
    dias: diasDoCiclo_(terca).map(function (c) {
      var l = s.porData[c.data];
      return {
        data: c.data, dia: c.dia, rotulo: c.rotulo,
        tipo: l ? String(l.tipo) : '',
        principal_id: l ? String(l.principal_id || '') : '',
        acompanhamento_ids: l ? lerLista_(l.acompanhamento_ids) : [],
        prato: l ? String(l.prato || '') : '',
        itens: l ? lerLista_(l.itens) : [],
        observacao: l ? String(l.observacao || '') : ''
      };
    }),
    pratos: ordenarPorNome_(lerPratos_(ss)),
    fixos: lerItensFixos_(ss)
  };
}

/**
 * Volta uma semana publicada para rascunho: os funcionários deixam de vê-la.
 * Só enquanto ninguém respondeu; depois disso, o caminho é alterar e salvar (os pedidos vão para revisão).
 */
function adminDespublicarSemana(terca) {
  var email = exigirAdmin_();
  terca = inicioDoCiclo_(String(terca));
  return comLock_(function () {
    var ss = abrirPlanilha_();
    var s = lerSemanaCompleta_(ss, terca);
    if (!s.semana || s.semana.situacao !== 'PUBLICADA') throw new Error('Esta semana não está publicada.');
    var respostas = pessoasQueResponderam_(lerTabela_(obterAba_(ss, 'Pedidos')).linhas, terca);
    if (respostas) {
      throw new Error('Não dá para despublicar: ' + respostas + (respostas === 1 ? ' pessoa já respondeu' : ' pessoas já responderam') +
        ' esta semana. Altere o cardápio e salve; quem pediu recebe o aviso para conferir.');
    }
    var semana = Object.assign({}, s.semana, { situacao: 'RASCUNHO', publicada_em: '', publicada_por: '', atualizado_em: agoraIso_() });
    regravarPorId_(obterAba_(ss, 'Semanas'), s.semanas.cabecalho, semana);
    registrarAuditoria_(ss, 'DESPUBLICAR_SEMANA', 'Semanas', terca, email, '');
    return { situacao: 'RASCUNHO' };
  });
}

/** Sugestão para os dias vazios (não grava nada). `evitar`: ids de principais que não devem ser sorteados. */
function adminSugerirSemana(terca, dias, evitar) {
  exigirAdmin_();
  terca = inicioDoCiclo_(String(terca));
  var entrada = normalizarDiasEntrada_(terca, dias);
  evitar = Array.isArray(evitar) ? evitar.slice(0, 20).map(String) : [];
  var ss = abrirPlanilha_();
  var cardapio = lerTabela_(obterAba_(ss, 'Cardapio'));
  return sugerirSemana_(entrada, lerPratos_(ss), pratosRecentes_(cardapio.linhas, terca), null, evitar);
}

/** Valida sem gravar (avisos ao vivo na tela). */
function adminValidarSemana(terca, dias) {
  exigirAdmin_();
  terca = inicioDoCiclo_(String(terca));
  var porId = {};
  lerPratos_(abrirPlanilha_()).forEach(function (p) { porId[p.id] = p; });
  return validarSemana_(normalizarDiasEntrada_(terca, dias), porId);
}

/**
 * Grava a semana. `publicar` = true muda para PUBLICADA (exige semana sem erros).
 * Em semana já publicada, dias com combinação alterada marcam os pedidos daquele dia como revisão PENDENTE.
 * `confirmarAte`: data limite das respostas ('yyyy-MM-ddTHH:mm' ou ''); ausente = mantém a gravada.
 */
function adminSalvarSemana(terca, dias, publicar, confirmarAte) {
  var email = exigirAdmin_();
  terca = inicioDoCiclo_(String(terca));
  var entrada = normalizarDiasEntrada_(terca, dias);
  if (confirmarAte !== undefined && confirmarAte !== null) {
    confirmarAte = String(confirmarAte);
    var erroData = erroConfirmarAte_(confirmarAte, terca);
    if (erroData) throw new Error(erroData);
  }

  return comLock_(function () {
    var ss = abrirPlanilha_();
    var porId = {};
    lerPratos_(ss).forEach(function (p) { porId[p.id] = p; });
    var fixos = lerItensFixos_(ss);
    var s = lerSemanaCompleta_(ss, terca);
    // Planilha de antes da data limite: a coluna nasce aqui mesmo, sem precisar atualizar a planilha.
    if (s.semanas.cabecalho.indexOf('confirmar_ate') === -1) {
      garantirAba_(ss, 'Semanas', ESQUEMA_.Semanas);
      s = lerSemanaCompleta_(ss, terca);
    }
    var publicada = s.semana && s.semana.situacao === 'PUBLICADA';

    // Prato inativo só é aceito se já estava gravado naquele dia.
    entrada.forEach(function (d) {
      if (d.tipo !== 'PRATO') return;
      var anterior = s.porData[d.data];
      var jaGravados = anterior ? [anterior.principal_id].concat(lerLista_(anterior.acompanhamento_ids)) : [];
      [d.principal_id].concat(d.acompanhamento_ids).forEach(function (id) {
        if (!id) return;
        var p = porId[id];
        if (!p) throw new Error(d.rotulo + ': prato não encontrado.');
        if (p.situacao !== 'ATIVO' && jaGravados.indexOf(id) === -1) throw new Error(d.rotulo + ': "' + p.nome + '" está inativo.');
      });
    });

    var validacao = validarSemana_(entrada, porId);
    if ((publicar || publicada) && validacao.erros.length) {
      throw new Error('Não foi possível ' + (publicada ? 'salvar a semana publicada' : 'publicar') + ':\n' + validacao.erros.join('\n'));
    }

    var agora = agoraIso_();
    var abaCard = obterAba_(ss, 'Cardapio');
    var ids = new Set(s.cardapio.linhas.map(function (l) { return l.id; }));
    var novas = [];
    var alteradas = [];
    entrada.forEach(function (d) {
      var anterior = s.porData[d.data];
      var acompJson = JSON.stringify(d.acompanhamento_ids);
      var mesmaCombinacao = anterior && anterior.tipo === d.tipo && String(anterior.principal_id || '') === d.principal_id &&
        String(anterior.acompanhamento_ids || '[]') === acompJson;
      // O retrato (nomes/itens) é recalculado a cada gravação: inclui renomeações do banco e os itens de todo dia.
      var r = retratoDoDia_(d, porId, fixos);
      var itensAntes = anterior ? lerLista_(anterior.itens) : [];
      // Pedidos precisam de revisão se a combinação mudou ou se algum item deixou de existir;
      // só acrescentar itens (ex.: arroz/feijão/farofa) não invalida o que o funcionário escolheu.
      var afetaPedidos = !mesmaCombinacao || itensAntes.some(function (i) { return r.itens.indexOf(i) === -1; });
      var linha = {
        semana_id: terca, data: d.data, dia_semana: d.dia, tipo: d.tipo,
        principal_id: d.principal_id, acompanhamento_ids: d.tipo === 'PRATO' ? acompJson : '',
        prato: r.prato, itens: d.tipo === 'PRATO' ? JSON.stringify(r.itens) : '', observacao: d.observacao
      };
      if (!anterior) {
        if (!d.tipo && !d.observacao) return;
        linha.id = novoIdUnico_('C', ids);
        ids.add(linha.id);
        linha.criado_em = agora;
        linha.atualizado_em = agora;
        novas.push(linha);
        return;
      }
      var mudou = ['tipo', 'principal_id', 'acompanhamento_ids', 'prato', 'itens', 'observacao'].some(function (c) {
        return String(anterior[c] || '') !== String(linha[c] || '');
      });
      if (!mudou) return;
      linha.id = anterior.id;
      linha.criado_em = anterior.criado_em;
      linha.atualizado_em = agora;
      regravarPorId_(abaCard, s.cardapio.cabecalho, linha);
      alteradas.push({
        data: d.data,
        antes: anterior.tipo === 'PRATO' ? anterior.prato : anterior.tipo,
        depois: linha.tipo === 'PRATO' ? linha.prato : linha.tipo,
        afetaPedidos: afetaPedidos
      });
    });
    anexarLinhas_(abaCard, s.cardapio.cabecalho, novas);

    var abaSem = obterAba_(ss, 'Semanas');
    var semana = s.semana ? Object.assign({}, s.semana) : {
      id: terca, data_inicio: terca, data_fim: somarDias_(terca, 6), situacao: 'RASCUNHO', publicada_em: '', publicada_por: ''
    };
    var publicouAgora = publicar && !publicada;
    if (publicouAgora) {
      semana.situacao = 'PUBLICADA';
      semana.publicada_em = agora;
      semana.publicada_por = email;
    }
    var confirmarAntes = String(semana.confirmar_ate || '');
    if (typeof confirmarAte === 'string') semana.confirmar_ate = confirmarAte;
    semana.atualizado_em = agora;
    if (s.semana) regravarPorId_(abaSem, s.semanas.cabecalho, semana);
    else anexarLinhas_(abaSem, s.semanas.cabecalho, [semana]);

    var pedidosMarcados = publicada
      ? marcarRevisaoPedidos_(ss, alteradas.filter(function (a) { return a.afetaPedidos; }).map(function (a) { return a.data; }))
      : 0;

    var auditoria = [];
    if (novas.length || alteradas.length) {
      auditoria.push({
        operacao: publicada ? 'ALTERAR_CARDAPIO_PUBLICADO' : 'SALVAR_CARDAPIO', entidade: 'Cardapio', registroId: terca, responsavel: email,
        detalhes: { novos: novas.map(function (n) { return n.data + ' ' + (n.prato || n.tipo); }), alterados: alteradas, pedidosMarcados: pedidosMarcados }
      });
    }
    if (typeof confirmarAte === 'string' && confirmarAte !== confirmarAntes) {
      auditoria.push({ operacao: 'ALTERAR_DATA_LIMITE', entidade: 'Semanas', registroId: terca, responsavel: email, detalhes: { antes: confirmarAntes, depois: confirmarAte } });
    }
    if (publicouAgora) auditoria.push({ operacao: 'PUBLICAR_SEMANA', entidade: 'Semanas', registroId: terca, responsavel: email });
    registrarAuditoriaLote_(ss, auditoria);

    return { situacao: semana.situacao, avisos: validacao.avisos, pedidosMarcados: pedidosMarcados };
  });
}
