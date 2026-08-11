# Valuation (FCD): corrigir "Fonte de dados indisponível" e deixar claro o que é automático

## Respondendo primeiro: sim, é automático

Ao expandir o ativo, a sessão busca sozinha os dados (balanço, DRE, fluxo de caixa, beta, preço) e a Selic do Banco Central, calcula o preço justo e a matriz de sensibilidade, e guarda o resultado por 6 horas. Nada precisa ser clicado. As premissas (Beta, Selic, prêmio de risco, crescimento) recalculam na hora, sem nova consulta.

## Por que aparece "Fonte de dados indisponível no momento"

Duas causas confirmadas nos testes:

1. A fonte principal (Yahoo) responde **429 – excesso de requisições** a partir do servidor do app.
2. A fonte alternativa (brapi, dados CVM/B3) responde **401 – token não fornecido** quando o volume anônimo se esgota. As outras sessões do app (cotações e fundamentos) não têm esse problema porque enviam o **token brapi salvo em Ajustes**; o Valuation ainda não envia.

Ou seja: quando o seu token está salvo, o Valuation não o utiliza, e sem token a fonte bloqueia.

## O que será feito

- **Usar o token brapi das Configurações no Valuation**, igual às cotações e aos fundamentos. Com o token salvo, a coleta passa a funcionar de forma estável para todos os ativos.
- **Tentar as fontes em cadeia**: Yahoo → brapi com token → brapi anônimo, ficando com a primeira que devolver dados completos.
- **Mensagens de erro específicas** em vez da frase genérica:
  - "Fonte exige token — cadastre seu token brapi em Ajustes" (com link para Configurações);
  - "Fonte temporariamente limitada (muitas consultas) — tente em alguns minutos";
  - "Ativo sem demonstrações financeiras publicadas nesta fonte".
- **Botão "Tentar novamente"** no painel, que refaz a consulta ignorando o cache de 6 horas.
- **Aviso para bancos e seguradoras**: nesses casos o EBIT/CAPEX não representam a operação (ex.: ITUB4 retorna EBIT negativo), então o painel exibe um alerta de que o FCD por FCFF não é adequado ao setor financeiro e sugere ler o resultado por FCFE, em vez de mostrar um preço justo enganoso.
- **Rodapé com procedência**: fonte utilizada, horário da coleta e a observação de aproximação de D&A/CAPEX quando ela ocorrer.

## Detalhes técnicos

- `src/lib/valuation.functions.ts`: o schema de entrada passa a aceitar `token?: string`, repassado a `collectValuationInputs(ticker, token)`.
- `src/hooks/use-valuation.ts`: lê `useBrapiToken()` (de `use-live-quotes`), inclui o token na `queryKey` e expõe `refetch` para o botão de atualizar.
- `src/lib/valuation.server.ts`: assinatura com token; ordem Yahoo → brapi(token) → brapi(anônimo); retorno de códigos de erro (`sem-token`, `limite-fonte`, `sem-demonstracoes`) além do texto; classificação de setor financeiro por ausência/incoerência de EBIT e CAPEX.
- `src/components/ValuationPanel.tsx`: estados de erro por código, botão de nova tentativa, alerta de setor financeiro e rodapé de procedência.
- Sem mudanças de banco de dados e sem chamadas de IA.
