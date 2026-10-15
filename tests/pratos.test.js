const test = require('node:test');
const assert = require('node:assert/strict');
const { carregar } = require('./carregar');
const { MEALS_TSV } = require('./fixtures');

const p = carregar(['Database.js', 'Funcionarios.js', 'Pratos.js']);
const lista = (x) => [...x];

test('partesDoNome_: separa por "/" mas não por "c/"', () => {
  assert.deepEqual(lista(p.partesDoNome_('Frango Grelhado / Salada de Brocolis c/ Couve-flor')),
    ['Frango Grelhado', 'Salada de Brocolis c/ Couve-flor']);
  assert.deepEqual(lista(p.partesDoNome_('Carré/Pure de batata/ Farofa')), ['Carré', 'Pure de batata', 'Farofa']);
  assert.deepEqual(lista(p.partesDoNome_('Carne assada c /Batata')), ['Carne assada c/ Batata']);
  assert.deepEqual(lista(p.partesDoNome_('Estrogonofe Frango')), ['Estrogonofe Frango']);
});

test('itensFixos_: separa, limpa e remove repetidos/inválidos', () => {
  assert.deepEqual(lista(p.itensFixos_('Arroz; Feijão;  Farofa ')), ['Arroz', 'Feijão', 'Farofa']);
  assert.deepEqual(lista(p.itensFixos_('Arroz, arroz\n=X;;Feijão')), ['Arroz', 'Feijão']);
  assert.equal(p.itensFixos_('').length, 0);
  assert.equal(p.itensFixos_(undefined).length, 0);
});

test('fixosDoPrincipal_: tira os dispensados (sem diferenciar acento)', () => {
  const fixos = ['Arroz', 'Feijão', 'Farofa'];
  assert.deepEqual(lista(p.fixosDoPrincipal_({ sem_fixos: ['feijao', 'Farofa'] }, fixos)), ['Arroz']);
  assert.deepEqual(lista(p.fixosDoPrincipal_({}, fixos)), fixos);
  assert.deepEqual(lista(p.fixosDoPrincipal_(null, fixos)), fixos);
});

test('validarPrato_: sem_fixos só no principal', () => {
  const prin = p.validarPrato_({ tipo: 'PRINCIPAL', nome: 'Estrogonofe', categoria: 'CARNE', sem_fixos: [' Feijão ', 'Farofa'] });
  assert.deepEqual(lista(prin.prato.sem_fixos), ['Feijão', 'Farofa']);
  assert.equal(p.validarPrato_({ tipo: 'ACOMPANHAMENTO', nome: 'Couve', sem_fixos: ['Arroz'] }).prato.sem_fixos.length, 0);
  assert.match(p.validarPrato_({ tipo: 'PRINCIPAL', nome: 'X', categoria: 'CARNE', sem_fixos: ['=1'] }).erro, /todo dia/);
});

test('normalizarCategoria_', () => {
  assert.equal(p.normalizarCategoria_('Frango'), 'FRANGO');
  assert.equal(p.normalizarCategoria_(''), 'OUTRO');
  assert.equal(p.normalizarCategoria_('Vegano'), 'OUTRO');
});

test('erroTextoLivre_: bloqueia fórmulas e controle', () => {
  assert.equal(p.erroTextoLivre_('Purê', 60), '');
  assert.notEqual(p.erroTextoLivre_('=IMPORTXML()', 60), '');
  assert.notEqual(p.erroTextoLivre_('a\tb', 60), '');
  assert.notEqual(p.erroTextoLivre_('', 60), '');
});

test('validarPrato_: principal e acompanhamento', () => {
  assert.match(p.validarPrato_({ tipo: 'X', nome: 'a' }).erro, /Tipo/);
  assert.match(p.validarPrato_({ tipo: 'PRINCIPAL', nome: 'a', categoria: 'SOJA' }).erro, /Categoria/);
  assert.match(p.validarPrato_({ tipo: 'PRINCIPAL', nome: 'a', categoria: 'CARNE', acompanhamentos: ['PR-1', 'PR-1'] }).erro, /repetido/);
  const prin = p.validarPrato_({ tipo: 'PRINCIPAL', nome: ' Feijoada ', categoria: 'CARNE', so_sexta: 'SIM', acompanhamentos: ['PR-1'] });
  assert.equal(prin.erro, '');
  assert.equal(prin.prato.nome, 'Feijoada');
  assert.equal(prin.prato.so_sexta, 'SIM');
  const ac = p.validarPrato_({ tipo: 'ACOMPANHAMENTO', nome: 'Couve', categoria: 'LIXO', so_sexta: 'SIM', acompanhamentos: ['x'] });
  assert.equal(ac.erro, '');
  assert.equal(ac.prato.categoria, '');
  assert.equal(ac.prato.so_sexta, 'NAO');
  assert.equal(ac.prato.acompanhamentos.length, 0);
});

test('interpretarColagemPratos_: aba Meals real', () => {
  const r = p.interpretarColagemPratos_(MEALS_TSV, []);
  // "Frango Grelhado" aparece 2 vezes: a segunda combinação é ignorada.
  assert.equal(r.principais.length, 27);
  assert.equal(r.ignorados.length, 1);
  assert.match(r.ignorados[0].motivo, /repetido/);
  const sexta = lista(r.principais).filter((x) => x.so_sexta === 'SIM').map((x) => x.nome);
  assert.deepEqual(sexta, ['Feijoada', 'Lasanha', 'Panqueca de frango', 'Rocambole']);
  const empanado = r.principais.find((x) => x.nome === 'Frango Empanado');
  assert.deepEqual(lista(empanado.acompanhamentos), ['Batata Frita']);
  assert.equal(empanado.categoria, 'FRANGO');
  const carre = r.principais.find((x) => x.nome === 'Carré');
  assert.deepEqual(lista(carre.acompanhamentos), ['Pure de batata', 'Farofa']);
  const jardineira = r.principais.find((x) => x.nome === 'Jardineira');
  assert.equal(jardineira.acompanhamentos.length, 0);
  assert.equal(jardineira.categoria, 'OUTRO');
  assert.equal(r.principais.find((x) => x.nome === 'Linguiça Toscana').categoria, 'LINGUICA');
  assert.equal(r.principais.find((x) => x.nome === 'Figado com Purê').categoria, 'FIGADO');
  // acompanhamentos sem duplicar variações de caixa ("Batata frita" x "Batata Frita")
  const chaves = r.acompanhamentos.map((a) => p.normalizarNome_(a));
  assert.equal(new Set(chaves).size, chaves.length);
  assert.ok(r.acompanhamentos.includes('Salada de alface e Tomate'));
  assert.ok(!r.acompanhamentos.includes('Salada de Alface e Tomate'));
});

test('interpretarColagemPratos_: respeita o que já está cadastrado', () => {
  const r = p.interpretarColagemPratos_('Pernil / Farofa\tLivres\tPorco\nFrango / Farofa\t\t', [
    { tipo: 'PRINCIPAL', nome: 'pernil', situacao: 'ATIVO' },
    { tipo: 'ACOMPANHAMENTO', nome: 'Farofa', situacao: 'ATIVO' },
  ]);
  assert.deepEqual(lista(r.principais).map((x) => x.nome), ['Frango']);
  assert.equal(r.acompanhamentos.length, 0); // Farofa já existe
  assert.equal(r.ignorados.length, 1);
});
