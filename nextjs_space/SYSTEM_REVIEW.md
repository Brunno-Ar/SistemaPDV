# Relatório de Revisão do Sistema Nexus PDV

## Resumo Executivo

A revisão do código revelou um sistema bem estruturado em termos de organização de pastas e uso de tecnologias modernas (Next.js App Router, Prisma, Shadcn/UI). A segurança e a separação de inquilinos (multi-tenancy) estão bem implementadas.

No entanto, foram identificados **problemas críticos de escalabilidade e desempenho** que impactarão o sistema à medida que o volume de dados crescer. A lógica de PDV e de gerenciamento de estoque, embora funcional, possui gargalos significativos.

---

## 1. Banco de Dados e Desempenho (Backend)

### 🔴 Crítico
*   **Índices Faltantes**: As tabelas `products` e `sales` não possuem índices nas colunas `empresa_id`. Como todas as consultas filtram por empresa, isso causará lentidão extrema (Full Table Scans) conforme o banco crescer.
    *   *Recomendação*: Adicionar índices compostos `@@index([empresaId, nome])` em Products e `@@index([empresaId, dataHora])` em Sales.
*   **SKU Globalmente Único**: O campo `sku` na tabela `products` possui uma restrição `@unique` global. Isso impede que duas empresas diferentes cadastrem produtos com o mesmo código de barras (ex: Coca-Cola).
    *   *Recomendação*: Alterar a restrição para ser única apenas dentro da empresa: `@@unique([sku, empresaId])`.
*   **Cálculo de Estoque Ineficiente**: A função `recalcularEstoqueCache` (usada após cada venda) lê e soma *todos* os lotes de um produto para atualizar o cache. Isso é O(N) e ficará lento.
    *   *Recomendação*: Usar operações atômicas de decremento (`increment`/`decrement`) no campo `estoqueAtual`.

### 🟡 Médio
*   **Ordenação em Memória**: A função `descontarLotesFEFO` busca os lotes e os ordena via Javascript (`sort`). O banco de dados é muito mais eficiente nisso.
    *   *Recomendação*: Usar `orderBy: { dataValidade: 'asc' }` na query do Prisma.

---

## 2. Front-end e Experiência do Usuário

### 🔴 Crítico
*   **Carregamento de Produtos no PDV**: A tela de Vendas (`VenderClient`) baixa **todos** os produtos da empresa de uma vez (`fetch('/api/products')`) ao carregar. Para lojas com milhares de itens, isso travará o navegador do caixa.
    *   *Recomendação*: Implementar paginação ou busca assíncrona (buscar apenas quando o usuário digita).
*   **Waterfall de Imagens**: O componente `ProductImage` faz uma requisição API individual (`/api/products/image`) para obter a URL assinada de *cada* produto na tela. Se houver 50 produtos, serão 50 requisições simultâneas, sobrecarregando o servidor.
    *   *Recomendação*: Gerar as URLs assinadas no backend na listagem inicial de produtos ou usar um componente de imagem que aceite a chave pública diretamente se possível.
*   **Ausência de Responsividade**: O layout do PDV (grid de produtos + carrinho lateral) não se adapta a telas menores (celulares/tablets). O carrinho é empurrado para o final da página, tornando o uso móvel inviável.

---

## 3. Segurança e Arquitetura

### 🟢 Pontos Positivos
*   **Isolamento de Tenants**: O `middleware.ts` e as rotas de API verificam corretamente o `empresaId` da sessão, prevenindo vazamento de dados entre clientes.
*   **Validação de Status**: O sistema bloqueia corretamente logins de empresas pendentes ou com pagamento atrasado.

### 🟡 Atenção
*   **Custo Unitário Impreciso**: O sistema usa `product.precoCompra` como snapshot do custo no momento da venda. Se o produto tiver vários lotes com preços de compra diferentes, o custo registrado na venda pode não refletir o custo real do lote específico que foi baixado (FEFO).
    *   *Recomendação*: O `SaleItem` deve pegar o `precoCompra` do `Lote` que foi efetivamente consumido, ou o sistema deve manter um Custo Médio Ponderado atualizado no produto.

---

## 4. Plano de Ação Recomendado

Para estabilizar o sistema, recomendo a seguinte ordem de correções:

1.  **Banco de Dados**: Criar os índices faltantes e corrigir a constraint de SKU.
2.  **Performance do PDV**: Refatorar a busca de produtos para ser feita sob demanda (search-as-you-type) em vez de carregar tudo.
3.  **Lógica de Estoque**: Otimizar a baixa de estoque (FEFO) para usar ordenação do banco e evitar recálculos desnecessários.
4.  **Responsividade**: Ajustar o CSS da tela de vendas para funcionar em tablets (layout flexível).
