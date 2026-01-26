# 🚀 Flow PDV (SaaS) - Ecossistema de Gestão para Varejo

<div align="center">

![Banner Flow PDV](https://via.placeholder.com/1200x400?text=Flow+PDV+-+Enterprise+SaaS+Solution)

[![Status](https://img.shields.io/badge/Status-Em_Desenvolvimento-blue?style=for-the-badge)]()
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)]()
[![Stack](https://img.shields.io/badge/Tech-Next.js_14_|_Prisma_|_Postgres-black?style=for-the-badge)]()

**Gestão Multi-Tenant • Controle Financeiro Rigoroso • Estoque Inteligente (FEFO)**

[Ver Demo Online](flowpdv.com) • [Reportar Bug](https://github.com/brunno-Ar/flow-pdv/issues)

</div>

---

## 📖 Sobre o Projeto

O **Flow PDV** é uma plataforma **SaaS (Software as a Service)** completa, projetada para modernizar a gestão de pequenos e médios comércios.

Diferente de PDVs comuns, o Flow foi arquitetado para resolver as dores reais do varejo: **quebra de caixa**, **produtos vencidos** e **falta de clareza no lucro real**. O sistema opera em uma arquitetura **Multi-tenant** segura, onde uma única instância atende milhares de lojas com isolamento total de dados.

---

## ✨ Destaques da Última Atualização

O sistema recebeu melhorias significativas focadas em **Segurança** e **Monetização**:

- **🎟️ Sistema de Cupons (Master):** Nova engine de cupons para planos de assinatura. O Master agora pode criar cupons (ex: `BLACKFRIDAY50`) com regras de limite de uso, validade temporária e rastreamento de quais empresas utilizaram.
- **�️ Monitor de Inatividade:** Segurança reforçada com bloqueio automático de sessão. Usuários inativos por período prolongado são desconectados automaticamente, prevenindo acesso não autorizado em terminais PDV abandonados.
- **🎭 Layouts Adaptativos por Role:** A interface agora transmuta dependendo do nível de acesso (Master, Admin, Gerente, Caixa), entregando apenas as ferramentas pertinentes a cada função e reduzindo a complexidade visual.

---

## �📸 Galeria de Funcionalidades

|                          **Dashboard Gerencial (Dark Mode)**                           |                       **Frente de Caixa (PDV Ágil)**                        |
| :------------------------------------------------------------------------------------: | :-------------------------------------------------------------------------: |
| ![Dashboard](https://via.placeholder.com/500x300?text=Dashboard+com+Graficos+de+Lucro) | ![PDV](https://via.placeholder.com/500x300?text=Tela+de+Vendas+com+Atalhos) |
|                      _Visão clara de Faturamento x Custo x Lucro_                      |            _Venda rápida com atalhos (F2/F12) e busca otimizada_            |

|                           **Gestão de Equipe & Metas**                            |                               **Auditoria de Caixa**                                |
| :-------------------------------------------------------------------------------: | :---------------------------------------------------------------------------------: |
| ![Equipe](https://via.placeholder.com/500x300?text=Perfil+do+Funcionario+e+Metas) | ![Auditoria](https://via.placeholder.com/500x300?text=Auditoria+de+Fechamento+Cego) |
|                      _Definição de metas e mural de avisos_                       |                     _Conferência de quebra de caixa e sangrias_                     |

---

## 🧠 Engenharia & Diferenciais Técnicos

Este projeto implementa lógicas de negócio complexas geralmente encontradas apenas em ERPs Enterprise:

### 1. 💰 Inteligência Financeira (Profitability Engine)

- **Custo Histórico (Snapshot):** O sistema não calcula o lucro baseando-se no custo _atual_ do produto. No momento da venda, gravamos um "snapshot" do custo médio ponderado daquele lote específico. Isso garante relatórios de lucratividade 100% precisos, imunes à inflação futura do estoque.
- **Auditoria de Caixa Blindada:** Implementação de **Fechamento Cego**. O operador informa o valor na gaveta sem saber o esperado pelo sistema. O Admin recebe um relatório detalhado de Sobra/Falta (Quebra de Caixa), Sangrias e Suprimentos.

### 2. 📦 Estoque FEFO (First Expired, First Out)

- O sistema gerencia múltiplos lotes por produto.
- Ao realizar uma venda, o algoritmo baixa automaticamente o estoque do lote com a **validade mais próxima**, reduzindo desperdícios e perdas por vencimento.

### 3. 🔐 Arquitetura SaaS Multi-Tenant

- **Isolamento Lógico:** Middleware e Services garantem que dados de uma empresa (Produtos, Vendas, Clientes) sejam estritamente inacessíveis para outras tenants.
- **RBAC (Role-Based Access Control):** Sistema granular de permissões:
  - `Master`: Dono do SaaS (Gestão de Cupons, Assinaturas, Métricas Globais).
  - `Admin`: Dono da Loja (Acesso total à sua empresa).
  - `Gerente`: Gestão operacional (Estoque, Relatórios), sem acesso a RH/Financeiro sensível.
  - `Caixa`: Acesso restrito ao PDV e Fechamento.

---

## 🛠️ Stack Tecnológica

O projeto utiliza as tecnologias mais modernas do ecossistema React para garantir performance, tipagem segura e DX (Developer Experience).

- **Core:** [Next.js 14](https://nextjs.org/) (App Router & Server Actions)
- **Linguagem:** [TypeScript](https://www.typescriptlang.org/) (Strict Mode)
- **Banco de Dados:** [PostgreSQL](https://www.postgresql.org/) (via Supabase)
- **ORM:** [Prisma](https://www.prisma.io/) (Schema robusto com Relations & Enums)
- **Estilização:** [Tailwind CSS](https://tailwindcss.com/) + [Shadcn/UI](https://ui.shadcn.com/)
- **Animações:** [Framer Motion](https://www.framer.com/motion/) (Micro-interações e Layouts fluidos)
- **Gráficos:** [Recharts](https://recharts.org/) (Analytics financeiro)
- **Onboarding:** [React Joyride](https://docs.react-joyride.com/) (Tour guiado para novos usuários)
- **Upload:** AWS S3 (Armazenamento de imagens de produtos)

---

## 🚀 Como Rodar Localmente

### Pré-requisitos

- Node.js 18+
- PostgreSQL (Local ou Docker)

### Instalação

1.  **Clone o repositório:**

    ```bash
    git clone https://github.com/seu-usuario/flow-pdv.git
    cd flow-pdv
    ```

2.  **Instale as dependências:**

    ```bash
    npm install
    ```

3.  **Configure as variáveis de ambiente:**
    Crie um arquivo `.env` baseado no exemplo e adicione suas credenciais do Banco e Auth.

4.  **Setup do Banco de Dados:**

    ```bash
    # Cria as tabelas e roda o Seed (Dados iniciais de teste)
    npm run reset-db
    ```

5.  **Rode o projeto:**
    ```bash
    npm run dev
    ```
    Acesse `http://localhost:3000`.

---

## 🗺️ Roadmap (Próximos Passos)

- [x] Gestão de Lotes e Validade (FEFO)
- [x] Controle Financeiro (Caixa e DRE)
- [x] Gestão de Equipe e Metas
- [x] Mural de Avisos Internos
- [x] **Sistema de Cupons & Descontos (SaaS)**
- [ ] **Impressão Térmica:** Geração de cupom não-fiscal (PDF/Raw).
- [x] **PWA:** Funcionalidade Offline-first e instalação no Desktop/Mobile.
- [ ] **Integração WhatsApp:** Envio de comprovantes via API.

---

## 🤝 Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para abrir Issues ou enviar Pull Requests.

## 📄 Licença

Este projeto está sob a licença MIT.

---

<div align="center">
  Desenvolvido com 💙 por <strong>Bruno Araujo</strong>
  <br>
  <a href="https://www.linkedin.com/in/brunno-araujo">LinkedIn</a> • <a href="https://github.com/brunno-Ar">GitHub</a>
</div>
