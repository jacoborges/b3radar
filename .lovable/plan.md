# Plano: Botões de explicação (?) para as classes de proventos e parâmetros do score

## Objetivo
Tornar o app auto-explicativo: adicionar botões de interrogação (já usados nos dados fundamentalistas via `InfoTip`) ao lado das classificações **Elite / Consistente / Regular / Irregular / Sem cobertura** e dos cinco parâmetros do score, para que qualquer usuário entenda o significado de cada valor ao usá-lo.

## Arquivos envolvidos
- `src/lib/dividend-intelligence.ts` — onde mora a lógica de classificação (somente leitura hoje).
- `src/components/InfoTip.tsx` — componente de tooltip (?) já existente.
- `src/components/DividendIntelligencePanel.tsx` — exibe o badge de classe e os 5 itens do breakdown.
- `src/routes/_authenticated/dividendos.tsx` — filtro por classe + distribuição por classe.

## Passo 1 — Criar um mapa de explicação das classes (`dividend-intelligence.ts`)
Adicionar um `CLASS_INFO: Record<DividendClass, { label; color; criterio; fundamentalista; tecnica }>` exportado, contendo para cada uma das 5 classes:
- **Elite** — score ≥ 80 **e** frequência mensal/trimestral. Pagador de altíssima previsibilidade.
- **Consistente** — score ≥ 65. Pagador regular, com bom histórico mas sem atingir os dois critérios do Elite.
- **Regular** — score ≥ 45. Paga, mas com falhas de regularidade ou consistência.
- **Irregular** — score ≥ 20. Pagamentos esporádicos ou com cortes relevantes.
- **Sem cobertura** — score < 20 ou sem histórico de proventos em dinheiro.

Cada entrada traz `fundamentalista` (o que significa e o critério) e `tecnica` (relevância para a decisão de investimento).

Também adicionar `BREAKDOWN_INFO: Record<chave, { fundamentalista; tecnica }>` explicando cada um dos 5 fatores do score (Regularidade, Consecutividade, Consistência de valor, Cobertura, Ausência de cortes), com peso e o que mede.

## Passo 2 — Criar componente `ClassificationInfoTip`
Novo componente em `src/components/InfoTip.tsx` (exportado junto) que renderiza um `InfoTip` com uma **tabela compacta de todas as 5 classes** (bolinha colorida + nome + faixa de score + 1 linha de significado), destacando a classe atual quando informada, seguido das explicações fundamentalista/técnica. Reutiliza o popover/popovercontent já existente.

## Passo 3 — `DividendIntelligencePanel.tsx`: adicionar InfoTips
1. Ao lado do badge de classificação (linha ~203), inserir um `ClassificationInfoTip` com a classe atual destacada — explica todas as 5 faixas e onde a ação se encaixa.
2. Ao lado de cada `BreakdownItem` (linhas 194-200), adicionar um `InfoTip` com a explicação de `BREAKDOWN_INFO[chave]` — peso do fator, o que mede e por que importa.

## Passo 4 — `dividendos.tsx`: enriquecer explicações
1. Substituir o `InfoTip` curto atual (linha 264-268) do filtro "Classe de provento" por um `ClassificationInfoTip` completo com a tabela das 5 faixas.
2. Adicionar um `ClassificationInfoTip` no cabeçalho "Distribuição por classe" (linha ~493) explicando o que cada classe significa.

## Resultado
Cada classificação e cada parâmetro do score passa a ter um (?) que explica de forma didática o significado e o critério — mantendo o padrão visual já usado nos indicadores fundamentalistas, sem mudar lógica de cálculo nem dados.
