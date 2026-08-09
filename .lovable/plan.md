# Gráficos de histórico (10 anos) nos indicadores

## O que muda para o usuário

- Ao lado da interrogação de alguns indicadores aparece um pequeno ícone de gráfico. Clicando nele, abre um pop-up com a série histórica de até 10 anos daquele parâmetro, com fonte e ano a ano.
- Os gráficos que já existem (Dividendos + JCP, Yield vs Selic, Valorização anual vs Selic) passam a mostrar 10 anos fechados + o ano corrente parcial, em vez de 6 anos.

## Onde o ícone vai aparecer (e onde não vai)

Você escolheu usar apenas dados reais. Com as fontes atuais, só existe série histórica de verdade para:

- **Proventos por ano** (Dividendos, JCP, total) — B3, histórico longo de dividendos em dinheiro.
- **Preço** (fechamento anual, valorização do ano) — histórico de cotações mensais dos últimos 10 anos.
- **Dividend Yield por ano** — derivado dos dois acima (proventos do ano ÷ preço médio do ano).
- **Selic** (média ponderada por ano) — tabela do app, estendida para 10 anos.

Os demais indicadores (P/L, P/VP, ROE, ROIC, margens, dívida/patrimônio, liquidez corrente, CAGR, valor de mercado, liquidez diária, free float) vêm das fontes atuais **apenas como foto do momento** — não há série histórica real. Nesses casos o ícone de gráfico **não aparece**, só a interrogação, como hoje. Se mais adiante quiser 10 anos nesses indicadores, será preciso uma fonte adicional (IA com RI/CVM ou API paga de fundamentos históricos) — fica como decisão futura.

Além disso, o histórico real depende do que a B3/cotações devolvem por ativo: empresas com IPO recente mostram menos anos, e o gráfico indica isso em vez de inventar valores.

## Detalhes técnicos

- `src/lib/proventos.server.ts`: `fetchSupplementYears` passa a cobrir `anoAtual+1 … anoAtual−10`; o array `anos` do histórico vira 11 entradas (`anoAtual−10 … anoAtual`). Paginação de `GetListedCashDividends` sobe de 4 para ~8 páginas para cobrir a década. Anos sem retorno da B3 ficam marcados como indisponíveis (`null`), não como zero.
- `src/lib/stocks-data.ts`: `SELIC` estendida de 2016 a 2026 (médias ponderadas anuais); `YEARS` passa a 11 anos; `computeDividendStats` continua contando apenas anos fechados, com base configurável (10 anos), e o Preço Teto segue usando somente os 5 anos fechados mais recentes (fórmula Bazin inalterada).
- Novo `src/lib/price-history.functions.ts` (server fn, cache 24h): busca cotações mensais dos últimos 10 anos por ticker na mesma fonte já usada pelo consenso, e devolve `{ year, precoInicio, precoFim, precoMedio, valorizacao }`. Substitui a série sintética de `precosAnuais` quando houver dado real.
- Novo `src/components/IndicatorHistoryDialog.tsx`: pop-up (Dialog) com gráfico de barras/linha (Recharts, já no projeto) + tabela ano a ano e rodapé de fonte.
- `src/lib/indicators.ts`: cada `IndicatorInfo` ganha `history?: "proventos" | "preco" | "dy" | "selic"`. Só indicadores com esse campo renderizam o ícone.
- `src/components/InfoTip.tsx` / `src/components/StockDetailModal.tsx`: ícone `LineChart` ao lado da interrogação, abrindo o dialog com o histórico do ticker aberto.
- `src/components/DividendChart.tsx`: eixos e legendas ajustados para 11 pontos (rótulos abreviados no mobile, rolagem horizontal quando estreito).
- Sem mudanças de banco de dados; o cache de proventos é renovado com nova chave para não servir a janela antiga de 6 anos.
