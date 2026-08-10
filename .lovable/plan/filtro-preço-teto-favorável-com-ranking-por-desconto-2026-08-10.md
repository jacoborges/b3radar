# Filtro "Preço teto favorável" com ranking por desconto

## O que muda

Um novo filtro no painel de Filtros: **Preço teto favorável (ação descontada)**, disponível tanto na tela principal quanto na Inteligência de Proventos.

- Liga/desliga: mostra apenas ações cujo preço atual está **abaixo** do preço teto (Bazin), calculado com os proventos reais da B3 já usados hoje no painel "Preço Teto" e com o divisor configurado em Ajustes.
- Um controle opcional de **desconto mínimo (%)** — ex.: mostrar só quem está pelo menos 20% abaixo do teto.
- Quando esse filtro está ativo, cada ativo passa a exibir uma etiqueta com o desconto (ex.: "-27% do teto").

## Ranking

Quando o filtro de preço teto está ativo **e é o único filtro ativo**, a ordenação passa automaticamente para **desconto decrescente**: da mais descontada para a menos descontada. Havendo outros filtros ativos, a ordenação escolhida pelo usuário é respeitada; ainda assim fica disponível a opção "Desconto do teto" no seletor de ordenação, para uso manual a qualquer momento.

Ativos sem dados de proventos suficientes na B3 (teto não calculável) simplesmente não aparecem enquanto o filtro estiver ligado.

## Detalhes técnicos

- Novo helper `src/lib/preco-teto.ts` (puro, sem servidor) com `calcPrecoTeto(historico, divisor)`: soma dividendos + JCP dos cinco anos fechados (ano−5..ano−1), divide por 5 e pelo divisor — mesma fórmula já usada em `PrecoTetoPanel.tsx`, que passa a importar esse helper para evitar duplicação. Retorna `{ teto, descontoPct }`, com `descontoPct = (teto − preço) / preço × 100`.
- Fonte de dados em lista: o cache persistente de proventos já lido por `useDividendBatch` (`historicoCompleto`), agregado por ano em dividendos/JCP. Em `src/routes/_authenticated/index.tsx` o hook passa a ser usado apenas quando o filtro está ligado, para não pesar o carregamento inicial; a página `/dividendos` já o carrega.
- Divisor: `useBazinDivisor()` (mesmo valor de Ajustes).
- `src/lib/stock-filters.ts`: acrescentar `precoTetoOnly: boolean` e `minDescontoTeto: number` a `QualitativeFilters`, com o teste aplicado sobre o desconto calculado (recebido por parâmetro, já que depende de dados assíncronos).
- `src/components/StockFilterSheet.tsx`: novo bloco no grupo qualitativo com um switch e um slider de desconto mínimo (0–80%), incluído na contagem de filtros ativos e no "Limpar todos os filtros", com `InfoTip` explicando o método Bazin.
- Ordenação: em `index.tsx` adicionar a chave `descontoTeto` ao `SortKey` e aplicar ordenação automática quando o filtro de teto for o único ativo; em `/dividendos`, o mesmo critério tem prioridade sobre a ordenação por score nessa condição.
- Sem mudanças de backend, banco ou coleta de dados.
