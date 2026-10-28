# Valor justo com P/VP = 1

## O que muda
- Logo após a coluna **P/VP**, aparece uma nova coluna **"Justo P/VP=1"** com o valor: cotação atual ÷ P/VP.
- Vale para todas as ações com P/VP positivo (descontadas abaixo de 1 e valorizadas acima de 1).
- Cor: verde quando o valor justo está acima da cotação (P/VP < 1, ação descontada), vermelho quando está abaixo (P/VP > 1). Uma pequena seta ou percentual mostra a distância até o preço atual.
- Sem P/VP válido (zero, negativo ou ausente): mostra "—".
- Aparece em todas as telas que usam o cabeçalho (Cotações, Inteligência de Proventos, Carteira, Simulador, Grupos) e também no detalhe expandido do ativo, ao lado do P/VP.
- Fica junto ao P/VP automaticamente: se o P/VP estiver no cabeçalho, o valor justo aparece logo depois, sem precisar escolher outra coluna.
- Ícone de interrogação explicando: "Preço que a ação teria se fosse negociada exatamente pelo seu valor patrimonial (P/VP = 1). Equivale ao valor patrimonial por ação (VPA)."

## Detalhes técnicos
- Função pura `fairPriceAtPvp1(preco, pvp)` em `src/lib/` com teste (ex.: preço 20, P/VP 0,8 → 25; P/VP 2 → 10; P/VP ≤ 0 → null).
- `StockMetricColumns` renderiza a célula extra imediatamente após `pvp`; larguras ajustadas para não gerar sobreposição.
- Nenhuma alteração em filtros, preferências salvas ou cálculos de carteira.
