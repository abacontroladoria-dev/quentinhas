# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Funcionários** (até ~30, equipe de escritório, à vontade com celular e sistemas): respondem, no celular, se querem a marmita de cada dia da semana e retiram itens que não querem. Identificam-se escolhendo o próprio nome, sem senha.
- **Cozinha** (interna, da própria empresa): consulta no celular/tablet quantas marmitas preparar por dia e as exceções por pessoa (`SEM <item>`). Somente leitura, por link com token.
- **Administração** (pessoa do administrativo, não a cozinha): mantém o banco de pratos, monta e publica o cardápio da semana, cuida da lista de compras, dos funcionários e das configurações. Acesso por link com token, em qualquer navegador.

## Product Purpose

Substituir as enquetes do WhatsApp usadas para pedir marmitas. Sucesso: ninguém precisa contar enquete nem refazer lista à mão, e a cozinha sabe o total certo de cada dia.

## Operating Context

- Ciclo semanal de **terça a segunda seguinte** (5 almoços), identificado pela data da terça.
- Rotina: a administração monta o cardápio (com sugestão automática), publica; funcionários respondem até a data limite da semana e ajustam até o prazo de cada dia (padrão 9h30 do próprio dia); a cozinha acompanha o painel, que se atualiza sozinho.
- Antes do sistema: enquetes no WhatsApp e a planilha `Cardápio Novo.xlsm` (macros `GerarCardapio`/`RegistrarCardapio`, aba de lista de mercado). O sistema reproduz e melhora essas regras.
- Telas no GitHub Pages; API Node + SQLite num VPS (Coolify). O Apps Script/planilha ficou como histórico e reserva.

## Capabilities and Constraints

- Pedido por dia: Quero / Não quero; itens da combinação podem ser desmarcados (não todos — para isso existe "Não quero").
- Cardápio: 1 principal + até 5 acompanhamentos + itens de todo dia (Arroz, Feijão, Farofa), que o principal pode dispensar. Dias "Sem almoço" com motivo.
- Regras de sugestão: sem repetir principal na semana, sem frango em dias seguidos, pratos "só sexta", preferência por pratos que não saíram nos 2 ciclos anteriores.
- Mudança de combinação após publicar marca pedidos como **revisão pendente** e vai para a auditoria; nenhum pedido muda em silêncio.
- Lista de compras semanal por seção (Açougue, Mercearia, Temperos, Limpeza, Sacolão), sugerida a partir do cardápio.
- Exportação de tudo em Excel na administração.
- Sem contas nem senhas: identidade do funcionário por escolha de nome; cozinha e administração por token no link.
- Terminologia: quentinha/marmita, principal, acompanhamento, itens de todo dia, ciclo, prazo do dia, "Respostas até", revisão pendente, Sem almoço.
- Todo o texto da interface é em português do Brasil; fuso `America/Sao_Paulo`.

## Brand Commitments

Nome do produto: **Quentinhas**. Ferramenta interna, sem marca pública.

## Evidence on Hand

- Documentação de regras em `docs/` (cardápio, compras, modelo de dados, segurança, servidor).
- Ícone: `web/icone.svg`.
- Sem depoimentos, métricas ou números de uso registrados; não inventar.

## Product Principles

1. **Mais simples que a enquete.** Responder a semana no celular precisa ser mais rápido do que votar no WhatsApp.
2. **O total da cozinha é a verdade.** Toda tela serve para que o número de marmitas e as exceções de cada dia estejam certos.
3. **Nada muda em silêncio.** Alterações depois de publicar ficam visíveis para quem pediu e registradas.
4. **Sem atrito de acesso.** Nada de login: um link e um nome bastam.
5. **Reproduzir a rotina que já existia.** As regras vêm da planilha e da prática da cozinha; melhorias não podem quebrar o costume.
