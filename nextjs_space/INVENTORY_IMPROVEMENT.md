# Guia para Implementação do Estoque Perfeito

Este documento detalha o roteiro técnico e operacional para corrigir as inconsistências do sistema de estoque atual e transformar a gestão de lotes na "única fonte da verdade" (Single Source of Truth), garantindo integridade de dados e auditoria completa.

---

## 1. O Problema Atual: "Estoque Híbrido e Opcional"

Atualmente, o sistema opera em um estado híbrido perigoso:

1.  **Product.estoqueAtual**: Funciona como um cache simples (um número inteiro).
2.  **Lote (Batches)**: Tabela detalhada com validades e quantidades.

**A Falha Crítica:**
O sistema permite criar Movimentações de Estoque (Entradas ou Saídas Manuais) que atualizam o `estoqueAtual` **sem** atualizar nenhum `Lote`.
*   *Exemplo:* O usuário registra uma "Quebra" de 5 unidades. O sistema reduz o `estoqueAtual` de 100 para 95. Porém, os lotes continuam somando 100.
*   **Resultado:** "Estoque Fantasma". Quando o sistema tentar vender (usando FEFO), ele achará que tem 100, mas só tem 95 reais, causando erros na hora da venda.

---

## 2. A Solução: Arquitetura "Lote-First"

Para ter um estoque perfeito, devemos adotar a regra: **"Todo item pertence a um lote."**

### Regras de Ouro
1.  **Imutabilidade do Cache**: O campo `Product.estoqueAtual` deve ser **sempre** igual à soma de `Lote.quantidade` daquele produto. Nunca deve ser editado diretamente sem afetar um lote.
2.  **Rastreabilidade Total**: Toda linha na tabela `MovimentacaoEstoque` deve apontar para um `loteId` específico. (Exceto talvez correções de migração, mas idealmente sempre).

---

## 3. Roteiro de Implementação (Passo a Passo)

### Passo 1: Melhoria no Banco de Dados (Schema)
Precisamos vincular as movimentações aos lotes formalmente, não apenas em texto.

**Ação:** Adicionar o campo `loteId` na tabela `MovimentacaoEstoque`.

```prisma
// Em prisma/schema.prisma

model MovimentacaoEstoque {
  id        String   @id @default(cuid())
  // ... outros campos
  loteId    String?  @map("lote_id") // Novo campo

  lote      Lote?    @relation(fields: [loteId], references: [id])
  // ...
}
```

### Passo 2: Refatoração da API de Movimentações (`/api/admin/movimentacoes`)
A API deve ser "estrita".

**Mudanças na Lógica (POST):**
1.  **Entrada (Compra/Produção):**
    *   **Obrigatório:** O usuário deve criar um novo Lote OU selecionar um Lote existente para adicionar a quantidade.
    *   *Bloqueio:* Rejeitar entradas sem definição de lote.
2.  **Saída Manual (Perda/Quebra/Uso Interno):**
    *   **Obrigatório:** O usuário deve selecionar de **qual lote** o item foi perdido.
    *   *Por que?* Se um iogurte venceu, você sabe qual lote era. Se um vidro quebrou, você sabe qual era.
    *   *Fallback (Opcional):* Se o usuário não souber, o sistema pode oferecer um botão "Auto-selecionar (FEFO)" que desconta do lote mais antigo automaticamente (igual à venda).

### Passo 3: Refatoração da Interface (Frontend)
O modal de "Ajuste de Estoque" precisa mudar.

1.  **Remover** a edição simples de número (+/-).
2.  **Adicionar** um seletor de Lotes.
    *   Ao selecionar "Tipo: Quebra", mostrar dropdown: "Selecione o Lote afetado".
    *   Mostrar a quantidade disponível em cada lote no dropdown (ex: "Lote A - Vence 12/12 - Qtd: 50").

### Passo 4: Rotina de Auto-Cura (Self-Healing)
Como já existem dados inconsistentes, precisamos de uma ferramenta para arrumar a casa.

**Criar script/endpoint `/api/admin/recalculate-stock`:**
1.  Percorre todos os produtos.
2.  Calcula `Soma = sum(Lote.quantidade)`.
3.  Compara `Soma` com `Product.estoqueAtual`.
4.  Se diferente, atualiza `Product.estoqueAtual` para igualar a `Soma`.
    *   *Nota:* Isso assume que os Lotes são a verdade. Se o usuário diz que tem 100 no produto mas os lotes somam 80, o sistema corrigirá para 80.

---

## 4. Benefícios do "Estoque Perfeito"

1.  **Auditoria Real**: Saber exatamente quanto de cada lote foi perdido ou vendido.
2.  **Prevenção de Venda Sem Estoque**: O sistema FEFO nunca falhará pois o total baterá com os lotes.
3.  **Controle de Validade Preciso**: Relatórios de "Próximos a Vencer" serão 100% confiáveis.
4.  **Valor de Estoque Real**: O cálculo financeiro (Preço de Compra x Qtd) será exato, pois cada lote tem seu preço de compra preservado.

## Resumo da Ação Imediata (Para você)

Se você quiser seguir este caminho, o próximo passo prático é me autorizar a fazer a alteração no `schema.prisma` (Passo 1) e refatorar a API de movimentações (Passo 2). Isso garantirá que, daqui para frente, seu estoque seja blindado.
