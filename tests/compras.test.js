const test = require('node:test');
const assert = require('node:assert/strict');
const { carregar } = require('./carregar');
const { MEALS_TSV } = require('./fixtures');

const c = carregar(['Database.js', 'Datas.js', 'Funcionarios.js', 'Pratos.js', 'Cardapio.js', 'Compras.js']);

const itens = [...c.itensCompraPadrao_()].map((i, n) => ({ ...i, id: 'IC-' + n, situacao: 'ATIVO' }));
const item = (nome) => itens.find((i) => i.nome === nome);

test('itensCompraPadrao_: seções na ordem e sem nomes repetidos', () => {
  assert.deepEqual([...new Set(itens.map((i) => i.secao))], ['ACOUGUE', 'MERCEARIA', 'TEMPEROS', 'LIMPEZA', 'SACOLAO']);
  const nomes = itens.map((i) => c.normalizarNome_(i.nome));
  assert.equal(new Set(nomes).size, nomes.length);
  itens.forEach((i) => assert.equal(c.erroTextoLivre_(i.nome, 60), '', i.nome));
});

test('comprasPadraoDoPrato_: casa todos os principais da aba Meals que têm carne conhecida', () => {
  const plano = c.interpretarColagemPratos_(MEALS_TSV, []);
  const semSugestao = [...plano.principais].filter((p) => !c.comprasPadraoDoPrato_(p.nome, itens).length).map((p) => p.nome);
  assert.deepEqual(semSugestao, ['Carne Seca com Abobora', 'Churrasco Misto', 'Jardineira', 'Figado com Purê']);
  assert.deepEqual([...c.comprasPadraoDoPrato_('Carré', itens)].map((x) => ({ ...x })), [{ item_id: item('Carré').id, quantidade: '4 kg' }]);
  // "Filé de frango à parmegiana" cai na regra da parmegiana, não na do frango.
  assert.equal(c.comprasPadraoDoPrato_('Filé de frango à parmegiana', itens).length, 2);
});

test('lerQuantidade_ e somarQuantidades_: unidades da planilha da Tati', () => {
  assert.deepEqual({ ...c.lerQuantidade_('4k') }, { n: 4, unidade: 'kg' });
  assert.deepEqual({ ...c.lerQuantidade_('6 bandeijas') }, { n: 6, unidade: 'bandeja' });
  assert.deepEqual({ ...c.lerQuantidade_('1,5 kg') }, { n: 1.5, unidade: 'kg' });
  assert.equal(c.lerQuantidade_('meia dúzia'), null);
  assert.equal(c.somarQuantidades_(['6 bandejas', '6 bandeijas']), '12 bandejas');
  assert.equal(c.somarQuantidades_(['4k', '1,5 kg']), '5,5 kg');
  assert.equal(c.somarQuantidades_(['3 kg', '2 unid', 'a combinar']), '3 kg + 2 unid + a combinar');
  assert.equal(c.somarQuantidades_(['1 bandeja']), '1 bandeja');
});

test('quantidadeVale_: vazio e zero não entram na lista', () => {
  assert.equal(c.quantidadeVale_(''), false);
  assert.equal(c.quantidadeVale_('0'), false);
  assert.equal(c.quantidadeVale_(' 0 kg '), false);
  assert.equal(c.quantidadeVale_('2'), true);
  assert.equal(c.quantidadeVale_('a combinar'), true);
});

test('sugestaoDoCardapio_: soma o que os pratos da semana pedem', () => {
  const pratos = {
    P1: { id: 'P1', nome: 'Frango Grelhado', compras: [{ item_id: item('Filé de frango').id, quantidade: '6 bandejas' }] },
    P2: { id: 'P2', nome: 'Frango em cubos', compras: [{ item_id: item('Filé de frango').id, quantidade: '4 bandejas' }] },
    P3: { id: 'P3', nome: 'Carré', compras: [{ item_id: item('Carré').id, quantidade: '4 kg' }] },
  };
  const dias = [
    { dia: 'TERCA', rotulo: 'Terça-feira', tipo: 'PRATO', principal_id: 'P1' },
    { dia: 'QUARTA', rotulo: 'Quarta-feira', tipo: 'SEM_ALMOCO', principal_id: '' },
    { dia: 'QUINTA', rotulo: 'Quinta-feira', tipo: 'PRATO', principal_id: 'P2' },
    { dia: 'SEXTA', rotulo: 'Sexta-feira', tipo: '', principal_id: '' },
    { dia: 'SEGUNDA', rotulo: 'Segunda-feira', tipo: 'PRATO', principal_id: 'P3' },
  ];
  const s = c.sugestaoDoCardapio_(dias, pratos);
  assert.equal(s[item('Filé de frango').id].quantidade, '10 bandejas');
  assert.deepEqual([...s[item('Filé de frango').id].pratos], ['terça: Frango Grelhado', 'quinta: Frango em cubos']);
  assert.equal(s[item('Carré').id].quantidade, '4 kg');
  assert.equal(Object.keys(s).length, 2);
});

test('montarListaSemana_: salva > anterior (sem açougue) + cardápio', () => {
  const arroz = item('Arroz 5 kg').id;
  const carre = item('Carré').id;
  const pernil = item('Pernil suíno').id;
  const anterior = { [arroz]: '1', [pernil]: '6 kg', [item('Sal 1 kg').id]: '0' };
  const sugestao = { [carre]: { quantidade: '4 kg', pratos: ['terça: Carré'] } };
  const nova = c.montarListaSemana_(itens, null, anterior, sugestao);
  assert.equal(nova.origem, 'ANTERIOR');
  assert.deepEqual({ ...nova.quantidades }, { [arroz]: '1', [carre]: '4 kg' }, 'pernil da semana passada e zeros não vêm');
  assert.equal(c.montarListaSemana_(itens, null, null, sugestao).origem, 'NOVA');
  const salva = c.montarListaSemana_(itens, { [arroz]: '2' }, anterior, sugestao);
  assert.deepEqual({ origem: salva.origem, q: { ...salva.quantidades } }, { origem: 'SALVA', q: { [arroz]: '2' } });
});

test('validarQuantidades_: descarta vazios, recusa item desconhecido e fórmula', () => {
  const porId = Object.fromEntries(itens.map((i) => [i.id, i]));
  const ok = c.validarQuantidades_({ [itens[0].id]: ' 3 kg ', [itens[1].id]: '', [itens[2].id]: '0' }, porId);
  assert.deepEqual({ ...ok.quantidades }, { [itens[0].id]: '3 kg' });
  assert.match(c.validarQuantidades_({ 'IC-x': '1' }, porId).erro, /não encontrado/);
  assert.match(c.validarQuantidades_({ [itens[0].id]: '=1+1' }, porId).erro, /não pode começar/);
  assert.match(c.validarQuantidades_([], porId).erro, /inválida/);
});

test('validarPrato_: compras do principal', () => {
  const base = { tipo: 'PRINCIPAL', nome: 'Carré', categoria: 'PORCO', acompanhamentos: [] };
  const v = c.validarPrato_({ ...base, compras: [{ item_id: 'IC-1', quantidade: ' 4  kg ' }, { item_id: '' }] });
  assert.deepEqual([...v.prato.compras].map((x) => ({ ...x })), [{ item_id: 'IC-1', quantidade: '4 kg' }]);
  assert.match(c.validarPrato_({ ...base, compras: [{ item_id: 'IC-1' }, { item_id: 'IC-1' }] }).erro, /repetido/);
  assert.equal(c.validarPrato_({ ...base }).prato.compras.length, 0);
});
