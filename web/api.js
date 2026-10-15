// Transporte das telas no site (GitHub Pages): chama a API JSON do servidor no VPS (server/servidor.js).
// Mesma assinatura de src/Transporte.html, usada quando as telas são servidas pelo próprio Apps Script.
// POST com corpo em texto puro: requisição "simples", sem preflight de CORS e sem enviar cookies.
// Para voltar ao Apps Script: https://script.google.com/macros/s/AKfycbx_JKo5ajDM8Mg4Rht-BgtmF3nDamP8cpYvplji8Wtcxm3vXoxXyRx3VXvT8nuFvyQ8_w/exec
var URL_API = 'https://bzqiu5mhr363hinibuaujsk5.143.95.211.211.sslip.io/api';

function chamarApi(fn, args, ok, alvoErro, aoFalhar) {
  var falhar = function (msg) {
    if (alvoErro) aviso(alvoErro, 'erro', msg);
    if (aoFalhar) aoFalhar(msg);
  };
  fetch(URL_API, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ acao: fn, args: args || [] }),
    credentials: 'omit',
    redirect: 'follow'
  })
    .then(function (r) {
      if (!r.ok) throw new Error('http ' + r.status);
      return r.json();
    })
    .then(function (r) {
      if (r && r.ok) ok(r.dados);
      else falhar((r && r.erro) || 'Resposta inesperada do servidor. Tente de novo.');
    })
    .catch(function () {
      falhar('Não foi possível conectar. Verifique a internet e tente de novo.');
    });
}
