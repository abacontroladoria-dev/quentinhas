// Entrada do web app (doGet), roteamento por perfil e menu da planilha (onOpen).

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Quentinhas')
    .addItem('Administração', 'menuAdministracao')
    .addSeparator()
    .addItem('Links (funcionários e cozinha)', 'menuLinkCozinha')
    .addItem('Trocar link da cozinha', 'menuTrocarLinkCozinha')
    .addSeparator()
    .addItem('Configuração inicial', 'menuConfiguracaoInicial')
    .addToUi();
}

/** Web app. Sem parâmetros: tela do funcionário. `?v=cozinha&k=<token>`: painel da cozinha. */
function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.v === 'cozinha') {
    var token = PropertiesService.getScriptProperties().getProperty('COZINHA_TOKEN');
    if (!tokensIguais_(p.k, token)) return paginaSimples_('Link inválido', 'Peça o link atualizado da cozinha ao administrador.');
    var t = HtmlService.createTemplateFromFile('PainelCozinha');
    t.token = token; // já validado; o painel usa para chamar apiCozinha
    return t.evaluate()
      .setTitle('Quentinhas — Cozinha')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }
  return HtmlService.createTemplateFromFile('Index').evaluate()
    .setTitle('Quentinhas')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function paginaSimples_(titulo, texto) {
  return HtmlService.createHtmlOutput(
    '<div style="font:16px system-ui,sans-serif;padding:24px"><h2>' + escaparHtml_(titulo) + '</h2><p>' + escaparHtml_(texto) + '</p></div>')
    .setTitle('Quentinhas')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function escaparHtml_(t) {
  return String(t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
}

/** Inclui o conteúdo de outro arquivo HTML num template (<?!= include_('Styles') ?>). Só para arquivos do projeto. */
function include_(nome) {
  return HtmlService.createHtmlOutputFromFile(nome).getContent();
}

function menuAdministracao() {
  var ui = SpreadsheetApp.getUi();
  try {
    exigirAdmin_();
  } catch (e) {
    ui.alert('Quentinhas', e.message, ui.ButtonSet.OK);
    return;
  }
  var html = HtmlService.createTemplateFromFile('Admin').evaluate()
    .setWidth(920)
    .setHeight(680);
  ui.showModalDialog(html, 'Quentinhas — Administração');
}

function menuLinkCozinha() {
  var ui = SpreadsheetApp.getUi();
  try {
    exigirAdmin_();
    var link = linkCozinha_();
    if (!link) throw new Error('Web app ainda não disponível ou token não gerado. Execute a Configuração inicial.');
    var caixa = function (texto) {
      return '<textarea readonly style="width:100%;height:64px;font:13px monospace" onclick="this.select()">' + escaparHtml_(texto) + '</textarea>';
    };
    var html = HtmlService.createHtmlOutput(
      '<div style="font:14px system-ui,sans-serif">' +
      '<p><b>Funcionários</b> — mande este link no grupo. Cada um escolhe o próprio nome.</p>' + caixa(URL_SITE_) +
      '<p><b>Cozinha</b> — abra no celular/tablet da cozinha. Quem tiver este link vê o painel (somente leitura); não compartilhe no grupo.</p>' + caixa(link) +
      '</div>').setWidth(580).setHeight(330);
    ui.showModalDialog(html, 'Links do Quentinhas');
  } catch (e) {
    ui.alert('Quentinhas', e.message, ui.ButtonSet.OK);
  }
}

function menuTrocarLinkCozinha() {
  var ui = SpreadsheetApp.getUi();
  try {
    var email = exigirAdmin_();
    var r = ui.alert('Trocar link da cozinha',
      'O link atual deixa de funcionar imediatamente. Depois será preciso abrir o novo link no tablet da cozinha. Continuar?',
      ui.ButtonSet.YES_NO);
    if (r !== ui.Button.YES) return;
    comLock_(function () {
      PropertiesService.getScriptProperties().setProperty('COZINHA_TOKEN', gerarToken_());
      registrarAuditoria_(abrirPlanilha_(), 'TROCAR_TOKEN_COZINHA', 'Configuracoes', '', email, '');
    });
    menuLinkCozinha();
  } catch (e) {
    ui.alert('Quentinhas', e.message, ui.ButtonSet.OK);
  }
}

// Callbacks de menu não podem terminar com "_", então esta função também é chamável via google.script.run.
// É segura: configurarPlanilha_ exige planilha ativa (inexistente no web app) e e-mail de proprietário/admin.
function menuConfiguracaoInicial() {
  var ui = SpreadsheetApp.getUi();
  try {
    var r = configurarPlanilha_();
    var linhas = ['Configuração concluída.', ''];
    if (r.abasCriadas.length) linhas.push('Abas criadas/atualizadas: ' + r.abasCriadas.join(', '));
    if (r.colunasAcrescentadas.length) linhas.push('Colunas acrescentadas: ' + r.colunasAcrescentadas.join(', '));
    if (r.configuracoesInseridas.length) linhas.push('Configurações padrão: ' + r.configuracoesInseridas.join(', '));
    if (r.estrogonofes.length) linhas.push('Só com arroz (sem feijão e farofa): ' + r.estrogonofes.join(', '));
    if (r.tokenGerado) linhas.push('Token da cozinha gerado (o link será exibido após a implantação do web app).');
    if (r.primeiraVez) linhas.push('Administrador inicial: ' + r.email);
    if (!r.abasCriadas.length && !r.colunasAcrescentadas.length && !r.configuracoesInseridas.length && !r.tokenGerado) {
      linhas.push('Nada a alterar: a planilha já estava configurada.');
    }
    ui.alert('Quentinhas', linhas.join('\n'), ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('Quentinhas', 'Erro: ' + e.message, ui.ButtonSet.OK);
  }
}

/** Cria/verifica abas, configurações padrão e Script Properties. Idempotente. */
function configurarPlanilha_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Execute a configuração pelo menu da planilha.');
  var auth = autorizarConfiguracaoInicial_(ss);

  return comLock_(function () {
    var props = PropertiesService.getScriptProperties();
    var abasCriadas = [];
    var colunasAcrescentadas = [];
    if (ss.getSpreadsheetTimeZone() !== FUSO_) ss.setSpreadsheetTimeZone(FUSO_);
    Object.keys(ESQUEMA_).forEach(function (nome) {
      var g = garantirAba_(ss, nome, ESQUEMA_[nome]);
      if (g.estado === 'CRIADA' || g.estado === 'CABECALHO') abasCriadas.push(nome);
      g.acrescentadas.forEach(function (c) { colunasAcrescentadas.push(nome + '.' + c); });
    });
    removerAbaPadraoVazia_(ss);
    protegerAbas_(ss);
    var configuracoesInseridas = garantirConfiguracoesPadrao_(ss);
    // Migração única: quando a coluna sem_fixos nasce, os estrogonofes passam a vir só com arroz.
    var estrogonofes = colunasAcrescentadas.indexOf('Pratos.sem_fixos') !== -1 ? aplicarPadraoEstrogonofe_(ss) : [];

    props.setProperty('SPREADSHEET_ID', ss.getId());
    var tokenGerado = false;
    if (!props.getProperty('COZINHA_TOKEN')) {
      props.setProperty('COZINHA_TOKEN', gerarToken_());
      tokenGerado = true;
    }
    if (auth.primeiraVez) props.setProperty('ADMIN_EMAILS', auth.email);

    registrarAuditoria_(ss, 'CONFIGURACAO_INICIAL', 'Planilha', ss.getId(), auth.email, {
      abasCriadas: abasCriadas,
      colunasAcrescentadas: colunasAcrescentadas,
      configuracoesInseridas: configuracoesInseridas,
      estrogonofes: estrogonofes,
      tokenGerado: tokenGerado,
      primeiraVez: auth.primeiraVez
    });

    return {
      email: auth.email,
      primeiraVez: auth.primeiraVez,
      abasCriadas: abasCriadas,
      colunasAcrescentadas: colunasAcrescentadas,
      configuracoesInseridas: configuracoesInseridas,
      estrogonofes: estrogonofes,
      tokenGerado: tokenGerado
    };
  });
}
