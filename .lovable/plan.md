# Preço Teto: nova pesquisa Bazin + divisor configurável

## Nova pergunta à Perplexity

A busca passa a ser explícita por ano, cobrindo ano atual −5 até ano atual −1 (5 anos fechados):

```text
Consulte na B3, na CVM e no RI da ação {TICKER} ({NOME}) os proventos
(dividendos + JCP) pagos por ação de {ANO-5} a {ANO-1}. Informe o valor de
cada ano individualmente em R$ X,XX (2 casas, arredondando para cima), o
somatório dos 5 anos e a média (somatório / 5). Traga as fontes com links
para conferência.
```

A resposta deve conter: tabela ano a ano (dividendos, JCP, total), somatório, média,
e a lista de fontes com links clicáveis. Continua devolvendo, no fim, o bloco
estruturado com os números (média, mínimo e máximo quando houver divergência),
que o app usa para o cálculo — se a extração falhar, mostra o texto e avisa que o
teto não pôde ser calculado.

## Divisor Bazin configurável

- Em **Configurações**, novo bloco "Bazin — divisor do preço teto": campo numérico
  (padrão `0,06`), com botão salvar/restaurar padrão e explicação curta
  (é o yield mínimo desejado; 0,06 = 6% ao ano).
- Valor salvo no navegador (localStorage), igual ao token da brapi, aceitando
  valores entre 0,01 e 0,50.
- O painel Preço Teto passa a usar esse divisor em vez do 0,06 fixo — no cálculo,
  no título ("média ÷ 0,06" vira o divisor atual) e no texto de ajuda.
- Mudar o divisor recalcula o teto na hora, sem nova chamada à IA.

## Detalhes técnicos

- `src/lib/preco-teto.functions.ts`: novos `systemPrompt`/`userPrompt` com os anos
  calculados no handler (`new Date().getFullYear()`), exigindo tabela ano a ano,
  somatório, média e fontes com URL; `max_tokens` sobe para ~1200. Cache de 24h por
  ticker mantido (o divisor não entra na chamada).
- Novo hook `useBazinDivisor()` em `src/hooks/use-bazin-divisor.ts`, espelhando
  `useBrapiToken` (localStorage + evento `b3radar:bazin-divisor-changed`),
  com fallback 0,06.
- `src/components/PrecoTetoPanel.tsx`: substitui a constante `YIELD_ALVO` pelo valor
  do hook e atualiza os textos.
- `src/routes/_authenticated/configuracoes.tsx`: nova seção com o campo do divisor.
- Sem mudanças de banco de dados.
