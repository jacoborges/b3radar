# Preço Teto (método Bazin) no detalhe do ativo

Nova janela "Preço Teto", posicionada logo após o Semáforo de Endividamento no modal de detalhes do ativo.

## O que o usuário vê

- Título "Preço Teto" com um botão de interrogação explicando o método (proventos médios / 6%).
- No topo, ao lado do título, o valor destacado:
  - Valor único quando a IA retorna um só valor: `R$ X,XX` (média de proventos ÷ 0,06).
  - Faixa quando a IA retorna valores divergentes: `R$ mín ÷ 0,06 — R$ máx ÷ 0,06`.
  - Um selo comparando com o preço atual: "Abaixo do teto (desconto de X%)" ou "Acima do teto (prêmio de X%)".
- Abaixo, o texto completo da resposta da Perplexity em markdown, com fontes numeradas clicáveis, igual aos painéis existentes.
- Botão "Analisar / Atualizar", estado de carregamento, aviso de cache (24h) e mensagens de erro (créditos, limite, conector não linkado) no mesmo padrão dos painéis de IA já existentes.

## Como funciona

Pergunta enviada à Perplexity:

```text
Informe a média ponderada do somatório de dividendos e JCP dos últimos cinco anos
da ação {TICKER} ({NOME}). Após a sua análise, caso encontre valores divergentes,
informe o mínimo e o máximo em sua resposta.
```

Além do texto, a IA devolve os números em um bloco estruturado ao final da resposta (média, mínimo, máximo em R$ por ação), que o app extrai para calcular o teto. Se a extração falhar, a janela mostra o texto da IA e informa que o teto não pôde ser calculado — nunca inventa números.

Fórmula: `preço teto = média ponderada de proventos (5 anos) / 0,06`. Com divergência: `mínimo / 0,06` e `máximo / 0,06` formam a faixa.

## Detalhes técnicos

- Novo `src/lib/preco-teto.functions.ts` (`createServerFn`), espelhando `macro-sensitivity.functions.ts`: chama `https://api.perplexity.ai/chat/completions` (modelo `sonar`) com `PERPLEXITY_API_KEY` lido dentro do handler, cache em memória de 24h por ticker, mesmo tratamento de 401/429/erros e retorno com `citations`.
- Retorno tipado: `{ content, media, minimo, maximo, cached, updatedAt, error, citations }`; os números vêm de um bloco final padronizado na resposta, parseado no servidor.
- Novo `src/components/PrecoTetoPanel.tsx` reutilizando `InfoTip`, `ReactMarkdown`, `Button` e o helper de citações do painel macro.
- `src/components/StockDetailModal.tsx`: renderiza `<PrecoTetoPanel />` imediatamente após `<DebtSemaphore />` (linha ~277), recebendo ticker, nome e preço atual.
- Sem mudanças de banco de dados.
