// Carrega o código de src/ (o mesmo do Apps Script) num contexto do Node com os serviços do Google imitados:
// SpreadsheetApp e PropertiesService sobre a Planilha (SQLite), LockService, Utilities e Session.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

const SRC = path.join(__dirname, '..', 'src');

/** Utilities.formatDate para os padrões usados em src/: yyyy MM dd HH mm ss XXX e 'literais'. */
function formatarData(data, fuso, padrao) {
  const partes = {};
  new Intl.DateTimeFormat('en-US', {
    timeZone: fuso, hourCycle: 'h23', timeZoneName: 'longOffset',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
  }).formatToParts(data).forEach((p) => { partes[p.type] = p.value; });
  const desvio = partes.timeZoneName.replace('GMT', '').replace(/^([+-]00:00)?$/, 'Z'); // XXX: "Z" no UTC
  const tokens = { yyyy: partes.year, MM: partes.month, dd: partes.day, HH: partes.hour, mm: partes.minute, ss: partes.second, XXX: desvio };
  return String(padrao).replace(/'([^']*)'|yyyy|MM|dd|HH|mm|ss|XXX/g, (t, literal) => (literal !== undefined ? literal : tokens[t]));
}

function criarContexto(planilha) {
  const propriedades = {
    getProperty: (chave) => planilha.propriedade(chave),
    setProperty: (chave, valor) => { planilha.definirPropriedade(chave, valor); return propriedades; }
  };
  const contexto = vm.createContext({
    SpreadsheetApp: {
      openById: () => planilha,
      getActiveSpreadsheet: () => planilha,
      ProtectionType: { SHEET: 'SHEET' },
      getUi: () => { throw new Error('Não há planilha aberta no servidor.'); }
    },
    PropertiesService: { getScriptProperties: () => propriedades },
    // Uma requisição por vez (o código de src/ é síncrono): o lock é sempre obtido.
    LockService: { getScriptLock: () => ({ tryLock: () => true, waitLock: () => {}, releaseLock: () => {} }) },
    Utilities: { getUuid: () => crypto.randomUUID(), formatDate: formatarData },
    // Sem conta Google no servidor: administração só pelo link (token).
    Session: { getActiveUser: () => ({ getEmail: () => '' }) },
    Set,
    console
  });
  for (const arquivo of fs.readdirSync(SRC).filter((a) => a.endsWith('.js')).sort()) {
    vm.runInContext(fs.readFileSync(path.join(SRC, arquivo), 'utf8'), contexto, { filename: 'src/' + arquivo });
  }
  return contexto;
}

/** Cria abas, colunas, configurações padrão e tokens que faltarem (como "Atualizar a planilha"). Retorna o resumo ou null. */
function prepararDados(ctx, planilha) {
  const esquema = ctx.ESQUEMA_;
  const abasOk = Object.keys(esquema).every((nome) => {
    const aba = planilha.getSheetByName(nome);
    if (!aba) return false;
    const cab = aba.getRange(1, 1, 1, Math.max(1, aba.getLastColumn())).getValues()[0];
    return ctx.verificarCabecalho_(cab, esquema[nome], aba.getLastRow() > 1).acao === 'OK';
  });
  const configOk = abasOk && (() => {
    const config = ctx.lerConfiguracoes_(planilha);
    return ctx.CONFIG_PADRAO_.every((c) => c[0] in config);
  })();
  const tokensOk = planilha.propriedade('COZINHA_TOKEN') && planilha.propriedade('ADMIN_TOKEN');
  if (abasOk && configOk && tokensOk) return null;
  const r = ctx.configurarPlanilha_(planilha, { email: 'SISTEMA', primeiraVez: false });
  planilha.confirmar();
  return ctx.resumoConfiguracao_(r);
}

module.exports = { criarContexto, prepararDados, formatarData };
