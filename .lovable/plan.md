# Dividendos + JCP: incluir o ano atual e os cinco anos anteriores

## O que muda para o usuário

- A janela "Dividendos + JCP" passa a mostrar **6 colunas**: ano−5, ano−4, ano−3, ano−2, ano−1 e o **ano atual** (parcial, até hoje). Hoje ela mostra ano−4 até o ano atual.
- Os valores desses anos são importados dos dados oficiais já usados pelo app (B3), com os mesmos dividendos e JCP separados por cor e valor na barra.
- O título vira "Dividendos + JCP — ano atual e últimos cinco anos", e o ano corrente aparece marcado como parcial.
- Os gráficos "Yield da ação vs. Selic" e "Valorização anual vs. Selic" acompanham a mesma janela de anos.
- Os contadores e filtros que hoje dizem "x/5 anos" continuam considerando apenas os cinco anos já fechados (ano−5 a ano−1), para não misturar um ano incompleto na comparação.

## Detalhes técnicos

- `src/lib/proventos.server.ts`:
  - `fetchSupplementYears` passa a buscar de `anoAtual+1` até `anoAtual−5`.
  - o array `anos` do histórico vira `[anoAtual−5 … anoAtual]` (6 entradas).
- `src/lib/stocks-data.ts`:
  - `SELIC` ganha o ano faltante (2021 ≈ 4,42% média ponderada) para não cair no fallback `12`.
  - `YEARS` passa a conter 6 anos (2021–2026), usado apenas como série sintética de fallback e para `precosAnuais`.
  - `computeDividendStats` calcula `anosComProventos`, `dividendosRecorrentes` e `anosYieldAcimaSelic` sobre os anos fechados (exclui o ano corrente), mantendo a base 5.
- `src/components/StockDetailModal.tsx`: ajuste do título da seção e legenda "ano corrente parcial".
- `src/components/DividendChart.tsx`: sem mudança de lógica; apenas recebe 6 pontos.
- Sem mudanças de banco de dados. O cache de proventos (6h) é renovado naturalmente; se preferir, o cache pode ser invalidado por chave nova.
