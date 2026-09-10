# Linha do tempo mensal na Carteira

Uma faixa com os 12 meses do ano no topo da carteira, com seletor de ano à direita. Cada mês vira uma bolinha; ao passar o mouse (ou tocar, no celular), aparece um resumo do que aconteceu naquele mês.

## O que será construído

### Faixa de meses
- Linha horizontal com Jan…Dez, cada mês representado por uma bolinha ligada por um traço.
- Seletor de ano à direita, listando os anos que têm movimento na carteira (da primeira compra até o ano atual), começando no ano corrente.
- Cor da bolinha pelo resultado do mês: verde para positivo, vermelho para negativo, neutra quando não houve nada. Tamanho um pouco maior nos meses com movimento.
- Meses futuros do ano corrente ficam apagados.

### Pop-up do mês (ao passar o mouse)
Mostra, para o mês escolhido:
- Compras: quantas operações e valor total aplicado.
- Vendas: quantas operações e valor total recebido.
- Ganho/perda nas vendas do mês (preço de venda menos preço médio até a data, mesma regra já usada na carteira).
- Proventos recebidos no mês (dividendos e JCP com pagamento no mês, contando só a quantidade em custódia na data com).
- Resultado do mês: ganho na venda + proventos, em destaque verde/vermelho.
- Quando o histórico de proventos ainda está carregando, a parcela aparece como "—" e o resultado é marcado como parcial.

### Resumo do ano
Abaixo da faixa, uma linha curta com o acumulado do ano selecionado: total investido em compras, total vendido, ganho na venda, proventos e resultado do ano.

## Detalhes técnicos

- Novo componente `src/components/PortfolioTimeline.tsx`, usado no topo da seção de detalhe em `src/routes/_authenticated/carteira.tsx`, logo acima do card de resumo.
- Entradas: `positions` (já montado na rota, com `lots` e `sales` por ticker) e os eventos de proventos por mês.
- O hook `src/hooks/use-portfolio-proventos-recebidos.ts` passa a expor também `byMonth: Map<"YYYY-MM", number>` (mesma lógica de custódia já existente, agrupando pelo mês de `dataPagamento`), mantendo `byTicker` e `total` como estão para não afetar o resumo atual.
- Agregação mensal calculada com `useMemo` na rota: compras por `boughtAt`, vendas por `soldAt`, ganho realizado por venda usando o preço médio das compras até a data da venda (mesma fórmula de `positions`).
- Pop-up com `Tooltip`/`HoverCard` do shadcn já disponível no projeto; no mobile a bolinha responde ao toque abrindo o mesmo conteúdo.
- Nenhuma alteração de banco, server function ou chamada externa nova — usa os dados já carregados e o cache `["proventos", ticker]`.
- Faixa com rolagem horizontal em telas estreitas, seguindo o padrão responsivo do app.
