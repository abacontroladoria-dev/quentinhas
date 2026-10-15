// Servidor da API das quentinhas (substitui o Apps Script). As telas continuam no GitHub Pages e chamam
// POST /api com o mesmo corpo de antes: {"acao": "<função>", "args": [...]} → {"ok": true, "dados": ...}.
//
// Variáveis de ambiente:
//   PORT            porta (padrão 3000)
//   DADOS           arquivo do banco SQLite (padrão ./dados/quentinhas.db; no Coolify, /data/quentinhas.db)
//   ORIGENS         sites que podem chamar a API, separados por vírgula (padrão: o GitHub Pages)
//   IMPORTAR_TOKEN  libera POST /importar (migração da planilha). Deixe vazio depois de migrar.
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
const { Planilha } = require('./planilha');
const { criarContexto, prepararDados, formatarData } = require('./gas');
const { gerarXlsx } = require('./xlsx');

const CORPO_API_MAX = 64 * 1024;
const CORPO_IMPORTAR_MAX = 50 * 1024 * 1024;
const BACKUPS_MANTIDOS = 14;

/** Monta o servidor sobre um arquivo de banco. Retorna { servidor, planilha, ctx }. */
function criarServidor(opcoes = {}) {
  const arquivo = opcoes.dados || process.env.DADOS || path.join(__dirname, '..', 'dados', 'quentinhas.db');
  const origens = String(opcoes.origens || process.env.ORIGENS || 'https://abacontroladoria-dev.github.io')
    .split(',').map((o) => o.trim()).filter(Boolean);
  const tokenImportar = opcoes.tokenImportar !== undefined ? opcoes.tokenImportar : process.env.IMPORTAR_TOKEN || '';

  const planilha = new Planilha(arquivo);
  const ctx = criarContexto(planilha);
  const resumo = prepararDados(ctx, planilha);
  if (resumo && !opcoes.silencioso) console.log('Dados preparados:\n  ' + resumo.join('\n  '));

  // Só no servidor: a planilha inteira em Excel, para consulta (substitui abrir a planilha do Google).
  ctx.ACOES_ADMIN_.adminExportarExcel = () => {
    ctx.exigirAdmin_();
    const hoje = formatarData(new Date(), ctx.FUSO_, 'yyyy-MM-dd');
    return { nome: 'quentinhas-' + hoje + '.xlsx', base64: gerarXlsx(planilha.valores()).toString('base64') };
  };

  function cors(req) {
    const origem = req.headers.origin;
    const h = { Vary: 'Origin' };
    if (origem && origens.includes(origem)) {
      h['Access-Control-Allow-Origin'] = origem;
      h['Access-Control-Allow-Methods'] = 'POST, GET, OPTIONS';
      h['Access-Control-Allow-Headers'] = 'Content-Type';
      h['Access-Control-Max-Age'] = '86400';
    }
    return h;
  }

  function responder(req, res, status, corpo) {
    res.writeHead(status, Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, cors(req)));
    res.end(JSON.stringify(corpo));
  }

  function lerCorpo(req, limite) {
    return new Promise((ok, falha) => {
      const partes = [];
      let tamanho = 0;
      req.on('data', (p) => {
        tamanho += p.length;
        if (tamanho > limite) { falha(Object.assign(new Error('Requisição grande demais.'), { status: 413 })); req.destroy(); return; }
        partes.push(p);
      });
      req.on('end', () => ok(Buffer.concat(partes).toString('utf8')));
      req.on('error', falha);
    });
  }

  /** Executa uma ação da API: tudo ou nada (se der erro, nada do que ela alterou fica gravado). */
  function executar(texto) {
    let resposta;
    try {
      resposta = ctx.executarApi_(texto, ctx.ACOES_API_);
    } catch (e) {
      resposta = { ok: false, erro: 'Erro interno. Tente de novo.' };
      console.error(e);
    }
    if (resposta && resposta.ok) {
      planilha.confirmar();
    } else {
      planilha.desfazer();
    }
    return resposta;
  }

  async function tratar(req, res) {
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'OPTIONS') {
      res.writeHead(204, cors(req));
      res.end();
      return;
    }
    if (req.method === 'GET' && url.pathname === '/saude') return responder(req, res, 200, { ok: true });
    if (req.method === 'POST' && (url.pathname === '/api' || url.pathname === '/')) {
      const texto = await lerCorpo(req, CORPO_API_MAX);
      return responder(req, res, 200, executar(texto));
    }
    if (req.method === 'POST' && url.pathname === '/importar') {
      const enviado = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      if (!tokenImportar || !ctx.tokensIguais_(enviado, tokenImportar)) return responder(req, res, 403, { ok: false, erro: 'Importação não autorizada.' });
      const corpo = JSON.parse(await lerCorpo(req, CORPO_IMPORTAR_MAX));
      if (!corpo || typeof corpo.abas !== 'object') return responder(req, res, 400, { ok: false, erro: 'Envie { abas, propriedades }.' });
      planilha.substituirTudo(corpo.abas, corpo.propriedades || {});
      const r = prepararDados(ctx, planilha);
      const linhas = {};
      for (const [nome, aba] of planilha.abas) linhas[nome] = Math.max(0, aba.getLastRow() - 1);
      console.log('Importação concluída:', JSON.stringify(linhas));
      return responder(req, res, 200, { ok: true, linhas, preparacao: r || [] });
    }
    return responder(req, res, 404, { ok: false, erro: 'Não encontrado.' });
  }

  const servidor = http.createServer((req, res) => {
    tratar(req, res).catch((e) => {
      if (!e.status) console.error(e);
      if (!res.headersSent) responder(req, res, e.status || 500, { ok: false, erro: e.status ? e.message : 'Erro interno.' });
    });
  });

  /** Cópia diária do banco ao lado dele, em backups/, mantendo as últimas BACKUPS_MANTIDOS. */
  function backup() {
    if (arquivo === ':memory:') return;
    const pasta = path.join(path.dirname(arquivo), 'backups');
    const hoje = formatarData(new Date(), ctx.FUSO_, 'yyyy-MM-dd');
    const destino = path.join(pasta, 'quentinhas-' + hoje + '.db');
    try {
      if (!fs.existsSync(destino)) planilha.copiarPara(destino);
      fs.readdirSync(pasta).filter((a) => /^quentinhas-\d{4}-\d{2}-\d{2}\.db$/.test(a)).sort().reverse()
        .slice(BACKUPS_MANTIDOS).forEach((a) => fs.rmSync(path.join(pasta, a), { force: true }));
    } catch (e) {
      console.error('Backup falhou:', e);
    }
  }

  return { servidor, planilha, ctx, backup };
}

if (require.main === module) {
  const { servidor, planilha, backup } = criarServidor();
  const porta = Number(process.env.PORT) || 3000;
  servidor.listen(porta, () => console.log('Quentinhas no ar na porta ' + porta));
  backup();
  const relogio = setInterval(backup, 60 * 60 * 1000);
  const parar = () => {
    clearInterval(relogio);
    servidor.close(() => { planilha.fechar(); process.exit(0); });
    setTimeout(() => process.exit(0), 5000).unref();
  };
  process.on('SIGTERM', parar);
  process.on('SIGINT', parar);
}

module.exports = { criarServidor };
