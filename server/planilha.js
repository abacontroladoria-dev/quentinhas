// Substituto da planilha do Google no servidor: as abas ficam em memória e cada linha alterada vai para o SQLite.
// Imita só o que src/ usa de SpreadsheetApp (getSheetByName, getDataRange, getRange().getValues/setValues...),
// para o mesmo código rodar aqui e no Apps Script.
// Cada requisição termina em confirmar() (grava tudo numa transação) ou desfazer() (volta a memória ao que era).
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const vazio = (v) => v === '' || v === null || v === undefined;

class Intervalo {
  constructor(aba, linha, coluna, nLinhas, nColunas) {
    if (!(linha >= 1 && coluna >= 1 && nLinhas >= 1 && nColunas >= 1)) {
      throw new Error('Intervalo inválido: ' + [linha, coluna, nLinhas, nColunas].join(','));
    }
    Object.assign(this, { aba, linha, coluna, nLinhas, nColunas });
  }

  getValues() {
    const valores = [];
    for (let r = 0; r < this.nLinhas; r++) {
      const linha = [];
      for (let c = 0; c < this.nColunas; c++) linha.push(this.aba.celula(this.linha + r, this.coluna + c));
      valores.push(linha);
    }
    return valores;
  }

  setValues(valores) {
    if (!Array.isArray(valores) || valores.length !== this.nLinhas || valores.some((l) => !Array.isArray(l) || l.length !== this.nColunas)) {
      throw new Error('As dimensões dos dados não correspondem ao intervalo.');
    }
    valores.forEach((l, r) => l.forEach((v, c) => this.aba.gravar(this.linha + r, this.coluna + c, v)));
    return this;
  }

  setValue(valor) {
    return this.setValues(Array.from({ length: this.nLinhas }, () => Array(this.nColunas).fill(valor)));
  }

  clearContent() { return this.setValue(''); }
  setNumberFormat() { return this; }
  setFontWeight() { return this; }
}

class Aba {
  constructor(planilha, nome, linhas) {
    this.planilha = planilha;
    this.nome = nome;
    this.linhas = linhas || [];
  }

  getName() { return this.nome; }

  celula(r, c) {
    const linha = this.linhas[r - 1];
    const v = linha ? linha[c - 1] : undefined;
    return vazio(v) ? '' : v;
  }

  gravar(r, c, v) {
    this.planilha.antesDeAlterar(this, r);
    while (this.linhas.length < r) this.linhas.push([]);
    const linha = this.linhas[r - 1];
    while (linha.length < c) linha.push('');
    linha[c - 1] = vazio(v) ? '' : v;
  }

  getLastRow() {
    for (let i = this.linhas.length - 1; i >= 0; i--) if (this.linhas[i].some((v) => !vazio(v))) return i + 1;
    return 0;
  }

  getLastColumn() {
    let max = 0;
    this.linhas.forEach((l) => {
      for (let i = l.length - 1; i >= max; i--) if (!vazio(l[i])) { max = i + 1; break; }
    });
    return max;
  }

  getMaxRows() { return Math.max(1000, this.linhas.length); }
  getMaxColumns() { return Math.max(26, this.getLastColumn()); }

  getDataRange() {
    return new Intervalo(this, 1, 1, Math.max(1, this.getLastRow()), Math.max(1, this.getLastColumn()));
  }

  getRange(linha, coluna, nLinhas, nColunas) {
    return new Intervalo(this, linha, coluna, nLinhas || 1, nColunas || 1);
  }

  // Formatação e proteção não existem fora do Google: aceitas e ignoradas.
  insertColumnsAfter() { return this; }
  setFrozenRows() { return this; }
  getProtections() { return []; }
  protect() {
    const p = { setDescription: () => p, setWarningOnly: () => p };
    return p;
  }
}

class Planilha {
  /** `arquivo`: caminho do SQLite (':memory:' nos testes). */
  constructor(arquivo) {
    if (arquivo !== ':memory:') fs.mkdirSync(path.dirname(arquivo), { recursive: true });
    this.db = new DatabaseSync(arquivo);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = FULL;
      CREATE TABLE IF NOT EXISTS abas (nome TEXT PRIMARY KEY, ordem INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS linhas (aba TEXT NOT NULL, n INTEGER NOT NULL, valores TEXT NOT NULL, PRIMARY KEY (aba, n)) WITHOUT ROWID;
      CREATE TABLE IF NOT EXISTS propriedades (chave TEXT PRIMARY KEY, valor TEXT NOT NULL);
    `);
    this.carregar();
  }

  carregar() {
    this.abas = new Map();
    for (const { nome } of this.db.prepare('SELECT nome FROM abas ORDER BY ordem').all()) {
      this.abas.set(nome, new Aba(this, nome, []));
    }
    for (const { aba, n, valores } of this.db.prepare('SELECT aba, n, valores FROM linhas ORDER BY aba, n').all()) {
      const a = this.abas.get(aba);
      if (!a) continue;
      while (a.linhas.length < n) a.linhas.push([]);
      a.linhas[n - 1] = JSON.parse(valores);
    }
    this.props = new Map(this.db.prepare('SELECT chave, valor FROM propriedades').all().map((p) => [p.chave, p.valor]));
    this.limparPendencias();
  }

  limparPendencias() {
    this.linhasAntes = new Map(); // aba → Map(n → cópia da linha antes da 1ª alteração, ou null)
    this.tamanhoAntes = new Map(); // aba → quantidade de linhas antes
    this.propsAntes = new Map(); // chave → valor antes (ou undefined)
    this.abasAntes = null; // cópia do mapa de abas, se alguma foi criada/apagada
  }

  antesDeAlterar(aba, n) {
    if (!this.linhasAntes.has(aba)) {
      this.linhasAntes.set(aba, new Map());
      this.tamanhoAntes.set(aba, aba.linhas.length);
    }
    const m = this.linhasAntes.get(aba);
    if (!m.has(n)) m.set(n, aba.linhas[n - 1] ? aba.linhas[n - 1].slice() : null);
  }

  // ----- SpreadsheetApp -----
  getId() { return 'servidor'; }
  getSpreadsheetTimeZone() { return 'America/Sao_Paulo'; }
  setSpreadsheetTimeZone() { return this; }
  getOwner() { return null; }
  getSheetByName(nome) { return this.abas.get(nome) || null; }
  getSheets() { return Array.from(this.abas.values()); }

  insertSheet(nome) {
    if (this.abas.has(nome)) throw new Error('Já existe uma aba chamada ' + nome + '.');
    if (!this.abasAntes) this.abasAntes = new Map(this.abas);
    const aba = new Aba(this, nome, []);
    this.abas.set(nome, aba);
    return aba;
  }

  deleteSheet(aba) {
    if (!this.abasAntes) this.abasAntes = new Map(this.abas);
    this.abas.delete(aba.nome);
  }

  // ----- PropertiesService -----
  propriedade(chave) {
    return this.props.has(chave) ? this.props.get(chave) : null;
  }

  definirPropriedade(chave, valor) {
    if (!this.propsAntes.has(chave)) this.propsAntes.set(chave, this.props.get(chave));
    this.props.set(chave, String(valor));
  }

  // ----- fim da requisição -----

  /** Grava no SQLite, numa transação, tudo o que mudou desde a última confirmação. */
  confirmar() {
    const db = this.db;
    db.exec('BEGIN IMMEDIATE');
    try {
      if (this.abasAntes) {
        db.exec('DELETE FROM abas');
        const ins = db.prepare('INSERT INTO abas (nome, ordem) VALUES (?, ?)');
        Array.from(this.abas.keys()).forEach((nome, i) => ins.run(nome, i));
        const apagar = db.prepare('DELETE FROM linhas WHERE aba = ?');
        for (const nome of this.abasAntes.keys()) if (!this.abas.has(nome)) apagar.run(nome);
      }
      const gravar = db.prepare('INSERT INTO linhas (aba, n, valores) VALUES (?, ?, ?) ON CONFLICT (aba, n) DO UPDATE SET valores = excluded.valores');
      for (const [aba, alteradas] of this.linhasAntes) {
        if (this.abas.get(aba.nome) !== aba) continue;
        for (const n of alteradas.keys()) gravar.run(aba.nome, n, JSON.stringify(aba.linhas[n - 1] || []));
      }
      const prop = db.prepare('INSERT INTO propriedades (chave, valor) VALUES (?, ?) ON CONFLICT (chave) DO UPDATE SET valor = excluded.valor');
      for (const chave of this.propsAntes.keys()) prop.run(chave, this.props.get(chave));
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      this.desfazer();
      throw e;
    }
    this.limparPendencias();
  }

  /** Volta a memória ao estado da última confirmação (a requisição falhou: nada dela fica). */
  desfazer() {
    if (this.abasAntes) this.abas = this.abasAntes;
    for (const [aba, alteradas] of this.linhasAntes) {
      for (const [n, linha] of alteradas) aba.linhas[n - 1] = linha || [];
      aba.linhas.length = this.tamanhoAntes.get(aba);
    }
    for (const [chave, valor] of this.propsAntes) {
      if (valor === undefined) this.props.delete(chave);
      else this.props.set(chave, valor);
    }
    this.limparPendencias();
  }

  /** Abas como { nome: valores 2D } (exportação). */
  valores() {
    const r = {};
    for (const [nome, aba] of this.abas) r[nome] = aba.getDataRange().getValues();
    return r;
  }

  /** Troca todos os dados (migração): `abas` = { nome: valores 2D }, `propriedades` = { chave: valor }. */
  substituirTudo(abas, propriedades) {
    const db = this.db;
    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec('DELETE FROM abas; DELETE FROM linhas; DELETE FROM propriedades;');
      const insAba = db.prepare('INSERT INTO abas (nome, ordem) VALUES (?, ?)');
      const insLinha = db.prepare('INSERT INTO linhas (aba, n, valores) VALUES (?, ?, ?)');
      Object.keys(abas).forEach((nome, i) => {
        insAba.run(nome, i);
        abas[nome].forEach((linha, j) => {
          if (linha.some((v) => !vazio(v))) insLinha.run(nome, j + 1, JSON.stringify(linha.map((v) => (vazio(v) ? '' : v))));
        });
      });
      const insProp = db.prepare('INSERT INTO propriedades (chave, valor) VALUES (?, ?)');
      for (const [chave, valor] of Object.entries(propriedades || {})) insProp.run(chave, String(valor));
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
    this.carregar();
  }

  /** Cópia consistente do banco em `destino` (backup). */
  copiarPara(destino) {
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    fs.rmSync(destino, { force: true });
    this.db.exec("VACUUM INTO '" + destino.replace(/'/g, "''") + "'");
  }

  fechar() { this.db.close(); }
}

module.exports = { Planilha };
