# Preço Teto Projetivo

Nova seção logo abaixo do "Preço Teto" no detalhe do ativo, com o teto de Bazin calculado sobre o dividendo projetado para o próximo ano em vez da média dos 5 anos fechados.

## Fórmula

```text
LPA projetivo = Lucro líquido projetado (próximo ano) / nº total de ações
DPA projetivo = LPA projetivo x Payout (%)
Preço teto projetivo = DPA projetivo / divisor Bazin (Ajustes)
```

Observação: "lucro projetivo por ação" é o próprio LPA; a divisão pelo número de ações é o passo que produz o LPA a partir do lucro total. O painel mostrará cada etapa numerada para conferência.

## De onde vêm os números

- Nº total de ações: já disponível na coleta do Valuation FCD (brapi/CVM-B3, campo `acoes`). Reaproveitado.
- Lucro líquido projetado do próximo ano: consulta de IA com busca web restrita a casas de análise (BTG Pactual Research, incluindo a URL informada) e ao RI da empresa; retorna valor, ano-base e as fontes com link.
- Payout: dois modos, com o usuário podendo alternar:
  1. Histórico (padrão): payout médio calculado com proventos da B3 já no app ÷ lucro líquido do período.
  2. Manual: campo editável em % para o usuário arbitrar.
  Se a IA encontrar payout declarado em política de dividendos/RI, ele aparece como sugestão.
- Divisor Bazin: o mesmo já configurado em Ajustes (`useBazinDivisor`).

## Interface

- Cabeçalho "Preço Teto Projetivo" com o valor em destaque e InfoTip explicando o método.
- Tabela de memória de cálculo: Lucro projetado, Nº de ações, LPA, Payout, DPA, Divisor, Preço teto projetivo.
- Comparação com o preço atual: desconto/prêmio em % (mesmas cores de sucesso/perigo do painel atual).
- Linha comparando teto projetivo x teto histórico (Bazin 5 anos), para ver se a projeção é mais otimista ou conservadora.
- Botão "Buscar projeção" (ou atualização automática ao expandir, com cache), badge de cache, lista de fontes clicáveis e aviso de que projeções não são recomendação de investimento.
- Estados claros: sem nº de ações, sem lucro projetado encontrado, ou payout indisponível → mensagem dizendo exatamente qual dado falta.

## Detalhes técnicos

- `src/lib/preco-teto-projetivo.ts`: funções puras (LPA, DPA, teto projetivo, desconto) — testáveis e sem I/O.
- `src/lib/preco-teto-projetivo.functions.ts`: `createServerFn` fino que chama o gateway de IA (Gemini com busca) pedindo lucro líquido projetado, payout e fontes, devolvendo JSON estruturado + markdown; cache em memória de 24h, mesmo padrão de `market-analysis.functions.ts`.
- Nº de ações vindo do resultado de valuation já em cache (`use-valuation`), sem nova chamada quando disponível.
- `src/components/PrecoTetoProjetivoPanel.tsx` renderizado em `StockDetailModal.tsx` entre `PrecoTetoPanel` e `ValuationPanel`.
- Persistência do payout manual por ticker em localStorage, no mesmo estilo do divisor Bazin.
