const test = require('node:test');
const assert = require('node:assert/strict');
const { carregar } = require('./carregar');
const { MEALS_TSV } = require('./fixtures');

const c = carregar(['Database.js', 'Datas.js', 'Funcionarios.js', 'Pratos.js', 'Cardapio.js']);

// Monta o banco como a importação faria: acompanhamentos + principais com os de costume.
const plano = c.interpretarColagemPratos_(MEALS_TSV, []);
const acomp = plano.acompanhamentos.map((nome, i) => ({ id: 'AC-' + i, tipo: 'ACOMPANHAMENTO', nome, categoria: '', so_sexta: 'NAO', acompanhamentos: [], situacao: 'ATIVO' }));
const idAcomp = Object.fromEntries(acomp.map((a) => [c.normalizarNome_(a.nome), a.id]));
const principais = plano.principais.map((x, i) => ({
  ...x, id: 'PR-' + i, tipo: 'PRINCIPAL', situacao: 'ATIVO',
  acompanhamentos: [...x.acompanhamentos].map((a) => idAcomp[c.normalizarNome_(a)]),
}));
const pratos = [...principais, ...acomp];
const porId = Object.fromEntries(pratos.map((x) => [x.id, x]));
const vazia = () => [...c.diasDoCiclo_('2026-10-20')].map((d) => ({ ...d, tipo: '', principal_id: '', acompanhamento_ids: [], observacao: '' }));

// Gerador determinístico (LCG) para repetir os sorteios.
function semente(s) {
  return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
}

test('sugerirSemana_: respeita as regras da macro em 300 sorteios', () => {
  for (let s = 1; s <= 300; s++) {
    const r = c.sugerirSemana_(vazia(), pratos, new Set(), semente(s));
    assert.equal(r.semCandidato.length, 0);
    const escolhidos = r.dias.map((d) => porId[d.principal_id]);
    assert.ok(escolhidos.every((p) => p.tipo === 'PRINCIPAL'));
    assert.equal(new Set(escolhidos.map((p) => p.id)).size, 5, 'sem repetição');
    escolhidos.forEach((p, i) => {
      assert.equal(p.so_sexta === 'SIM', r.dias[i].dia === 'SEXTA', 'sexta só com pratos de sexta');
      if (i > 0) assert.ok(!(p.categoria === 'FRANGO' && escolhidos[i - 1].categoria === 'FRANGO'), 'sem frango seguido');
      assert.deepEqual([...r.dias[i].acompanhamento_ids], p.acompanhamentos, 'acompanhamentos de costume');
    });
  }
});

test('sugerirSemana_: mantém escolhas e completa acompanhamentos vazios', () => {
  const dias = vazia();
  dias[0] = { ...dias[0], tipo: 'SEM_ALMOCO', observacao: 'Feriado' };
  const frango = principais.find((x) => x.nome === 'Frango Empanado');
  dias[1] = { ...dias[1], tipo: 'PRATO', principal_id: frango.id, acompanhamento_ids: [] };
  const manual = principais.find((x) => x.nome === 'Pernil');
  dias[4] = { ...dias[4], tipo: 'PRATO', principal_id: manual.id, acompanhamento_ids: ['AC-0'] };
  for (let s = 1; s <= 100; s++) {
    const r = c.sugerirSemana_(dias, pratos, new Set(), semente(s));
    assert.equal(r.dias[0].tipo, 'SEM_ALMOCO');
    assert.equal(r.dias[1].principal_id, frango.id);
    assert.deepEqual([...r.dias[1].acompanhamento_ids], frango.acompanhamentos);
    assert.notEqual(porId[r.dias[2].principal_id].categoria, 'FRANGO');
    assert.deepEqual([...r.dias[4].acompanhamento_ids], ['AC-0'], 'combinação manual mantida');
  }
  assert.equal(dias[1].acompanhamento_ids.length, 0, 'não altera a entrada');
});

test('sugerirSemana_: ignora acompanhamentos de costume inativos', () => {
  const empanado = principais.find((x) => x.nome === 'Frango Empanado');
  const inativos = pratos.map((x) => (x.id === empanado.acompanhamentos[0] ? { ...x, situacao: 'INATIVO' } : x));
  const dias = vazia();
  dias[0] = { ...dias[0], tipo: 'PRATO', principal_id: empanado.id };
  const r = c.sugerirSemana_(dias, inativos, new Set(), semente(3));
  assert.equal(r.dias[0].acompanhamento_ids.length, 0);
});

test('sugerirSemana_: evita principais recentes quando há alternativa', () => {
  const recentes = new Set(principais.filter((x) => x.so_sexta === 'NAO').slice(0, 15).map((x) => x.id));
  for (let s = 1; s <= 100; s++) {
    const r = c.sugerirSemana_(vazia(), pratos, recentes, semente(s));
    r.dias.forEach((d) => assert.ok(!recentes.has(d.principal_id)));
  }
});

test('sugerirSemana_: banco sem principais informa dias sem candidato', () => {
  assert.equal(c.sugerirSemana_(vazia(), acomp, new Set(), semente(1)).semCandidato.length, 5);
});

test('retratoDoDia_: principal + acompanhamentos', () => {
  const carre = principais.find((x) => x.nome === 'Carré');
  const r = c.retratoDoDia_({ tipo: 'PRATO', principal_id: carre.id, acompanhamento_ids: carre.acompanhamentos }, porId);
  assert.equal(r.prato, 'Carré / Pure de batata / Farofa');
  assert.deepEqual([...r.itens], ['Carré', 'Pure de batata', 'Farofa']);
  assert.equal(c.retratoDoDia_({ tipo: 'SEM_ALMOCO' }, porId).itens.length, 0);
});

test('retratoDoDia_: itens de todo dia, sem repetir e respeitando o que o principal dispensa', () => {
  const fixos = ['Arroz', 'Feijão', 'Farofa'];
  const carre = principais.find((x) => x.nome === 'Carré');
  const r = c.retratoDoDia_({ tipo: 'PRATO', principal_id: carre.id, acompanhamento_ids: carre.acompanhamentos }, porId, fixos);
  assert.equal(r.prato, 'Carré / Pure de batata / Farofa', 'nome não repete os fixos');
  assert.deepEqual([...r.itens], ['Carré', 'Pure de batata', 'Farofa', 'Arroz', 'Feijão'], 'farofa não duplica');

  const estrog = { ...principais.find((x) => x.nome === 'Estrogonofe de carne'), sem_fixos: ['feijao', 'Farofa'] };
  const r2 = c.retratoDoDia_({ tipo: 'PRATO', principal_id: estrog.id, acompanhamento_ids: [] }, { ...porId, [estrog.id]: estrog }, fixos);
  assert.deepEqual([...r2.itens], ['Estrogonofe de carne', 'Arroz'], 'estrogonofe só com arroz');
});

test('validarSemana_: erros e avisos', () => {
  const dias = vazia();
  const frangos = principais.filter((x) => x.categoria === 'FRANGO' && x.so_sexta === 'NAO');
  const sexta = principais.find((x) => x.so_sexta === 'SIM');
  dias[0] = { ...dias[0], tipo: 'PRATO', principal_id: frangos[0].id, acompanhamento_ids: ['AC-0'] };
  dias[1] = { ...dias[1], tipo: 'PRATO', principal_id: frangos[1].id, acompanhamento_ids: ['AC-1'] };
  dias[2] = { ...dias[2], tipo: 'PRATO', principal_id: sexta.id, acompanhamento_ids: [] };
  dias[3] = { ...dias[3], tipo: 'SEM_ALMOCO' };
  const v = c.validarSemana_(dias, porId);
  assert.equal(v.erros.length, 1);
  assert.match(v.erros[0], /Segunda-feira \(26\/10\)/);
  assert.equal(v.avisos.length, 3); // frango seguido + sexta na quinta + quinta sem acompanhamento

  const ruim = vazia();
  ruim[0] = { ...ruim[0], tipo: 'PRATO', principal_id: 'AC-0' }; // acompanhamento no lugar do principal
  ruim[1] = { ...ruim[1], tipo: 'PRATO', principal_id: frangos[0].id, acompanhamento_ids: [frangos[1].id] };
  const v2 = c.validarSemana_(ruim, porId);
  assert.match(v2.erros[0], /principal/);
  assert.match(v2.erros[1], /acompanhamento não encontrado/);
});

test('normalizarDiasEntrada_: confere datas, tipos e acompanhamentos', () => {
  assert.equal(c.normalizarDiasEntrada_('2026-10-20', vazia()).length, 5);
  const errada = vazia();
  errada[4].data = '2026-10-24';
  assert.throws(() => c.normalizarDiasEntrada_('2026-10-20', errada), /não conferem/);
  const tipo = vazia();
  tipo[0].tipo = 'OUTRO';
  assert.throws(() => c.normalizarDiasEntrada_('2026-10-20', tipo), /Tipo/);
  const rep = vazia();
  rep[0] = { ...rep[0], tipo: 'PRATO', principal_id: 'PR-1', acompanhamento_ids: ['AC-1', 'AC-1'] };
  assert.throws(() => c.normalizarDiasEntrada_('2026-10-20', rep), /repetido/);
  const sem = vazia();
  sem[0] = { ...sem[0], tipo: 'SEM_ALMOCO', principal_id: 'PR-1', acompanhamento_ids: ['AC-1'] };
  const n = c.normalizarDiasEntrada_('2026-10-20', sem);
  assert.equal(n[0].principal_id, '');
  assert.equal(n[0].acompanhamento_ids.length, 0);
  assert.throws(() => c.normalizarDiasEntrada_('2026-10-20', vazia().slice(0, 4)));
});
