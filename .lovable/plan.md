## Objetivo
Refinar a busca do Perplexity AI no painel de Inteligência de Proventos para focar no ticker e restringir os resultados à janela **ano corrente + próximos 12 meses**.

## Alterações

### 1. `src/lib/dividend-ai.functions.ts`
- **Query (user prompt)**: montar como `"<TICKER>" "<Nome da Empresa>" RI dividendos JCP <ano corrente>`, com aspas literais ao redor do ticker e do nome para melhorar o match nas fontes.
- **Prompt de sistema**: instruir o modelo a listar apenas proventos cuja Data COM, Data EX ou Data de Pagamento caia entre `01/01/<ano corrente>` e `31/12/<ano corrente + 1>` (ano corrente + próximos 12 meses). Descartar explicitamente eventos anteriores; deixar claro que provisionamentos/anúncios futuros dentro dessa janela devem ser incluídos.
- **Filtro nativo Perplexity**: enviar `search_after_date_filter: "01/01/<ano corrente>"` no body da chamada para reforçar a recência.
- **Cache**: incluir o ano corrente na chave do cache de 24 h para não servir resposta de anos anteriores após virada de ano.

### 2. `src/components/DividendIntelligencePanel.tsx`
- Atualizar rótulo do botão e o texto contextual acima do resultado para indicar a janela usada (ex.: "Buscar proventos de 2026 e próximos 12 meses no RI/CVM/B3").
- Sem mudanças de layout, renderização das citações (`linkifyCitations`) ou fluxo de erro.

## Fora de escopo
- Modelo Perplexity (`sonar`), demais fontes (Fundamentus, brapi, TradingView), rota `/dividendos` e scoring de Inteligência de Proventos permanecem inalterados.