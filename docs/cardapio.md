# Cardápio: banco de pratos e montagem da semana

Substitui a planilha `Cardápio Novo.xlsm` usada antes do sistema (abas Meals, Cardapio_Semanal e Registro, com as macros `GerarCardapio` e `RegistrarCardapio`). A aba "LISTA DE MERCADO SEMANAL" daquela planilha ficou fora do escopo.

Tudo é feito na administração (página `admin.html` do link de administração, ou *Quentinhas → Administração* na planilha), sem importar arquivos.

## Banco de pratos (aba "Pratos" do diálogo)

Dois tipos, alternados no topo da lista:

- **Principais** — nome, categoria (Carne, Frango, Peixe, Porco, Linguiça, Fígado, Outro), "só sexta" e **acompanhamentos de costume** (já vêm marcados quando o principal é escolhido num dia).
- **Acompanhamentos** — só o nome (Batata Frita, Salada de alface e tomate…).
- **Itens de todo dia** — Arroz, Feijão e Farofa (aba `Configuracoes`, chave `ITENS_FIXOS`). Entram automaticamente em toda marmita. Cada principal pode dispensar alguns em "Vem com" — os estrogonofes vêm só com arroz. Se um acompanhamento tiver o mesmo nome de um item de todo dia (ex.: Farofa), ele aparece uma vez só.

**Colar do Excel**: copiar as colunas Prato · Tag · Categoria da aba Meals e colar.

- O trecho antes da primeira `/` é o principal; os demais são acompanhamentos de costume.
  `Carré/Pure de batata/ Farofa` → principal `Carré` com `Pure de batata` e `Farofa`.
- `c/` não separa: `Picadinho de Carne c/ Aipim` é um principal só.
- Tag `Sexta` → só sexta. Categoria vazia ou desconhecida → `OUTRO`.
- Acompanhamentos com o mesmo nome (ignorando maiúsculas/acentos) viram um só.
- Principal repetido (ex.: `Frango Grelhado` aparece com duas saladas) → fica a primeira combinação; a linha repetida é listada como ignorada.

## Montagem da semana (aba "Cardápio da semana")

1. A tela abre no próximo ciclo (terça a segunda). As setas navegam entre ciclos; com alterações não salvas, a tela pergunta antes de trocar de semana. O topo mostra quantos dias já estão definidos.
2. Para cada dia: escolher o **principal** num campo com busca (digite parte do nome; os acompanhamentos de costume entram automaticamente), tirar (×) ou acrescentar acompanhamentos, ou marcar **Sem almoço** (com motivo, ex.: "Feriado"; "Voltar a ter almoço" restaura o prato anterior).
   - Na lista, cada principal mostra "já na quarta" (repetiria na semana) ou "saiu há 2 semanas" (últimos 6 ciclos).
   - Se o prato não existir, "Cadastrar" leva à aba Pratos com o nome preenchido.
   - **Sugerir outro** troca só aquele dia, com as mesmas regras abaixo e sem repetir o principal atual. **Desfazer sugestão** volta os dias sugeridos ao que eram.
   - Avisos e erros aparecem embaixo do próprio dia. Na semana publicada, o dia cuja combinação mudou avisa que os pedidos vão para revisão ao salvar.
3. **Sugerir dias vazios** reproduz a macro `GerarCardapio` para o principal:
   - sexta usa principais "só sexta" (se não houver, usa os demais); os outros dias usam os que não são só de sexta;
   - não repete principal na semana;
   - evita frango em dias seguidos (inclusive sexta → segunda);
   - prefere principais que não saíram nos 2 ciclos anteriores (melhoria em relação à macro);
   - completa com os acompanhamentos de costume;
   - mantém dias já escolhidos, combinações ajustadas à mão e dias sem almoço.
4. **Salvar rascunho** grava sem mostrar aos funcionários. **Publicar** exige os 5 dias definidos.
   - **Respostas até** (opcional): data e hora limite para cada pessoa responder os dias da semana. Depois dela, quem não respondeu um dia não pede mais; quem já respondeu ainda ajusta até o prazo de cada dia (Configurações → Prazo de cada dia, padrão 9h30 do próprio dia). O funcionário vê "Responda os dias desta semana até …" no topo da semana.
5. Avisos (não bloqueiam): principal repetido, frango em dias seguidos, prato de sexta em outro dia, dia sem acompanhamento.

O histórico (antiga aba Registro) passa a ser as próprias abas `Semanas` e `Cardapio`. O histórico anterior ao sistema não foi importado: a aba Registro não tem as datas de cada linha.

## No pedido

O funcionário recebe a combinação do dia e pode desmarcar qualquer item (principal ou acompanhamento). A cozinha vê `SEM <item>` por pessoa.

## Alterações após publicar

- Mudar a combinação de um dia marca os pedidos confirmados daquele dia como **revisão pendente** e registra em `Auditoria`.
- Mudar só a observação não afeta pedidos.
- **Despublicar** (rodapé da semana publicada) volta a semana para rascunho e a tira da tela dos funcionários. Só funciona enquanto ninguém respondeu (nenhum pedido, nem "não quero"); depois disso, o caminho é alterar e salvar.
- Editar o banco não altera semanas já publicadas até a semana ser salva de novo. Ao salvar, os itens são recalculados; só acrescentar itens (ex.: os de todo dia) não marca pedidos para revisão.
