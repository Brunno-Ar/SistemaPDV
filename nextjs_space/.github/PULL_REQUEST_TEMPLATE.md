## O que mudou?

- Implementação da feature `anotacoes-sidebar`.
- Adicionada nova tabela `Note` no schema do Prisma.
- Criadas rotas de API para CRUD de anotações (`/api/notes`).
- Implementada interface de usuário com suporte a cores e sticky notes.
- Adicionado item "Anotações" na sidebar para Gerente, Admin e Caixa (oculto para Master).

## Como testar?

1. Execute `npx prisma db push` para atualizar o banco local.
2. Acesse com um usuário não-master (Gerente ou Caixa).
3. Navegue até "Anotações" na sidebar.
4. Tente criar, editar e excluir uma nota.
5. Verifique a persistência dos dados.
6. Acesse com usuário Master e confirme que a aba não existe.

## Checklist QA

- [ ] CRUD de notas funcionando.
- [ ] Layout responsivo.
- [ ] Permissões corretas (Master bloqueado na UI).
- [ ] Design conforme solicitado (Bloco de notas).
