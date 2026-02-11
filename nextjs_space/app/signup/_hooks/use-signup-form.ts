import { useState } from "react";
import { useRouter } from "next/navigation";

export interface SignupFormData {
  email: string;
  password: string;
  confirmPassword: string;
  nome: string;
  nomeEmpresa: string;
  telefone: string;
  cpfCnpj: string;
  cep: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
  cupom?: string;
  termsAccepted: boolean;
}

interface CupomStatus {
  valid: boolean;
  message: string;
  color: string;
}

export function useSignupForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [validatingCupom, setValidatingCupom] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [cupomStatus, setCupomStatus] = useState<CupomStatus | null>(null);

  const [formData, setFormData] = useState<SignupFormData>({
    email: "",
    password: "",
    confirmPassword: "",
    nome: "",
    nomeEmpresa: "",
    telefone: "",
    cpfCnpj: "",
    cep: "",
    logradouro: "",
    numero: "",
    bairro: "",
    cidade: "",
    uf: "",
    cupom: "",
    termsAccepted: false,
  });

  const nextStep = () => {
    setError("");
    // Validate Step 1
    if (step === 1) {
      if (
        !formData.nome ||
        !formData.email ||
        !formData.password ||
        !formData.confirmPassword ||
        !formData.telefone
      ) {
        setError("Preencha todos os campos obrigatórios.");
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError("As senhas não coincidem.");
        return;
      }
      if (formData.password.length < 8) {
        setError("A senha deve ter pelo menos 8 caracteres.");
        return;
      }
    }
    setStep((prev) => prev + 1);
  };

  const prevStep = () => {
    setError("");
    setStep((prev) => prev - 1);
  };

  const handleChange = (
    field: keyof SignupFormData,
    value: string | boolean,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const formatTelefone = (value: string): string => {
    const numbers = value.replace(/\D/g, "").slice(0, 11);
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 6)
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 10)
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(
        6,
      )}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(
      7,
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
          6,
        )}`;
      return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(
        6,
        9,
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
          8,
        )}/${cnpj.slice(8)}`;
      return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(
        5,
        8,
      )}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`;
    }
  };

  const formatCep = (value: string) => {
    return value
      .replace(/\D/g, "")
      .replace(/^(\d{5})(\d)/, "$1-$2")
      .slice(0, 9);
  };

  const handleCepBlur = async () => {
    const cleanCep = formData.cep.replace(/\D/g, "");
    if (cleanCep.length !== 8) return;

    setLoadingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setFormData((prev) => ({
          ...prev,
          logradouro: data.logradouro,
          bairro: data.bairro,
          cidade: data.localidade,
          uf: data.uf,
        }));
        document.getElementById("numero")?.focus();
      }
    } catch (e) {
      console.error("Erro ao buscar CEP", e);
    } finally {
      setLoadingCep(false);
    }
  };

  const validateCupom = async () => {
    if (!formData.cupom) return;
    setValidatingCupom(true);
    setCupomStatus(null);
    try {
      const res = await fetch("/api/cupons/validate", {
        method: "POST",
        body: JSON.stringify({ codigo: formData.cupom }),
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

    if (formData.password !== formData.confirmPassword) {
      setError("As senhas não coincidem");
      setLoading(false);
      return;
    }

    try {
      const payload = {
        email: formData.email.toLowerCase(),
        password: formData.password,
        nome: formData.nome,
        nomeEmpresa: formData.nomeEmpresa,
        telefone: formData.telefone.replace(/\D/g, ""),
        cpfCnpj: formData.cpfCnpj.replace(/\D/g, ""),
        cep: formData.cep.replace(/\D/g, ""),
        logradouro: formData.logradouro,
        numero: formData.numero,
        bairro: formData.bairro,
        cidade: formData.cidade,
        uf: formData.uf,
        cupom:
          formData.cupom && cupomStatus?.valid ? formData.cupom : undefined,
        termsAccepted: formData.termsAccepted,
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

      // Reset logic could be added here if needed, but we redirect immediately

      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (error) {
      setError("Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  };

  return {
    state: {
      step,
      formData,
      loading,
      loadingCep,
      validatingCupom,
      error,
      success,
      cupomStatus,
    },
    actions: {
      setStep,
      nextStep,
      prevStep,
      handleChange,
      formatTelefone,
      formatCpfCnpj,
      formatCep,
      handleCepBlur,
      validateCupom,
      handleSubmit,
    },
  };
}
