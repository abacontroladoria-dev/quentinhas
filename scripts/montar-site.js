// Monta o site estático (GitHub Pages) a partir dos mesmos arquivos de src/ usados no Apps Script.
// Diferenças em relação ao Apps Script:
//   - os <?!= include_('X'); ?> são resolvidos aqui, copiando o conteúdo de src/X.html;
//   - Transporte.html (google.script.run) é trocado por <script src="api.js"> (fetch para a API JSON);
//   - o token da cozinha vem do endereço (?k=...), não do template.
// Uso: node scripts/montar-site.js [pasta de saída]   (padrão: _site)
const fs = require('node:fs');
const path = require('node:path');

const raiz = path.join(__dirname, '..');
const src = path.join(raiz, 'src');
const saidaPadrao = path.resolve(process.argv[2] || path.join(raiz, '_site'));

const ler = (nome) => fs.readFileSync(path.join(src, nome + '.html'), 'utf8');

function resolverIncludes(html) {
  return html.replace(/<\?!= include_\('(\w+)'\); \?>/g, (_, nome) =>
    nome === 'Transporte' ? '<script src="api.js"></script>' : resolverIncludes(ler(nome)));
}

function montarPagina(nomeOrigem, titulo) {
  // Administração: a tela do diálogo chama google.script.run; no site, admin-run.js imita isso sobre a API.
  // Sem referrer, para o token do link não vazar ao abrir links externos (ex.: WhatsApp).
  const extras = nomeOrigem === 'Admin'
    ? '\n  <meta name="referrer" content="no-referrer">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <script src="api.js"></script>\n  <script src="admin-run.js"></script>'
    : '';
  let html = resolverIncludes(ler(nomeOrigem))
    .replace('<base target="_top">', '')
    .replace('data-k="<?= token ?>"', 'data-k=""')
    // Página interna: fora dos buscadores.
    .replace('<meta charset="utf-8">', '<meta charset="utf-8">\n  <meta name="robots" content="noindex, nofollow">\n  <title>' + titulo + '</title>\n  <link rel="icon" href="icone.svg">' + extras);
  const sobra = html.match(/<\?[\s\S]*?\?>/);
  if (sobra) throw new Error(nomeOrigem + ': scriptlet do Apps Script não resolvido: ' + sobra[0]);
  return html;
}

function montar(saida = saidaPadrao) {
  fs.rmSync(saida, { recursive: true, force: true });
  fs.mkdirSync(saida, { recursive: true });
  const paginas = {
    'index.html': ['Index', 'Quentinhas'],
    'cozinha.html': ['PainelCozinha', 'Quentinhas · Cozinha'],
    'admin.html': ['Admin', 'Quentinhas · Administração']
  };
  for (const [destino, [origem, titulo]] of Object.entries(paginas)) {
    fs.writeFileSync(path.join(saida, destino), montarPagina(origem, titulo));
  }
  for (const arquivo of fs.readdirSync(path.join(raiz, 'web'))) {
    fs.copyFileSync(path.join(raiz, 'web', arquivo), path.join(saida, arquivo));
  }
  // Sem processamento Jekyll no GitHub Pages.
  fs.writeFileSync(path.join(saida, '.nojekyll'), '');
  return saida;
}

if (require.main === module) console.log('Site montado em ' + montar());
module.exports = { montar, montarPagina };
