## Objetivo

Expor no painel de **Filtros** todos os parâmetros fundamentalistas disponíveis no dataset. Hoje o filtro cobre 11 indicadores + 3 qualitativos; faltam alguns que já existem em `INDICATORS`/`Stock` mas não estão selecionáveis.

## O que falta hoje

Já filtráveis (11): P/L, P/VP, DY, ROE, ROIC, Marg. Líq., Marg. EBIT, Dív/PL, Liq. Corrente, CAGR Lucros 5a, Free Float.

Ausentes do filtro mas presentes nos dados:
- **Valor de Mercado** (`valorMercado`, R$ bi)
- **Liquidez Diária** (`liquidezDiaria`, R$ mi)
- **Preço** (`preco`, R$) — útil para filtrar faixas de ticker "barato/caro"
- **Variação no dia / 7d / 30d** (`variacaoDia`, `varD7`, `varD30`, em %)
- **Preço bateu Selic** (`anosPrecoAcimaSelic`, 0–5) — paralelo ao filtro de yield vs Selic que já existe

## Mudanças

### 1. `src/lib/indicators.ts`
- Adicionar entradas em `INDICATORS` para: `variacaoDia`, `varD7`, `varD30` (com textos fundamentalista/técnica).
- Estender `FUNDAMENTAL_KEYS` incluindo, nesta ordem lógica:
  `preco, valorMercado, liquidezDiaria, pl, pvp, dy, roe, roic, margemLiquida, margemEbit, divBrutaPatrimonio, liquidezCorrente, cagrLucros5a, freeFloat, variacaoDia, varD7, varD30`.

### 2. `src/routes/index.tsx` (`FilterSheet`)
- Adicionar `bounds` para as novas chaves:
  - `preco`: [0, 500, 1]
  - `valorMercado`: [0, 800, 5]  (bi)
  - `liquidezDiaria`: [0, 500, 5] (mi)
  - `variacaoDia`, `varD7`, `varD30`: [-30, 30, 0.5]
- Adicionar novo filtro qualitativo no bloco superior, ao lado de "Dividendo > Selic":
  - **"Preço bateu Selic"** — slider 0–5 controlando novo estado `minAnosPrecoAcimaSelic`.
- Estado + propagação: novos `useState`, prop em `FilterSheet`, inclusão em `activeFilters`/`extraActiveCount`, aplicação no `.filter()` (`s.anosPrecoAcimaSelic >= minAnosPrecoAcimaSelic`), e reset no botão "Limpar".

### 3. Sem mudanças em dados
Nenhuma alteração em `stocks-data.ts` — todos os campos já existem no `Stock`.

## Detalhes técnicos

- Como o filtro genérico usa `s[k as keyof Stock] as number`, incluir os novos campos em `FUNDAMENTAL_KEYS` já os aplica automaticamente no filtro numérico.
- Formatação dos chips ativos continua vindo de `INDICATORS[k].format`, então cada novo indicador precisa de `format` coerente (%, R$, bi, mi).
- Sem mudanças na tabela, no modal ou no gráfico — escopo estritamente do painel de filtros.

## Fora de escopo

- Não adicionar colunas novas à tabela.
- Não mexer em ordenação (`SortKey`) — segue igual.
- Não alterar dados de origem nem o modal de detalhes.
