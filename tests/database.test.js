const test = require('node:test');
const assert = require('node:assert/strict');
const { carregar } = require('./carregar');

const db = carregar(['Database.js']);

test('verificarCabecalho_: aba vazia → CRIAR', () => {
  const r = db.verificarCabecalho_(['', ''], ['id', 'nome']);
  assert.equal(r.acao, 'CRIAR');
  assert.deepEqual([...r.faltando], ['id', 'nome']);
});

test('verificarCabecalho_: completo (com extra e fora de ordem) → OK', () => {
  const r = db.verificarCabecalho_(['nome', ' id ', 'obs'], ['id', 'nome']);
  assert.equal(r.acao, 'OK');
});

test('verificarCabecalho_: faltando coluna com dados → ACRESCENTAR só as que faltam', () => {
  const r = db.verificarCabecalho_(['id', 'obs'], ['id', 'nome', 'situacao'], true);
  assert.equal(r.acao, 'ACRESCENTAR');
  assert.deepEqual([...r.faltando], ['nome', 'situacao']);
});

test('verificarCabecalho_: faltando coluna sem dados → RECRIAR', () => {
  assert.equal(db.verificarCabecalho_(['id', 'componente'], ['id', 'tipo'], false).acao, 'RECRIAR');
});

test('tabelaDeValores_: mapeia por cabeçalho e ignora linhas vazias', () => {
  const t = db.tabelaDeValores_([
    ['id', 'nome', ''],
    ['F-1', 'Ana', 'x'],
    ['', '', ''],
    ['F-2', 'Bia', ''],
  ]);
  assert.deepEqual([...t.cabecalho], ['id', 'nome', '']);
  assert.equal(t.linhas.length, 2);
  assert.deepEqual({ ...t.linhas[1] }, { id: 'F-2', nome: 'Bia' });
});

test('tabelaDeValores_: planilha sem dados', () => {
  assert.equal(db.tabelaDeValores_([]).linhas.length, 0);
  assert.equal(db.tabelaDeValores_([['id']]).linhas.length, 0);
});

test('linhaDeObjeto_: segue a ordem do cabeçalho e preenche ausentes com vazio', () => {
  const linha = db.linhaDeObjeto_(['id', 'nome', 'ordem', 'x'], { nome: 'Ana', id: 'F-1', ordem: 0, x: null });
  assert.deepEqual([...linha], ['F-1', 'Ana', 0, '']);
});

test('novoIdUnico_: formato e unicidade', () => {
  const id = db.novoIdUnico_('F', []);
  assert.match(id, /^F-[0-9a-f]{12}$/);
});

test('novoIdUnico_: tenta de novo em colisão', () => {
  const uuids = ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'];
  const ctx = carregar(['Database.js'], { Utilities: { getUuid: () => uuids.shift() } });
  assert.equal(ctx.novoIdUnico_('P', new Set(['P-aaaaaaaaaaaa'])), 'P-bbbbbbbbbbbb');
});

test('ESQUEMA_: toda aba tem colunas únicas e as com id começam por id', () => {
  for (const [nome, cols] of Object.entries(db.ESQUEMA_)) {
    assert.equal(new Set(cols).size, cols.length, nome);
    if (cols.includes('id')) assert.equal(cols[0], 'id', nome);
  }
});

test('CONFIG_PADRAO_: chaves únicas e valores em texto', () => {
  const chaves = db.CONFIG_PADRAO_.map((c) => c[0]);
  assert.equal(new Set(chaves).size, chaves.length);
  for (const c of db.CONFIG_PADRAO_) assert.equal(typeof c[1], 'string');
});
