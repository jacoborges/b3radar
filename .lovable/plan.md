# Valuation DDM (Gordon) para bancos e financeiras

Nova seção "Valuation DDM" no detalhe do ativo, exibida apenas para tickers do setor financeiro (bancos, intermediários financeiros, serviços financeiros, seguros), onde o FCD atual não se aplica. Fórmula do documento:

```text
V0 = D1 / (r - g)

D1 = D0 x (1 + g)
g  = ROE x (1 - Payout)        (limitado a g < r)
r  = Rf + Beta x (Rm - Rf) + Risco-País
```

## De onde vem cada número

Já temos no app (sem consulta externa nova):
- D0: soma de dividendos + JCP por ação dos últimos 12 meses, dos proventos da B3 já carregados no ativo.
- ROE: dado fundamentalista já presente na base (Fundamentus/CVM-B3).
- Payout: calculado como proventos por ação ÷ LPA (lucro líquido ÷ nº de ações), reaproveitando a coleta do Valuation FCD; o usuário pode sobrepor manualmente.
- Beta: já vem da coleta do Valuation (Yahoo/brapi); com fallback manual.
- Rf (taxa livre de risco): Selic da API do Banco Central, já consumida pelo FCD.
- Rm - Rf e risco-país: premissas padrão já usadas no FCD, editáveis no painel.
- CAGR de dividendos 5-10 anos: calculado do histórico de proventos já existente, mostrado como g alternativo.

O que falta e será buscado por IA (Gemini com busca web, mesmo padrão dos painéis atuais; Perplexity como alternativa quando a chave estiver conectada):
- Payout declarado na política de dividendos / estatuto do RI.
- Dividendo por ação projetado para o próximo ano segundo casas de análise (BTG, XP, Itaú BBA, etc.) e guidance do RI.
- ROE projetado e beta, quando a fonte automática não trouxer.
- Resposta estruturada com valores + lista de fontes com link, cache de 24h por ticker.

## Como o cálculo escolhe as entradas

Para cada entrada há uma cascata: dado do app → dado da IA → valor manual do usuário. O painel mostra a origem de cada linha ("app", "IA", "manual").

Três cenários de g exibidos lado a lado:
1. Fundamentalista: ROE x (1 - Payout).
2. CAGR histórico dos dividendos.
3. Conservador: g fixo (inflação/PIB nominal, ajustável).

Cada cenário gera um preço justo, e o painel mostra a faixa (mínimo-máximo) e o desconto/prêmio sobre a cotação atual.

## Interface

- Cabeçalho "Valuation DDM (Gordon)" com preço justo em destaque e InfoTip explicando o método e sua limitação (só faz sentido para pagadores estáveis).
- Tabela de memória de cálculo: D0, g escolhido, D1, Rf, Beta, prêmio de mercado, risco-país, r, preço justo.
- Cartões dos três cenários de g com o preço justo de cada um.
- Matriz de sensibilidade 5x5 (r x g) igual à do FCD, com faixa de preço justo.
- Alerta quando g >= r (fórmula inválida) explicando o que ajustar.
- Botão "Buscar dados de mercado (IA)", badge de cache, fontes clicáveis e aviso de que não é recomendação.
- Estados claros informando exatamente qual dado falta (sem proventos, sem ROE, sem beta).

## Aplicação a todos os bancos

- Detecção por setor da base (Intermediários Financeiros, Serviços Financeiros Diversos, Previdência e Seguros, Holdings financeiras) combinada com a marcação `setorFinanceiro` que a coleta de valuation já produz.
- No detalhe do ativo: para esses tickers o painel DDM aparece acima do FCD, e o FCD passa a exibir aviso de método inadequado (já existe).
- Nos filtros: nova opção "DDM favorável" (preço justo acima da cotação), no mesmo padrão do filtro de preço teto favorável, calculada só para o subconjunto financeiro.

## Detalhes técnicos

- `src/lib/valuation-ddm.ts`: funções puras — `calcularCustoCapitalCapm`, `crescimentoFundamentalista`, `cagrDividendos`, `precoJustoGordon`, `matrizSensibilidadeDdm`, `classificarDdm`.
- `src/lib/valuation-ddm.functions.ts`: `createServerFn` fino que consulta o gateway de IA (Gemini com busca) pedindo payout declarado, DPA projetado, ROE projetado e beta em bloco estruturado + markdown com fontes; cache em memória de 24h, mesmo padrão de `preco-teto-projetivo.functions.ts`.
- `src/hooks/use-ddm.ts`: reúne proventos (histórico já em cache), `useValuation` (ações, lucro, beta, Selic) e o resultado da IA.
- `src/components/ValuationDdmPanel.tsx`: renderizado em `StockDetailModal.tsx` acima de `ValuationPanel`, só quando o ativo é financeiro.
- Premissas e overrides manuais (payout, beta, prêmio de risco, g) persistidos por ticker em localStorage, no mesmo estilo do divisor Bazin.
- Sem mudanças de banco de dados.
