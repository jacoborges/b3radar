## Objetivo
Adicionar, no modal de detalhe do ativo, um novo painel **"Sensibilidade Macroeconômica"** que consulta a Perplexity e responde de forma didática como o ativo é afetado positiva ou negativamente pela alta/queda do **dólar**, da **inflação** e da **taxa Selic**. Deve aparecer **imediatamente antes** do painel "Consenso do Mercado".

## Arquivos novos
1. `src/lib/macro-sensitivity.functions.ts`
   - Server function `analyzeMacroSensitivity` (mesmo padrão de `dividend-ai.functions.ts`).
   - Input: `{ ticker, nome?, setor? }` validado por Zod.
   - Usa `PERPLEXITY_API_KEY` (`process.env`) e chama `https://api.perplexity.ai/chat/completions` com o modelo `sonar`.
   - Prompt de sistema: analista macro em português, responder em markdown, estrutura fixa em 3 blocos (Dólar / Inflação / Selic), cada bloco com "Efeito de alta" e "Efeito de queda", linguagem didática, considerando setor e características da empresa; citar fontes com `[1]`, `[2]` etc.
   - Prompt de usuário: `"<TICKER>" "<nome curto>" impacto dólar inflação Selic setor <setor>`.
   - Cache in-memory por ticker com TTL de 24 h (mesmo padrão do módulo de dividendos).
   - Retorna `{ content, cached, updatedAt, error, citations }`.

2. `src/hooks/use-macro-sensitivity.ts`
   - Hook `useMacroSensitivity(ticker, meta)` com `useQuery` (staleTime 24 h, `enabled` só quando o painel é montado).

3. `src/components/MacroSensitivityPanel.tsx`
   - Card estilizado igual ao `DividendIntelligencePanel` (mesmo visual, header com título e subtítulo, badge "Fonte: Perplexity", botão "Atualizar").
   - Renderiza o markdown retornado (reaproveitar `ReactMarkdown` + `remark-gfm` já usados no painel de dividendos).
   - Estados: loading (skeleton), erro (mensagem amigável com botão "Tentar novamente"), vazio.
   - Lista de citações clicáveis abaixo do texto.

## Arquivos alterados
- `src/components/StockDetailModal.tsx`
  - Importar e inserir `<MacroSensitivityPanel ticker={...} nome={...} setor={...} />` **antes** do bloco atual "Consenso do Mercado".
  - Sem outras mudanças de layout.

## Detalhes técnicos
- Reaproveita o mesmo endpoint Perplexity e o mesmo tratamento de erros (429, 401 sem crédito, chave inválida, HTTP genérico) já implementado em `dividend-ai.functions.ts` para manter consistência de UX.
- O painel só faz fetch quando o modal está aberto (hook habilitado por `!!ticker`).
- Cache de 24 h evita gastar créditos a cada expansão do mesmo ticker.

## Validação
- Abrir um ativo (ex.: PETR4): novo card aparece acima de "Consenso do Mercado" com três seções (Dólar, Inflação, Selic) explicando efeitos de alta e queda.
- Reabrir o mesmo ativo no mesmo dia usa cache (badge/indicador "cache").
- Sem `PERPLEXITY_API_KEY`, mostra a mesma mensagem de conector não linkado usada no painel de dividendos.
