# Prompt administrativo da Análise de Mercado — IA

## Objetivo

Permitir que somente o administrador defina, em **Configurações**, palavras, critérios e orientações adicionais para refinar a análise aberta pelo ícone de interrogação ao lado de cada ativo.

## Configuração administrativa

- Adicionar em Configurações uma seção **Prompt da Análise de Mercado — IA**, visível apenas para o papel `admin`.
- Exibir uma caixa de texto ampla e responsiva com o complemento atualmente salvo.
- Incluir ações **Salvar** e **Restaurar padrão**, com confirmação de sucesso e tratamento de erro.
- Limitar e validar o texto para evitar conteúdo vazio acidental, tamanho excessivo ou instruções que quebrem o formato necessário da resposta.
- Gestores e usuários comuns não verão a seção e também não poderão ler ou alterar o prompt por chamadas diretas.

## Funcionamento da análise

- Manter a finalidade atual: modelo de negócio, perenidade, lucros, efetividade operacional, visão das casas e termômetro Compra/Neutro/Venda.
- Tratar o texto do administrador como **orientações adicionais**, combinado no servidor com as regras fixas que preservam o formato e o aviso de conteúdo informativo.
- Aplicar automaticamente o complemento salvo a todos os ativos, substituindo no momento da consulta os dados próprios do ticker, nome e setor.
- Após salvar ou restaurar, invalidar a versão anterior do cache da Análise de Mercado para que a próxima consulta use o novo refinamento; os demais caches financeiros não serão afetados.

## Dados e segurança

- Criar uma configuração global do aplicativo para o prompt e sua data de atualização, acessível diretamente apenas pelo serviço interno.
- Criar funções autenticadas separadas para consultar e alterar essa configuração, sempre validando no servidor o papel de administrador.
- A própria consulta da Análise de Mercado exigirá uma sessão autenticada e lerá a configuração no servidor, sem expor controles ou dados administrativos no navegador.
- Manter a chave de IA e as instruções fixas exclusivamente no servidor.

## Ajustes de estabilidade incluídos

- Finalizar e validar o histórico de acessos já em implementação, incluindo o ícone INFO exclusivo do administrador e o encerramento seguro no logout.
- Corrigir a divergência de carregamento observada na página de login, preservando o redirecionamento de quem já está conectado.

## Validação

- Confirmar que o administrador consegue salvar, reabrir e restaurar o complemento do prompt.
- Confirmar que gestor e usuário não veem a configuração e recebem bloqueio ao tentar acessá-la diretamente.
- Executar uma análise real e verificar que o refinamento salvo foi aplicado sem perder o termômetro nem as seções atuais.
- Verificar que uma alteração no prompt gera nova análise em vez de reutilizar resposta produzida com a versão anterior.
- Validar Configurações e o diálogo da análise em computador e celular, além do fluxo autenticado do histórico de acessos.
