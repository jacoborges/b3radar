# Valuation por Fluxo de Caixa Descontado (FCD) — nova seção abaixo do Preço Teto

Implementa o pipeline descrito no documento: coleta automática dos dados contábeis e macro, motor matemático (Ke via CAPM, WACC, projeção em fases + perpetuidade, FCFF e FCFE) e matriz de sensibilidade com leitura automática de margem de segurança.

## O que o usuário vê

Nova janela "Valuation (FCD)" no detalhe do ativo, logo abaixo do Preço Teto:

1. **Resumo do preço justo**
   - Preço justo por ação (FCFF) e preço justo (FCFE), lado a lado com a cotação atual.
   - Selo de margem de segurança em % — verde quando o preço justo está acima da cotação, vermelho quando abaixo.
   - Veredito automático, conforme o documento: "Margem de Segurança Extrema" (o pior cenário da matriz ainda fica acima do preço de tela), "Assimetria favorável", "Preço justo" ou "Ação esticada / sem margem de segurança" (só o melhor cenário justifica o preço).

2. **Premissas usadas** (todas visíveis e editáveis na própria janela, com valores padrão)
   - Taxa livre de risco (Selic, coletada automaticamente do Banco Central).
   - Prêmio de mercado (Rm), risco-país (EMBI+), custo bruto da dívida, alíquota de IR/CSLL 34%.
   - Beta do ativo (coletado; editável).
   - Crescimento fase 1 (alta), fase 2 (transição), crescimento na perpetuidade (limitado para nunca superar o IPCA/PIB de longo prazo), horizonte em anos.
   - Botão "restaurar premissas padrão".

3. **Dados coletados** — receita, EBIT, lucro líquido, depreciação/amortização, CAPEX, dívida líquida, market cap e nº de ações, com a fonte e a data. Campos indisponíveis aparecem como "—" e a janela avisa que o cálculo está incompleto em vez de inventar número.

4. **Fluxos projetados** — tabela ano a ano (fluxo do período, valor presente) mais valor terminal, valor da firma, ajuste de dívida líquida e equity value.

5. **Matriz de sensibilidade** — quadrante taxa de desconto (5 níveis, passos de 0,5 p.p.) × crescimento na perpetuidade (5 níveis, passos de 0,5 p.p.), com o preço justo em cada célula; verde onde fica acima da cotação atual, vermelho abaixo, célula-base destacada.

6. **Botão de interrogação** no mesmo padrão dos demais indicadores, explicando de forma didática FCFF, FCFE, WACC, CAPM, perpetuidade e como ler a matriz.

## Detalhes técnicos

- `src/lib/valuation.server.ts` — coleta:
  - Yahoo `quoteSummary` (reutilizando o mecanismo de crumb/cookies já existente em `consensus.functions.ts`) com os módulos `incomeStatementHistory`, `cashflowStatementHistory`, `balanceSheetHistory`, `defaultKeyStatistics`, `financialData`, `price` → receita, EBIT, lucro líquido, D&A, CAPEX, dívida total, caixa, beta, market cap e nº de ações.
  - Selic via API pública do Banco Central (série SGS 432, último valor) com fallback para o valor já usado no app quando a API falhar.
- `src/lib/valuation.functions.ts` — `getValuationInputs` (`createServerFn`, POST, input `{ ticker }` validado com Zod, cache HTTP de 6h via `setResponseHeader`), arquivo apenas com a declaração da server function.
- `src/lib/valuation.ts` — módulo puro, sem I/O, testável:
  - `calcularCustoCapital({ rf, beta, rm, riscoPais, custoDividaPreTax, aliquota, E, D })` → `Ke = Rf + β(Rm − Rf) + riscoPais`; `WACC = Ke·E/V + Kd·(1−t)·D/V`.
  - `projetarFCD({ tipo: "FCFF" | "FCFE", ... })` → fase de alta, fase de transição (interpolação linear até g perpétuo) e perpetuidade de Gordon; FCFF = `EBIT·(1−t) + D&A − CAPEX − ΔNIG`; FCFE = FCFF − despesa financeira líquida·(1−t) + variação do endividamento; desconto por WACC (FCFF) ou Ke (FCFE); FCFF converte firm value → equity value subtraindo a dívida líquida; divide pelo nº de ações.
  - `matrizSensibilidade(...)` → grade 5×5 em torno das premissas base, passos de ±0,5 p.p.
  - `classificarMargem(...)` → os vereditos listados acima.
- `src/components/ValuationPanel.tsx` — apresentação, premissas editáveis (estado local), tabelas e matriz; cores exclusivamente pelos tokens existentes (`--color-success` / `--color-danger`), no mesmo padrão visual do `PrecoTetoPanel`.
- `src/components/StockDetailModal.tsx` — renderiza `<ValuationPanel />` imediatamente após `<PrecoTetoPanel />`, passando ticker e preço atual.
- Hook `src/hooks/use-valuation.ts` com React Query (staleTime de 6h) para os inputs coletados; cálculo roda no cliente a cada mudança de premissa, sem nova requisição.
- Sem mudanças no banco de dados e sem chamadas de IA — cálculo determinístico.
