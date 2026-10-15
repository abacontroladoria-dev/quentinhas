const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { carregar } = require('./carregar');
const { montar } = require('../scripts/montar-site');

const api = carregar(['Api.js']);
const acoes = {
  soma: (a) => a[0] + a[1],
  falha: () => { throw new Error('Funcionário não encontrado.'); },
};

test('executarApi_: chama só ações da lista e devolve {ok, dados}', () => {
  assert.deepEqual({ ...api.executarApi_('{"acao":"soma","args":[2,3]}', acoes) }, { ok: true, dados: 5 });
});

test('executarApi_: erros viram {ok:false, erro}', () => {
  const r = (t) => ({ ...api.executarApi_(t, acoes) });
  assert.deepEqual(r('{"acao":"falha"}'), { ok: false, erro: 'Funcionário não encontrado.' });
  assert.deepEqual(r('{"acao":"toString"}'), { ok: false, erro: 'Ação inválida.' });
  assert.deepEqual(r('{"acao":"constructor"}'), { ok: false, erro: 'Ação inválida.' });
  assert.deepEqual(r('não é json'), { ok: false, erro: 'Requisição inválida.' });
  assert.deepEqual(r('x'.repeat(70000)), { ok: false, erro: 'Requisição inválida.' });
  assert.deepEqual(r(undefined), { ok: false, erro: 'Requisição inválida.' });
});

test('ACOES_API_: expõe só as funções públicas do web app', () => {
  assert.deepEqual(Object.keys(api.ACOES_API_).sort(), ['apiAdmin', 'apiCozinha', 'apiInicio', 'apiPedidosDoFuncionario', 'apiSalvarPedidos']);
});

test('montar-site: páginas sem scriptlets do Apps Script e usando api.js', () => {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'quentinhas-site-'));
  try {
    montar(pasta);
    for (const pagina of ['index.html', 'cozinha.html']) {
      const html = fs.readFileSync(path.join(pasta, pagina), 'utf8');
      assert.ok(!/<\?/.test(html), pagina + ' tem scriptlet');
      assert.ok(html.includes('<script src="api.js"></script>'), pagina + ' sem api.js');
      assert.ok(!html.includes('google.script.run'), pagina + ' ainda usa google.script.run');
      assert.ok(html.includes('noindex'), pagina + ' sem noindex');
    }
    const admin = fs.readFileSync(path.join(pasta, 'admin.html'), 'utf8');
    assert.ok(!/<\?/.test(admin), 'admin.html tem scriptlet');
    assert.ok(admin.indexOf('<script src="api.js"></script>') < admin.indexOf('<script src="admin-run.js"></script>'), 'admin-run.js depois de api.js');
    assert.ok(admin.indexOf('admin-run.js') < admin.indexOf('google.script.run'), 'transporte antes da tela');
    assert.ok(admin.includes('content="no-referrer"') && admin.includes('noindex'));
    assert.ok(fs.existsSync(path.join(pasta, 'admin-run.js')));
    assert.ok(fs.existsSync(path.join(pasta, 'api.js')));
    assert.ok(fs.existsSync(path.join(pasta, '.nojekyll')));
  } finally {
    fs.rmSync(pasta, { recursive: true, force: true });
  }
});

test('apiAdmin: exige o token do link e libera exigirAdmin_ só durante a chamada', () => {
  const props = { ADMIN_TOKEN: 'a'.repeat(64), ADMIN_EMAILS: 'chefe@x.com' };
  const ctx = carregar(['Seguranca.js', 'Api.js'], {
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props[k] || null }) },
    Session: { getActiveUser: () => ({ getEmail: () => '' }) },
  });
  ctx.adminListarPratos = () => ctx.exigirAdmin_();
  assert.equal(ctx.apiAdmin('a'.repeat(64), 'adminListarPratos', []), 'LINK_ADMIN');
  assert.throws(() => ctx.exigirAdmin_(), /Acesso negado/, 'fora da chamada continua exigindo conta de admin');
  assert.throws(() => ctx.apiAdmin('b'.repeat(64), 'adminListarPratos', []), /Link de administração inválido/);
  assert.throws(() => ctx.apiAdmin('', 'adminListarPratos', []), /inválido/);
  assert.throws(() => ctx.apiAdmin('a'.repeat(64), 'menuConfiguracaoInicial', []), /Ação inválida/);
  assert.throws(() => ctx.apiAdmin('a'.repeat(64), 'toString', []), /Ação inválida/);
  ctx.adminListarPratos = () => { throw new Error('falhou'); };
  assert.throws(() => ctx.apiAdmin('a'.repeat(64), 'adminListarPratos', []), /falhou/);
  assert.equal(ctx.ADMIN_PELO_LINK_, '', 'limpa mesmo quando a função falha');
  delete props.ADMIN_TOKEN;
  assert.throws(() => ctx.apiAdmin('', 'adminListarPratos', []), /inválido/, 'sem token configurado ninguém entra');
});
