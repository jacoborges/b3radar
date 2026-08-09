# Preço Teto calculado com os dados da B3 do próprio app

## O que muda para o usuário

- O Preço Teto deixa de depender da IA para obter os números: ele passa a usar a mesma tabela "Dividendos + JCP — ano atual e últimos cinco anos" já importada da B3 e exibida logo abaixo, garantindo coerência entre as duas seções.
- Cálculo, ano a ano, apenas com os 5 anos fechados (ano−5 a ano−1); o ano corrente (parcial) é ignorado:
  1. Total do ano = dividendos + JCP daquele ano (valor exato da B3).
  2. Soma dos 5 totais anuais ÷ 5 = média ponderada.
  3. Média ÷ divisor (0,06 padrão, ajustável em Configurações) = Preço Teto.
- O valor aparece imediatamente ao abrir o ativo, sem precisar clicar em "Calcular" e sem espera de IA.
- A janela mostra uma pequena tabela dos 5 anos (Ano | Dividendos | JCP | Total), a soma, a média e o preço teto, além do selo de desconto/prêmio sobre o preço atual (como hoje).
- Se algum dos 5 anos não tiver dado da B3, o ano é exibido como "sem dado" e a janela avisa que a média foi calculada com os anos disponíveis (soma ÷ 5 continua sendo a regra, sinalizando que pode subestimar).
- A consulta à IA (Gemini, restrita a RI/B3/CVM) permanece disponível como conferência opcional, em um botão "Conferir com IA": ela não altera mais o preço teto, apenas exibe o texto comparativo e as fontes. Quando a IA apontar divergência, a janela mostra o aviso e a faixa mín.–máx. como informação complementar.

## Detalhes técnicos

- `src/components/PrecoTetoPanel.tsx`: passa a receber `historico: DividendYear[] | null` do modal. Calcula localmente `anos = historico.filter(y => y.year >= anoAtual-5 && y.year <= anoAtual-1)`, `total = dividendo + jcp`, `soma`, `media = soma / 5`, `teto = media / divisor`. Renderiza a mini-tabela e mantém o selo de comparação com `precoAtual`. O bloco de IA vira secundário (colapsado/opcional) e não alimenta mais `tetoMin/tetoMax`.
- `src/components/StockDetailModal.tsx`: passa `historico={proventos?.historico ?? null}` para `<PrecoTetoPanel />`.
- `src/lib/preco-teto.functions.ts`: mantido como está (usado apenas pelo botão de conferência); nenhum ajuste de prompt necessário.
- Sem mudanças de banco de dados.
