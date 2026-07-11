## Objetivo

Passar a **priorizar sempre o snapshot do Fundamentus** (`src/lib/stocks-fundamentus.json`, já embarcado em `baseStock`) para os indicadores fundamentalistas. A brapi.dev deixa de sobrescrever esses campos e vira apenas fonte para o **preço ao vivo** (cotação, variação do dia, valor de mercado e liquidez diária derivados do preço). Proventos continuam vindo da B3.

## O que muda

### 1. `src/components/StockDetailModal.tsx` — inverter prioridade do merge

No `useMemo` que constrói `mergedStock`:

- Remover as chamadas `apply(...)` que sobrescrevem com `fund.*` para: `pl`, `pvp`, `dy`, `roe`, `margemLiquida`, `margemEbit`, `divBrutaPatrimonio`, `liquidezCorrente`.
- Manter da brapi **apenas** o que é ao vivo/preço-dependente:
  - `preco` (cotação atual)
  - `valorMercado` (recalculado pela brapi porque depende do preço)
  - `liquidezDiaria` (volume × preço do dia)
- Proventos da B3 seguem sobrescrevendo `dividendos`, `anosComProventos`, `dividendosRecorrentes`, `anosYieldAcimaSelic` e `proventosProvisionados` — sem alteração.

### 2. Badge de fonte no header

Ajustar `sourceLabel` para refletir a nova hierarquia:

- Ambos OK → `"Fundamentos: Fundamentus · Proventos: B3 · Preço: brapi.dev"`
- Só proventos → `"Proventos: B3 · Fundamentos: Fundamentus"`
- Só brapi → `"Preço: brapi.dev · Fundamentos: Fundamentus"`
- Nenhum → `"Fundamentos: Fundamentus (offline)"`

### 3. Escopo mantido

- Nenhuma mudança em `src/lib/fundamentals.functions.ts`, `src/lib/proventos.functions.ts`, `src/hooks/use-ticker-data.ts` — a brapi continua sendo chamada (precisamos do preço), só ignoramos os campos fundamentalistas no cliente.
- Nenhuma mudança na listagem `src/routes/index.tsx` (já usa Fundamentus).
- Nenhuma mudança nos gráficos.

## Observação

Como a decisão é "sempre Fundamentus", não há mais divergência a mostrar por card — o dado exibido é sempre o do snapshot local. Se depois você quiser voltar a comparar as duas fontes visualmente, dá para reintroduzir o badge de divergência sem desfazer este plano.
