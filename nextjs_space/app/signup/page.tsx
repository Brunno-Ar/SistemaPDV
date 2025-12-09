"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Sparkles } from "@/components/Sparkles";
import { AuthLayout } from "@/components/auth/auth-layout";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nome, setNome] = useState("");
  const [nomeEmpresa, setNomeEmpresa] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");

  // Endereço
  const [cep, setCep] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [loadingCep, setLoadingCep] = useState(false);

  // Cupom
  const [cupom, setCupom] = useState("");
  const [cupomStatus, setCupomStatus] = useState<{
    valid: boolean;
    message: string;
    color: string;
  } | null>(null);
  const [validatingCupom, setValidatingCupom] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const router = useRouter();

  // Formatações
  const formatTelefone = (value: string): string => {
    const numbers = value.replace(/\D/g, "").slice(0, 11);
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 6)
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 10)
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(
        6
      )}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(
      7
    )}`;
  };

  const formatCpfCnpj = (value: string): string => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 11) {
      if (numbers.length <= 3) return numbers;
      if (numbers.length <= 6)
        return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
      if (numbers.length <= 9)
        return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(
          6
        )}`;
      return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(
        6,
        9
      )}-${numbers.slice(9, 11)}`;
    } else {
      const cnpj = numbers.slice(0, 14);
      if (cnpj.length <= 2) return cnpj;
      if (cnpj.length <= 5) return `${cnpj.slice(0, 2)}.${cnpj.slice(2)}`;
      if (cnpj.length <= 8)
        return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5)}`;
      if (cnpj.length <= 12)
        return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(
          5,
          8
        )}/${cnpj.slice(8)}`;
      return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(
        5,
        8
      )}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`;
    }
  };

  const formatCep = (value: string) => {
    return value
      .replace(/\D/g, "")
      .replace(/^(\d{5})(\d)/, "$1-$2")
      .slice(0, 9);
  };

  // Handlers
  const handleCepBlur = async () => {
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length !== 8) return;

    setLoadingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setLogradouro(data.logradouro);
        setBairro(data.bairro);
        setCidade(data.localidade);
        setUf(data.uf);
        document.getElementById("numero")?.focus();
      }
    } catch (e) {
      console.error("Erro ao buscar CEP", e);
    } finally {
      setLoadingCep(false);
    }
  };

  const validateCupom = async () => {
    if (!cupom) return;
    setValidatingCupom(true);
    setCupomStatus(null);
    try {
      const res = await fetch("/api/cupons/validate", {
        method: "POST",
        body: JSON.stringify({ codigo: cupom }),
      });
      const data = await res.json();
      if (res.ok) {
        setCupomStatus({
          valid: true,
          message: data.mensagem,
          color: "text-green-600",
        });
      } else {
        setCupomStatus({
          valid: false,
          message: data.error,
          color: "text-red-500",
        });
      }
    } catch (e) {
      setCupomStatus({
        valid: false,
        message: "Erro ao validar cupom",
        color: "text-red-500",
      });
    } finally {
      setValidatingCupom(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError("As senhas não coincidem");
      setLoading(false);
      return;
    }

    try {
      const payload = {
        email: email.toLowerCase(),
        password,
        nome,
        nomeEmpresa,
        telefone: telefone.replace(/\D/g, ""),
        cpfCnpj: cpfCnpj.replace(/\D/g, ""),
        // Endereço
        cep: cep.replace(/\D/g, ""),
        logradouro,
        numero,
        bairro,
        cidade,
        uf,
        // Cupom (apenas se validado ou preenchido)
        cupom: cupom && cupomStatus?.valid ? cupom : undefined,
        // Termos
        termsAccepted,
      };

      const signupResponse = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const signupData = await signupResponse.json();

      if (!signupResponse.ok) {
        setError(signupData.error || "Erro ao criar conta");
        return;
      }

      setSuccess(signupData.message);

      // Reset
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setNome("");
      setNomeEmpresa("");
      setTelefone("");
      setCpfCnpj("");
      setLogradouro("");
      setNumero("");
      setBairro("");
      setCidade("");
      setUf("");
      setCep("");
      setCupom("");

      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (error) {
      setError("Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  };

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
        className="w-full max-w-md mt-20 lg:mt-0 pb-12"
      >
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight mb-3">
            Crie sua conta
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            Teste grátis por 14 dias. Sem compromisso.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Nome da Empresa */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Nome da Empresa
            </label>
            <div className="relative">
              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={nomeEmpresa}
                onChange={(e) => setNomeEmpresa(e.target.value)}
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
                value={cpfCnpj}
                onChange={(e) => setCpfCnpj(formatCpfCnpj(e.target.value))}
                className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl px-12 py-3.5 outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all placeholder:text-gray-400"
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
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
                value={telefone}
                onChange={(e) => setTelefone(formatTelefone(e.target.value))}
                className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl px-12 py-3.5 outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all placeholder:text-gray-400"
                placeholder="(11) 99999-9999"
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
                value={cep}
                onChange={(e) => setCep(formatCep(e.target.value))}
                onBlur={handleCepBlur}
                className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl px-12 py-3.5 outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all placeholder:text-gray-400"
                placeholder="00000-000"
                required
              />
              {loadingCep && (
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
                value={logradouro}
                onChange={(e) => setLogradouro(e.target.value)}
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
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
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
                value={bairro}
                onChange={(e) => setBairro(e.target.value)}
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
                value={cidade && uf ? `${cidade} - ${uf}` : ""}
                readOnly
                className="w-full bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-3.5 outline-none text-gray-500 cursor-not-allowed"
                placeholder="Cidade - UF"
              />
            </div>
          </div>

          {/* Nome do Usuário */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Seu Nome
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl px-12 py-3.5 outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all placeholder:text-gray-400"
                placeholder="seu@email.com"
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                  value={cupom}
                  onChange={(e) => {
                    setCupom(e.target.value.toUpperCase());
                    setCupomStatus(null);
                  }}
                  className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl pl-12 pr-4 py-3.5 outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all placeholder:text-gray-400"
                  placeholder="CUPOM"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={validateCupom}
                disabled={!cupom || validatingCupom}
                className="h-[50px] px-6"
              >
                {validatingCupom ? (
                  <Loader2 className="animate-spin w-4 h-4" />
                ) : (
                  "Aplicar"
                )}
              </Button>
            </div>
            {cupomStatus && (
              <p className={`text-sm ${cupomStatus.color} mt-1`}>
                {cupomStatus.message}
              </p>
            )}
          </div>

          <div className="flex items-start gap-3 pt-2">
            <input
              type="checkbox"
              id="terms"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
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

          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-sm font-medium"
            >
              <AlertTriangle size={16} />
              {error}
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg text-sm font-medium"
            >
              <CheckCircle2 size={16} />
              {success}
            </motion.div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-14 text-lg font-bold rounded-xl flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="animate-spin w-5 h-5" />
            ) : (
              <>
                Criar Conta
                <ArrowRight size={20} />
              </>
            )}
          </Button>
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
