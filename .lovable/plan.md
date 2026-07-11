## Objetivo

Fazer o app se adaptar automaticamente à largura da tela (do celular ~360px ao desktop wide), sem scroll horizontal indesejado, sem texto cortado e sem "espremer" tabela de 10 colunas em 384px. A ideia é **reflow real**, não só `overflow-x`.

## Diagnóstico atual

- **Header (`src/routes/index.tsx`)**: título + 2 badges + campo de busca + 2 selects + botão de filtro + botão de configurações competem por espaço; em 384px os selects/botões quebram feio.
- **Tabela de ativos** (`StockTable`): 10 colunas fixas (Ticker, Preço, Dia, 6 indicadores, Dívida). Em mobile vira barra de scroll horizontal — o usuário perde a coluna do ticker ao rolar.
- **Modal de detalhe (`StockDetailModal`)**: grids `md:grid-cols-4` e `md:grid-cols-5` só quebram a partir de 768px; entre 400–767px ficam com 2 colunas apertadas e valores truncando.
- **Chart do TradingView**: altura fixa `h-[320px]` mobile / `h-[480px]` desktop — ok, mas dá pra usar `aspect-ratio` para acompanhar melhor.
- **Tabelas de provisionamento**: 5 colunas com datas — em mobile o `overflow-x-auto` atual serve, mas dá pra melhorar.

## Estratégia

Mobile-first com breakpoints do Tailwind (`sm` 640, `md` 768, `lg` 1024, `xl` 1280). Usar `grid-cols-[minmax(0,1fr)_auto]` + `min-w-0` + `shrink-0` + `truncate` conforme o guia de responsive-layout. Em mobile, a tabela deixa de ser tabela e vira **lista de cards**; em `md+` volta a ser tabela.

## Mudanças por arquivo

### 1. `src/routes/index.tsx` — Header
- Envolver título/badges em um bloco `min-w-0` com `truncate` nos textos longos; badges com `shrink-0`.
- Barra de controles: em mobile, busca ocupa 100% em uma linha; selects + filtro + settings numa segunda linha usando `flex flex-wrap` com botões `flex-1 min-w-0`.
- Selects de largura fixa (`w-[110px]`, `w-[170px]`) viram `w-full sm:w-[110px]` etc.
- Chips de filtros ativos já usam `flex-wrap`; adicionar `max-w-full` e `truncate` no valor.

### 2. `src/routes/index.tsx` — `StockTable` (mudança principal)
Componente ganha dois modos:
- **`< md` (mobile/tablet estreito)**: renderiza uma **lista de cards** (`div` empilhado). Cada card tem:
  - Linha 1: `Ticker` (grande, mono) + `Preço` + `Variação Dia` (à direita, cor).
  - Linha 2: grid `grid-cols-3 gap-2` com os 3 indicadores mais importantes (DY, P/L, ROE) + semáforo de dívida como pill.
  - Toque no card = mesmo `onSelect(s)`.
- **`>= md`**: tabela atual, mas com colunas priorizadas e classes `hidden lg:table-cell` nos indicadores menos importantes (P/VP, LPA, Margem…), de modo que em `md` mostre 4 colunas e em `lg+` mostre as 6.
- Remove o `overflow-x-auto` no modo card; mantém no modo tabela como safety net.

### 3. `src/components/StockDetailModal.tsx`
- Grids de cards de preço: `grid-cols-2 sm:grid-cols-4` (em vez de `md:grid-cols-4`) — 2 colunas confortáveis em qualquer mobile, 4 a partir de 640px.
- Histórico D-1/D-7/D-30: `grid-cols-1 sm:grid-cols-3`.
- Indicadores fundamentais: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`.
- Provisionamento: usar `grid-cols-2 sm:grid-cols-3` nos 3 KPIs; a tabela mantém `overflow-x-auto`, mas com `text-xs sm:text-sm` para caber melhor.
- Chart do TradingView: trocar `h-[320px] md:h-[480px]` por `aspect-[4/3] sm:aspect-[16/10] max-h-[70vh]` para acompanhar a proporção da tela.
- `DialogContent`: `max-w-6xl w-[95vw] max-h-[92vh]` já é fluido; nada a mudar.

### 4. `src/components/DividendChart.tsx` (verificação)
Os charts já são `ResponsiveContainer width="100%"`. Só garantir que o wrapper pai não force largura mínima. Adicionar `min-w-0` no card contêiner se necessário.

### 5. `src/styles.css`
Nenhuma nova variável de tema. Opcional: adicionar `@utility no-scrollbar` para esconder scrollbar horizontal em containers de badges/tags quando eles ainda precisarem de scroll em telas muito estreitas (não crítico).

## O que **não** muda

- Lógica de dados, filtros, ordenação, hooks (`useAllStocks`, `useLiveQuotes`, `useTickerData`).
- Fonte dos dados (Fundamentus/B3/brapi).
- Rotas, server functions, cache.
- Cores, tipografia, tema dark — só layout/reflow.

## Validação

1. Preview em **mobile 384px** (viewport atual do usuário): verificar header sem overflow, cards de ativo legíveis, modal com 2 colunas.
2. Preview em **tablet 768px**: tabela volta com 4 colunas de indicadores.
3. Preview em **desktop 1280px**: tabela com todas as 6 colunas + grids `lg:grid-cols-5` no modal.
4. Screenshot via Playwright em 3 larguras (390 / 768 / 1440) para confirmar que nada corta.

## Risco

- Transformar tabela em cards altera a densidade em mobile — algumas colunas (P/VP, LPA) só aparecerão ao abrir o modal. É a única forma de caber em 360–400px sem scroll horizontal. Se você preferir manter a tabela sempre, posso ao invés disso reduzir font-size + esconder colunas progressivamente, mas fica menos legível.
