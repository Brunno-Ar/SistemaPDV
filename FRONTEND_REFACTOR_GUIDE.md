# Guia de Refatoração do Frontend - FlowPDV

Este documento serve como um guia técnico para a refatoração do frontend do projeto FlowPDV. O objetivo é padronizar a identidade visual, reduzir a duplicação de código e simplificar a manutenção futura, garantindo que as interfaces de Admin, Master e Funcionário sigam os mesmos padrões de design.

## 1. Diagnóstico Atual

Identificamos os seguintes pontos de melhoria:
- **Inconsistência Visual:** Cores hardcoded (ex: `#137fec`) espalhadas pelo código em vez de usar variáveis de tema.
- **Desalinhamento de Layout:** Páginas diferentes definem seus títulos e cabeçalhos de formas distintas (algumas usam `h1` direto, outras usam `CardTitle`).
- **Arquivos Monolíticos:** Componentes como `EstoqueClient` e `VenderClient` acumulam muita responsabilidade (UI, busca de dados, lógica de formulário), dificultando alterações simples ("voltas").
- **Duplicação de Lógica:** Lógica de busca, filtragem e modais repetida em várias telas.

---

## 2. Padronização Visual e Temática (O "Universal")

Para resolver o problema de "cores e fontes universais", devemos centralizar tudo no `tailwind.config.ts` e `globals.css`.

### A. Cores (Theme Tokens)
Atualmente, o azul `#137fec` está fixo em vários botões e na sidebar.
**Ação Recomendada:**
1. Atualizar a variável `--primary` no `globals.css` para ser a cor da marca (`#137fec`).
2. Substituir todas as ocorrências de `bg-[#137fec]`, `text-[#137fec]`, `border-[#137fec]` por `bg-primary`, `text-primary`, `border-primary`.

**Exemplo Prático:**
*Antes (EstoqueClient):*
```tsx
<InteractiveHoverButton className="bg-[#137fec] text-white border-[#137fec]">
```
*Depois:*
```tsx
<InteractiveHoverButton className="bg-primary text-primary-foreground border-primary">
```
Isso garante que, se a cor da marca mudar no futuro, basta alterar uma linha no CSS.

### B. Tipografia e Cabeçalhos
Para evitar que o Admin tenha um título tamanho 30px e o Vendedor tamanho 20px:

**Ação Recomendada:**
Criar um componente universal `<PageHeader />`.

```tsx
// components/ui/page-header.tsx
interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode; // Botões de ação (ex: "Novo Produto")
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}
```

**Uso nas páginas:**
Substituir os `div` manuais no topo de `EstoqueClient`, `VenderClient`, etc., por este componente.

---

## 3. Estratégia de Componentização (Reduzindo as "Voltas")

O problema das "voltas" acontece quando precisamos procurar uma função perdida no meio de 800 linhas de código. A solução é quebrar interfaces complexas em componentes menores e focados.

### A. Extração de Formulários (Modais)
Em vez de manter o `Dialog` e todo o seu formulário dentro da página principal:

**Ação Recomendada:**
Criar componentes isolados para criação/edição.
- `app/estoque/_components/product-form-dialog.tsx`
- `app/estoque/_components/category-manager-dialog.tsx`
- `app/estoque/_components/lot-manager-dialog.tsx`

A página principal (`EstoqueClient`) deve apenas gerenciar *quando* o modal abre e *o que acontece* quando ele salva (reload da lista).

### B. Tabelas Padronizadas
Muitas tabelas repetem a lógica de "Carregando", "Vazio" e "Dados".

**Ação Recomendada:**
Criar um componente `<DataTableShell>` ou usar o padrão já existente do `shadcn/ui` de forma mais abstrata.
Se todas as tabelas precisam de paginação e filtros, crie um componente `<SmartTable data={...} columns={...} filterable />`.

---

## 4. Refatoração Específica por Módulo

### Módulo de Estoque (`EstoqueClient`)
1. **Extrair Lógica de Estado:** Mover os `useState` e `useEffect` de busca de produtos para um hook customizado `useProducts(companyId)`.
2. **Componentizar Filtros:** Criar um componente `<ProductFilters />` que recebe `onSearch`, `onCategoryChange`, etc. Isso limpa o JSX principal.
3. **Padronizar Botões:** Usar o mesmo tamanho e variante de botão para "Novo Produto" e "Ver Lotes".

### Módulo de Vendas (`VenderClient`)
1. **Layout de Grid:** Padronizar o grid de produtos para usar as classes responsivas definidas no `globals.css` (ex: `.grid-responsive`).
2. **Carrinho:** Extrair o componente visual do carrinho para `<CartSummary />`.
3. **Feedback Visual:** Garantir que as mensagens de erro (Toasts) usem o componente padrão e não alertas nativos ou divs customizadas.

---

## 5. Passo a Passo para Execução

Para quem for executar esta refatoração, siga esta ordem para evitar quebrar o sistema:

1.  **CSS Global:**
    *   Ajuste o `globals.css` definindo corretamente as cores da marca na variável `--primary`.
    *   Verifique se `--radius` está consistente para botões e inputs.

2.  **Componentes Base:**
    *   Crie o `components/ui/page-header.tsx`.
    *   Verifique se `components/ui/button.tsx` e `input.tsx` estão seguindo o tema.

3.  **Refatoração Tela a Tela (Começando pelo Estoque):**
    *   Substitua o cabeçalho manual pelo `<PageHeader />`.
    *   Substitua as cores hardcoded (`#137fec`) por classes `primary`.
    *   Extraia o formulário de "Novo Produto" para um arquivo separado.
    *   Teste a funcionalidade (Criar, Editar, Excluir) para garantir que nada quebrou.

4.  **Refatoração Tela de Vendas:**
    *   Alinhe o topo da página com o `<PageHeader />` (mesmo que não tenha botões de ação).
    *   Padronize os cards de produtos para terem a mesma sombra e borda dos cards do Estoque.

5.  **Verificação Final:**
    *   Navegue como "Admin", "Master" e "Funcionário".
    *   Verifique se a Sidebar, Títulos e Botões parecem pertencer à mesma "família" visual.

---

## 6. Dicas de Manutenção

*   **Nunca use Hexadecimal direto no componente:** Se precisar de uma cor, use `bg-red-500` (Tailwind) ou variáveis CSS (`var(--destructive)`).
*   **Evite layouts manuais:** Se perceber que está escrevendo `flex flex-col gap-4 p-4` em toda página, crie um componente wrapper.
*   **Pense em Mobile:** Use as classes utilitárias `.container-responsive` e `.grid-responsive` criadas no `globals.css` para garantir que o layout se adapte sem precisar de media queries manuais em cada arquivo.
