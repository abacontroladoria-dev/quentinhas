// Carrega arquivos de src/ num contexto isolado com stubs mínimos dos serviços do Apps Script.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

function carregar(arquivos, stubs = {}) {
  const contexto = vm.createContext({
    Utilities: { getUuid: () => crypto.randomUUID() },
    Set,
    ...stubs,
  });
  for (const arquivo of arquivos) {
    const codigo = fs.readFileSync(path.join(__dirname, '..', 'src', arquivo), 'utf8');
    vm.runInContext(codigo, contexto, { filename: arquivo });
  }
  return contexto;
}

module.exports = { carregar };
