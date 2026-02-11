"use client";

import { useSignupForm } from "./_hooks/use-signup-form";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Building2,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Phone,
  FileText,
  Ticket,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthLayout } from "@/components/auth/auth-layout";
import { useState } from "react";

export default function SignupPage() {
  const { state, actions } = useSignupForm();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <AuthLayout
      sideContent={
        <>
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            <h2 className="text-5xl font-bold mb-6 text-gray-900 dark:text-white tracking-tight">
              Comece sua jornada <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                rumo ao sucesso.
              </span>
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
              Ferramentas poderosas para quem quer ir além do básico.
            </p>
          </motion.div>
        </>
      }
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md mx-auto py-12"
      >
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight mb-3">
            Crie sua conta
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            {state.step === 1
              ? "Passo 1 de 2: Seus Dados"
              : "Passo 2 de 2: Sua Empresa"}
          </p>
        </div>

        <form
          onSubmit={
            state.step === 2
              ? actions.handleSubmit
              : (e) => {
                  e.preventDefault();
                  actions.nextStep();
                }
          }
          className="space-y-5"
        >
          {state.step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-5"
            >
              {/* Nome do Usuário */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Seu Nome
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={state.formData.nome}
                    onChange={(e) =>
                      actions.handleChange("nome", e.target.value)
                    }
                    className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl px-12 py-3.5 outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all placeholder:text-gray-400"
                    placeholder="João Silva"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="email"
                    value={state.formData.email}
                    onChange={(e) =>
                      actions.handleChange("email", e.target.value)
                    }
                    className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl px-12 py-3.5 outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all placeholder:text-gray-400"
                    placeholder="seu@email.com"
                    required
                  />
                </div>
              </div>

              {/* Telefone */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Telefone / WhatsApp
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="tel"
                    value={state.formData.telefone}
                    onChange={(e) =>
                      actions.handleChange(
                        "telefone",
                        actions.formatTelefone(e.target.value),
                      )
                    }
                    className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl px-12 py-3.5 outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all placeholder:text-gray-400"
                    placeholder="(11) 99999-9999"
                    required
                  />
                </div>
              </div>

              {/* Senhas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Senha
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={state.formData.password}
                      onChange={(e) =>
                        actions.handleChange("password", e.target.value)
                      }
                      className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl px-12 py-3.5 outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all placeholder:text-gray-400"
                      placeholder="••••••••"
                      required
                      minLength={8}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Confirmar
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={state.formData.confirmPassword}
                      onChange={(e) =>
                        actions.handleChange("confirmPassword", e.target.value)
                      }
                      className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl px-12 py-3.5 outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all placeholder:text-gray-400"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  {showPassword ? "Ocultar senha" : "Mostrar senha"}
                </button>
              </div>
            </motion.div>
          )}

          {state.step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              {/* Nome da Empresa */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nome da Empresa
                </label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={state.formData.nomeEmpresa}
                    onChange={(e) =>
                      actions.handleChange("nomeEmpresa", e.target.value)
                    }
                    className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl px-12 py-3.5 outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all placeholder:text-gray-400"
                    placeholder="Minha Loja Inc."
                    required
                  />
                </div>
              </div>

              {/* CPF/CNPJ */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  CPF ou CNPJ
                </label>
                <div className="relative">
                  <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={state.formData.cpfCnpj}
                    onChange={(e) =>
                      actions.handleChange(
                        "cpfCnpj",
                        actions.formatCpfCnpj(e.target.value),
                      )
                    }
                    className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl px-12 py-3.5 outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all placeholder:text-gray-400"
                    placeholder="000.000.000-00 ou 00.000.000/0000-00"
                    required
                  />
                </div>
              </div>

              {/* Endereço - CEP */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  CEP
                </label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={state.formData.cep}
                    onChange={(e) =>
                      actions.handleChange(
                        "cep",
                        actions.formatCep(e.target.value),
                      )
                    }
                    onBlur={actions.handleCepBlur}
                    className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl px-12 py-3.5 outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all placeholder:text-gray-400"
                    placeholder="00000-000"
                    required
                  />
                  {state.loadingCep && (
                    <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin w-4 h-4 text-blue-500" />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Logradouro
                  </label>
                  <input
                    type="text"
                    value={state.formData.logradouro}
                    onChange={(e) =>
                      actions.handleChange("logradouro", e.target.value)
                    }
                    className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                    placeholder="Rua..."
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Número
                  </label>
                  <input
                    id="numero"
                    type="text"
                    value={state.formData.numero}
                    onChange={(e) =>
                      actions.handleChange("numero", e.target.value)
                    }
                    className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                    placeholder="123"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Bairro
                  </label>
                  <input
                    type="text"
                    value={state.formData.bairro}
                    onChange={(e) =>
                      actions.handleChange("bairro", e.target.value)
                    }
                    className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                    placeholder="Centro"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Cidade - UF
                  </label>
                  <input
                    type="text"
                    value={
                      state.formData.cidade && state.formData.uf
                        ? `${state.formData.cidade} - ${state.formData.uf}`
                        : ""
                    }
                    readOnly
                    className="w-full bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-3.5 outline-none text-gray-500 cursor-not-allowed"
                    placeholder="Cidade - UF"
                  />
                </div>
              </div>

              {/* Cupom */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Cupom de Desconto (Opcional)
                </label>
                <div className="relative flex gap-2">
                  <div className="relative flex-1">
                    <Ticket className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      value={state.formData.cupom}
                      onChange={(e) => {
                        actions.handleChange(
                          "cupom",
                          e.target.value.toUpperCase(),
                        );
                      }}
                      className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl pl-12 pr-4 py-3.5 outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all placeholder:text-gray-400"
                      placeholder="CUPOM"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={actions.validateCupom}
                    disabled={!state.formData.cupom || state.validatingCupom}
                    className="h-[50px] px-6"
                  >
                    {state.validatingCupom ? (
                      <Loader2 className="animate-spin w-4 h-4" />
                    ) : (
                      "Aplicar"
                    )}
                  </Button>
                </div>
                {state.cupomStatus && (
                  <p className={`text-sm ${state.cupomStatus.color} mt-1`}>
                    {state.cupomStatus.message}
                  </p>
                )}
              </div>

              <div className="flex items-start gap-3 pt-2">
                <input
                  type="checkbox"
                  id="terms"
                  checked={state.formData.termsAccepted}
                  onChange={(e) =>
                    actions.handleChange("termsAccepted", e.target.checked)
                  }
                  required
                  className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                />
                <label
                  htmlFor="terms"
                  className="text-sm text-gray-500 dark:text-gray-400"
                >
                  Eu concordo com os{" "}
                  <Link
                    href="/termos"
                    className="text-blue-600 hover:underline"
                    target="_blank"
                  >
                    Termos de Serviço
                  </Link>{" "}
                  e{" "}
                  <Link
                    href="/privacidade"
                    className="text-blue-600 hover:underline"
                    target="_blank"
                  >
                    Política de Privacidade
                  </Link>
                  .
                </label>
              </div>
            </motion.div>
          )}

          {state.error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-sm font-medium"
            >
              <AlertTriangle size={16} />
              {state.error}
            </motion.div>
          )}

          {state.success && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg text-sm font-medium"
            >
              <CheckCircle2 size={16} />
              {state.success}
            </motion.div>
          )}

          <div className="flex gap-4">
            {state.step === 2 && (
              <Button
                type="button"
                variant="outline"
                onClick={actions.prevStep}
                disabled={state.loading}
                className="w-1/3 h-14 text-lg font-bold rounded-xl flex items-center justify-center gap-2"
              >
                Voltar
              </Button>
            )}
            <Button
              type="submit"
              disabled={state.loading}
              className={`h-14 text-lg font-bold rounded-xl flex items-center justify-center gap-2 ${
                state.step === 2 ? "w-2/3" : "w-full"
              }`}
            >
              {state.loading ? (
                <Loader2 className="animate-spin w-5 h-5" />
              ) : (
                <>
                  {state.step === 1 ? "Próximo" : "Criar Conta"}
                  <ArrowRight size={20} />
                </>
              )}
            </Button>
          </div>
        </form>
        {/* ... Login Link ... */}
        <div className="mt-8 text-center pb-8">
          <p className="text-gray-500 dark:text-gray-400">
            Já tem uma conta?{" "}
            <Link
              href="/login"
              className="text-blue-600 font-bold hover:underline"
            >
              Fazer login
            </Link>
          </p>
        </div>
      </motion.div>
    </AuthLayout>
  );
}
