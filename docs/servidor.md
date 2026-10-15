# Servidor no VPS (Coolify)

A API saiu do Apps Script, que levava de 8 a 20 s por chamada, e foi para um servidor Node no VPS, que responde em milissegundos.
As telas continuam no GitHub Pages, nos mesmos endereços: só a constante `URL_API` de [web/api.js](../web/api.js) aponta para o servidor.

```
celular ──► GitHub Pages (index.html, cozinha.html, admin.html)
              │  POST texto puro {acao, args} → /api
              ▼
           VPS · Coolify · container "quentinhas" (server/servidor.js)
              │  o MESMO código de src/*.js, carregado em server/gas.js
              ▼
           /data/quentinhas.db (SQLite) + /data/backups/ (cópia diária, 14 dias)
```

## Como o código do Apps Script roda no Node

- [server/planilha.js](../server/planilha.js) imita a parte do `SpreadsheetApp` que `src/` usa (abas, `getRange`, `getValues`/`setValues`…). As abas ficam em memória; cada linha alterada é gravada no SQLite.
- [server/gas.js](../server/gas.js) imita `PropertiesService` (tabela `propriedades`), `LockService`, `Utilities` e `Session`, e carrega todos os `src/*.js`.
- Cada requisição é **tudo ou nada**: se a ação der erro, o que ela alterou é desfeito e nada vai para o banco. As requisições rodam uma por vez, o que dispensa o lock.
- Ao subir, o servidor cria as abas, colunas, configurações e tokens que faltarem (o antigo "Atualizar a planilha").
- A administração é só pelo link com token (`admin.html?k=…`); não há mais login por conta Google.
- Administração → Configurações → **Baixar tudo em Excel** exporta todas as abas (`adminExportarExcel`, só no servidor).

As regras continuam em `src/`, cobertas pelos testes de sempre. O arquivo `tests/servidor.test.js` testa a imitação, a API HTTP, a importação e o Excel.

## Rodar localmente

```bash
node server/servidor.js          # porta 3000, banco em ./dados/quentinhas.db
npm test
```

## Configuração no Coolify

1. **Projects → (projeto) → + New → Public/Private Repository** → `abacontroladoria-dev/quentinhas`, branch `main`.
2. **Build Pack: Dockerfile** (o [Dockerfile](../Dockerfile) está na raiz). **Ports Exposes: 3000**.
3. **Domains**: use o gerado pelo Coolify (`http://….sslip.io`) trocando `http` por **`https`**, ou um subdomínio próprio com registro DNS A para o IP do VPS. Precisa ser HTTPS: o GitHub Pages é HTTPS e o navegador bloqueia chamadas para HTTP.
4. **Persistent Storage → + Add → Volume Mount**: destino **`/data`**. Sem isso, os dados somem a cada deploy.
5. **Environment Variables** (opcionais):
   - `IMPORTAR_TOKEN`: um texto longo e aleatório, só durante a migração. Apague depois.
   - `ORIGENS`: sites que podem chamar a API (padrão `https://abacontroladoria-dev.github.io`).
6. **Healthcheck**: caminho `/saude`, porta 3000 (o Dockerfile já declara).
7. Deploy. Teste: `https://<domínio>/saude` → `{"ok":true}`.

### Ambiente atual

- Domínio: `https://bzqiu5mhr363hinibuaujsk5.143.95.211.211.sslip.io` (gerado pelo Coolify; VPS `143.95.211.211`).
- O certificado do Let's Encrypt é renovado a cada 90 dias e, no `sslip.io`, a renovação pode falhar por limite de emissões. Se o site passar a dar erro de conexão por certificado, crie um subdomínio gratuito (ex.: DuckDNS) apontando para o IP do VPS, troque o domínio no Coolify e o `URL_API` em [web/api.js](../web/api.js).
- Migração feita em 15/10/2026, sem semanas, cardápios, pedidos e lista de compras da semana (recomeçaram do zero no servidor).

## Migração da planilha (uma vez)

1. Escolha um horário sem pedidos. O que for feito na planilha depois do download não vai para o servidor.
2. Na planilha: **Arquivo → Fazer download → Microsoft Excel (.xlsx)**.
3. Confira o arquivo (não envia nada):
   ```bash
   node scripts/migrar.js Quentinhas.xlsx "<link de administração atual>"
   ```
4. Envie:
   ```bash
   node scripts/migrar.js Quentinhas.xlsx "<link de administração atual>" https://<domínio> <IMPORTAR_TOKEN>
   ```
   Os tokens da cozinha e da administração são copiados do Apps Script, então os links atuais continuam valendo.
5. Troque `URL_API` em [web/api.js](../web/api.js) para `https://<domínio>/api`, faça commit e push na `main`. O Actions publica o site.
6. Apague `IMPORTAR_TOKEN` no Coolify e faça redeploy.
7. A planilha fica só como histórico. Para voltar ao Apps Script, basta restaurar o `URL_API` antigo (os dados novos ficam só no servidor).

## Backups

Uma cópia por dia em `/data/backups/quentinhas-AAAA-MM-DD.db`, mantendo as 14 mais recentes, no mesmo volume.
Para ter uma cópia fora do VPS, configure o backup de volumes do Coolify ou use o botão "Baixar tudo em Excel".
