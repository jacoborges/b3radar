## Objetivo
Ampliar a janela temporal da pesquisa Perplexity na Inteligência de Proventos para cobrir **ano anterior + ano corrente + próximos 12 meses**.

## Alterações

### `src/lib/dividend-ai.functions.ts`
- Calcular `anoAnterior = anoAtual - 1` além de `anoAtual` e `anoProximo`.
- **User prompt**: incluir os três anos, ex.: `"<TICKER>" "<Nome>" RI dividendos JCP <anoAnterior> <anoAtual>`.
- **System prompt**: atualizar a regra temporal obrigatória para aceitar proventos com Data COM, EX ou Pagamento entre `01/01/<anoAnterior>` e `31/12/<anoProximo>`. Descartar apenas eventos anteriores a `01/01/<anoAnterior>`.
- **Filtro nativo**: alterar `search_after_date_filter` para `01/01/<anoAnterior>`.
- **Cache**: manter a chave por ano corrente (`${ticker}:${anoAtual}`) — a janela desliza junto quando o ano vira.

### `src/components/DividendIntelligencePanel.tsx`
- Ajustar o rótulo/contexto do botão para refletir a nova janela (ex.: "Buscar proventos de <anoAnterior>, <anoAtual> e próximos 12 meses no RI/CVM/B3").

## Fora de escopo
Modelo Perplexity, demais fontes de dados, layout, citações e scoring permanecem inalterados.