## Objetivo
Transformar a seção "Provisionamento" do modal de detalhes do ativo de uma aba separada em uma seção contínua exibida logo após "Fundamentos & Dividendos".

## Alterações propostas

### 1. `src/components/StockDetailModal.tsx`
- Remover o componente `Tabs` e seus subcomponentes (`TabsList`, `TabsTrigger`, `TabsContent`), pois a divisão por abas não será mais necessária.
- Remover o import de `Tabs`, `TabsContent`, `TabsList`, `TabsTrigger` e do ícone `CalendarClock` (caso deixe de ser usado no título da seção).
- Manter o conteúdo de "Fundamentos & Dividendos" como está.
- Inserir o conteúdo do `ProvisionamentoPanel` diretamente após o bloco "Yield da ação vs. Selic", dentro do mesmo fluxo vertical do modal.
- Preservar o título "Provisionamento de novos dividendos", o tooltip didático, os cards de resumo, a tabela de proventos e a mensagem "Nenhum provento provisionado".
- Manter a função auxiliar `ProvisionamentoPanel` ou fundi-la no corpo principal, conforme mais limpo.

## Resultado esperado
Ao abrir o modal de um ativo, o usuário verá, em sequência:
1. Cabeçalho com ticker, tipo, setor e botão TradingView
2. Cards de preço, variação, valor de mercado e liquidez
3. Cards históricos D-1, D-7, D-30
4. Indicadores fundamentais
5. Semáforo de endividamento
6. Gráfico de dividendos empilhados
7. Gráfico Yield vs Selic
8. **Provisionamento de novos dividendos** (tabela e resumo)

Sem necessidade de clicar em abas.

## Escopo
- Apenas refatoração de UI no modal de detalhes.
- Nenhuma alteração em dados, filtros, rotas ou server functions.
