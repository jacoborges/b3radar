Problema: no modal de detalhes do ativo, o gráfico do TradingView fica muito colado às informações abaixo dele (preço, variação e indicadores fundamentais), dando a impressão de sobreposição.

Plano:
1. Abrir `src/components/StockDetailModal.tsx`.
2. Aumentar o espaçamento entre o container do iframe do TradingView e a primeira linha de cards (preço/variação/valor de mercado/liquidez). Alterar `mt-2` para `mt-6` (ou equivalente) nessa div.
3. Revisar o espaçamento entre a linha de histórico (D-1, D-7, D-30) e a seção "Indicadores Fundamentais". Se necessário, aumentar o `mt-4` para `mt-6` nessa seção para garantir respiro visual.
4. Validar no preview que o gráfico não mais parece sobrepor os dados abaixo e que a hierarquia visual ficou mais clara.

Escopo: apenas ajuste de espaçamento/margem no modal de detalhes.