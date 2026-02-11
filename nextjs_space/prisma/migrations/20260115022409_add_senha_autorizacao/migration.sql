-- CreateEnum
CREATE TYPE "Role" AS ENUM ('master', 'admin', 'caixa', 'gerente');

-- CreateEnum
CREATE TYPE "StatusEmpresa" AS ENUM ('PENDENTE', 'ATIVO', 'PAUSADO', 'EM_TESTE', 'CANCELADO');

-- CreateEnum
CREATE TYPE "StatusCaixa" AS ENUM ('ABERTO', 'FECHADO');

-- CreateEnum
CREATE TYPE "MetodoPagamento" AS ENUM ('dinheiro', 'debito', 'credito', 'pix');

-- CreateEnum
CREATE TYPE "TipoMovimentacao" AS ENUM ('ENTRADA', 'AJUSTE_QUEBRA', 'AJUSTE_INVENTARIO', 'DEVOLUCAO', 'VENDA');

-- CreateEnum
CREATE TYPE "TipoMovimentacaoCaixa" AS ENUM ('SANGRIA', 'SUPRIMENTO', 'ABERTURA');

-- CreateEnum
CREATE TYPE "CicloPlano" AS ENUM ('MENSAL', 'ANUAL');

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "password" TEXT,
    "nome" TEXT,
    "role" "Role" NOT NULL DEFAULT 'caixa',
    "empresa_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "meta_mensal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "must_change_password" BOOLEAN NOT NULL DEFAULT false,
    "tour_completed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "empresas" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "status" "StatusEmpresa" NOT NULL DEFAULT 'PENDENTE',
    "plano" TEXT NOT NULL DEFAULT 'PRO',
    "vencimento_plano" TIMESTAMP(3),
    "dia_vencimento" INTEGER NOT NULL DEFAULT 10,
    "telefone" TEXT,
    "cpf_cnpj" TEXT,
    "asaas_customer_id" TEXT,
    "asaas_subscription_id" TEXT,
    "webhook_event_id" TEXT,
    "ciclo" "CicloPlano" NOT NULL DEFAULT 'MENSAL',
    "endereco_logradouro" TEXT DEFAULT '',
    "endereco_numero" TEXT DEFAULT '',
    "endereco_bairro" TEXT DEFAULT '',
    "endereco_cidade" TEXT DEFAULT '',
    "endereco_uf" TEXT DEFAULT '',
    "endereco_cep" TEXT DEFAULT '',
    "liberacao_temporaria_ate" TIMESTAMP(3),
    "ultimo_desbloqueio" TIMESTAMP(3),
    "cupom_aplicado" TEXT,
    "senha_autorizacao" TEXT,
    "ciclo_pagamento" TEXT NOT NULL DEFAULT 'MENSAL',
    "forma_pagamento" TEXT NOT NULL DEFAULT 'BOLETO_PIX',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "preco_venda" DECIMAL(10,2) NOT NULL,
    "preco_compra" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "estoque_atual" INTEGER NOT NULL DEFAULT 0,
    "estoque_minimo" INTEGER NOT NULL DEFAULT 5,
    "imagem_url" TEXT,
    "empresa_id" TEXT,
    "category_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lotes" (
    "id" TEXT NOT NULL,
    "numero_lote" TEXT NOT NULL,
    "data_validade" TIMESTAMP(3),
    "preco_compra" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "quantidade" INTEGER NOT NULL DEFAULT 0,
    "produto_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_compra" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "empresa_id" TEXT,
    "data_hora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valor_total" DECIMAL(10,2) NOT NULL,
    "valor_recebido" DECIMAL(10,2),
    "troco" DECIMAL(10,2),
    "metodo_pagamento" "MetodoPagamento" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_payments" (
    "id" TEXT NOT NULL,
    "sale_id" TEXT NOT NULL,
    "method" "MetodoPagamento" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sale_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_items" (
    "id" TEXT NOT NULL,
    "sale_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "preco_unitario" DECIMAL(10,2) NOT NULL,
    "custo_unitario" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "desconto_aplicado" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimentacoes_estoque" (
    "id" TEXT NOT NULL,
    "produto_id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "tipo" "TipoMovimentacao" NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "motivo" TEXT,
    "lote_id" TEXT,
    "data_movimentacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimentacoes_estoque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "avisos" (
    "id" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "importante" BOOLEAN NOT NULL DEFAULT false,
    "lido" BOOLEAN NOT NULL DEFAULT false,
    "empresa_id" TEXT,
    "remetente_id" TEXT NOT NULL,
    "destinatario_id" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "avisos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caixas" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "saldo_inicial" DECIMAL(10,2) NOT NULL,
    "saldo_final" DECIMAL(10,2),
    "valor_informado_dinheiro" DECIMAL(10,2),
    "valor_informado_pix" DECIMAL(10,2),
    "valor_informado_cartao" DECIMAL(10,2),
    "valor_informado_maquininha" DECIMAL(10,2),
    "justificativa" TEXT,
    "quebra_de_caixa" DECIMAL(10,2),
    "divergencia_dinheiro" DECIMAL(10,2),
    "status" "StatusCaixa" NOT NULL DEFAULT 'ABERTO',
    "data_abertura" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_fechamento" TIMESTAMP(3),

    CONSTRAINT "caixas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimentacoes_caixa" (
    "id" TEXT NOT NULL,
    "caixa_id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "tipo" "TipoMovimentacaoCaixa" NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "metodo_pagamento" "MetodoPagamento",
    "descricao" TEXT,
    "data_hora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimentacoes_caixa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cancelamentos" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "feedback" TEXT,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cancelamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cupons" (
    "codigo" TEXT NOT NULL,
    "desconto_porcentagem" DOUBLE PRECISION NOT NULL,
    "valido_ate" TIMESTAMP(3),
    "usos_atuais" INTEGER NOT NULL DEFAULT 0,
    "limite_usos" INTEGER,

    CONSTRAINT "cupons_pkey" PRIMARY KEY ("codigo")
);

-- CreateTable
CREATE TABLE "notes" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "color" TEXT DEFAULT 'yellow',
    "user_id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" TEXT NOT NULL DEFAULT 'ESTOQUE',
    "movimentacao_estoque_id" TEXT,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "empresas_cpf_cnpj_key" ON "empresas"("cpf_cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "empresas_asaas_customer_id_key" ON "empresas"("asaas_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "empresas_asaas_subscription_id_key" ON "empresas"("asaas_subscription_id");

-- CreateIndex
CREATE INDEX "categories_empresa_id_idx" ON "categories"("empresa_id");

-- CreateIndex
CREATE INDEX "products_empresa_id_idx" ON "products"("empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_empresa_id_key" ON "products"("sku", "empresa_id");

-- CreateIndex
CREATE INDEX "lotes_produto_id_idx" ON "lotes"("produto_id");

-- CreateIndex
CREATE INDEX "lotes_data_validade_idx" ON "lotes"("data_validade");

-- CreateIndex
CREATE INDEX "sales_empresa_id_idx" ON "sales"("empresa_id");

-- CreateIndex
CREATE INDEX "sale_payments_sale_id_idx" ON "sale_payments"("sale_id");

-- CreateIndex
CREATE INDEX "sale_payments_method_idx" ON "sale_payments"("method");

-- CreateIndex
CREATE INDEX "avisos_empresa_id_idx" ON "avisos"("empresa_id");

-- CreateIndex
CREATE INDEX "avisos_destinatario_id_idx" ON "avisos"("destinatario_id");

-- CreateIndex
CREATE INDEX "caixas_usuario_id_idx" ON "caixas"("usuario_id");

-- CreateIndex
CREATE INDEX "caixas_empresa_id_idx" ON "caixas"("empresa_id");

-- CreateIndex
CREATE INDEX "caixas_status_idx" ON "caixas"("status");

-- CreateIndex
CREATE INDEX "movimentacoes_caixa_caixa_id_idx" ON "movimentacoes_caixa"("caixa_id");

-- CreateIndex
CREATE INDEX "movimentacoes_caixa_usuario_id_idx" ON "movimentacoes_caixa"("usuario_id");

-- CreateIndex
CREATE INDEX "notes_user_id_idx" ON "notes"("user_id");

-- CreateIndex
CREATE INDEX "notes_empresa_id_idx" ON "notes"("empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX "expenses_movimentacao_estoque_id_key" ON "expenses"("movimentacao_estoque_id");

-- CreateIndex
CREATE INDEX "expenses_empresa_id_idx" ON "expenses"("empresa_id");

-- CreateIndex
CREATE INDEX "expenses_date_idx" ON "expenses"("date");

-- CreateIndex
CREATE INDEX "expenses_category_idx" ON "expenses"("category");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_payments" ADD CONSTRAINT "sale_payments_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes_estoque" ADD CONSTRAINT "movimentacoes_estoque_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes_estoque" ADD CONSTRAINT "movimentacoes_estoque_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes_estoque" ADD CONSTRAINT "movimentacoes_estoque_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes_estoque" ADD CONSTRAINT "movimentacoes_estoque_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "lotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avisos" ADD CONSTRAINT "avisos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avisos" ADD CONSTRAINT "avisos_remetente_id_fkey" FOREIGN KEY ("remetente_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avisos" ADD CONSTRAINT "avisos_destinatario_id_fkey" FOREIGN KEY ("destinatario_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caixas" ADD CONSTRAINT "caixas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caixas" ADD CONSTRAINT "caixas_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes_caixa" ADD CONSTRAINT "movimentacoes_caixa_caixa_id_fkey" FOREIGN KEY ("caixa_id") REFERENCES "caixas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes_caixa" ADD CONSTRAINT "movimentacoes_caixa_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cancelamentos" ADD CONSTRAINT "cancelamentos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_movimentacao_estoque_id_fkey" FOREIGN KEY ("movimentacao_estoque_id") REFERENCES "movimentacoes_estoque"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
