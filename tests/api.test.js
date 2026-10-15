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
  assert.deepEqual(r('x'.repeat(30000)), { ok: false, erro: 'Requisição inválida.' });
  assert.deepEqual(r(undefined), { ok: false, erro: 'Requisição inválida.' });
});

test('ACOES_API_: expõe só as funções públicas do web app', () => {
  assert.deepEqual(Object.keys(api.ACOES_API_).sort(), ['apiCozinha', 'apiInicio', 'apiPedidosDoFuncionario', 'apiSalvarPedidos']);
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
    assert.ok(fs.existsSync(path.join(pasta, 'api.js')));
    assert.ok(fs.existsSync(path.join(pasta, '.nojekyll')));
  } finally {
    fs.rmSync(pasta, { recursive: true, force: true });
  }
});
