## Objetivo

Adicionar, logo após o gráfico "Yield da ação vs Selic", um novo gráfico que compara, para cada um dos últimos 5 anos, a **valorização do preço do ativo** (preço em 01/jan vs 31/dez do mesmo ano) contra a **Selic média ponderada** daquele ano, indicando se o ativo bateu ou perdeu para a Selic.

## Escopo

Apenas frontend/apresentação — dados gerados deterministicamente no mesmo padrão dos dividendos existentes (não há API de histórico anual conectada).

## Alterações

### 1. `src/lib/stocks-data.ts`
- Estender `SELIC` para incluir 2026 (ano atual, ~14,75%).
- Mudar `YEARS` para os últimos 5 anos relativos ao ano atual (2022–2026).
- Adicionar novo tipo:
  ```ts
  export interface PrecoAnual {
    year: number;
    precoInicio: number;   // 01/jan
    precoFim: number;      // 31/dez
    valorizacao: number;   // % ((fim/inicio)-1)*100
    selicMediaPonderada: number;
    bateuSelic: boolean;
  }
  ```
- Adicionar `precosAnuais: PrecoAnual[]` em `Stock`.
- Em `buildStock`, gerar série determinística: usar o preço atual como âncora e recuar ano a ano com fator de crescimento pseudo-aleatório (mesma `seed(ticker)`) para produzir preço inicial e final coerentes de cada ano. O ano corrente (2026) usa `precoFim = preco atual`.

### 2. `src/components/DividendChart.tsx`
- Novo componente exportado `PriceVsSelicChart({ data }: { data: PrecoAnual[] })`:
  - `ComposedChart` (mesmo padrão do `DividendVsSelicChart`).
  - Barras = valorização % do ativo, cor verde se `bateuSelic`, vermelha caso contrário.
  - Linha = Selic média ponderada.
  - `LabelList` no topo com o % da valorização.
  - Tooltip mostrando preço 01/jan, preço 31/dez, valorização % e Selic %.

### 3. `src/components/StockDetailModal.tsx`
- Após o bloco atual do `DividendVsSelicChart`, adicionar nova seção:
  - Título: "Valorização anual vs Selic" com `InfoTip` explicando a comparação.
  - Renderizar `<PriceVsSelicChart data={stock.precosAnuais} />`.
  - Resumo textual curto: "Bateu a Selic em X de 5 anos".

## Layout final do modal (ordem)

1. Gráfico TradingView
2. Cards de preço (D, D-1, D-7, D-30)
3. Indicadores fundamentalistas + semáforo
4. Dividendos empilhados
5. Yield vs Selic
6. **Valorização anual vs Selic** ← novo
7. Provisionamento de novos dividendos

## Observação

Os preços anuais são simulados de forma determinística por ticker, seguindo o mesmo padrão dos demais dados históricos do app. Caso, no futuro, uma API de histórico (ex.: brapi `historical-prices`) seja conectada, basta substituir a geração em `buildStock` mantendo a mesma interface.
