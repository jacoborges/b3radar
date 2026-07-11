# Dados reais: proventos via B3 + fundamentalistas via brapi (sob demanda no modal)

Como você pediu decisão minha: vou pela rota **híbrida pragmática**, sob demanda no modal, sem virar projeto de ETL. Justificativa: 100% CVM exige pipeline Postgres + cron + parsing de dezenas de CSVs anuais e ainda assim divergiria de Fundamentus/StatusInvest por convenções contábeis — desproporcional para dados que já existem prontos em API pública.

## Fontes por tipo de dado

| Dado | Fonte | Como |
|---|---|---|
| Proventos histórico + provisionados | **B3** endpoint público JSON `GetListedCashDividends` | server fn, cache 1h |
| P/L, P/VP, DY, ROE, valor de mercado, margens, Dív/PL, LC | **brapi.dev** `/quote/{ticker}?modules=defaultKeyStatistics,summaryProfile,financialData` | server fn, cache 1h |
| Preço atual, D-1, D-7, D-30 | **brapi.dev** (já integrado) | inalterado |
| CAGR lucros 5a, free float | mantém simulado + badge "estimado" | — |

## Arquitetura

### 1. `src/lib/proventos.functions.ts` (nova)
`getTickerProventos({ ticker })` — server fn:
- Deriva `issuingCompany` (4 letras iniciais).
- `fetch` em `https://sistemaswebb3-listados.b3.com.br/listedCompaniesProxy/CompanyCall/GetListedCashDividends/{base64}` com `{"issuingCompany","language":"pt-br"}`.
- Normaliza em `{ historico: DividendYear[], provisionados: ProventoProvisionado[] }` no mesmo formato dos tipos atuais.
- Filtra pela classe do ticker (final 3=ON, 4=PN, 11=UNIT).
- `setResponseHeader('cache-control','s-maxage=3600')`.
- Fallback silencioso em erro: `{ historico: null, provisionados: null }`.

### 2. `src/lib/fundamentals.functions.ts` (nova)
`getTickerFundamentals({ ticker })` — server fn:
- `fetch` em `https://brapi.dev/api/quote/{ticker}?modules=defaultKeyStatistics,financialData,summaryProfile` com `Authorization: Bearer ${process.env.BRAPI_TOKEN}`.
- Extrai e normaliza: `pl`, `pvp`, `dy`, `roe`, `margemLiquida`, `margemEbit`, `divBrutaPatrimonio`, `liquidezCorrente`, `valorMercado`, `liquidezDiaria`.
- Cache 1h.
- Fallback silencioso.

### 3. `src/hooks/use-ticker-data.ts` (nova)
Um único hook com dois `useQuery` (staleTime 1h, `enabled: !!ticker`):
- `proventos` chamando `getTickerProventos`
- `fundamentals` chamando `getTickerFundamentals`

### 4. `src/components/StockDetailModal.tsx`
- Chama `useTickerData(stock?.ticker)`.
- Constrói `mergedStock` = `{ ...stock, ...(fundamentals ?? {}), dividendos: proventos?.historico ?? stock.dividendos, proventosProvisionados: proventos?.provisionados ?? stock.proventosProvisionados }`.
- Toda a UI existente (indicadores, semáforo, gráficos de dividendo/yield/preço vs Selic, painel de provisionamento) passa a ler de `mergedStock`.
- Enquanto `isLoading`: skeleton nas seções afetadas.
- Badge no topo:
  - `Fonte: B3 / brapi.dev · atualizado agora` quando ambos retornaram
  - `Alguns dados estimados` quando qualquer um falhou
- Recalcular `anosYieldAcimaSelic` e `anosComProventos` a partir do `historico` real (função pura reutilizada de `stocks-data.ts`, extraída como `computeDividendStats`).

### 5. `src/lib/stocks-data.ts`
- Extrair a lógica de derivação (`anosComProventos`, `dividendosRecorrentes`, `anosYieldAcimaSelic`) para funções puras exportadas, para reuso no modal com dados reais.
- Sem outras mudanças — listagem e filtros continuam usando o dataset atual.

## Sem impacto na listagem/filtros

Como o carregamento é sob demanda, filtros da tela principal (P/L, DY, semáforo, etc.) continuam com os dados atuais de `stocks-fundamentus.json`. Apenas o modal do ativo exibe dados reais quando você o abre.

## Chave brapi

`BRAPI_TOKEN` já foi discutido em iteração anterior via `/configuracoes`. Se estiver ausente/expirado, a server function de fundamentals cai no fallback silenciosamente (usa dados simulados existentes) — nada quebra.

## Fora de escopo

- CVM ETL completo (não vale a pena para o ganho marginal em CAGR e free float).
- Substituir dados na listagem/filtros (exigiria Postgres + cron).
- Bonificações, desdobramentos, grupamentos, FRE detalhado.
