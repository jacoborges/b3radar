# Valuation (FCD) com erro mesmo com o token brapi cadastrado

## O que eu verifiquei

No seu navegador, o resultado guardado do Valuation (ex.: BBSE3) foi buscado com a chave `["valuation-inputs","BBSE3","anon"]` — ou seja, **a consulta saiu sem o token**, embora o token esteja salvo em `b3radar:brapi-token`. A fonte respondeu 401 e o app gravou:

```text
errorCode: "sem-token"
error: "A fonte de demonstrações financeiras exige um token. Cadastre seu token brapi em Ajustes..."
```

Causa: o hook que lê o token (`useBrapiToken`) começa com string vazia e só carrega o valor do armazenamento **depois** da primeira renderização. O painel de Valuation dispara a consulta nesse primeiro instante, sem token. Como o resultado (mesmo sendo erro) é guardado em cache por 1 dia e o cache é persistido no navegador, o erro fica congelado na tela — e reabrir o ativo devolve o mesmo erro guardado.

Não confirmei ainda se, **com** o token, a fonte libera os módulos contábeis para o seu plano (o teste anônimo funciona daqui, mas o servidor do app recebe 401). Isso será verificado como primeiro passo da correção, e a mensagem passará a mostrar o motivo real devolvido pela fonte.

## O que será feito

1. **Ler o token de forma síncrona**, já na primeira renderização, para que a consulta nunca saia como "anônima" quando existe token salvo.
2. **Não travar a consulta enquanto o token ainda não foi lido**: o painel só dispara a coleta depois que o estado do token está resolvido.
3. **Não guardar erro em cache**: respostas com `errorCode` deixam de ser persistidas por 1 dia — ao reabrir o ativo, o app tenta de novo automaticamente.
4. **Mensagem honesta**: exibir o motivo real da fonte (token inválido, módulo não incluído no plano, limite de consultas) em vez de sempre pedir para cadastrar o token que já está cadastrado.
5. **Verificar em execução** se o plano brapi libera os módulos contábeis com o seu token; se não liberar, manter a cadeia de fontes (Yahoo → brapi com token → brapi anônimo) e informar claramente que a limitação é do plano.
6. Aplicar a mesma leitura síncrona do token nos demais pontos que hoje sofrem da mesma corrida (cotações ao vivo e fundamentos), evitando a primeira chamada sem token.

## Detalhes técnicos

- `src/hooks/use-live-quotes.ts`: `useBrapiToken` passa a inicializar via `useSyncExternalStore` (ou `useState` com leitura no cliente + flag `ready`), expondo `ready` além do valor; `useEffect` continua ouvindo `storage` e o evento customizado.
- `src/hooks/use-valuation.ts`: `enabled` passa a exigir `ready`; `queryKey` continua com o marcador de token.
- `src/lib/query-persist.ts`: `shouldDehydrateQuery` exclui resultados cujo `data.errorCode` não é nulo.
- `src/lib/valuation.server.ts`: propagar o `message` do corpo de erro da brapi em `error`, distinguindo "token ausente" de "token sem permissão para o módulo"; manter a ordem de fontes atual.
- `src/components/ValuationPanel.tsx`: texto de erro por código, incluindo o novo caso "plano sem acesso às demonstrações".
- Sem mudanças de banco de dados e sem chamadas de IA.
