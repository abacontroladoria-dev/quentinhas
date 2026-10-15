const test = require('node:test');
const assert = require('node:assert/strict');
const { carregar } = require('./carregar');

const c = carregar(['Database.js', 'Datas.js', 'Funcionarios.js', 'Pratos.js', 'Cardapio.js', 'Pedidos.js', 'Cozinha.js']);

const dia = { tipo: 'PRATO', itens: ['Frango Empanado', 'Batata Frita', 'Arroz', 'Feijão', 'Farofa'] };
const ativos = [
  { id: 'F-a', nome: 'Ana' }, { id: 'F-b', nome: 'Bia' }, { id: 'F-c', nome: 'Caio' },
  { id: 'F-d', nome: 'Duda' }, { id: 'F-e', nome: 'Edu' },
];
const nomes = Object.fromEntries([...ativos, { id: 'F-x', nome: 'Xavier (inativo)' }].map((f) => [f.id, f.nome]));
const pedido = (funcionario_id, situacao, retirados = [], revisao = '') =>
  ({ funcionario_id, situacao, retirados: JSON.stringify(retirados), revisao });

test('resumoCozinha_: totais, quantidade por item e listas', () => {
  const r = c.resumoCozinha_(dia, [
    pedido('F-b', 'CONFIRMADO', ['Feijão', 'Farofa']),
    pedido('F-a', 'CONFIRMADO'),
    pedido('F-c', 'CANCELADO'),
    pedido('F-x', 'CONFIRMADO', ['Batata Frita']),
  ], ativos, nomes);
  assert.equal(r.total, 3);
  const q = Object.fromEntries(r.itens.map((i) => [i.item, i.quantidade]));
  assert.deepEqual(q, { 'Frango Empanado': 3, 'Batata Frita': 2, Arroz: 3, 'Feijão': 2, Farofa: 2 });
  assert.deepEqual(r.personalizadas.map((x) => x.nome), ['Bia', 'Xavier (inativo)']);
  assert.deepEqual([...r.personalizadas[0].retirados], ['Feijão', 'Farofa']);
  assert.deepEqual(r.completas.map((x) => x.nome), ['Ana']);
  assert.deepEqual(r.pessoas.map((x) => x.nome), ['Ana', 'Bia', 'Xavier (inativo)'], 'visão por pessoa: todos os confirmados');
  assert.equal(r.pessoas[1].id, 'F-b');
  assert.deepEqual([...r.naoQuerem], ['Caio']);
  assert.deepEqual([...r.semResposta], ['Duda', 'Edu']);
});

test('resumoCozinha_: ignora itens retirados que saíram do cardápio (revisão pendente)', () => {
  const r = c.resumoCozinha_(dia, [pedido('F-a', 'CONFIRMADO', ['Salada'], 'PENDENTE')], ativos, nomes);
  assert.equal(r.completas.length, 1);
  assert.equal(r.completas[0].revisao, true);
  assert.ok(r.itens.every((i) => i.quantidade === 1));
});

test('resumoCozinha_: dia sem pedidos', () => {
  const r = c.resumoCozinha_(dia, [], ativos, nomes);
  assert.equal(r.total, 0);
  assert.equal(r.semResposta.length, 5);
});

test('diaPadraoCozinha_: hoje, senão o próximo, senão o último', () => {
  const datas = ['2026-10-16', '2026-10-13', '2026-10-15'];
  assert.equal(c.diaPadraoCozinha_(datas, '2026-10-15'), '2026-10-15');
  assert.equal(c.diaPadraoCozinha_(datas, '2026-10-14'), '2026-10-15');
  assert.equal(c.diaPadraoCozinha_(datas, '2026-10-18'), '2026-10-16');
  assert.equal(c.diaPadraoCozinha_([], '2026-10-18'), '');
});
