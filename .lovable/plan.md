## Objetivo
Ao abrir o modal de detalhes de um ativo, exibir o **gráfico do TradingView já expandido no topo**, com todas as demais informações (preço, histórico D-1/D-7/D-30, indicadores fundamentais, dividendos, Yield vs Selic, provisionamento) rolando logo abaixo — sem precisar clicar no botão "Gráfico".

## Mudanças

### `src/components/StockDetailModal.tsx`
- Remover o `TradingViewModal` separado (botão "Ver gráfico") e embutir o **iframe do TradingView direto no topo do modal de detalhes**.
- Reaproveitar a mesma URL `s.tradingview.com/widgetembed` já usada hoje (símbolo `BMFBOVESPA:<ticker>`, tema dark, studies padrão).
- Altura fixa confortável (ex.: `h-[480px]` no desktop, `h-[320px]` no mobile) com `rounded-xl` e placeholder "Carregando gráfico…" até o `onLoad`.
- Abaixo do gráfico, manter na ordem atual: card de preço + variação → histórico D-1/D-7/D-30 → semáforo de endividamento → indicadores fundamentais → dividendos (barra empilhada) → Yield vs Selic → provisionamento.
- Aumentar a largura do `DialogContent` (ex.: `max-w-6xl`) e garantir `overflow-y-auto` no corpo para o gráfico não empurrar o resto.

### `src/routes/index.tsx`
- Remover o botão "Gráfico" da linha do ativo (a função agora vive dentro do próprio modal de detalhes) — clicar no ativo já abre tudo junto.
- Se preferir manter o botão como atalho, ele passa a apenas abrir o mesmo modal (sem modal separado).

### `src/components/TradingViewModal.tsx`
- Fica sem uso; pode ser removido para não deixar código morto.

## Detalhes técnicos
- O iframe do TradingView é montado com `key={ticker}` para forçar recarregar quando o usuário troca de ativo.
- Nada muda em dados, filtros, polling brapi ou provisionamento — é só reorganização visual do modal.

Confirma que quer eu **remover o botão "Gráfico"** da lista (já que o gráfico passa a abrir junto com o detalhe)?