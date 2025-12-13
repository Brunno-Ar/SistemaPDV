import { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  MessageCircle,
  Clock,
  HelpCircle,
  CheckCircle,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Fale Conosco - FlowPDV",
  description: "Entre em contato conosco - FlowPDV",
};

const faqItems = [
  {
    question: "Como faço para abrir o caixa?",
    answer:
      "No Dashboard, clique no botão 'Abrir Caixa', informe o valor inicial em dinheiro e confirme. O caixa ficará aberto para você realizar vendas.",
  },
  {
    question: "Esqueci minha senha, como recupero?",
    answer:
      "Na tela de login, clique em 'Esqueci minha senha'. Informe seu e-mail cadastrado e você receberá uma senha temporária para acessar o sistema.",
  },
  {
    question: "Como adicionar um novo produto?",
    answer:
      "Vá em Estoque > Adicionar Produto. Preencha as informações como nome, SKU, preços e quantidade. Você também pode adicionar uma imagem do produto.",
  },
  {
    question: "Como faço sangria ou suprimento de caixa?",
    answer:
      "No Dashboard, na seção 'Meu Caixa', clique em 'Suprimento' para adicionar dinheiro ou 'Sangria' para retirar. Informe o valor e o método de pagamento.",
  },
  {
    question: "Como cadastrar um funcionário?",
    answer:
      "Vá em Equipe > Adicionar Funcionário. Informe o nome, e-mail e cargo do funcionário. Ele receberá um e-mail com as credenciais de acesso.",
  },
  {
    question: "Meu pagamento não foi identificado, o que fazer?",
    answer:
      "Entre em contato com nosso suporte pelo WhatsApp ou e-mail informando seus dados. Verificaremos o pagamento e liberaremos seu acesso.",
  },
];

export default function FaleConoscoPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 mb-6 transition-colors"
          >
            <ArrowLeft size={16} className="mr-2" />
            Voltar para o início
          </Link>
        </div>

        {/* Hero */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-8 md:p-12 text-white mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Fale Conosco</h1>
          <p className="text-blue-100 text-lg">
            Estamos prontos para te atender e resolver qualquer dúvida.
          </p>
        </div>

        {/* Contact Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-6 text-center hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              WhatsApp / Suporte
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
              Atendimento rápido e prático
            </p>
            <a
              href="https://wa.me/5521980814965"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-green-600 hover:underline font-medium"
            >
              Iniciar Conversa
            </a>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-6 text-center hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Email Profissional
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
              Para questões detalhadas
            </p>
            <a
              href="mailto:Brunoaraujodev0@gmail.com"
              className="inline-flex items-center text-blue-600 hover:underline font-medium"
            >
              Brunoaraujodev0@gmail.com
            </a>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-6 text-center hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Horário
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
              Segunda a Sexta
            </p>
            <span className="text-purple-600 font-medium">09:00 - 18:00</span>
          </div>
        </div>

        {/* FAQ */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg border border-gray-200 dark:border-zinc-800 p-8 md:p-12">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-yellow-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Perguntas Frequentes
            </h2>
          </div>

          <div className="space-y-6">
            {faqItems.map((item, index) => (
              <div
                key={index}
                className="border-b border-gray-100 dark:border-zinc-800 pb-6 last:border-0"
              >
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  {item.question}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 pl-7">
                  {item.answer}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Status */}
        <div className="mt-8 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 p-6">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <span className="font-medium text-green-700 dark:text-green-400">
              Todos os sistemas operacionais
            </span>
          </div>
          <p className="text-green-600 dark:text-green-500 text-sm mt-2">
            FlowPDV está funcionando normalmente. Sem incidentes reportados.
          </p>
        </div>
      </div>
    </div>
  );
}
