# Próximos proventos na Carteira

Nova seção na página **Carteira** listando os proventos já **anunciados oficialmente** (B3/CVM/RI) dos ativos que você tem em carteira, com o valor total que você vai receber e a data de pagamento.

## O que será construído

### Seção "Próximos proventos a receber"
Aparece abaixo do resumo da carteira (acima ou logo após a lista de posições), apenas com dados oficiais já divulgados — nada de estimativa ou projeção.

Para cada anúncio:
- Ticker e tipo (Dividendo ou JCP), com cores distintas
- Valor por ação
- Sua quantidade na carteira
- **Total a receber** = valor por ação × quantidade
- Data com, data ex e **data de pagamento**
- Aviso quando a data com já passou (direito garantido) ou ainda está por vir

Ordenação por data de pagamento (mais próximo primeiro). Rodapé com o **total consolidado previsto** da carteira e, se útil, subtotal por mês.

Estados:
- Sem carteira/posições: mensagem curta.
- Nenhum provento anunciado para os ativos: "Nenhum provento anunciado no momento para os ativos da carteira."
- Carregando: skeleton.
- Botão "Atualizar" para forçar nova consulta.

## Detalhes técnicos

- Fonte: os proventos provisionados já coletados da B3 (`provisionados` em `proventos.server.ts`, servidos por `getTickerProventos` com cache no `dividend_cache`). Nenhuma fonte nova, nenhuma IA.
- Novo hook `src/hooks/use-portfolio-proventos.ts`: recebe a lista de tickers da carteira selecionada e usa `useQueries` chamando `getTickerProventos` por ticker (mesma queryKey `["proventos", ticker]` já usada, aproveitando o cache existente).
- Novo componente `src/components/PortfolioProventos.tsx` renderizando a tabela (desktop) / cards (mobile), no mesmo padrão visual da carteira.
- Cálculo: quantidade da posição agregada por ticker (soma dos lotes) × `valorPorAcao`; filtra registros com `dataPagamento` no passado.
- Integração em `src/routes/_authenticated/carteira.tsx`, reaproveitando `positions` já calculado.
- Sem alteração de banco de dados ou de server functions.
