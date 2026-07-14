# TradingView técnico + consenso de analistas por ativo

## Objetivo
Remover a rota `/consenso` e mover a informação para **dentro do modal** de cada ativo, mostrando **dois semáforos lado a lado** (Analistas | Técnico TradingView) — sem fundir. Adicionar **filtro por viés** na lista principal para pesquisar ativos por rating.

## 1. Fonte de dados TradingView

Endpoint público usado pelo próprio site (mesmo do link `/technicals/`):

```
POST https://scanner.tradingview.com/brazil/scan
body: { "symbols": { "tickers": ["BMFBOVESPA:BBSE3", ...] },
        "columns": ["Recommend.All|1", "Recommend.MA|1", "Recommend.Other|1",
                    "Recommend.All|15", "Recommend.All|60",
                    "Recommend.All", "Recommend.All|1W",
                    "RSI", "Stoch.K", "CCI20", "ADX", "AO", "Mom", "MACD.macd", "MACD.signal"] }
```

- Retorna floats de -1 a +1 que mapeiam para: `≥0.5` Strong Buy, `≥0.1` Buy, `>-0.1` Neutral, `>-0.5` Sell, `≤-0.5` Strong Sell — **mesma escala que o site mostra**.
- `Recommend.MA` = resumo das médias móveis; `Recommend.Other` = resumo dos osciladores; `Recommend.All` = geral.
- Suporta batch de ~50 tickers por request. Fresco em tempo real (delay ~15s, igual ao site).

**Server function nova** `src/lib/tradingview.functions.ts`:
- `getTradingViewTechnical({ ticker })` → um ativo, todos timeframes (1m, 15m, 1h, 1D, 1W).
- `getTradingViewBatch({ tickers })` → só o timeframe **1D** de todos (para o filtro/lista).
- Cache 60s no Worker; sem crumb/cookie (endpoint aberto).

## 2. UI dentro do modal (`StockDetailModal.tsx`)

Após a seção de fundamentos, nova seção **"Consenso do mercado"** com dois cards lado a lado:

```text
┌──────────────────────┬──────────────────────┐
│ Analistas (Yahoo)    │ Técnico (TradingView)│
│ ● Compra Forte  4.6  │ Timeframe: [1D ▼]    │
│ ▓▓▓▓▓▓░░ 18 casas    │ ● Compra   +0.32     │
│ Melhorando ↑         │ Médias:  Compra      │
│                      │ Oscilad: Neutro      │
│                      │ 1m 15m 1h 1D 1W      │
│                      │ ● ● ○ ● ●            │
└──────────────────────┴──────────────────────┘
```

- Reaproveita `RATING_META`/`StackedDistribution` já existentes.
- Card TradingView tem seletor de timeframe + mini-strip mostrando o rating em cada timeframe (bolinhas coloridas) para dar visão multi-tempo.
- Ambos os cards deixam explícito na label: **"Analistas — Yahoo/Refinitiv"** e **"Técnico — TradingView (tempo real)"**.

## 3. Filtro por viés na lista principal

Em `src/routes/index.tsx` / `FilterSheet`, nova seção **"Viés de mercado"** com dois blocos de chips independentes:

- **Analistas**: `[C.Forte] [Compra] [Neutro] [Venda] [V.Forte]` (multi-select)
- **Técnico TradingView (1D)**: mesmos 5 chips

Aplica-se combinando com os filtros existentes. Como precisa do rating por ticker na lista, adiciono hook `useBiasBatch(tickers)` que:
- Roda `getConsensusBatch` (já existe) + `getTradingViewBatch` (novo).
- Query única com refresh a cada 5 min, `keepPreviousData`.
- Retorna `Map<ticker, { analyst?: rating, technical?: rating }>`.

Ativos sem cobertura ficam visíveis por padrão; o filtro só esconde se o usuário marcar chips.

## 4. Remover /consenso

- Deletar `src/routes/consenso.tsx`.
- Remover botão "Consenso" do header em `src/routes/index.tsx`.
- Manter `src/lib/consensus-rating.ts`, `consensus.functions.ts` e `use-consensus.ts` — passam a servir ao modal e ao filtro.
- `routeTree.gen.ts` regenera automaticamente no build.

## 5. Arquivos afetados

**Novos:**
- `src/lib/tradingview.functions.ts` — server functions do scanner.
- `src/lib/tradingview-rating.ts` — mapeamento float→rating + metadata (reusando as chaves de `consensus-rating.ts`).
- `src/hooks/use-tradingview.ts` — hooks single/batch.
- `src/hooks/use-bias-batch.ts` — combina analistas + técnico para a lista.

**Editados:**
- `src/components/StockDetailModal.tsx` — nova seção "Consenso do mercado" com os dois cards.
- `src/routes/index.tsx` — remove botão consenso, adiciona chips de viés no FilterSheet e aplica filtro na lista.

**Removidos:**
- `src/routes/consenso.tsx`.

## Notas técnicas

- Endpoint TradingView aceita User-Agent normal; sem auth. Já vi outros projetos OSS usando o mesmo scanner sem problemas de bloqueio em Worker.
- Se o Cloudflare Worker for bloqueado por IP em algum momento, o fallback será "Sem cobertura" (mesmo tratamento atual do Yahoo).
- Nenhum dado sensível; nenhum secret novo.
- **Não** vou tocar em fundamentos, dividendos, proventos ou preço — só na camada de consenso.
