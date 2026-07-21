## Objetivo
Fazer com que o texto/campo **"Valorização do ativo"** no gráfico de preço vs. Selic use a mesma cor de fonte do campo **"Yield da ação"** no gráfico de dividendos vs. Selic.

## Diagnóstico
- No `DividendVsSelicChart`, a série `dyAcao` (legenda "Yield da ação") possui `fill="var(--color-dividend)"` diretamente na `<Bar>`, o que faz a legenda herdar essa cor.
- No `PriceVsSelicChart`, a série `valorizacao` (legenda "Valorização do ativo") não possui `fill` na `<Bar>`; as cores são aplicadas individualmente em `<Cell>` (`success`/`danger`). Por isso a legenda não herda a cor do dividend.

## Plano de implementação
1. Em `src/components/DividendChart.tsx`, na função `PriceVsSelicChart`, adicionar `fill="var(--color-dividend)"` na `<Bar dataKey="valorizacao">`.
   - As `<Cell>` continuam sobrescrevendo a cor de cada barra conforme `bateuSelic`.
   - A legenda passa a usar `var(--color-dividend)`, alinhando-se visualmente com "Yield da ação".

## Arquivos alterados
- `src/components/DividendChart.tsx`

## Validação
- Abrir o modal de qualquer ativo e verificar que a legenda "Valorização do ativo" no gráfico de preço vs. Selic aparece na mesma cor (tom de verde/azulado) da legenda "Yield da ação" no gráfico anterior.