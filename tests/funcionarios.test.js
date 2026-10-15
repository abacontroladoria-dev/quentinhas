const test = require('node:test');
const assert = require('node:assert/strict');
const { carregar } = require('./carregar');

const fn = carregar(['Database.js', 'Funcionarios.js']);

const LISTA_REAL = `Arthur Kaleb

Aline Notes

Jennifer

Pamela

Jenifer Silva

Alessandra

Amanda Rangel

Juliana Matos

Larissa Souza

Laryssa

Laura Agrello

Luana

Silvana

Victoria França

Isabela Sacramento

Ayla Barcellos
`;

test('normalizarNome_: ignora acentos, caixa e espaços', () => {
  assert.equal(fn.normalizarNome_('  Victória   FRANÇA '), 'victoria franca');
});

test('erroNome_', () => {
  assert.equal(fn.erroNome_('Ana Souza'), '');
  assert.equal(fn.erroNome_("D'Ávila-Neto Jr."), '');
  assert.notEqual(fn.erroNome_(''), '');
  assert.notEqual(fn.erroNome_('=HYPERLINK("x")'), '');
  assert.notEqual(fn.erroNome_('-Ana'), '');
  assert.notEqual(fn.erroNome_('Ana2'), '');
  assert.notEqual(fn.erroNome_('a'.repeat(61)), '');
});

test('planejarInclusao_: lista real tem 16 nomes válidos e distintos', () => {
  const r = fn.planejarInclusao_(LISTA_REAL.replace(/\n/g, '\r\n'), []);
  assert.equal(r.novos.length, 16);
  assert.equal(r.ignorados.length, 0);
  assert.ok(r.novos.includes('Jennifer') && r.novos.includes('Jenifer Silva'));
});

test('planejarInclusao_: duplicados, existentes e inativos', () => {
  const existentes = [
    { nome: 'Luana', situacao: 'ATIVO' },
    { nome: 'Silvana', situacao: 'INATIVO' },
  ];
  const r = fn.planejarInclusao_('LUANA\nsilvana\nPamela\n pamela \n=1+1', existentes);
  assert.deepEqual([...r.novos], ['Pamela']);
  const motivos = Object.fromEntries(r.ignorados.map((i) => [i.nome, i.motivo]));
  assert.equal(motivos.LUANA, 'já cadastrado');
  assert.match(motivos.silvana, /inativo/);
  assert.match(motivos.pamela, /repetido/);
  assert.ok(motivos['=1+1']);
});

test('nomeConflitaComAtivo_: ignora o próprio registro e inativos', () => {
  const lista = [
    { id: 'F-1', nome: 'Ana', situacao: 'ATIVO' },
    { id: 'F-2', nome: 'Bia', situacao: 'INATIVO' },
  ];
  assert.equal(fn.nomeConflitaComAtivo_('ána', lista, 'F-1'), false);
  assert.equal(fn.nomeConflitaComAtivo_('ana', lista, 'F-9'), true);
  assert.equal(fn.nomeConflitaComAtivo_('Bia', lista, 'F-9'), false);
});

test('ordenarPorNome_: ordem alfabética pt-BR sem diferenciar acento', () => {
  const r = fn.ordenarPorNome_([{ nome: 'Érica' }, { nome: 'Ana' }, { nome: 'eduardo' }]);
  assert.deepEqual(r.map((x) => x.nome), ['Ana', 'eduardo', 'Érica']);
});
