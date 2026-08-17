# Análise do mercado (IA) no cabeçalho do ativo

Adicionar, ao lado do código do ativo na aba expandida, um botão de interrogação que abre um pop-up com uma análise gerada por IA (Google Gemini) sobre modelo de negócio, perenidade, lucro e efetividade da operação, encerrando com um termômetro de recomendação (Compra / Neutro / Venda).

## Como vai funcionar

1. No cabeçalho do detalhe do ativo, ao lado do ticker, aparece um botão redondo com "?".
2. Ao clicar, abre um pop-up (diálogo) com o título "Análise do mercado — TICKER".
3. A IA é chamada na hora, com indicador "Analisando…"; a resposta é guardada em cache por 24h, então reabrir é instantâneo. Um botão "Atualizar" força nova análise.
4. Conteúdo do pop-up:
   - Termômetro visual no topo: barra com faixas Venda / Neutro / Compra, com marcador na recomendação apontada e rótulo em destaque.
   - Blocos de texto: Modelo de negócio, Perenidade, Lucro e rentabilidade, Efetividade da operação, e Resumo do consenso das casas de análise.
   - Rodapé com data/hora da análise e aviso de que é conteúdo informativo gerado por IA, não recomendação de investimento.

## Detalhes técnicos

- Nova server function `src/lib/market-analysis.functions.ts` (`analyzeMarketView`), no mesmo padrão de `macro-sensitivity.functions.ts`: validação com zod (ticker, nome, setor), cache em memória com TTL de 24h e chave por ticker, `cache-control: no-store`.
- Chamada ao Lovable AI Gateway (`https://ai.gateway.lovable.dev/v1/chat/completions`) com `google/gemini-3.5-flash`, usando `LOVABLE_API_KEY` no servidor. Tratamento explícito de 429/402 e demais erros, devolvidos como mensagem legível.
- Saída estruturada: além do markdown, o prompt pede uma linha final `RECOMENDACAO: COMPRA|NEUTRO|VENDA` que o servidor extrai e devolve em campo próprio (`recomendacao`) para alimentar o termômetro; sem essa linha, o termômetro fica em "indefinido".
- Prompt do usuário exatamente na intenção pedida: análise do mercado financeiro quanto a modelo de negócio, perenidade, lucro e efetividade da operação da empresa do ticker, mais o termômetro de recomendação segundo as principais casas de análise (fundamentalista + técnica).
- Novo componente `src/components/MarketAnalysisDialog.tsx`: botão `HelpCircle` + `Dialog` (shadcn), render do markdown com `react-markdown` (já usado no projeto) e componente de termômetro em tokens semânticos do tema (sem cores hardcoded).
- Integração em `src/components/StockDetailModal.tsx`: inserir o botão logo após o `<span>` do ticker no `DialogTitle`, passando `ticker`, `nome` e `setor`.
