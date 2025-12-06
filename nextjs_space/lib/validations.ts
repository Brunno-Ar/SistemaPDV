import { z } from "zod";

// ============================================
// ESQUEMAS DE VALIDAÇÃO ZOD
// Use estes schemas para validar formulários
// ============================================

// --- PRODUTO ---
export const productSchema = z.object({
  nome: z
    .string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome pode ter no máximo 100 caracteres"),
  sku: z
    .string()
    .min(1, "SKU é obrigatório")
    .max(50, "SKU pode ter no máximo 50 caracteres"),
  descricao: z
    .string()
    .max(500, "Descrição pode ter no máximo 500 caracteres")
    .optional(),
  precoVenda: z
    .number({ invalid_type_error: "Preço de venda deve ser um número" })
    .positive("Preço de venda deve ser maior que zero"),
  precoCompra: z
    .number({ invalid_type_error: "Preço de compra deve ser um número" })
    .min(0, "Preço de compra não pode ser negativo"),
  estoqueAtual: z
    .number({ invalid_type_error: "Estoque deve ser um número" })
    .int("Estoque deve ser um número inteiro")
    .min(0, "Estoque não pode ser negativo"),
  estoqueMinimo: z
    .number({ invalid_type_error: "Estoque mínimo deve ser um número" })
    .int("Estoque mínimo deve ser um número inteiro")
    .min(0, "Estoque mínimo não pode ser negativo"),
  unidadeMedida: z.string().min(1, "Unidade de medida é obrigatória"),
  categoriaId: z.string().optional(),
});

export type ProductFormValues = z.infer<typeof productSchema>;

// --- FUNCIONÁRIO ---
export const employeeSchema = z.object({
  nome: z
    .string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome pode ter no máximo 100 caracteres"),
  email: z
    .string()
    .email("E-mail inválido")
    .max(100, "E-mail pode ter no máximo 100 caracteres"),
  password: z
    .string()
    .min(6, "Senha deve ter pelo menos 6 caracteres")
    .optional()
    .or(z.literal("")),
  role: z.enum(["funcionario", "gerente", "admin"], {
    errorMap: () => ({ message: "Selecione um cargo válido" }),
  }),
  metaMensal: z
    .number({ invalid_type_error: "Meta deve ser um número" })
    .min(0, "Meta não pode ser negativa")
    .optional()
    .nullable(),
});

export type EmployeeFormValues = z.infer<typeof employeeSchema>;

// --- LOGIN ---
export const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

// --- ALTERAR SENHA ---
export const changePasswordSchema = z
  .object({
    senhaAtual: z.string().min(1, "Senha atual é obrigatória"),
    novaSenha: z.string().min(6, "Nova senha deve ter pelo menos 6 caracteres"),
    confirmarSenha: z.string().min(1, "Confirmação é obrigatória"),
  })
  .refine((data) => data.novaSenha === data.confirmarSenha, {
    message: "As senhas não coincidem",
    path: ["confirmarSenha"],
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

// --- RECUPERAR SENHA ---
export const forgotPasswordSchema = z.object({
  email: z.string().email("E-mail inválido"),
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

// --- CADASTRO DE EMPRESA ---
export const signupSchema = z.object({
  empresaNome: z
    .string()
    .min(2, "Nome da empresa deve ter pelo menos 2 caracteres"),
  cnpj: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.replace(/\D/g, "").length === 14,
      "CNPJ deve ter 14 dígitos"
    ),
  nome: z.string().min(2, "Seu nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

export type SignupFormValues = z.infer<typeof signupSchema>;

// --- CAIXA ---
export const abrirCaixaSchema = z.object({
  saldoInicial: z
    .number({ invalid_type_error: "Valor deve ser um número" })
    .min(0, "Valor não pode ser negativo"),
});

export type AbrirCaixaFormValues = z.infer<typeof abrirCaixaSchema>;

export const movimentacaoCaixaSchema = z.object({
  valor: z
    .number({ invalid_type_error: "Valor deve ser um número" })
    .positive("Valor deve ser maior que zero"),
  metodoPagamento: z.enum(["dinheiro", "pix", "credito", "debito"], {
    errorMap: () => ({ message: "Selecione um método de pagamento" }),
  }),
  descricao: z
    .string()
    .max(200, "Descrição pode ter no máximo 200 caracteres")
    .optional(),
});

export type MovimentacaoCaixaFormValues = z.infer<
  typeof movimentacaoCaixaSchema
>;

// --- LOTE ---
export const loteSchema = z.object({
  numeroLote: z.string().min(1, "Número do lote é obrigatório"),
  quantidade: z
    .number({ invalid_type_error: "Quantidade deve ser um número" })
    .int("Quantidade deve ser um número inteiro")
    .positive("Quantidade deve ser maior que zero"),
  dataValidade: z.date().optional().nullable(),
  dataFabricacao: z.date().optional().nullable(),
  precoCompra: z
    .number({ invalid_type_error: "Preço deve ser um número" })
    .min(0, "Preço não pode ser negativo")
    .optional()
    .nullable(),
});

export type LoteFormValues = z.infer<typeof loteSchema>;

// --- AVISO ---
export const avisoSchema = z.object({
  mensagem: z
    .string()
    .min(1, "Mensagem é obrigatória")
    .max(500, "Mensagem pode ter no máximo 500 caracteres"),
  importante: z.boolean().default(false),
});

export type AvisoFormValues = z.infer<typeof avisoSchema>;

// --- CATEGORIA ---
export const categorySchema = z.object({
  nome: z
    .string()
    .min(1, "Nome é obrigatório")
    .max(50, "Nome pode ter no máximo 50 caracteres"),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;
