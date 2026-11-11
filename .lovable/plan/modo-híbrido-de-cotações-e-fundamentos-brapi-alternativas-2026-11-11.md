# Modo híbrido de cotações e fundamentos (BRAPI + alternativas)

## O que muda para você
- Em **Ajustes**, além do token da BRAPI, surgem novos campos de chave: **Bolsai**, **HG Brasil Finance** e **Partnr** (todos opcionais, com link para criar conta grátis e botão "Testar chave").
- Um seletor **Modo de dados**: *Somente BRAPI*, *Híbrido (recomendado)* ou *Prioridade alternativa*.
- No modo Híbrido o app consulta a BRAPI primeiro e, quando ela falhar, atingir o limite ou deixar um dado em branco, completa automaticamente com as outras fontes que tiverem chave.
- Cada ativo mostra discretamente de onde veio o dado (ex.: "BRAPI", "Bolsai"), e o indicador de cotações disponíveis/indisponíveis passa a contar todas as fontes.
- O informativo de consultas no cabeçalho mostra o uso de cada serviço no dia.

## Como cada fonte é aproveitada
- **Preço e variação:** BRAPI → HG Brasil → Bolsai.
- **Fundamentos (P/L, P/VP, ROE, EV/EBITDA, margens, dívida):** BRAPI → Bolsai → Partnr; campos vazios de uma fonte são preenchidos pela seguinte.
- **Proventos (dividendos e JCP):** fonte atual + Partnr/Bolsai para completar anos faltantes, sem duplicar pagamentos.
- **Selic/CDI:** continua do Banco Central; HG Brasil só como reserva.

## Pontos de atenção
- Os formatos exatos das APIs alternativas serão confirmados na documentação oficial de cada uma durante a implementação; se alguma não tiver o dado prometido no plano grátis, ela fica marcada como "não disponível" nos Ajustes.
- Limites grátis (ex.: ~200 consultas/dia na Bolsai) são respeitados: o app guarda os resultados e só reconsulta quando necessário.

## Detalhes técnicos
- Nova coluna por usuário em `user_settings` (chaves bolsai/hgbrasil/partnr + `data_mode`), RLS do próprio dono; chaves nunca voltam completas ao navegador (apenas mascaradas).
- Adaptadores puros em `src/lib/providers/{brapi,bolsai,hgbrasil,partnr}.ts` normalizando para o formato atual de cotação/fundamentos; `src/lib/providers/merge.ts` faz a fusão por campo com testes.
- `quotes.functions.ts` e `fundamentals.functions.ts` passam a ler as chaves no servidor (usuário autenticado) e chamar o orquestrador; o cache por ticker atual continua o mesmo.
- Testes: prioridade por modo, preenchimento de campos vazios, fallback em erro 401/429, deduplicação de proventos.
