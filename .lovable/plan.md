# Total por ticker na lista de próximos proventos

Ajustar a seção "Próximos proventos a receber" na Carteira para que, quando expandida, cada ticker apareça como um grupo com uma linha de total no topo e, abaixo, a lista detalhada dos proventos (dividendos, JCP, etc.) que compõem aquele valor.

## O que será alterado

### Agrupamento por ticker
- No componente `src/components/PortfolioProventos.tsx`, agrupar os `eventos` por `ticker` antes de renderizar.
- Calcular o subtotal de proventos por ticker (soma dos `total` de cada evento daquele ativo).
- Preservar a ordenação atual por data de pagamento dentro de cada grupo.

### Desktop (tabela)
- Inserir uma linha de destaque por ticker com:
  - Ticker em destaque.
  - Total a receber daquele ativo (soma de dividendos + JCP).
- Abaixo dessa linha de total, listar as linhas normais de cada provento (tipo, valor por ação, quantidade, total parcial, datas).
- Diferenciar visualmente a linha de total (ex.: fundo sutil ou fonte em negrito) da linha dos itens.

### Mobile (cards)
- Criar um card de grupo por ticker no topo com o total consolidado do ativo.
- Abaixo, renderizar os cards individuais dos proventos daquele ticker, levemente recuados ou com borda diferenciada para indicar hierarquia.

### Estados mantidos
- Sem carteira/posições: mensagem curta.
- Nenhum provento anunciado: mensagem.
- Carregando: skeleton.
- Painel colapsado: continua mostrando apenas o total geral previsto da carteira, sem alteração.

## Detalhes técnicos
- Alterar apenas `src/components/PortfolioProventos.tsx`.
- Nenhuma mudança em `use-portfolio-proventos.ts`, server functions, hooks ou banco de dados.
- Manter as cores e classes existentes (verde para dividendos, azul para JCP, `text-success`, etc.).
- Preservar responsividade e acessibilidade do `Collapsible`.
