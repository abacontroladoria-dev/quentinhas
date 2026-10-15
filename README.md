# Quentinhas — Gestão de pedidos semanais

Substitui as enquetes do WhatsApp para pedidos de marmitas. Telas no GitHub Pages; dados e API num servidor Node + SQLite no VPS (Coolify), rodando as mesmas regras de `src/` escritas para o Apps Script.

| Perfil | Onde usa | Como se identifica |
|---|---|---|
| Funcionário | https://abacontroladoria-dev.github.io/quentinhas/ no celular | Escolhe o próprio nome (sem senha) |
| Cozinha | `…/quentinhas/cozinha.html?k=<token>` no celular/tablet | Token da cozinha no link (somente leitura) |
| Administrador | `…/quentinhas/admin.html?k=<token>` (qualquer navegador) | Token no link (sem login) |

> Status: em produção desde 15/10/2026; no servidor do VPS desde a mesma data (antes, Apps Script + planilha). Os links estão em Administração → Configurações.

## Arquitetura

```
celular ──► GitHub Pages (index.html, cozinha.html, admin.html)   montado de src/*.html por scripts/montar-site.js
              │  fetch POST texto puro {acao, args}, sem cookies
              ▼
           VPS · Coolify  https://bzqiu5mhr363hinibuaujsk5.143.95.211.211.sslip.io/api   (server/servidor.js)
              │  o mesmo código de src/*.js (src/Api.js → apiInicio, apiSalvarPedidos, apiCozinha, apiAdmin…)
              ▼
           /data/quentinhas.db (SQLite) + backups diários
```

Detalhes, configuração no Coolify e migração: [docs/servidor.md](docs/servidor.md).

As telas saíram do Apps Script porque, servidas por ele, não abrem em navegadores com mais de uma conta Google logada. Depois a API também saiu, porque o Apps Script levava de 8 a 20 s por chamada. A planilha "Quentinhas" e o `/exec` do Apps Script ficaram como histórico: não recebem mais dados.

## Documentação

- [docs/modelo-dados.md](docs/modelo-dados.md) — abas, colunas, IDs e regras de integridade.
- [docs/cardapio.md](docs/cardapio.md) — banco de pratos, montagem da semana (terça a segunda), sugestão automática e publicação.
- [docs/compras.md](docs/compras.md) — lista de compras semanal (antiga aba LISTA DE MERCADO SEMANAL).
- [docs/seguranca.md](docs/seguranca.md) — autorização, implantação, permissões OAuth e limitações.
- [docs/servidor.md](docs/servidor.md) — servidor no VPS (Coolify) que substitui o Apps Script, e a migração da planilha.

## Estrutura

```
quentinhas/
├── README.md
├── package.json          # scripts locais (clasp, testes)
├── docs/                 # documentação técnica
├── tests/                # testes locais (Node) da lógica pura
├── Dockerfile            # imagem do servidor (Coolify)
├── server/               # servidor Node: HTTP, imitação do SpreadsheetApp/PropertiesService sobre SQLite, Excel
├── scripts/montar-site.js # monta _site/ (GitHub Pages) a partir de src/*.html + web/
├── scripts/migrar.js     # migração única da planilha (.xlsx) para o servidor
├── web/                  # arquivos só do site: api.js (URL_API e fetch), admin-run.js (google.script.run da página de administração), icone.svg
├── .github/workflows/pages.yml # testes + montagem + publicação no Pages a cada push na main
└── src/                  # regras e telas (escritas para o Apps Script; o servidor carrega os mesmos arquivos)
    ├── appsscript.json   # manifesto: fuso, escopos, web app
    ├── Code.js           # doGet, roteamento, menu da planilha
    ├── Api.js            # doPost: API JSON usada pelo site
    ├── Transporte.html   # google.script.run (telas servidas pelo próprio Apps Script)
    ├── Tema.html         # tema das telas de pedido e cozinha
    ├── Database.js       # leitura/gravação em lote no Sheets, criação das abas
    ├── Datas.js          # datas yyyy-MM-dd e ciclo terça → segunda
    ├── Funcionarios.js   # cadastro de funcionários
    ├── Pratos.js         # banco: principais (categoria, só sexta, acompanhamentos de costume) e acompanhamentos
    ├── Cardapio.js       # semana: sugestão, validação, publicação, alterações controladas
    ├── Compras.js        # lista de compras semanal: itens por seção, sugestão a partir do cardápio
    ├── Pedidos.js        # registro/edição com LockService
    ├── Cozinha.js        # totalizadores e exceções
    ├── Seguranca.js      # autorização (funcionário ativo, token, admin)
    ├── Auditoria.js
    ├── Index.html        # casca do web app
    ├── Pedido.html       # tela do funcionário (mobile-first)
    ├── PainelCozinha.html # painel da cozinha (nome não pode coincidir com Cozinha.js)
    ├── Admin.html        # diálogo de administração (aberto pela planilha)
    ├── Styles.html
    └── JavaScript.html
```

Arquivos `.js` em `src/` aparecem como `.gs` no editor do Apps Script (o clasp converte). Usar `.js` localmente permite carregar a lógica pura em testes Node.

**Convenção obrigatória:** toda função global cujo nome **não** termina com `_` pode ser chamada pelo navegador via `google.script.run`. Por isso, só as funções de API pública ficam sem `_`, e cada uma valida autorização no servidor. Todo o resto termina com `_`.

## Pré-requisitos

| Ferramenta | Situação nesta máquina | Ação |
|---|---|---|
| Node.js ≥ 20 | v24.15.0 ✔ | — |
| npm | 11.16.0 ✔ | — |
| clasp (`@google/clasp` 3.x) | 3.4.1 ✔ (local) | `npm install` nesta pasta; use `npx clasp` |
| Git | instalado ✔ | opcional, recomendado para versionar |
| API do Apps Script | ativada ✔ | https://script.google.com/home/usersettings (necessário para o clasp) |
| Conta Google proprietária | conta da controladoria (dona da planilha) | o web app executa como ela |

Python **não** é necessário.

## Instalação (Etapa 2 em diante)

> Os passos abaixo criam recursos reais no Google. Só serão executados com autorização explícita.

```powershell
cd C:\Users\UNIVERSO\projetos\quentinhas
npm install                  # instala o clasp localmente
npx clasp login              # abre o navegador para autorizar a conta Google
npx clasp create --type sheets --title "Quentinhas" --rootDir src
npx clasp push
```

`clasp create --type sheets` cria uma planilha nova com o script vinculado e gera o `.clasp.json` (contém o `scriptId`; não é segredo, mas é específico do ambiente).

> **Atenção:** o `clasp create` sobrescreve `src/appsscript.json` com o manifesto padrão do Google (fuso de Nova York, sem escopos). Restaure a versão do projeto antes do `push`.
>
> No Apps Script, `.js` e `.html` com o mesmo nome-base colidem (ex.: `Cozinha.js` × `Cozinha.html`). Por isso a view da cozinha se chama `PainelCozinha.html`.

Ambiente atual (criado em 14/10/2026):

- Planilha: "Quentinhas", no Drive da conta proprietária (o ID está em `.clasp.json`, campo `parentId`).
- Script: `npx clasp open-script` abre o editor.

Depois, na planilha: menu **Quentinhas → Configuração inicial** cria as abas e gera o token da cozinha (Etapa 2).

## Implantação do web app (Etapa 6)

- Executar como: **Eu (proprietário)**.
- Quem tem acesso: **Qualquer pessoa** (funcionários não precisam de conta Google).
- Toda autorização é feita no servidor (ver [docs/seguranca.md](docs/seguranca.md)).

Implantação do Apps Script (criada em 14/10/2026), hoje só histórico, com os dados da planilha até a migração:

- `/exec`: https://script.google.com/macros/s/AKfycbx_JKo5ajDM8Mg4Rht-BgtmF3nDamP8cpYvplji8Wtcxm3vXoxXyRx3VXvT8nuFvyQ8_w/exec (para voltar a ele, ver comentário em `web/api.js`)

Site: repositório `abacontroladoria-dev/quentinhas`, publicado pelo GitHub Actions em https://abacontroladoria-dev.github.io/quentinhas/ (endereço fixo em `URL_SITE_`, `src/Cozinha.js`).

**Publicar uma alteração**:

```powershell
npm test
git add -A; git commit -m "o que mudou"; git push   # o Actions testa, monta e publica o site
```

Depois do push, no Coolify: **Redeploy** do app Quentinhas, para o servidor pegar as mudanças em `src/*.js` e `server/`. Mudança só em telas (`src/*.html`, `web/`) precisa só do push.

Prévia local do site: `node scripts/montar-site.js` gera `_site/` (as chamadas vão para a API de produção).

## Testes locais

```powershell
npm test
```

Executa os testes em `tests/*.test.js` sobre a lógica pura (datas do ciclo, banco de pratos, sugestão e validação da semana, funcionários). Integrações com Sheets/Lock só podem ser testadas no Apps Script.

## Operação

A ser preenchido nas etapas seguintes (rotina semanal do admin, rotação do token da cozinha, consulta de semanas anteriores).
