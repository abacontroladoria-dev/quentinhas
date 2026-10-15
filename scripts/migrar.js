// Migração única da planilha do Google para o servidor (VPS).
// 1. Na planilha: Arquivo → Fazer download → Microsoft Excel (.xlsx).
// 2. node scripts/migrar.js <planilha.xlsx> "<link de administração atual>" <endereço do servidor> <IMPORTAR_TOKEN>
//    Os tokens da cozinha e da administração são copiados do Apps Script, então os links atuais continuam valendo.
//    Sem o endereço do servidor, só confere o arquivo e mostra o que seria enviado.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { lerXlsx } = require('../server/xlsx');

// API antiga (Apps Script), de onde vêm os tokens dos links atuais.
const URL_APPS_SCRIPT = 'https://script.google.com/macros/s/AKfycbx_JKo5ajDM8Mg4Rht-BgtmF3nDamP8cpYvplji8Wtcxm3vXoxXyRx3VXvT8nuFvyQ8_w/exec';

function esquema() {
  const ctx = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', 'Database.js'), 'utf8'), ctx);
  return ctx.ESQUEMA_;
}

/** Só as abas do sistema, sem linhas e colunas vazias no fim. Avisa sobre datas que o Google converteu em número. */
function prepararAbas(lidas) {
  const abas = {};
  const avisos = [];
  for (const nome of Object.keys(esquema())) {
    const valores = lidas[nome];
    if (!valores) { avisos.push('Aba ' + nome + ' não encontrada (será criada vazia).'); continue; }
    const cab = (valores[0] || []).map((c) => String(c).trim());
    const largura = cab.reduce((m, c, i) => (c ? i + 1 : m), 0);
    let linhas = valores.map((l) => Array.from({ length: largura }, (_, i) => (l[i] === undefined ? '' : l[i])));
    while (linhas.length > 1 && linhas[linhas.length - 1].every((v) => v === '')) linhas.pop();
    ['id', 'data', 'semana_id', 'data_inicio', 'data_fim'].forEach((col) => {
      const i = cab.indexOf(col);
      if (i === -1) return;
      linhas.slice(1).forEach((l, r) => {
        if (typeof l[i] === 'number') avisos.push(nome + ' linha ' + (r + 2) + ': ' + col + ' virou número (' + l[i] + ') — confira na planilha.');
      });
    });
    abas[nome] = linhas;
  }
  return { abas, avisos };
}

async function tokensAtuais(linkAdmin) {
  const k = new URL(linkAdmin).searchParams.get('k');
  if (!k) throw new Error('O link de administração precisa ter ?k=...');
  const r = await fetch(URL_APPS_SCRIPT, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ acao: 'apiAdmin', args: [k, 'adminLinks', []] })
  }).then((x) => x.json());
  if (!r.ok) throw new Error('Apps Script: ' + r.erro);
  const cozinha = new URL(r.dados.cozinha).searchParams.get('k');
  return { ADMIN_TOKEN: k, COZINHA_TOKEN: cozinha };
}

async function main() {
  const [arquivo, linkAdmin, servidor, token] = process.argv.slice(2);
  if (!arquivo || !linkAdmin) {
    console.log('Uso: node scripts/migrar.js <planilha.xlsx> "<link de administração>" [endereço do servidor] [IMPORTAR_TOKEN]');
    process.exit(1);
  }
  const { abas, avisos } = prepararAbas(lerXlsx(fs.readFileSync(arquivo)));
  for (const [nome, linhas] of Object.entries(abas)) console.log(nome.padEnd(14) + (linhas.length - 1) + ' linhas');
  avisos.forEach((a) => console.log('Aviso: ' + a));
  const propriedades = await tokensAtuais(linkAdmin);
  console.log('Tokens dos links atuais: ok');
  if (!servidor) { console.log('\nNada enviado (informe o endereço do servidor e o IMPORTAR_TOKEN para migrar).'); return; }
  const r = await fetch(servidor.replace(/\/+$/, '') + '/importar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ abas, propriedades })
  }).then((x) => x.json());
  if (!r.ok) throw new Error('Servidor: ' + r.erro);
  console.log('\nMigrado. Linhas no servidor:', r.linhas);
  if (r.preparacao.length) console.log('Ajustes feitos:\n  ' + r.preparacao.join('\n  '));
}

main().catch((e) => { console.error('Erro: ' + e.message); process.exit(1); });
