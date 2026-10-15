// Excel (.xlsx) mínimo, sem dependências: gera a exportação da administração e lê o download da planilha
// do Google na migração. Um .xlsx é um zip de XMLs; aqui só texto e números, sem estilos nem fórmulas.
const zlib = require('node:zlib');

// ---------- zip ----------

function zipar(arquivos) {
  const locais = [];
  const central = [];
  let posicao = 0;
  for (const [nome, conteudo] of Object.entries(arquivos)) {
    const dados = Buffer.from(conteudo, 'utf8');
    const comprimido = zlib.deflateRawSync(dados);
    const nomeBuf = Buffer.from(nome, 'utf8');
    const crc = zlib.crc32(dados);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // nomes em UTF-8
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(comprimido.length, 18);
    local.writeUInt32LE(dados.length, 22);
    local.writeUInt16LE(nomeBuf.length, 26);
    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0x0800, 8);
    cd.writeUInt16LE(8, 10);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(comprimido.length, 20);
    cd.writeUInt32LE(dados.length, 24);
    cd.writeUInt16LE(nomeBuf.length, 28);
    cd.writeUInt32LE(posicao, 42);
    locais.push(local, nomeBuf, comprimido);
    central.push(cd, nomeBuf);
    posicao += 30 + nomeBuf.length + comprimido.length;
  }
  const tamCentral = central.reduce((s, b) => s + b.length, 0);
  const fim = Buffer.alloc(22);
  fim.writeUInt32LE(0x06054b50, 0);
  fim.writeUInt16LE(central.length / 2, 8);
  fim.writeUInt16LE(central.length / 2, 10);
  fim.writeUInt32LE(tamCentral, 12);
  fim.writeUInt32LE(posicao, 16);
  return Buffer.concat([...locais, ...central, fim]);
}

function deszipar(buf) {
  let fim = buf.length - 22;
  while (fim >= 0 && buf.readUInt32LE(fim) !== 0x06054b50) fim--;
  if (fim < 0) throw new Error('Arquivo não é um .xlsx válido.');
  const total = buf.readUInt16LE(fim + 10);
  let p = buf.readUInt32LE(fim + 16);
  const arquivos = {};
  for (let i = 0; i < total; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('Arquivo .xlsx corrompido.');
    const metodo = buf.readUInt16LE(p + 10);
    const tamComprimido = buf.readUInt32LE(p + 20);
    const tamNome = buf.readUInt16LE(p + 28);
    const tamExtra = buf.readUInt16LE(p + 30);
    const tamComentario = buf.readUInt16LE(p + 32);
    const posLocal = buf.readUInt32LE(p + 42);
    const nome = buf.toString('utf8', p + 46, p + 46 + tamNome);
    const inicio = posLocal + 30 + buf.readUInt16LE(posLocal + 26) + buf.readUInt16LE(posLocal + 28);
    const dados = buf.subarray(inicio, inicio + tamComprimido);
    arquivos[nome] = metodo === 8 ? zlib.inflateRawSync(dados) : dados;
    p += 46 + tamNome + tamExtra + tamComentario;
  }
  return arquivos;
}

// ---------- XML ----------

const escapar = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
  // caracteres de controle não são aceitos em XML
  .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');

const desescapar = (t) => t.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e) => {
  if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
  return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }[e.toLowerCase()];
});

const attr = (tag, nome) => {
  const m = new RegExp('\\s' + nome + '="([^"]*)"').exec(tag);
  return m ? desescapar(m[1]) : null;
};

/** Junta o texto de todos os <t> de um trecho (texto com formatação vem em vários). */
const textoDe = (xml) => {
  let r = '';
  xml.replace(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g, (_, t) => { r += desescapar(t); });
  return r;
};

function letraColuna(n) {
  let s = '';
  for (n += 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

function indiceColuna(ref) {
  const letras = /^[A-Z]+/.exec(ref)[0];
  let n = 0;
  for (const l of letras) n = n * 26 + (l.charCodeAt(0) - 64);
  return n - 1;
}

// ---------- gerar ----------

/** `abas`: { nome: valores 2D }. Retorna o .xlsx em Buffer. */
function gerarXlsx(abas) {
  const nomes = Object.keys(abas);
  const arquivos = {
    '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      nomes.map((_, i) => '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('') +
      '</Types>',
    '_rels/.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
      '</Relationships>',
    'xl/workbook.xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
      nomes.map((n, i) => '<sheet name="' + escapar(n.slice(0, 31)) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>').join('') +
      '</sheets></workbook>',
    'xl/_rels/workbook.xml.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      nomes.map((_, i) => '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>').join('') +
      '<Relationship Id="rId' + (nomes.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
      '</Relationships>',
    // Estilo 1 = negrito (cabeçalho).
    'xl/styles.xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
      '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
      '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
      '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>' +
      '</styleSheet>'
  };
  nomes.forEach((nome, i) => {
    const linhas = abas[nome].map((linha, r) => '<row r="' + (r + 1) + '">' + linha.map((v, c) => {
      if (v === '' || v === null || v === undefined) return '';
      const ref = letraColuna(c) + (r + 1);
      const estilo = r === 0 ? ' s="1"' : '';
      if (typeof v === 'number' && Number.isFinite(v)) return '<c r="' + ref + '"' + estilo + '><v>' + v + '</v></c>';
      return '<c r="' + ref + '"' + estilo + ' t="inlineStr"><is><t xml:space="preserve">' + escapar(v) + '</t></is></c>';
    }).join('') + '</row>').join('');
    arquivos['xl/worksheets/sheet' + (i + 1) + '.xml'] = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
      '<sheetData>' + linhas + '</sheetData></worksheet>';
  });
  return zipar(arquivos);
}

// ---------- ler ----------

/** Lê um .xlsx (Buffer) → { nome da aba: valores 2D }. Texto vira string; número vira number; vazio vira ''. */
function lerXlsx(buf) {
  const arq = deszipar(buf);
  const ler = (nome) => (arq[nome] ? arq[nome].toString('utf8') : '');
  const compartilhados = [];
  ler('xl/sharedStrings.xml').replace(/<si>([\s\S]*?)<\/si>/g, (_, si) => { compartilhados.push(textoDe(si)); });
  const alvos = {};
  ler('xl/_rels/workbook.xml.rels').replace(/<Relationship\b[^>]*>/g, (tag) => {
    const alvo = attr(tag, 'Target');
    alvos[attr(tag, 'Id')] = alvo.startsWith('/') ? alvo.slice(1) : 'xl/' + alvo;
  });
  const abas = {};
  ler('xl/workbook.xml').replace(/<sheet\b[^>]*>/g, (tag) => {
    const xml = ler(alvos[attr(tag, 'r:id')]);
    const valores = [];
    xml.replace(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g, (_, rAttr, corpo) => {
      const n = parseInt(attr(rAttr, 'r'), 10) || valores.length + 1;
      const linha = [];
      (corpo || '').replace(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g, (__, cAttr, conteudo) => {
        const col = indiceColuna(attr(cAttr, 'r'));
        const tipo = attr(cAttr, 't');
        const v = /<v>([\s\S]*?)<\/v>/.exec(conteudo || '');
        let valor = '';
        if (tipo === 's') valor = compartilhados[parseInt(v[1], 10)];
        else if (tipo === 'inlineStr') valor = textoDe(conteudo);
        else if (tipo === 'str' || tipo === 'e') valor = v ? desescapar(v[1]) : '';
        else if (tipo === 'b') valor = v ? v[1] === '1' : '';
        else if (v) valor = Number(v[1]);
        while (linha.length < col) linha.push('');
        linha[col] = valor;
      });
      while (valores.length < n - 1) valores.push([]);
      valores[n - 1] = linha;
    });
    abas[attr(tag, 'name')] = valores;
  });
  return abas;
}

module.exports = { gerarXlsx, lerXlsx };
