# Preço Teto com Google Gemini e 3 fontes oficiais

## O que muda para o usuário

- A janela "Preço Teto" passa a ser gerada pelo Google Gemini (via Lovable AI, sem chave nova) no lugar da Perplexity.
- A pesquisa aceita apenas três fontes: RI da própria empresa, B3 e CVM. Qualquer outra fonte (Status Invest, Fundamentus, notícias, redes sociais) é descartada, e a IA deve dizer explicitamente quando um ano não tiver dado nessas três fontes — nunca preencher com estimativa.
- A resposta traz, por ano (ano−5 a ano−1), o valor de dividendos, JCP e total por ação, indicando o que cada uma das três fontes informou.
- Quando as três fontes divergirem no total de um ano, o app mostra o valor mínimo e o máximo, e o preço teto vira uma faixa.
- Fórmula aplicada no app: somatório dos 5 anos ÷ 5 = média ponderada; média ÷ divisor (0,06 padrão, ajustável em Configurações) = preço teto. Com divergência: somatório mínimo e máximo seguem o mesmo caminho, gerando a faixa.
- O restante da janela continua igual: selo de desconto/prêmio sobre o preço atual, cache de 24h, botão de atualizar, fontes com links e avisos de erro.

## Detalhes técnicos

- `src/lib/preco-teto.functions.ts`: substitui a chamada `api.perplexity.ai` por Lovable AI Gateway com `google/gemini-3.6-flash`, lendo `LOVABLE_API_KEY` dentro do handler. Mantém `createServerFn`, validação Zod, cache em memória de 24h (nova chave `v3:` para invalidar o cache antigo) e o mesmo shape `PrecoTetoResult`.
- Prompt reescrito: restringe explicitamente às três fontes (RI, B3, CVM), exige tabela ano a ano com coluna por fonte, o somatório dos 5 anos, e o bloco final estruturado `DADOS / SOMA / SOMA_MINIMO / SOMA_MAXIMO` já usado pelo parser atual (`extractValues` permanece).
- Fontes: como o Gemini via gateway não devolve `citations`, o prompt pede uma seção final "Fontes" em markdown com nome e URL completo; o painel passa a exibir esses links vindos do texto. A lista numerada separada de citações é removida quando não houver citações.
- Tratamento de erro adaptado ao gateway: 429 (limite), 402 (créditos esgotados) e demais HTTP com mensagem clara em português.
- `src/components/PrecoTetoPanel.tsx`: apenas ajustes de texto (menção às três fontes) e à exibição de fontes; cálculo e divisor Bazin permanecem como estão.
- Sem mudanças de banco de dados.

## Observação

O Gemini via Lovable AI não navega na web em tempo real como a Perplexity; ele responde a partir do conhecimento do modelo restrito às três fontes indicadas. Isso pode reduzir a cobertura de anos recentes e a precisão dos links. Se preferir manter a busca web ao vivo, uma alternativa é seguir com a Perplexity restringindo os domínios a RI/B3/CVM.
