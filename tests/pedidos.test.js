const test = require('node:test');
const assert = require('node:assert/strict');
const { carregar } = require('./carregar');

const p = carregar(['Database.js', 'Datas.js', 'Funcionarios.js', 'Pratos.js', 'Cardapio.js', 'Pedidos.js']);
const dia = { tipo: 'PRATO', itens: ['Frango Empanado', 'Brócolis', 'Salada'] };

test('configPrazo_: padrão quando inválido', () => {
  assert.deepEqual({ ...p.configPrazo_({ PRAZO_HORA: '10:15', PRAZO_DIAS_ANTES: '1' }) }, { hora: '10:15', diasAntes: 1 });
  assert.deepEqual({ ...p.configPrazo_({ PRAZO_HORA: '9h30', PRAZO_DIAS_ANTES: 'x' }) }, { hora: '09:30', diasAntes: 0 });
  assert.deepEqual({ ...p.configPrazo_({}) }, { hora: '09:30', diasAntes: 0 });
  assert.equal(p.configPrazo_({ PRAZO_HORA: '24:00' }).hora, '09:30');
});

test('dentroDoPrazo_: no próprio dia e na véspera', () => {
  const noDia = { hora: '09:30', diasAntes: 0 };
  assert.equal(p.limiteDoDia_('2026-10-20', noDia), '2026-10-20T09:30');
  assert.equal(p.dentroDoPrazo_('2026-10-20', '2026-10-20T09:29', noDia), true);
  assert.equal(p.dentroDoPrazo_('2026-10-20', '2026-10-20T09:30', noDia), false);
  assert.equal(p.dentroDoPrazo_('2026-10-20', '2026-10-19T23:00', noDia), true);
  const vespera = { hora: '17:00', diasAntes: 1 };
  assert.equal(p.limiteDoDia_('2026-10-26', vespera), '2026-10-25T17:00');
  assert.equal(p.dentroDoPrazo_('2026-10-26', '2026-10-25T16:59', vespera), true);
  assert.equal(p.dentroDoPrazo_('2026-10-26', '2026-10-25T17:00', vespera), false);
});

test('planejarPedido_: completa, personalizada e não quero', () => {
  assert.deepEqual({ ...p.planejarPedido_(dia, { quer: true, retirados: [] }), retirados: [] }, { situacao: 'CONFIRMADO', tipo: 'COMPLETA', retirados: [] });
  const pers = p.planejarPedido_(dia, { quer: true, retirados: ['Salada', 'Brócolis'] });
  assert.equal(pers.tipo, 'PERSONALIZADA');
  assert.deepEqual([...pers.retirados], ['Brócolis', 'Salada'], 'ordem do cardápio');
  const nao = p.planejarPedido_(dia, { quer: false, retirados: ['Salada'] });
  assert.equal(nao.situacao, 'CANCELADO');
  assert.equal(nao.retirados.length, 0);
});

test('planejarPedido_: rejeita entradas inválidas', () => {
  assert.throws(() => p.planejarPedido_({ tipo: 'SEM_ALMOCO', itens: [] }, { quer: true }), /Não há almoço/);
  assert.throws(() => p.planejarPedido_(dia, { quer: 'sim' }), /inválido/);
  assert.throws(() => p.planejarPedido_(dia, { quer: true, retirados: ['Feijão'] }), /mudou/);
  assert.throws(() => p.planejarPedido_(dia, { quer: true, retirados: ['Salada', 'Salada'] }), /inválido/);
  assert.throws(() => p.planejarPedido_(dia, { quer: true, retirados: dia.itens }), /Não quero/);
});

test('ciclosVisiveis_: ciclo atual e o seguinte', () => {
  assert.deepEqual([...p.ciclosVisiveis_('2026-10-14')], ['2026-10-13', '2026-10-20']);
  assert.deepEqual([...p.ciclosVisiveis_('2026-10-19')], ['2026-10-13', '2026-10-20']); // segunda ainda é do ciclo de 13
  assert.deepEqual([...p.ciclosVisiveis_('2026-10-20')], ['2026-10-20', '2026-10-27']);
});

test('limiteParaFuncionario_: data limite da semana vale só para a primeira resposta', () => {
  const noDia = { hora: '09:30', diasAntes: 0 };
  const lim = (data, ate, respondeu) => ({ ...p.limiteParaFuncionario_(data, noDia, ate, respondeu) });
  assert.deepEqual(lim('2026-10-21', '2026-10-16T17:00', false), { limite: '2026-10-16T17:00', tipo: 'SEMANA' });
  assert.deepEqual(lim('2026-10-21', '2026-10-16T17:00', true), { limite: '2026-10-21T09:30', tipo: 'DIA' }, 'quem respondeu ajusta até o dia');
  assert.deepEqual(lim('2026-10-21', '', false), { limite: '2026-10-21T09:30', tipo: 'DIA' }, 'sem data limite');
  assert.deepEqual(lim('2026-10-20', '2026-10-22T12:00', false), { limite: '2026-10-20T09:30', tipo: 'DIA' }, 'o que vier primeiro');
});

test('erroConfirmarAte_: vazio, formato e até a segunda do ciclo', () => {
  assert.equal(p.erroConfirmarAte_('', '2026-10-20'), '');
  assert.equal(p.erroConfirmarAte_('2026-10-16T17:00', '2026-10-20'), '');
  assert.equal(p.erroConfirmarAte_('2026-10-26T23:59', '2026-10-20'), '');
  assert.match(p.erroConfirmarAte_('2026-10-27T08:00', '2026-10-20'), /segunda-feira/);
  assert.match(p.erroConfirmarAte_('2026-02-30T08:00', '2026-10-20'), /inválida/);
  assert.match(p.erroConfirmarAte_('2026-10-16 17:00', '2026-10-20'), /inválida/);
  assert.match(p.erroConfirmarAte_('2026-10-16T25:00', '2026-10-20'), /inválida/);
});
