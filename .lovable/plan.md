# Próximos proventos: painel colapsável

Transformar a seção "Próximos proventos a receber" na página **Carteira** em um painel que pode ser expandido/retraído. Quando fechado, exibe apenas o total previsto a receber; quando aberto, mostra a lista completa dos proventos anunciados.

## O que será construído

### Comportamento colapsável
- A seção inicia **fechada** por padrão.
- O cabeçalho inteiro vira o gatilho de expansão, com uma seta indicativa (`ChevronRight` fechada / `ChevronDown` aberta).
- No estado fechado, o cabeçalho já mostra o **total previsto** a receber (ex.: "Total previsto R$ 123,45").
- Ao clicar na seta/cabeçalho, o conteúdo se expande e revela:
  - A tabela desktop / cards mobile com todos os proventos.
  - O rodapé com o total consolidado.
- O botão **Atualizar** permanece no cabeçalho, funcionando em ambos os estados.

### Estados mantidos
- Sem carteira/posições: mensagem curta (visível mesmo fechado? Não — só aparece ao expandir, ou substitui o total por "—").
- Carregando: skeleton ao expandir; no cabeçalho fechado pode mostrar "Calculando…".
- Nenhum provento anunciado: mensagem ao expandir.
- Com proventos: lista ordenada por data de pagamento.

## Detalhes técnicos

- Usar o componente `Collapsible` já existente em `src/components/ui/collapsible.tsx` (Radix UI).
- Alterar apenas `src/components/PortfolioProventos.tsx`.
- Adicionar estado local `open` com `useState(false)`.
- Reorganizar o cabeçalho para incluir:
  - Ícone + título + subtítulo à esquerda.
  - Total previsto + seta de expansão + botão "Atualizar" à direita.
- Envolver o conteúdo (tabela/cards + footer) em `<CollapsibleContent>`.
- Preservar formatação, cores e responsividade existentes.
- Nenhuma alteração em server functions, hooks ou banco de dados.
