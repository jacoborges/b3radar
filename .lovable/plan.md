## Objetivo

Quando o usuário expande um ativo, buscar automaticamente os dados fundamentalistas mais recentes daquele ticker específico (em vez de depender apenas do snapshot global do Fundamentus, que roda com cache de 1h) e mesclá-los no modal — sem alterar a lista principal.

## Fonte

Usar a página de detalhe do próprio Fundamentus: `https://www.fundamentus.com.br/detalhes.php?papel=<TICKER>`. Ela devolve, por ticker, os mesmos campos que já usamos (cotação, P/L, P/VP, DY, ROE, ROIC, margens, Dív.Bruta/Patrim., Liq.Corrente, CAGR lucros 5a, valor de mercado, liquidez média diária, patrimônio líquido). Mantém a política já acordada de "sempre Fundamentus".

Fallback: se o parse falhar ou a rede cair, mantemos o `baseStock` (snapshot) como está hoje — nada quebra.

## Mudanças

1. **Nova server function** `getTickerFundamentus` em `src/lib/stocks.functions.ts` (mesmo arquivo do scraper da lista, para reaproveitar helpers `parseBr` / `fetch` com timeout + `iso-8859-1`).
   - Input: `{ ticker: string }` validado com Zod.
   - Faz `fetch` de `detalhes.php?papel=<TICKER>`, extrai as células das tabelas de "Oscilações / Indicadores fundamentalistas / Balanço patrimonial / Dados demonstrativos".
   - Retorna um `Partial<RawStockRow>` só com os campos numéricos atualizáveis + `updatedAt` + `error`.
   - `cache-control: public, s-maxage=900, stale-while-revalidate=3600` (15 min fresco, 1h SWR) — mais agressivo que a lista global, já que é 1 request por ticker sob demanda.

2. **Novo hook** `useTickerFundamentals(ticker)` em `src/hooks/use-ticker-fundamentals.ts`.
   - `useQuery` com `queryKey: ["fundamentus-ticker", ticker]`, `enabled: !!ticker`, `staleTime: 15 min`, `gcTime: 1h`, `refetchOnWindowFocus: false`.
   - Chama a server function via `useServerFn`.

3. **`src/components/StockDetailModal.tsx`**
   - Chamar `useTickerFundamentals(ticker)` junto com o `useTickerData` atual.
   - No `useMemo` do `mergedStock`, quando `data.row` chegar, sobrescrever apenas os campos numéricos vindos do Fundamentus (`preco`, `pl`, `pvp`, `dy`, `roe`, `roic`, `margemLiquida`, `margemEbit`, `divBrutaPatrimonio`, `liquidezCorrente`, `cagrLucros5a`, `valorMercado`, `liquidezDiaria`). Ticker/nome/setor/tipo continuam do snapshot.
   - Atualizar o `sourceLabel` (e o `title` do badge) para refletir o novo estado:
     - carregando → "Atualizando fundamentos…"
     - ok → "Fundamentos: Fundamentus (ao vivo, HH:MM) · Proventos: B3"
     - erro/fallback → texto atual de "offline".
   - Manter o `↻` já existente também para `isFetching` desse hook novo.

## Fora de escopo

- Não altera a listagem principal nem os filtros — eles continuam usando o snapshot global (para não disparar ~1000 requests). Só o modal é "ao vivo por ticker".
- Não mexe em proventos, TradingView, consenso, IA, layout.

## Comportamento esperado

- Abrir um ticker dispara 1 request extra para o Fundamentus daquele papel; o modal já pinta com o snapshot e, em ~1s, atualiza silenciosamente os cards de Preço / Valor de Mercado / Liq. Diária e a grade de Indicadores Fundamentais com os números mais recentes. Reabrir o mesmo ticker dentro de 15 min usa cache.
