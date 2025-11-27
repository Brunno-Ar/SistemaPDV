# 🚀 Nexus PDV (SaaS) - Plataforma de Gestão Multi-Tenant

![Status](https://img.shields.io/badge/Status-Em_Desenvolvimento-blue?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

> **Uma solução Enterprise para gestão de varejo, arquitetada para escalar.**
> O Nexus PDV não é apenas um ponto de venda; é um ecossistema SaaS completo que permite a gestão centralizada de múltiplas empresas, com controle financeiro rigoroso, gestão de estoque inteligente (FEFO) e hierarquia de acesso granular.

---

## 📸 Screenshots

| **Painel do Master (SaaS)** | **Frente de Caixa (PDV)** |
|:---:|:---:|
| ![Master Dashboard](https://via.placeholder.com/500x300?text=Painel+Master+SaaS) | ![PDV Screen](https://via.placeholder.com/500x300?text=Tela+de+Vendas) |
| *Gestão global de assinantes e planos* | *Interface ágil para vendas rápidas* |

---

## 🧠 Diferenciais Técnicos & Arquitetura

Este projeto se destaca pela implementação de regras de negócio complexas e uma arquitetura multi-tenant segura.

### 🔐 Arquitetura SaaS Multi-Tenant
- **Isolamento de Dados:** Middleware de segurança que garante que dados de uma empresa (Produtos, Vendas, Clientes) sejam inacessíveis para outras.
- **Hierarquia de Roles:** Sistema robusto de permissões (`Master` > `Admin` > `Caixa`) implementado via *NextAuth* e *Server-Side Logic*.
- **Fluxo de Aprovação:** Empresas criadas via Signup entram como `PENDENTE` e exigem aprovação manual ou automática do Master para ativação.

### 📦 Gestão de Estoque Avançada (FEFO)
Diferente de PDVs comuns, este sistema implementa lógica **FEFO (First Expired, First Out)**:
- O sistema rastreia **Lotes e Validades**.
- Ao realizar uma venda, o backend (`/api/sales`) desconta automaticamente do lote com vencimento mais próximo.
- Previne prejuízos com produtos vencidos e garante a rotatividade correta do estoque.

### 👑 "God Mode" (Painel Master)
O Super Admin (Master) possui ferramentas exclusivas de gestão:
- **Spy Mode:** Capacidade de visualizar o dashboard financeiro de qualquer cliente em tempo real para auditoria.
- **Gestão de Ciclo de Vida:** Ações atômicas para `Aprovar`, `Pausar` (Inadimplência) ou `Renovar` planos de assinatura.

---

## ✨ Funcionalidades Principais

### 🏢 Para o Lojista (Cliente do SaaS)
* **Frente de Caixa (PDV):**
    * Busca rápida de produtos por Nome ou SKU.
    * Carrinho dinâmico com cálculo de descontos por item.
    * Múltiplos métodos de pagamento (Pix, Crédito, Débito, Dinheiro).
* **Gestão Financeira:**
    * **Controle de Caixa:** Abertura e Fechamento com cálculo automático de quebra de caixa.
    * **Relatórios:** Lucro líquido, Margem de contribuição e Gráficos de desempenho (Recharts).
* **Equipe:**
    * Criação de contas para operadores de caixa com acesso restrito.

### 🛠️ Para o Desenvolvedor (Stack)

O projeto foi construído com a stack mais moderna do ecossistema React/Node:

* **Frontend:** [Next.js 14 (App Router)](https://nextjs.org/) - Server Components & Server Actions.
* **Linguagem:** [TypeScript](https://www.typescriptlang.org/) - Tipagem estrita para segurança do código.
* **Estilização:** [Tailwind CSS](https://tailwindcss.com/) + [Shadcn/UI](https://ui.shadcn.com/) - Design System consistente e acessível.
* **Banco de Dados:** [PostgreSQL](https://www.postgresql.org/) - Relacional e robusto.
* **ORM:** [Prisma](https://www.prisma.io/) - Modelagem de dados e Migrations.
* **Auth:** [NextAuth.js v4](https://next-auth.js.org/) - Autenticação segura com JWT.
* **Armazenamento:** [AWS S3](https://aws.amazon.com/s3/) - Upload de imagens de produtos.

---

## 🚀 Instalação e Execução

Siga os passos abaixo para rodar o projeto localmente:

### Pré-requisitos
* Node.js 18+
* PostgreSQL (Local ou Docker)
* Conta na AWS (para S3 - opcional)

### 1. Clone o repositório
```bash
git clone [https://github.com/seu-usuario/nexus-pdv.git](https://github.com/seu-usuario/nexus-pdv.git)
cd nexus-pdv
