# Preço Teto de Graham + coluna "Valuation" no cabeçalho

## O que o usuário verá
1. **Nova seção "Preço Justo de Graham"** no detalhe expandido do ativo, junto aos demais valuations (após Preço Teto / Projetivo).
   - Fórmula: Preço Justo = raiz(22,5 x LPA x VPA).
   - Mostra LPA, VPA, preço justo, preço atual, margem de segurança (%) e selo Barato / Justo / Caro.
   - Botão de interrogação explicando a origem do 22,5 (P/L 15 x P/VP 1,5) e os cuidados do método.
   - Aviso "Não aplicável" quando LPA ou VPA forem negativos/zero; alerta para empresas de crescimento/tecnologia.
   - LPA: usa a média dos últimos 5 anos quando houver histórico; senão o LPA atual (indicado na tela).
2. **Opção "Valuation" no seletor de Cabeçalho.** Ao marcar, entram de uma vez as colunas de todos os valuations disponíveis para cada ativo:
   - Graham (preço justo e margem), Bazin (preço teto) e Gordon/DDM quando já calculado.
   - Valores ausentes aparecem como "—"; cores verde/vermelho conforme preço abaixo/acima do valor.
   - Funciona em Cotações, Inteligência de Proventos, Carteira e Simulador (mesma configuração compartilhada), sem repetir colunas.
3. Filtro "Graham favorável" adicionado aos filtros, como já existe para Preço Teto.

## Detalhes técnicos
- `src/lib/graham.ts`: função pura `grahamFairPrice({ lpa, vpa, preco })` com testes (exemplo do documento: LPA 4, VPA 20 = R$ 42,42; casos negativos = não aplicável).
- LPA/VPA derivados de preço/P/L e preço/P/VP dos dados já carregados; média de LPA a partir do histórico de 10 anos quando em cache.
- `GrahamPanel.tsx` no `StockDetailModal`.
- `stock-columns.ts`: novo grupo virtual `valuation` que expande em chaves `grahamPreco`, `grahamMargem`, `bazinTeto`, `ddmValor`; normalização mantém unicidade; valores calculados por um resolvedor que lê os caches existentes (Bazin/DDM) sem alterar cálculos financeiros.
- Bazin no cabeçalho usa média de dividendos já disponível na lista; DDM só aparece se já estiver em cache (não dispara consultas de IA em massa).
