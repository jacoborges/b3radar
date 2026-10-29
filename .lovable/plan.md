# Preço justo no P/VP e linha do tempo de proventos no ativo expandido

## O que muda para você
1. **Cartão P/VP (ativo expandido, em "Indicadores Fundamentais")**: abaixo do valor do P/VP aparece uma linha "Preço justo (P/VP = 1): R$ X,XX" com a variação em relação à cotação atual.
   - Verde quando a ação está descontada (P/VP abaixo de 1 → preço justo acima da cotação).
   - Vermelho quando está cara (P/VP acima de 1 → preço justo abaixo da cotação).
   - Sem P/VP válido (zero, negativo ou ausente): mostra "—".
2. **Linha do tempo de proventos**: no topo do ativo expandido, logo abaixo do nome/ticker, aparece a mesma linha de 12 meses da Inteligência de Proventos — mesmas cores (verde aceso = ano atual, verde pulsante = recorrente, cinza = só ano anterior, apagado = sem pagamento) e mesmas dicas ao passar o mouse.

## Detalhes técnicos
- `StockDetailModal.tsx`: no `FUNDAMENTAL_KEYS.map`, quando `k === "pvp"`, renderizar abaixo do valor o resultado de `fairPriceAtPvp1(stock.preco, stock.pvp)` reaproveitando `pvpFairCell` (cor `text-success` / `text-destructive` e percentual), com `InfoTip` usando `PVP_FAIR_TIP`. Fórmula única: cotação ÷ P/VP (já testada em `pvp-fair.test.ts`).
- Linha do tempo: reutilizar `PayoutMonthsTimeline` com os eventos `historicoCompleto` do mesmo cache de proventos B3 usado pela Inteligência de Proventos (`useDividendBatch` para o ticker único), para que os dois lugares mostrem exatamente o mesmo resultado. Sem dados: linha apagada com aviso discreto "sem histórico".
- Nenhuma mudança em cálculos financeiros, banco de dados ou cabeçalho.
- Verificação: abrir um ativo no preview e conferir o preço justo colorido e a linha do tempo comparando com a mesma ação na Inteligência de Proventos.
