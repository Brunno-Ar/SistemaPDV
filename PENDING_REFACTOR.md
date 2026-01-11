# Status da Refatoração do Frontend - FlowPDV

Este documento detalha o estado atual da refatoração do frontend, identificando o que já foi implementado e o que ainda está pendente para atingir a padronização visual e de código desejada.

## 1. Visão Geral (Status: 🟡 Parcialmente Implementado)

A infraestrutura base (CSS global, variáveis de tema) foi estabelecida, e algumas telas principais (`Estoque`, `Vendas`) receberam atualizações visuais. No entanto, a refatoração profunda de arquitetura (componentização, extração de hooks) e a padronização das interfaces administrativas (`Admin`, `Master`) ainda estão pendentes.

---

## 2. Infraestrutura Global

| Item | Status | Observações |
| :--- | :--- | :--- |
| **Variáveis CSS (`globals.css`)** | ✅ Concluído | Variável `--primary` definida e classes responsivas criadas. |
| **Componente `<PageHeader />`** | ✅ Concluído | Criado em `components/ui/page-header.tsx`. |
| **Componente `<DataTableShell />`** | ❌ Pendente | Tabelas ainda são construídas manualmente em cada página. |
| **Padronização de Formulários** | 🟡 Parcial | Alguns diálogos extraídos, mas lógica ainda acoplada. |

---

## 3. Análise por Módulo

### A. Admin Dashboard (`app/admin`)
**Estado Atual:** Interface antiga com estilos manuais e lógica monolítica.

*   **Problemas Identificados:**
    *   **Header Manual:** Usa `h1` e `div` hardcoded em vez de `<PageHeader />`.
    *   **Cores Hardcoded:** Uso de `bg-red-50`, `text-red-600` em vez de variantes semânticas do tema ou componentes de alerta padrão.
    *   **Lógica Monolítica:** O componente `DashboardClient` faz 3 fetches diferentes num único `useEffect` e mistura lógica de apresentação com busca de dados.
    *   **Notificações:** O componente `NotificationBell` está solto no layout manual.

*   **Ação Necessária:**
    1.  Substituir o topo pelo `<PageHeader />`.
    2.  Criar componentes para os cards de estatísticas (`<DashboardStats />`) e alertas (`<StockAlerts />`).
    3.  Mover a lógica de fetch para um hook `useAdminDashboard`.

### B. Master Dashboard (`app/master`)
**Estado Atual:** Server Component com HTML/Tailwind manual.

*   **Problemas Identificados:**
    *   **Header Manual:** `<header className="flex ...">` implementado manualmente.
    *   **Tabelas Manuais:** Uso de `<table>`, `<thead>`, `<tr>` nativos em vez do componente `Table` do Shadcn UI.
    *   **Visual Inconsistente:** Botões e badges usam classes de cor diretas (`bg-green-100`) em vez de variantes de componentes (`<Badge variant="success">`).
    *   **Mistura de Responsabilidades:** O Server Component faz queries diretas ao banco (correto para performance) mas renderiza todo o HTML complexo diretamente.

*   **Ação Necessária:**
    1.  Implementar `<PageHeader />` adaptado para o contexto Master.
    2.  Substituir a tabela manual pelo componente `<Table>` do UI Kit.
    3.  Extrair a tabela de empresas recentes para `<RecentCompaniesTable data={...} />`.

### C. Estoque (`app/estoque`)
**Estado Atual:** Visual atualizado, mas código ainda monolítico.

*   **Problemas Identificados:**
    *   **Hooks Ausentes:** Lógica de `fetchProducts` e filtros misturada no componente visual.
    *   **Filtros Inline:** O bloco de inputs e selects de filtro ocupa muito espaço no componente principal.
    *   **Tabela Manual:** A renderização da tabela é feita linha a linha dentro do componente principal.

*   **Ação Necessária:**
    1.  Criar hook `useProducts(companyId)` para gerenciar busca e estado.
    2.  Extrair `<ProductFilters />` para limpar o JSX.
    3.  Implementar `<ProductTable />` recebendo os dados já filtrados.

### D. Vendas / POS (`app/vender`)
**Estado Atual:** Funcional e visualmente melhor, mas arquivo gigante (`VenderClient.tsx`).

*   **Problemas Identificados:**
    *   **Arquivo Gigante:** O arquivo `vender-client.tsx` contém toda a lógica de carrinho, busca, atalhos de teclado e renderização.
    *   **Carrinho Acoplado:** A lógica e UI do carrinho estão misturadas com a grade de produtos.
    *   **Busca:** A lógica de debounce e fetch está inline.

*   **Ação Necessária:**
    1.  Extrair componente visual `<CartSummary />`.
    2.  Criar hook `usePOS()` para gerenciar o estado do carrinho e funções de adicionar/remover.
    3.  Componentizar `<ProductGrid />` para separar a exibição da lógica.

### E. Relatórios (`app/relatorios`)
**Estado Atual:** Visualmente coerente, mas código repetitivo.

*   **Problemas Identificados:**
    *   **Cards Repetitivos:** Código dos cards de resumo (Vendas, Lucro) copiado e colado 3 vezes com pequenas variações.
    *   **Gráficos:** Uso direto de `Recharts` no componente principal, poluindo o arquivo.

*   **Ação Necessária:**
    1.  Criar componente `<StatCard title=".." value=".." icon={...} />` para reutilização.
    2.  Extrair gráficos para componentes isolados: `<SalesBarChart />`, `<PaymentMethodPieChart />`.

---

## 4. Plano de Ação Recomendado

Para concluir a refatoração, siga esta ordem de prioridade:

1.  **Refatoração do Admin Dashboard:** É a área com maior discrepância visual e de código atualmente.
    *   [ ] Implementar `PageHeader`.
    *   [ ] Componentizar Cards e Alertas.
2.  **Refatoração do Master Dashboard:** Padronizar tabelas e header.
    *   [ ] Substituir HTML nativo por componentes Shadcn.
3.  **Refatoração Profunda do Estoque:** Limpeza de código (Hooks e Componentes).
    *   [ ] Extrair `useProducts` e `ProductFilters`.
4.  **Refatoração do POS:** Modularização para facilitar manutenção.
    *   [ ] Separar Carrinho e Grid de Produtos.

Este documento deve guiar os próximos passos do desenvolvimento para garantir uma base de código limpa, manutenível e visualmente consistente.
