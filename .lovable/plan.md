## Objetivo
Ajustar a busca Perplexity na aba **Inteligência de proventos** para:
1. Usar consulta no formato `"<NOME_EMPRESA/TICKER>" + RI + dividendos + fatos relevantes`.
2. Exibir o resultado como a Perplexity mostra: texto corrido com citações numeradas `[1] [2]` inline, e a lista de links das fontes clicáveis abaixo.

## Mudanças

### 1. `src/lib/dividend-ai.functions.ts` — `analyzeDividendsWithPerplexity`
- Trocar o `userPrompt` estruturado (3 seções fixas) por uma **query de busca** simples:
  ```
  "<nome da empresa>" (<TICKER>) RI dividendos fatos relevantes
  ```
  Ex.: `"Banco do Brasil" (BBAS3) RI dividendos fatos relevantes`.
- Ajustar o `system` para: "Responda em português, cite as fontes com marcadores numéricos [1], [2] etc. no texto, priorize site de RI, CVM e B3, não invente valores/datas."
- Remover `search_recency_filter: "month"` (mensagens do usuário exigem localizar fatos relevantes recentes mas também política vigente; deixar padrão amplo).
- Manter `search_domain_filter` atual (RI/CVM/B3 e blacklist redes sociais).
- Manter cache 24h, tratamento de 401/429, retorno de `citations`.

### 2. `src/components/DividendIntelligencePanel.tsx` — bloco Perplexity
- Alterar `description` do `AiCard` do Perplexity para refletir a nova forma: "Busca ao vivo com a query `\"empresa\" RI dividendos fatos relevantes`. Resultado com citações e links das fontes."
- Garantir que o markdown renderizado converta as citações `[1]`, `[2]` em links clicáveis para as URLs correspondentes em `result.citations`. Fazer isso via um pré-processamento simples do `content` antes do `ReactMarkdown` (substituir `[n]` por `[[n]](url)`) — já é assim que a Perplexity exibe.
- Lista de fontes numeradas abaixo do texto (já existe no `AiCard`, apenas confirmar ordem 1..N e exibir domínio + URL).

## Fora do escopo
- Não altera Gemini, previsão quantitativa, provisionados oficiais nem histórico.
- Não altera schema de input do server function (mantém compatibilidade).

## Detalhes técnicos
- A API Perplexity retorna `citations: string[]` na mesma ordem dos marcadores `[n]` do texto → substituição regex `/\[(\d+)\]/g` por `[[$1]](citations[n-1])` no cliente antes do render.
- Se o modelo não emitir marcadores, o texto aparece cru e a lista de fontes segue exibida abaixo (comportamento atual preservado).
