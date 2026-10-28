# Botão "Atualizar" na Carteira

## O que muda
- No topo da Carteira, ao lado do título, aparece o botão **Atualizar** (mesmo visual da tela principal, ícone girando enquanto atualiza, texto "Atualizando…").
- Ao clicar, o app busca primeiro a cotação atual de todos os ativos das suas carteiras (inclusive de outras carteiras suas), e só depois os demais ativos exibidos na tela (grupos, índices).
- Os novos preços aparecem imediatamente nas posições, lucro/prejuízo, valuation e linha do tempo, e ficam sincronizados com a tela principal.
- Se alguma cotação falhar, aparece um aviso curto abaixo do botão, sem apagar os preços já exibidos.

## Detalhes técnicos
- `src/routes/_authenticated/carteira.tsx`: reutilizar o `quotes` de `useLiveQuotes(tickers)` já existente e chamar `quotes.refresh(priorityTickers)`, com `priorityTickers` = tickers dos lotes de todas as carteiras do usuário (já carregadas na página), ativos primeiro.
- Estado `refreshing`/`refreshError` igual ao da Home; botão desabilitado durante a atualização, `aria-busy`.
- Mesma fila em lotes e cache compartilhado por ticker já usados pela Home — sem mudanças no backend.
