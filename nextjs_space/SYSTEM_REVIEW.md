# Relatório de Revisão do Sistema Nexus PDV

## Resumo da Revisão (Solicitação: Foco em Lote/Estoque e Limpeza)

Após uma nova varredura completa, com ênfase na lógica de **Lotes** e **Estoque**, confirmo que o código possui redundâncias significativas e lógica "embolada" que prejudica a manutenção e a performance.

Abaixo detalho os problemas encontrados e proponho uma limpeza.

---

## 1. Lógica de Estoque e Lotes (Limpeza Prioritária)

O sistema mantém duas "verdades" sobre o custo e a quantidade, o que causa confusão no código:

### 🔴 Redundância de Cálculo de Custo
*   **Problema**: O campo `Product.precoCompra` existe no banco, mas a rota `GET /api/admin/products` ignora esse valor e recalcula o custo médio "on-the-fly" somando todos os lotes a cada requisição.
*   **Consequência**: Lentidão desnecessária na listagem de produtos e risco de o valor exibido ser diferente do valor salvo no banco.
*   **Solução (Limpeza)**: Remover o cálculo dinâmico no `GET`. Confiar no campo `Product.precoCompra`. Garantir que este campo seja atualizado apenas quando um lote é criado/editado.

### 🔴 Inconsistência na Atualização de Estoque
*   **Problema**:
    *   Ao criar lote (`POST /lotes`), o sistema usa `increment` (soma simples).
    *   Ao vender (`POST /sales`), o sistema chama `recalcularEstoqueCache`, que lê e soma **todos** os lotes do banco novamente.
*   **Consequência**: Código duplicado e operação pesada (O(N)) na venda.
*   **Solução (Limpeza)**: Remover a função `recalcularEstoqueCache`. Usar `decrement` atômico na venda, assim como é feito na criação.

### 🔴 Lógica FEFO "Suja"
*   **Problema**: A função `descontarLotesFEFO` baixa todos os lotes para a memória e os ordena com Javascript. Além disso, possui uma lógica complexa de criar "Lote Automático" se não encontrar lote.
*   **Solução (Limpeza)**:
    1.  Fazer a ordenação via banco (`orderBy: { dataValidade: 'asc' }`).
    2.  Remover a criação de "Lote Automático" (fallback). Se não tem lote, não deve vender (ou deve-se exigir que todo estoque tenha lote). Isso simplifica drasticamente a função.

---

## 2. Banco de Dados e Desempenho (Geral)

Mantém-se a necessidade crítica das correções apontadas anteriormente:

*   **Índices Faltantes**: Tabelas `products`, `sales`, `lotes` precisam de índice em `empresaId`.
*   **SKU Global**: O `sku` precisa ser único apenas por empresa (`@@unique([sku, empresaId])`), senão uma empresa bloqueia o código de barras da outra.

---

## 3. Front-end e UX

*   **VenderClient (PDV)**: Carrega *todos* os produtos de uma vez. Precisa de paginação/busca.
*   **Imagens**: Gera URLs assinadas uma a uma (waterfall).
*   **Responsividade**: O sistema não funciona em celulares/tablets (layout quebra).

---

## Plano de Limpeza Sugerido (Checklist)

Para "desembolar" o código de estoque:

1.  [ ] **Sales Route**: Remover `recalcularEstoqueCache`.
2.  [ ] **Sales Route**: Refatorar `descontarLotesFEFO` para usar ordenação do Prisma e remover a lógica de "Lote Automático".
3.  [ ] **Admin Products Route**: Remover o bloco de código que recalcula o custo médio no `GET` e remover o `include: { lotes }` desnecessário.
4.  [ ] **Schema**: Adicionar os índices de performance.

Esta limpeza deixará o sistema mais leve, mais rápido e mais fácil de entender.
