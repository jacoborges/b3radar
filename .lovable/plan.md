# Novas fontes de dados (Banco Central, CVM, B3, Yahoo, Fundamentus) + Dados Macroeconômicos

## Ponto importante sobre Python
O servidor do app não executa Python. As bibliotecas citadas (python-bcb, pyBACEN, pycvm, yfinance, fundamentus) são apenas "atalhos" que consultam fontes públicas: SGS do Banco Central, Dados Abertos da CVM, COTAHIST da B3, Yahoo Finance e Fundamentus. O app vai consultar essas mesmas fontes diretamente, com o mesmo resultado, atualizando sozinho e guardando tudo no banco. A brapi continua funcionando em paralelo.

## 1. Nova página "Dados Macroeconômicos"
- Item novo no menu do cabeçalho.
- Séries do Banco Central (SGS), com histórico e valor atual: Selic meta e efetiva, CDI, IPCA, IGP-M, INPC, dólar (PTAX compra/venda), euro, PIB, desemprego, inadimplência (PF, PJ e total), crédito/PIB, dívida bruta/PIB, resultado primário, reservas internacionais, expectativas Focus (IPCA, Selic, PIB, câmbio).
- Risco-país: o Banco Central não publica o EMBI; será usado o CDS Brasil 5 anos / EMBI via Ipeadata (fonte pública), sinalizado como tal.
- Cartões com valor atual e variação, gráfico de histórico (1, 5 e 10 anos) e explicação didática (?) em cada indicador.
- Atualização automática diária e botão "Atualizar".
- Catálogo editável de séries: novas séries podem ser adicionadas depois por código SGS para futuras integrações.

## 2. Cruzamento de fundamentos e cotações
- Cotações: Yahoo Finance (.SA) como segunda fonte, brapi como primeira; se uma falhar, a outra assume. Fechamentos históricos também pelo COTAHIST da B3.
- Fundamentos: múltiplos do Fundamentus + demonstrações da CVM (DFP/ITR) já usadas, cruzados com brapi. O painel mostra a fonte de cada número e avisa quando há divergência relevante entre fontes.
- Indicador nas Configurações mostrando quantas cotações vieram de cada fonte, para avaliar a redução de dependência da brapi.

## 3. Valuations otimizados
- Preço Teto (Bazin) e Projetivo: proventos cruzados B3 + Yahoo; comparação com Selic e IPCA reais do ano.
- DDM/Gordon: taxa livre de risco = Selic/NTN-B atual; risco-país real; g conservador = IPCA esperado do Focus + PIB esperado.
- FCD (FCFF/FCFE): WACC com Selic, risco-país e inflação Focus; crescimento na perpetuidade ancorado no Focus; dólar para empresas exportadoras.
- Cada painel exibe "dados macro de [data]" e a origem de cada premissa; valores manuais continuam prevalecendo.

## Ordem de entrega
1. Banco de dados macro + coleta do Banco Central + página Dados Macroeconômicos.
2. Uso dos dados macro nos valuations.
3. Yahoo/COTAHIST/Fundamentus como fontes paralelas e cruzamento.

## Detalhes técnicos
- Tabelas `macro_series` (código SGS, nome, unidade, periodicidade, categoria) e `macro_observations` (série, data, valor), leitura para usuários autenticados, escrita só pelo servidor; migração com catálogo inicial.
- `src/lib/macro.server.ts`: cliente SGS (`api.bcb.gov.br/dados/serie/bcdata.sgs.{cod}/dados`, janelas de 10 anos), Focus (OData `olinda.bcb.gov.br`), Ipeadata para risco-país; upsert incremental.
- Rota `src/routes/api/public/refresh-macro.ts` protegida por segredo para cron diário; `macro.functions.ts` para leitura e refresh manual (admin).
- `src/lib/macro-context.ts` + hook `useMacroContext()` entregando Selic, IPCA Focus, PIB Focus, risco-país e dólar aos painéis de valuation (`valuation.server.ts`, `valuation-ddm.ts`, `preco-teto*`).
- `src/lib/quote-sources.server.ts`: Yahoo chart API como fallback/cruzamento, integrado ao cache compartilhado por ticker existente; `fundamentus.server.ts` para múltiplos.
- Testes para fórmulas de WACC/r do DDM usando os dados macro e para a escolha de fonte de cotação.
