# Quentinhas — Gestão de pedidos semanais

Web app em Google Apps Script + Google Sheets que substitui as enquetes do WhatsApp para pedidos de marmitas.

| Perfil | Onde usa | Como se identifica |
|---|---|---|
| Funcionário | Link do web app no celular | Escolhe o próprio nome (sem senha) |
| Cozinha | Link do web app no tablet/PC | Token da cozinha no link (somente leitura) |
| Administrador | Menu "Quentinhas" dentro da planilha | Conta Google com acesso de edição + e-mail na lista de administradores |

> Status: **Etapas 1 a 6 concluídas** — web app implantado em 14/10/2026 (versão @2). Links em *Quentinhas → Links (funcionários e cozinha)*. Admin inicial: a conta proprietária da planilha.

## Documentação

- [docs/modelo-dados.md](docs/modelo-dados.md) — abas, colunas, IDs e regras de integridade.
- [docs/cardapio.md](docs/cardapio.md) — banco de pratos, montagem da semana (terça a segunda), sugestão automática e publicação.
- [docs/seguranca.md](docs/seguranca.md) — autorização, implantação, permissões OAuth e limitações.

## Estrutura

```
quentinhas/
├── README.md
├── package.json          # scripts locais (clasp, testes)
├── docs/                 # documentação técnica
├── tests/                # testes locais (Node) da lógica pura
└── src/                  # tudo que vai para o Apps Script (rootDir do clasp)
    ├── appsscript.json   # manifesto: fuso, escopos, web app
    ├── Code.js           # doGet, roteamento, menu da planilha
    ├── Database.js       # leitura/gravação em lote no Sheets, criação das abas
    ├── Datas.js          # datas yyyy-MM-dd e ciclo terça → segunda
    ├── Funcionarios.js   # cadastro de funcionários
    ├── Pratos.js         # banco: principais (categoria, só sexta, acompanhamentos de costume) e acompanhamentos
    ├── Cardapio.js       # semana: sugestão, validação, publicação, alterações controladas
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

Implantação de produção (criada em 14/10/2026):

- Funcionários: https://script.google.com/macros/s/AKfycbx_JKo5ajDM8Mg4Rht-BgtmF3nDamP8cpYvplji8Wtcxm3vXoxXyRx3VXvT8nuFvyQ8_w/exec
- Cozinha: o mesmo endereço com `?v=cozinha&k=<token>` — pegue o link completo no menu da planilha.
- Teste (só editores, sempre o código mais recente): https://script.google.com/macros/s/AKfycbysPDRa901yDiqWOW4Ej0nD7YJ0CWHlHqAbHvdIs37P/dev

**Publicar uma alteração** (o `push` sozinho só muda o link `/dev`; o link público continua na versão anterior):

```powershell
npm test
npx clasp push --force
npx clasp update-deployment AKfycbx_JKo5ajDM8Mg4Rht-BgtmF3nDamP8cpYvplji8Wtcxm3vXoxXyRx3VXvT8nuFvyQ8_w --description "o que mudou"
```

O ID da implantação não muda entre versões; ele está fixo em `URL_WEB_APP_` (`src/Cozinha.js`), porque `ScriptApp.getService().getUrl()` devolvia um endereço que não abria.

## Testes locais

```powershell
npm test
```

Executa os testes em `tests/*.test.js` sobre a lógica pura (datas do ciclo, banco de pratos, sugestão e validação da semana, funcionários). Integrações com Sheets/Lock só podem ser testadas no Apps Script.

## Operação

A ser preenchido nas etapas seguintes (rotina semanal do admin, rotação do token da cozinha, consulta de semanas anteriores).
