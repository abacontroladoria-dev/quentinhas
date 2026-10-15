// Autorização no servidor: validação do funcionário selecionado, token da cozinha e lista de administradores.

// ---------- Lógica pura (testada em Node) ----------

/** Converte o texto de ADMIN_EMAILS (separado por vírgula, ponto e vírgula ou espaço) em lista normalizada. */
function listaAdmins_(texto) {
  return String(texto || '')
    .split(/[\s,;]+/)
    .map(function (e) { return e.trim().toLowerCase(); })
    .filter(function (e) { return e.indexOf('@') > 0; })
    .filter(function (e, i, arr) { return arr.indexOf(e) === i; });
}

function emailEhAdmin_(email, textoAdmins) {
  var e = String(email || '').trim().toLowerCase();
  return e !== '' && listaAdmins_(textoAdmins).indexOf(e) !== -1;
}

/** Token de 64 caracteres hex (256 bits) para o link da cozinha. */
function gerarToken_() {
  return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '').toLowerCase();
}

/** Comparação em tempo constante para tokens de mesmo tamanho. */
function tokensIguais_(a, b) {
  a = String(a || '');
  b = String(b || '');
  if (!a || a.length !== b.length) return false;
  var dif = 0;
  for (var i = 0; i < a.length; i++) dif |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return dif === 0;
}

// ---------- Integração com Apps Script ----------

function emailAtivo_() {
  return String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
}

/** Garante que quem executa é administrador. Retorna o e-mail. */
function exigirAdmin_() {
  var email = emailAtivo_();
  var admins = PropertiesService.getScriptProperties().getProperty('ADMIN_EMAILS');
  if (!emailEhAdmin_(email, admins)) {
    throw new Error('Acesso negado: esta função é restrita aos administradores.');
  }
  return email;
}

/**
 * Autorização da configuração inicial.
 * - Se ADMIN_EMAILS já existe: exige admin.
 * - Primeira execução: só o proprietário da planilha pode executar, e ele vira o primeiro admin.
 * Retorna { email, primeiraVez }.
 */
function autorizarConfiguracaoInicial_(ss) {
  var props = PropertiesService.getScriptProperties();
  var email = emailAtivo_();
  if (!email) throw new Error('Não foi possível identificar sua conta Google.');
  if (props.getProperty('ADMIN_EMAILS')) {
    return { email: exigirAdmin_(), primeiraVez: false };
  }
  var dono = ss.getOwner();
  var emailDono = dono ? String(dono.getEmail() || '').toLowerCase() : '';
  if (emailDono && emailDono !== email) {
    throw new Error('A primeira configuração deve ser feita pelo proprietário da planilha (' + emailDono + ').');
  }
  return { email: email, primeiraVez: true };
}
