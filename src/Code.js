// Entrada do web app (doGet), roteamento por perfil e menu da planilha (onOpen).

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Quentinhas')
    .addItem('Administração', 'menuAdministracao')
    .addItem('Links (funcionários, cozinha e administração)', 'menuLinkCozinha')
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
    var links = linksDoSistema_();
    if (!links.cozinha || !links.admin) throw new Error('Links ainda não gerados. Execute a Configuração inicial.');
    var caixa = function (texto) {
      return '<textarea readonly style="width:100%;height:56px;font:13px monospace" onclick="this.select()">' + escaparHtml_(texto) + '</textarea>';
    };
    var html = HtmlService.createHtmlOutput(
      '<div style="font:14px system-ui,sans-serif">' +
      '<p><b>Funcionários</b> — mande este link no grupo. Cada um escolhe o próprio nome.</p>' + caixa(links.funcionarios) +
      '<p><b>Cozinha</b> — abra no celular/tablet da cozinha. Quem tiver este link vê o painel (somente leitura); não compartilhe no grupo.</p>' + caixa(links.cozinha) +
      '<p><b>Administração</b> — cardápio, lista de compras, pratos e funcionários, sem precisar abrir a planilha. ' +
      'Quem tiver este link administra o sistema: guarde só para você. Para trocar, use Administração → Configurações.</p>' + caixa(links.admin) +
      '</div>').setWidth(600).setHeight(470);
    ui.showModalDialog(html, 'Links do Quentinhas');
  } catch (e) {
    ui.alert('Quentinhas', e.message, ui.ButtonSet.OK);
  }
}

// Callbacks de menu não podem terminar com "_", então esta função também é chamável via google.script.run.
// É segura: sem planilha ativa (web app) ela recusa, e configurarPlanilha_ exige e-mail de proprietário/admin.
function menuConfiguracaoInicial() {
  var ui = SpreadsheetApp.getUi();
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) throw new Error('Execute a configuração pelo menu da planilha.');
    var r = configurarPlanilha_(ss, autorizarConfiguracaoInicial_(ss));
    ui.alert('Quentinhas', ['Configuração concluída.', ''].concat(resumoConfiguracao_(r)).join('\n'), ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('Quentinhas', 'Erro: ' + e.message, ui.ButtonSet.OK);
  }
}

/** Linhas que explicam o que a configuração fez (menu e página de administração). */
function resumoConfiguracao_(r) {
  var linhas = [];
  if (r.abasCriadas.length) linhas.push('Abas criadas/atualizadas: ' + r.abasCriadas.join(', '));
  if (r.colunasAcrescentadas.length) linhas.push('Colunas acrescentadas: ' + r.colunasAcrescentadas.join(', '));
  if (r.configuracoesInseridas.length) linhas.push('Configurações padrão: ' + r.configuracoesInseridas.join(', '));
  if (r.estrogonofes.length) linhas.push('Só com arroz (sem feijão e farofa): ' + r.estrogonofes.join(', '));
  if (r.itensCompra) linhas.push('Lista de compras: ' + r.itensCompra + ' itens da planilha antiga cadastrados.');
  if (r.comprasPratos.length) linhas.push('Compras sugeridas para ' + r.comprasPratos.length + ' pratos (confira em Pratos → Para comprar).');
  if (r.tokensGerados.length) linhas.push('Links gerados: ' + r.tokensGerados.join(', ') + ' (veja em Links).');
  if (r.primeiraVez) linhas.push('Administrador inicial: ' + r.email);
  if (!linhas.length) linhas.push('Nada a alterar: a planilha já estava configurada.');
  return linhas;
}

/** Cria/verifica abas, configurações padrão, dados iniciais e Script Properties. Idempotente. */
function configurarPlanilha_(ss, auth) {
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
    // Lista de compras: itens da planilha antiga e, quando a coluna Pratos.compras nasce, o que cada principal pede.
    var itensCompra = garantirItensCompraPadrao_(ss);
    var comprasPratos = colunasAcrescentadas.indexOf('Pratos.compras') !== -1 ? aplicarComprasPadrao_(ss) : [];

    props.setProperty('SPREADSHEET_ID', ss.getId());
    var tokensGerados = [];
    [['COZINHA_TOKEN', 'cozinha'], ['ADMIN_TOKEN', 'administração']].forEach(function (t) {
      if (props.getProperty(t[0])) return;
      props.setProperty(t[0], gerarToken_());
      tokensGerados.push(t[1]);
    });
    if (auth.primeiraVez) props.setProperty('ADMIN_EMAILS', auth.email);

    var r = {
      email: auth.email,
      primeiraVez: auth.primeiraVez,
      abasCriadas: abasCriadas,
      colunasAcrescentadas: colunasAcrescentadas,
      configuracoesInseridas: configuracoesInseridas,
      estrogonofes: estrogonofes,
      itensCompra: itensCompra,
      comprasPratos: comprasPratos,
      tokensGerados: tokensGerados
    };
    registrarAuditoria_(ss, 'CONFIGURACAO_INICIAL', 'Planilha', ss.getId(), auth.email, r);
    return r;
  });
}

// ---------- API administrativa: o que antes só existia no menu ----------

/** Links do sistema (os tokens só vão para quem já é administrador). */
function linksDoSistema_() {
  var props = PropertiesService.getScriptProperties();
  var admin = props.getProperty('ADMIN_TOKEN');
  return { funcionarios: URL_SITE_, cozinha: linkCozinha_(), admin: admin ? URL_SITE_ + 'admin.html?k=' + admin : '' };
}

function adminLinks() {
  exigirAdmin_();
  return linksDoSistema_();
}

/** Troca o link da cozinha ou o da administração; o antigo para de funcionar na hora. Retorna os links novos. */
function adminTrocarLink(qual) {
  var email = exigirAdmin_();
  var chave = { COZINHA: 'COZINHA_TOKEN', ADMIN: 'ADMIN_TOKEN' }[qual];
  if (!chave) throw new Error('Link inválido.');
  comLock_(function () {
    PropertiesService.getScriptProperties().setProperty(chave, gerarToken_());
    registrarAuditoria_(abrirPlanilha_(), qual === 'ADMIN' ? 'TROCAR_TOKEN_ADMIN' : 'TROCAR_TOKEN_COZINHA', 'Configuracoes', '', email, '');
  });
  return linksDoSistema_();
}

/** Configuração inicial a partir da administração (a planilha já existe; só cria o que falta). */
function adminConfigurar() {
  var email = exigirAdmin_();
  return resumoConfiguracao_(configurarPlanilha_(abrirPlanilha_(), { email: email, primeiraVez: false }));
}
