# Valuation (FCD): completar EBIT, depreciação e CAPEX

## O que está acontecendo

A mensagem "Faltam linhas contábeis (EBIT, depreciação ou CAPEX)" aparece porque a coleta atual só aceita esses três números quando eles vêm prontos numa única linha:

- O Yahoo, quando responde, hoje devolve o bloco de demonstrações vazio para a maioria dos ativos da B3 — a rotina então segue com EBIT/D&A/CAPEX nulos.
- Na fonte alternativa (CVM/B3 via brapi), verifiquei ao vivo que **não existe** campo de depreciação nem de CAPEX. O app hoje aproxima D&A por "caixa operacional − lucro líquido", o que fica nulo sempre que o lucro líquido vem nulo (caso de bancos e de vários ativos), e aproxima CAPEX pelo caixa de investimento, que vem positivo em alguns casos (ex.: ITUB4, +R$ 19 bi) e gera número sem sentido.
- Confirmei também que a fonte traz, no mesmo retorno, campos suficientes para derivar tudo corretamente: `ebitda`, `ebit`/`operatingIncome`, `operatingMargins`, `totalRevenue`, `operatingCashFlow` e `freeCashFlow`. Para VALE3, CAPEX = caixa operacional − fluxo de caixa livre = 48.765 − 10.302 = 38.463 (bate exatamente com o caixa de investimento), e D&A = EBITDA − EBIT ≈ 19.964.

Ou seja: os dados existem; a implementação é que não os deriva.

## O que será feito

1. **Cascata de derivação para cada linha** (sempre registrando de onde veio):
   - EBIT: `ebit` → `operatingIncome` → `EBITDA − D&A` → `margem operacional × receita`.
   - Depreciação/Amortização: `EBITDA − EBIT` → `caixa operacional − lucro líquido` (só quando positivo).
   - CAPEX: `caixa operacional − fluxo de caixa livre` → caixa de investimento (só quando negativo, usando o módulo).
2. **Percorrer os anos disponíveis**: hoje só a primeira linha anual é lida. Passa a usar o exercício mais recente que tenha os dados; se o último ano estiver incompleto, cai para o anterior.
3. **Mesclar as fontes em vez de escolher uma**: o que faltar no Yahoo é preenchido com a fonte CVM/B3 (e vice-versa), em vez de descartar a resposta parcial.
4. **Mensagem honesta e específica** quando mesmo assim faltar algo: dizer qual linha faltou (ex.: "sem CAPEX publicado") em vez do texto genérico, e manter o botão "Atualizar".
5. **Rodapé de procedência ampliado**: além da fonte e do horário, indicar quando EBIT, D&A ou CAPEX foram derivados (ex.: "D&A estimada por EBITDA − EBIT"), para o número nunca parecer oficial quando é aproximação.
6. **Bancos e seguradoras**: manter o alerta atual — nesses casos EBIT/CAPEX não representam a operação e a leitura correta é por FCFE.

## Detalhes técnicos

- `src/lib/valuation.server.ts`: novas funções puras `pickEbit`, `pickDA`, `pickCapex` aplicadas tanto ao caminho Yahoo quanto ao brapi; `firstRow` vira `pickRow(rows, predicate)` para varrer os exercícios; `collectFromBrapi` passa a pedir também `balanceSheetHistory`; o retorno ganha `derivacoes: string[]` para o rodapé; a mescla Yahoo+brapi acontece em `collectValuationInputs` antes de decidir por erro.
- `src/lib/valuation.ts`: campo `derivacoes` no tipo `ValuationInputs`.
- `src/components/ValuationPanel.tsx`: mensagem de linha faltante específica e exibição das derivações no rodapé.
- Sem mudanças de banco de dados e sem chamadas de IA.
