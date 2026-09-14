# Plano — “Visualizar somente” por setores

## Objetivo
Adicionar um seletor de setores compartilhado entre a página inicial e a Inteligência de Proventos. Cada usuário verá somente os setores marcados, e sua preferência ficará salva na própria conta.

## Experiência do usuário
- Incluir o botão **“Visualizar somente”** junto aos controles de busca/filtros nas duas páginas.
- Abrir uma janela responsiva e rolável com todos os setores disponíveis, em ordem alfabética, cada um com sua caixa de seleção.
- Oferecer ações **“Selecionar todos”** e **“Limpar seleção”**, além de indicar quantos setores estão selecionados.
- Considerar todos os setores selecionados na primeira utilização, preservando o comportamento atual.
- Aplicar imediatamente a escolha às listas e contagens das duas páginas; setores desmarcados não serão exibidos.
- Manter os demais filtros, rankings e a ordenação interna dos ativos funcionando apenas sobre os setores escolhidos.
- Exibir uma mensagem clara quando nenhum setor estiver selecionado ou quando os filtros não encontrarem ativos.

## Preferência compartilhada
- Acrescentar à configuração individual da conta o conjunto de setores escolhidos, protegido para leitura e alteração somente pelo próprio usuário.
- Criar um hook compartilhado que carregue a preferência salva, mantenha um cache local para resposta imediata e sincronize alterações com a conta.
- Reconciliar automaticamente a seleção com a lista atual de setores: setores novos entram selecionados por padrão, e nomes que deixarem de existir são ignorados.
- Usar a mesma preferência na página inicial e na Inteligência de Proventos, garantindo sincronização entre telas e aparelhos.

## Implementação técnica
- Criar um componente reutilizável para a janela “Visualizar somente”, usando os componentes de botão, diálogo e checkbox já existentes no projeto.
- Estender `user_settings` com uma coluna JSON para os setores selecionados, mantendo RLS e permissões existentes.
- Ampliar as funções autenticadas de preferências para ler e salvar a seleção sem expor configurações de outros usuários.
- Inserir o filtro setorial antes do agrupamento na página inicial e no ranking da Inteligência de Proventos, sem gerar novas consultas de mercado.
- Contabilizar a seleção como filtro ativo e fornecer uma dica explicativa ao passar o cursor sobre o novo controle.

## Validação
- Confirmar persistência após recarregar, navegar entre as duas páginas e entrar novamente na conta.
- Verificar seleção total, parcial, vazia e surgimento de um setor novo.
- Testar a janela e as listas em desktop, smartphone vertical/horizontal e tablet, sem ultrapassar as margens da tela.
- Executar a verificação de tipos e validar que não houve novas chamadas de dados apenas por alterar setores.
