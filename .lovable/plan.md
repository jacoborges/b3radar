## Diagnóstico (verificado agora, chamando a B3)

A página `/dividendos` fica vazia porque **as duas chamadas à B3 estão retornando nada útil**:

1. `GetListedCashDividends` é chamado com `{issuingCompany:"BBSE"}` → a B3 responde `totalRecords: 0`. Testado agora: só funciona com `{tradingName:"BBSEGURIDADE", pageNumber, pageSize}` (aí retorna 48 registros).
2. `GetListedSupplementCompany` funciona com `issuingCompany`, mas a resposta vem como **string JSON dentro de JSON** e é um **array**. O código faz `res.json()` e lê `.stockDividends` direto — sempre `undefined`.

Resultado: `rawCash` e `rawStock` vazios → `"Sem retorno da B3"` → `intel = null` → tabela toda com "—".

Além disso, os nomes de campo mudaram: hoje `GetListedCashDividends` devolve `valueCash`, `corporateAction`, `lastDatePriorEx`, `dateApproval` (o código procura `rate`, `label`, `lastDatePrior`, e não existe mais `paymentDate` nesse endpoint).

## Correção proposta

### 1. Usar o Supplement como fonte principal
Testado: `GetListedSupplementCompany` com `{issuingCompany, language, year}` já devolve, por ano, `cashDividends` completos com `rate`, `label` (DIVIDENDO/JCP), `lastDatePrior`, `paymentDate`, `approvedOn`, `relatedTo` — exatamente os campos que o app espera — mais `stockDividends` (bonificação/desdobramento/grupamento).

Ajustes em `src/lib/proventos.functions.ts`:
- Parsear corretamente: `const parsed = typeof json === "string" ? JSON.parse(json) : json` e pegar `parsed[0]`.
- Coletar `cashDividends` **e** `stockDividends` dos últimos 5–6 anos (uma chamada por ano, em paralelo).
- Deduplicar por `label + lastDatePrior + rate`.

### 2. Complemento por `tradingName` (histórico longo)
- Resolver `ticker → tradingName` via `GetInitialCompanies` (`{company:"BBSE"}` retorna `tradingName: "BBSEGURIDADE"`), com cache em memória.
- Chamar `GetListedCashDividends` paginado com `tradingName`, mapeando os campos atuais (`valueCash`, `corporateAction`, `lastDatePriorEx`, `dateApproval`).
- Fundir com o supplement (o supplement fornece a data de pagamento, que falta nesse endpoint).

### 3. Robustez do lote
- Limitar concorrência (~6 tickers simultâneos) e aplicar cache de 6 h por ticker no servidor, para o lote de 120 não estourar tempo/limite da B3.
- Quando um ticker realmente não tiver eventos, marcar `fonte: null` e mostrar "Sem cobertura" em vez de linha vazia.

### 4. Feedback na UI
- Em `src/routes/dividendos.tsx`, mostrar erro/parcialidade explícita (ex.: "X de 120 ativos sem retorno da B3") em vez de silenciosamente exibir "—".

## Impacto
Também corrige o painel **Inteligência de Proventos** dentro do modal de cada ação e o histórico de dividendos, que usam a mesma função.

## Detalhes técnicos
- Arquivos: `src/lib/proventos.functions.ts` (principal), `src/hooks/use-dividend-batch.ts` (concorrência/erro), `src/routes/dividendos.tsx` (estado vazio/erro).
- Sem mudança de schema, sem novas dependências.
