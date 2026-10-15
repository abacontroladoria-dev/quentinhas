const test = require('node:test');
const assert = require('node:assert/strict');
const { carregar } = require('./carregar');

const d = carregar(['Datas.js']);

test('lerData_: rejeita datas impossíveis', () => {
  assert.throws(() => d.lerData_('2026-02-30'));
  assert.throws(() => d.lerData_('14/10/2026'));
  assert.equal(d.escreverData_(d.lerData_('2026-10-14')), '2026-10-14');
});

test('somarDias_: atravessa mês e ano', () => {
  assert.equal(d.somarDias_('2026-12-29', 6), '2027-01-04');
  assert.equal(d.somarDias_('2026-03-01', -1), '2026-02-28');
});

test('inicioDoCiclo_: terça a segunda pertencem ao mesmo ciclo', () => {
  // 13/10/2026 é terça
  for (const dia of ['2026-10-13', '2026-10-14', '2026-10-16', '2026-10-18', '2026-10-19']) {
    assert.equal(d.inicioDoCiclo_(dia), '2026-10-13', dia);
  }
  assert.equal(d.inicioDoCiclo_('2026-10-20'), '2026-10-20');
});

test('proximoCiclo_: como a macro (terça = hoje; outros dias = próxima terça)', () => {
  assert.equal(d.proximoCiclo_('2026-10-13'), '2026-10-13'); // terça
  assert.equal(d.proximoCiclo_('2026-10-14'), '2026-10-20'); // quarta
  assert.equal(d.proximoCiclo_('2026-10-19'), '2026-10-20'); // segunda
  assert.equal(d.proximoCiclo_('2026-10-18'), '2026-10-20'); // domingo
});

test('diasDoCiclo_: Ter, Qua, Qui, Sex e a segunda seguinte', () => {
  const dias = d.diasDoCiclo_('2026-10-20');
  assert.deepEqual([...dias].map((x) => x.data), ['2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-26']);
  assert.deepEqual([...dias].map((x) => x.dia), ['TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SEGUNDA']);
  assert.throws(() => d.diasDoCiclo_('2026-10-21'));
});

test('dataCurta_', () => {
  assert.equal(d.dataCurta_('2026-10-05'), '05/10');
});
