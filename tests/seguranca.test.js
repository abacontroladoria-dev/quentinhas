const test = require('node:test');
const assert = require('node:assert/strict');
const { carregar } = require('./carregar');

const seg = carregar(['Seguranca.js', 'Auditoria.js']);

test('listaAdmins_: normaliza, separa e remove duplicados/inválidos', () => {
  const l = seg.listaAdmins_(' Ana@X.com, bia@x.com;ana@x.com\n semarroba ');
  assert.deepEqual([...l], ['ana@x.com', 'bia@x.com']);
  assert.equal(seg.listaAdmins_(null).length, 0);
});

test('emailEhAdmin_', () => {
  assert.equal(seg.emailEhAdmin_('ANA@x.com', 'ana@x.com,bia@x.com'), true);
  assert.equal(seg.emailEhAdmin_('', 'ana@x.com'), false);
  assert.equal(seg.emailEhAdmin_('', ''), false);
  assert.equal(seg.emailEhAdmin_('carla@x.com', 'ana@x.com'), false);
});

test('gerarToken_: 64 hex e diferentes a cada chamada', () => {
  const a = seg.gerarToken_();
  assert.match(a, /^[0-9a-f]{64}$/);
  assert.notEqual(a, seg.gerarToken_());
});

test('tokensIguais_', () => {
  assert.equal(seg.tokensIguais_('abc', 'abc'), true);
  assert.equal(seg.tokensIguais_('abc', 'abd'), false);
  assert.equal(seg.tokensIguais_('abc', 'abcd'), false);
  assert.equal(seg.tokensIguais_('', ''), false);
  assert.equal(seg.tokensIguais_(undefined, undefined), false);
});

test('detalhesAuditoria_: JSON e truncamento', () => {
  assert.equal(seg.detalhesAuditoria_({ a: 1 }), '{"a":1}');
  assert.equal(seg.detalhesAuditoria_(null), '');
  const longo = seg.detalhesAuditoria_('x'.repeat(5000));
  assert.equal(longo.length, seg.DETALHES_MAX_);
  assert.ok(longo.endsWith('…'));
});
