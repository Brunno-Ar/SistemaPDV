## O que mudou?

- Adicionada página `/admin/caixa` para o perfil Admin.
- Reutilizado componente `MeuCaixa` para permitir operações de caixa na conta Admin.
- Movido componente `CaixasVisaoGeral` da Dashboard Admin para a nova aba Caixa.
- Adicionado item "Caixa" na sidebar do Admin.

## Como testar?

1. Faça login como Admin (Gerente).
2. Verifique se o item "Caixa" aparece na sidebar.
3. Acesse a aba "Caixa".
4. Teste as operações de caixa (abrir, suprimento, sangria, fechar).
5. Verifique se a seção "Visão Geral da Loja" aparece abaixo do caixa.
6. Volte à Dashboard e verifique se o card "Visão Geral" sumiu.

## Screenshots

(Adicione screenshots aqui)

## Checklist QA

- [ ] Item na sidebar presente apenas para Admin.
- [ ] Funcionalidades de MeuCaixa operacionais.
- [ ] Dashboard limpa (sem card duplicado).
