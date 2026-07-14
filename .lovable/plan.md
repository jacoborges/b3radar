# Módulo de inteligência de proventos

Objetivo: transformar a seção "Provisionamento de novos dividendos" numa camada analítica e criar uma rota dedicada `/dividendos` com ranking de qualidade e histórico completo por ticker.

## 1. Coleta de dados (B3 — mesmo proxy já usado)

Estender `src/lib/proventos.functions.ts` (renomear internamente ou dividir em `proventos-b3.server.ts` + `proventos.functions.ts`):

- `GetListedCashDividends` → dividendos e JCP (já existe).
- `GetListedSupplementCompany` / `GetListedStockDividends` → **bonificações, grupamentos, desdobramentos** (novo).
- Unificar em um único retorno `TickerProventosCompleto`:
  - `historico`: 5 anos (dividendo, JCP) — já existe.
  - `historicoCompleto`: lista bruta ordenada por data com `{ tipo: 'Dividendo'|'JCP'|'Bonificacao'|'Grupamento'|'Desdobramento', valor, ratio, dataCom, dataEx, dataPagamento, dataAprovacao }`.
  - `provisionados`: eventos futuros já anunciados (já existe, adiciona eventos societários).
- Cache 1h no Worker (mantém `stale-while-revalidate`).

Nova server fn `getProventosBatch({ tickers })` para a rota de ranking: retorna só métricas agregadas por ticker (freq, gap médio, DY 12m, score) — sem histórico bruto, para caber em uma requisição.

## 2. Modelo de previsão + score

Novo módulo `src/lib/dividend-intelligence.ts` (puro, sem IO):

**Estimativa do próximo pagamento** (função `estimateNextPayout(historicoCompleto)`):
- Detecta frequência dominante (mensal / trimestral / semestral / anual / irregular) por gap mediano entre datas COM dos últimos 24 meses.
- Próxima data COM esperada = última data COM + gap mediano.
- Faixa esperada de valor = mediana e IQR (p25–p75) dos últimos N pagamentos do mesmo tipo, corrigidos pelo crescimento CAGR simples.
- Retorna `{ proximaDataComEstimada, faixaValor: [min, esperado, max], tipoProvavel, confiabilidade }`.

**Score de confiabilidade (0–100)** — média ponderada de:
- Regularidade (desvio padrão dos gaps / gap mediano) — peso 35.
- Anos consecutivos pagando — peso 25.
- Consistência de valor (1 − coef. variação) — peso 20.
- Cobertura por lucro (payout ≤ 100%, usando `margemLiquida` como proxy) — peso 10.
- Ausência de cortes bruscos (>50% ano/ano) — peso 10.

**Classificação** (função `classifyDividendQuality(score, freq)`):
- 80+ e ≥ trimestral → "Elite"
- 65–79 → "Consistente"
- 45–64 → "Regular"
- 20–44 → "Irregular"
- <20 ou sem histórico → "Sem cobertura"

## 3. UI dentro do modal (`StockDetailModal.tsx`)

Substituir a seção atual "Provisionamento de novos dividendos" por **"Inteligência de proventos"**, dividida em três blocos empilhados:

```text
┌ Próximo pagamento (previsto) ──────────────────────┐
│ Tipo provável: Dividendo  •  Frequência: Trimestral│
│ Data COM esperada: 12/03/2026 (± 8 dias)           │
│ Faixa de valor: R$ 0,18 – R$ 0,24 (mediana 0,21)   │
│ Confiabilidade: ●●●●○ 78/100 — Consistente         │
└────────────────────────────────────────────────────┘

┌ Provisionados oficiais (já anunciados) ────────────┐
│ (tabela atual — mantém como está)                  │
└────────────────────────────────────────────────────┘

┌ Histórico completo de eventos ─────────────────────┐
│ Filtro: [Todos] [Div] [JCP] [Bonif] [Split] [Grup] │
│ Tabela paginada: Data COM · Tipo · Valor/Ratio ·   │
│ Data Ex · Pagamento                                │
└────────────────────────────────────────────────────┘
```

O bloco de previsão fica visualmente destacado (borda accent) e deixa explícito que é **estimativa estatística**, não anúncio oficial.

## 4. Nova rota `/dividendos`

`src/routes/dividendos.tsx` — ranking de qualidade de proventos:

- Header com filtros: setor, classificação (Elite / Consistente / Regular / Irregular), frequência mínima, DY mínimo.
- Tabela ordenável por: Score, DY 12m, Frequência, Anos consecutivos, Próxima data COM.
- Cada linha clicável abre o `StockDetailModal` já existente do ativo, rolando direto para a seção "Inteligência de proventos".
- Usa `getProventosBatch` com `useQuery` (staleTime 1h). Fallback progressivo: mostra os 200 ativos com maior liquidez primeiro.
- `head()` próprio: title "Ranking de proventos — B3 Radar", description específica.

Botão "Proventos" volta ao header em `src/routes/index.tsx` (mesma posição do antigo "Consenso" que foi removido).

## 5. Alertas

Fora do escopo por decisão sua. Nenhum badge, push ou e-mail nesta fase.

## Arquivos afetados

**Novos**
- `src/lib/dividend-intelligence.ts` — modelo de previsão + score + classificação (puro).
- `src/hooks/use-dividend-batch.ts` — batch para a rota de ranking.
- `src/routes/dividendos.tsx` — nova rota.
- `src/components/DividendIntelligencePanel.tsx` — bloco reutilizável do modal.

**Editados**
- `src/lib/proventos.functions.ts` — passa a buscar também bonificações/grupamentos/desdobramentos e a retornar `historicoCompleto`. Adiciona `getProventosBatch`.
- `src/lib/stocks-data.ts` — adiciona tipos `EventoSocietario`, `TickerProventosCompleto`, `DividendQuality`.
- `src/components/StockDetailModal.tsx` — troca a seção atual pelo novo `<DividendIntelligencePanel />`.
- `src/routes/index.tsx` — reintroduz botão "Proventos" no header apontando para `/dividendos`.

## Notas técnicas

- Sem novos secrets, sem Lovable Cloud (tudo derivado do que a B3 já expõe publicamente).
- Toda a inteligência (previsão + score) roda no cliente sobre o payload cacheado — sem custo extra de infra.
- A previsão é apresentada com faixa de incerteza + score para deixar claro que **não** é anúncio oficial da empresa.
- Não altero nada em fundamentos, preço, TradingView ou consenso de analistas.
