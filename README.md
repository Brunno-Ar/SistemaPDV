# PDV SaaS Multi-Tenant com Gestão de Estoque

Um sistema de Ponto de Venda (PDV) robusto, construído como um Software as a Service (SaaS), utilizando uma arquitetura Multi-Tenant e Supabase para gerenciamento completo de dados e autenticação.

## 🚀 Conceito do Projeto

Este projeto vai além de um simples PDV. É uma plataforma SaaS projetada para que múltiplos clientes (lojas) possam usar o mesmo sistema de forma totalmente isolada e segura.

O "dono" da plataforma (o `master`) pode criar e gerenciar "Empresas" clientes, enquanto cada "Empresa" (`admin`) gerencia seus próprios produtos, vendas e operadores (`caixa`).

## 🔑 Principais Features

* **Arquitetura Multi-Tenant:** Cada dado (Produto, Venda, Usuário) é vinculado a uma `empresa_id`, garantindo que um lojista jamais veja os dados de outro.
* **Segurança com RLS (Row Level Security):** Utiliza as políticas de RLS do Supabase para garantir que as queries ao banco de dados sejam *automaticamente* filtradas por inquilino (tenant).
* **Hierarquia de Funções (3 Níveis):**
    * `master`: O dono do SaaS. Cria e gerencia as empresas clientes.
    * `admin`: O dono da loja (cliente). Gerencia seu estoque, produtos e seus funcionários.
    * `caixa`: O operador da loja. Apenas registra vendas.
* **Gestão de Estoque Nível 2:**
    * **Ciclo de Vida Completo:** O estoque não é apenas "abatido". Ele é gerenciado por uma tabela de `Movimentacoes_Estoque`.
    * **Auditoria:** Cada `ENTRADA`, `AJUSTE`, `DEVOLUÇÃO` ou `VENDA` gera um registro imutável, permitindo um rastreamento perfeito do inventário.
    * **Alertas:** Sistema de `estoque_minimo` para notificar o `admin` sobre a necessidade de reposição.


## 📜 Status do Projeto

Projeto em desenvolvimento, focado na construção do back-office (Nível 2) e na estruturação da arquitetura SaaS.
