# Grupos na Carteira

## O que muda
- Na coluna das carteiras, logo abaixo da lista de carteiras, aparece uma nova seção **"Grupos"** com todos os grupos do usuário (bolinha de cor + nome + quantidade de ativos).
- Clicar em um grupo o seleciona (as carteiras ficam desmarcadas) e a área principal mostra a lista dos ativos do grupo no mesmo visual da carteira: ticker com marcador de grupo, preço atual, variação do dia, botão "Ver gráfico" e os indicadores escolhidos no cabeçalho, com o mesmo seletor de organização.
- Como um grupo não tem compras, não aparecem quantidade, preço médio, resultado, linha do tempo, vendas nem proventos; aparece só a lista de acompanhamento.
- Clicar em uma carteira volta para a visão normal da carteira.
- Grupo sem ativos mostra o aviso "Nenhum ativo neste grupo — marque ativos pelo quadrado ao lado do ticker".
- Se o usuário não tiver grupos, a seção mostra um atalho para criar grupos (abre o painel de Grupos já existente).

## Detalhes técnicos
- `carteira.tsx`: novo estado de seleção `{ kind: "portfolio" | "group", id }`; reutiliza `useStockGroups`, `useLiveQuotes`, `useAllStocks`, `StockMetricsStrip`, `StockSortSelect`/comparador compartilhado, `PortfolioChartButton` e `StockGroupMarker`.
- Novo componente `GroupWatchlist.tsx` que renderiza as linhas (tabela no desktop, cartões no celular) sem cálculos de ledger.
- Tickers do grupo entram na consulta de cotações compartilhada, sem alterar cálculos da carteira.
- Sem mudanças no banco de dados.
