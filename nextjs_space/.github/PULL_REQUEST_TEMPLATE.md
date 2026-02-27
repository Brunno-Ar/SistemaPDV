## O que mudou?

- Implementado Painel de Precificação Dinâmica de Planos na conta Master (`/master/planos`).
- Adicionada funcionalidade de edição do valor da assinatura.
- Sincronização em tempo real do novo valor da assinatura com a API do Asaas.

## Como testar?

1. Faça login como conta Master.
2. Acesse a área de Planos / Precificação Dinâmica.
3. Edite o valor da assinatura de uma empresa e salve.
4. Verifique no painel do Asaas se a assinatura foi atualizada com sucesso.
5. Confirme se os dados também persistem localmente (se aplicável).

## Screenshots

(Adicione screenshots aqui)

## Checklist QA

- [ ] Sincronização com Asaas funciona perfeitamente.
- [ ] Validações de UI (loading state, toast messages).
- [ ] Proteção de rotas garantindo acesso exclusivo ao Master.
- [ ] Nenhum impacto nas cobranças vigentes antes da virada dociclo (se assim desejado).
