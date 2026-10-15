// Página de administração no site (admin.html?k=<token>): a tela é a mesma do diálogo da planilha (src/Admin.html),
// que chama google.script.run. Aqui google.script.run é imitado sobre a API JSON: cada chamada vira
// apiAdmin(token, função, argumentos). Precisa de api.js (URL_API) carregado antes.
(function () {
  var token = new URLSearchParams(location.search).get('k') || '';
  document.documentElement.classList.add('no-site');

  function chamar(nome, args, ok, falha) {
    if (!token) return; // a página só mostra onde achar o link (abaixo)
    var erro = function (msg) { if (falha) falha(new Error(msg)); };
    fetch(URL_API, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ acao: 'apiAdmin', args: [token, nome, args] }),
      credentials: 'omit',
      redirect: 'follow'
    })
      .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
      .then(function (r) {
        if (r && r.ok) { if (ok) ok(r.dados); } else erro((r && r.erro) || 'Resposta inesperada do servidor. Tente de novo.');
      })
      .catch(function () { erro('Não foi possível conectar. Verifique a internet e tente de novo.'); });
  }

  function corredor(ok, falha) {
    return new Proxy({}, {
      get: function (_, nome) {
        if (nome === 'withSuccessHandler') return function (f) { return corredor(f, falha); };
        if (nome === 'withFailureHandler') return function (f) { return corredor(ok, f); };
        return function () { chamar(String(nome), Array.prototype.slice.call(arguments), ok, falha); };
      }
    });
  }
  window.google = { script: { run: corredor(null, null) } };

  // Sem token no endereço não há o que carregar: explica onde achar o link.
  if (!token) {
    document.addEventListener('DOMContentLoaded', function () {
      document.body.innerHTML = '';
      var caixa = document.createElement('div');
      caixa.className = 'sem-link';
      var h = document.createElement('h1');
      h.textContent = 'Abra pelo link de administração';
      var p = document.createElement('p');
      p.textContent = 'Este endereço precisa do link completo. Na planilha do Quentinhas, use o menu Quentinhas → Links e copie o link de Administração.';
      caixa.appendChild(h);
      caixa.appendChild(p);
      document.body.appendChild(caixa);
    });
  }
})();
