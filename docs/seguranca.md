# Segurança, autorização e implantação

## Modelo de implantação

- Script **vinculado à planilha** (container-bound), criado com `clasp create --type sheets`.
- Web app implantado com **Executar como: Eu** e **Acesso: Qualquer pessoa** (`ANYONE_ANONYMOUS`).
  - Funcionários não precisam de conta Google.
  - Todas as execuções usam as permissões e as cotas do proprietário.
- A planilha é compartilhada **apenas** com administradores. Quem tem acesso à planilha vê todos os dados.

## Perfis

### Funcionário — seleção do nome, sem senha

Decisão do responsável pelo projeto: funcionários **não** usam senha nem código. Eles escolhem o próprio nome na lista de funcionários ativos.

- Isso é **identificação, não autenticação**: qualquer pessoa com o link pode registrar ou alterar o pedido de qualquer funcionário ativo. Risco aceito, considerando o baixo impacto (pedido de marmita).
- O servidor ainda valida tudo: o funcionário existe e está `ATIVO`, a semana está publicada, o prazo não passou e as opções pertencem ao dia.
- A lista de nomes enviada ao navegador contém só `id` e `nome` dos ativos.
- "Lembrar meu nome neste aparelho" (localStorage), para não precisar escolher de novo. O web app roda em iframe de `googleusercontent.com`; a persistência não é garantida.
- Mitigações: cada gravação registra data/hora em `Auditoria`; a tela mostra "última alteração em …" para o funcionário perceber mudanças que não fez; o admin pode corrigir.
- Se houver abuso, dá para acrescentar um código individual depois sem mudar o restante do modelo.

### Cozinha — token no link

- Link `…/exec?v=cozinha&k=<token>`; token longo em Script Properties.
- Somente leitura. Mostra nomes e personalizações (dados de baixa sensibilidade).
- **Limitações:** quem tiver o link vê o painel; o link fica no histórico do navegador do tablet. Rotacionar o token invalida o link antigo.

### Administrador — Google + lista de e-mails

- Funções administrativas rodam num **diálogo aberto pelo menu da planilha**, executando como o próprio admin.
- Toda função administrativa verifica `Session.getActiveUser().getEmail()` contra `ADMIN_EMAILS`.
- Como funções globais também são chamáveis pelo web app, essa verificação é o que bloqueia chamadas anônimas: no web app "executar como eu", o e-mail do visitante vem vazio → acesso negado.
- **Limitação:** edições feitas diretamente nas abas pelo admin não passam pela validação nem pela auditoria. As abas de dados terão proteção com aviso.

### Administrador — página no site, token no link

Decisão do responsável pelo projeto: administrar também **sem login**, por uma página do site (`…/quentinhas/admin.html?k=<token>`), com a mesma tela do diálogo.

- O token (`ADMIN_TOKEN`, 256 bits) fica em Script Properties, gerado pela configuração inicial. O link aparece em *Quentinhas → Links* e na aba Configurações.
- A página chama uma única ação da API, `apiAdmin(token, função, argumentos)`. Ela confere o token (comparação em tempo constante) e só executa as funções de `ACOES_ADMIN_` (`src/Api.js`). Durante a chamada, `exigirAdmin_()` aceita o link e devolve `LINK_ADMIN`, que é o que fica registrado em `Auditoria` e em `publicada_por`; a liberação vale só dentro daquela execução.
- **Quem tiver o link administra tudo**: muda cardápio, publica/despublica, vê e edita funcionários e troca os links. Não é login; é um segredo compartilhável. Guardar só com quem administra.
- Se vazar: *Configurações → Administração → Trocar link* (ou pela planilha, que continua exigindo conta Google de admin). O link antigo para de funcionar na hora.
- A página tem `referrer` desligado, para o token não ir junto ao abrir links externos (ex.: o WhatsApp da lista de compras), e `noindex`.
- O link fica no histórico e nos favoritos do navegador onde foi aberto.

## Regras no servidor

- Só funções sem `_` final são expostas ao navegador; todas validam o perfil antes de qualquer leitura/gravação.
- Nenhum segredo (token da cozinha, lista de admins) é enviado ao HTML.
- Todas as entradas são validadas (tipos, tamanhos, datas, IDs pertencentes ao dia/semana).
- Gravações protegidas por `LockService.getScriptLock()`; em caso de timeout, o usuário recebe "tente novamente".
- Saída HTML com escape (templates `<?= ?>`, nunca `<?!= ?>` com dado do usuário; `textContent` no JS).

## Permissões OAuth (manifesto)

| Escopo | Motivo |
|---|---|
| `spreadsheets` | ler/gravar a planilha (inclusive pelo web app, via `openById`) |
| `script.container.ui` | menu e diálogo na planilha |
| `userinfo.email` | identificar o admin (`Session.getActiveUser`) |

O proprietário autoriza esses escopos uma vez. Admins adicionais autorizam ao usar o menu pela primeira vez. Contas Google Workspace podem ter políticas que bloqueiam web apps anônimos ou apps não verificados — confirmar com o administrador do domínio.

## Privacidade do link

- A URL `/exec` é estável. Quem tiver o link vê a lista de nomes dos funcionários ativos, o cardápio e os pedidos de qualquer funcionário (escolhendo o nome). Não compartilhe o link fora da equipe.
- O Google exibe um aviso no topo ("criado por um usuário do Google Apps Script").
- O token da cozinha aparece na URL do painel.

## Cotas (verificar valores atuais na documentação do Google)

Execuções simultâneas por usuário são limitadas; como tudo roda como o proprietário, picos de acesso somam na mesma cota. Para dezenas de funcionários não deve ser problema; será testado na Etapa 6.

## Site no GitHub Pages e API JSON

- As telas de pedido e cozinha são arquivos estáticos públicos (repositório público). Não contêm segredos: o token da cozinha só existe no link entregue à cozinha e em Script Properties.
- O site chama `doPost` (`src/Api.js`) com `fetch` em texto puro e `credentials: 'omit'`: requisição simples (sem preflight), sem cookies do Google. A resposta do Apps Script libera qualquer origem (`Access-Control-Allow-Origin: *`).
- Só cinco ações podem ser chamadas (`ACOES_API_`): `apiInicio`, `apiPedidosDoFuncionario`, `apiSalvarPedidos`, `apiCozinha` e `apiAdmin` — as mesmas regras e validações do `google.script.run`. As funções administrativas só passam por `apiAdmin`, com o token da administração.
- Corpo limitado a 60 kB (a importação de pratos aceita até 50 kB); JSON inválido ou ação desconhecida → `{"ok": false, "erro": ...}`.
- Páginas com `noindex, nofollow` para ficarem fora de buscadores. Ainda assim, quem tiver o link do site vê a lista de nomes e o cardápio (o mesmo risco aceito do link `/exec`).
