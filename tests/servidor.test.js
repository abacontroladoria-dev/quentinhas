const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Planilha } = require('../server/planilha');
const { formatarData } = require('../server/gas');
const { gerarXlsx, lerXlsx } = require('../server/xlsx');
const { criarServidor } = require('../server/servidor');

const ORIGEM = 'https://abacontroladoria-dev.github.io';
const pastaTemp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'quentinhas-'));

test('planilha imita getValues/setValues/getLastRow como o Sheets', () => {
  const p = new Planilha(':memory:');
  const aba = p.insertSheet('X');
  assert.deepEqual(aba.getDataRange().getValues(), [['']]);
  assert.equal(aba.getLastRow(), 0);
  aba.getRange(1, 1, 1, 3).setValues([['id', 'nome', 'obs']]);
  aba.getRange(3, 1, 1, 2).setValues([['a', 'b']]);
  assert.equal(aba.getLastRow(), 3);
  assert.equal(aba.getLastColumn(), 3);
  assert.deepEqual(aba.getDataRange().getValues(), [['id', 'nome', 'obs'], ['', '', ''], ['a', 'b', '']]);
  assert.throws(() => aba.getRange(1, 1, 1, 2).setValues([['só um']]), /dimensões/);
});

test('desfazer descarta tudo o que a requisição alterou; confirmar grava no SQLite', () => {
  const pasta = pastaTemp();
  const arquivo = path.join(pasta, 'q.db');
  const p = new Planilha(arquivo);
  const aba = p.insertSheet('X');
  aba.getRange(1, 1, 1, 2).setValues([['id', 'v']]);
  p.definirPropriedade('T', '1');
  p.confirmar();

  aba.getRange(1, 2).setValue('mudado');
  aba.getRange(2, 1, 1, 2).setValues([['novo', 'x']]);
  p.definirPropriedade('T', '2');
  p.definirPropriedade('U', 'nova');
  p.desfazer();
  assert.deepEqual(aba.getDataRange().getValues(), [['id', 'v']]);
  assert.equal(p.propriedade('T'), '1');
  assert.equal(p.propriedade('U'), null);

  aba.getRange(2, 1, 1, 2).setValues([['r1', 7]]);
  p.confirmar();
  p.fechar();
  const reaberta = new Planilha(arquivo);
  assert.deepEqual(reaberta.getSheetByName('X').getDataRange().getValues(), [['id', 'v'], ['r1', 7]]);
  assert.equal(reaberta.propriedade('T'), '1');
  reaberta.copiarPara(path.join(pasta, 'backup', 'copia.db'));
  assert.ok(fs.existsSync(path.join(pasta, 'backup', 'copia.db')));
  reaberta.fechar();
});

test('formatarData segue os padrões do Utilities.formatDate', () => {
  const d = new Date('2026-10-15T12:05:09Z');
  assert.equal(formatarData(d, 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ssXXX"), '2026-10-15T09:05:09-03:00');
  assert.equal(formatarData(d, 'America/Sao_Paulo', 'yyyy-MM-dd'), '2026-10-15');
  assert.equal(formatarData(new Date('2026-10-16T02:30:00Z'), 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm"), '2026-10-15T23:30');
  assert.equal(formatarData(d, 'UTC', 'HH:mmXXX'), '12:05Z');
});

test('xlsx: o que é gerado é lido de volta igual', () => {
  const abas = {
    Funcionarios: [['id', 'nome', 'situacao'], ['F-1', 'José & Ana <teste> "aspas"', 'ATIVO'], ['F-2', 'Çãé', '']],
    Numeros: [['ordem'], [3], [1.5]]
  };
  const lidas = lerXlsx(gerarXlsx(abas));
  assert.deepEqual(lidas.Funcionarios, [['id', 'nome', 'situacao'], ['F-1', 'José & Ana <teste> "aspas"', 'ATIVO'], ['F-2', 'Çãé']]);
  assert.deepEqual(lidas.Numeros, [['ordem'], [3], [1.5]]);
});

async function comServidor(fn, opcoes = {}) {
  const pasta = pastaTemp();
  const s = criarServidor(Object.assign({ dados: path.join(pasta, 'q.db'), silencioso: true, tokenImportar: 'segredo-importar' }, opcoes));
  await new Promise((ok) => s.servidor.listen(0, '127.0.0.1', ok));
  const base = 'http://127.0.0.1:' + s.servidor.address().port;
  const api = (acao, args) => fetch(base + '/api', {
    method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8', Origin: ORIGEM }, body: JSON.stringify({ acao, args })
  }).then((r) => r.json());
  try {
    await fn({ base, api, s });
  } finally {
    await new Promise((ok) => s.servidor.close(ok));
    s.planilha.fechar();
  }
}

test('API: banco novo já sai configurado e atende as telas', async () => {
  await comServidor(async ({ base, api, s }) => {
    const tk = s.planilha.propriedade('ADMIN_TOKEN');
    assert.match(tk, /^[0-9a-f]{64}$/);

    const r = await fetch(base + '/api', { method: 'POST', headers: { Origin: ORIGEM }, body: JSON.stringify({ acao: 'apiInicio' }) });
    assert.equal(r.headers.get('access-control-allow-origin'), ORIGEM);
    assert.deepEqual((await r.json()).dados.funcionarios, []);

    const add = await api('apiAdmin', [tk, 'adminAdicionarFuncionarios', ['Maria Silva']]);
    assert.equal(add.ok, true, add.erro);
    assert.deepEqual((await api('apiInicio', [])).dados.funcionarios.map((f) => f.nome), ['Maria Silva']);

    assert.match((await api('apiAdmin', ['errado', 'adminLinks', []])).erro, /Link de administração inválido/);
    assert.match((await api('naoExiste', [])).erro, /Ação inválida/);

    const x = await api('apiAdmin', [tk, 'adminExportarExcel', []]);
    assert.equal(x.ok, true, x.erro);
    assert.deepEqual(lerXlsx(Buffer.from(x.dados.base64, 'base64')).Funcionarios[1].slice(1, 3), ['Maria Silva', 'ATIVO']);

    const outra = await fetch(base + '/api', { method: 'POST', headers: { Origin: 'https://outro.site' }, body: '{}' });
    assert.equal(outra.headers.get('access-control-allow-origin'), null);
    assert.deepEqual(await (await fetch(base + '/saude')).json(), { ok: true });
  });
});

test('importar troca os dados, mantém os tokens enviados e completa o que faltar', async () => {
  await comServidor(async ({ base, api }) => {
    const enviar = (token, corpo) => fetch(base + '/importar', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify(corpo)
    });
    const abas = { Funcionarios: [['id', 'nome', 'situacao', 'criado_em', 'atualizado_em'], ['F-0123456789ab', 'Ana Lima', 'ATIVO', '', '']] };
    const tokenAdmin = 'a'.repeat(64);
    assert.equal((await enviar('errado', { abas })).status, 403);
    const r = await (await enviar('segredo-importar', { abas, propriedades: { ADMIN_TOKEN: tokenAdmin, COZINHA_TOKEN: 'b'.repeat(64) } })).json();
    assert.equal(r.ok, true, r.erro);
    assert.equal(r.linhas.Funcionarios, 1);
    assert.ok(r.linhas.Pedidos === 0 && r.linhas.ItensCompra > 0);
    assert.deepEqual((await api('apiInicio', [])).dados.funcionarios, [{ id: 'F-0123456789ab', nome: 'Ana Lima' }]);
    assert.equal((await api('apiAdmin', [tokenAdmin, 'adminLinks', []])).ok, true);
  });
});

test('sem IMPORTAR_TOKEN a importação fica fechada', async () => {
  await comServidor(async ({ base }) => {
    const r = await fetch(base + '/importar', { method: 'POST', headers: { Authorization: 'Bearer ' }, body: '{}' });
    assert.equal(r.status, 403);
  }, { tokenImportar: '' });
});
