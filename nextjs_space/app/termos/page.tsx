import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Termos de Serviço - FlowPDV",
  description: "Termos de Serviço do FlowPDV - Sistema de Ponto de Venda",
};

export default function TermosPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/signup"
            className="inline-flex items-center text-sm text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 mb-6 transition-colors"
          >
            <ArrowLeft size={16} className="mr-2" />
            Voltar para o cadastro
          </Link>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg border border-gray-200 dark:border-zinc-800 p-8 md:p-12">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Termos de Serviço
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            Última atualização: Dezembro de 2025
          </p>

          <div className="prose prose-gray dark:prose-invert max-w-none">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
              1. Aceitação dos Termos
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Ao acessar e usar o FlowPDV, você concorda em cumprir e estar
              vinculado a estes Termos de Serviço. Se você não concordar com
              qualquer parte destes termos, não poderá acessar o serviço.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
              2. Descrição do Serviço
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              O FlowPDV é um sistema de ponto de venda (PDV) baseado na web que
              oferece:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-4 space-y-2">
              <li>Processamento de vendas e transações</li>
              <li>Gerenciamento de estoque</li>
              <li>Controle de caixa</li>
              <li>Relatórios e análises</li>
              <li>Gestão de funcionários</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
              3. Conta de Usuário
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Para utilizar o FlowPDV, você deve criar uma conta fornecendo
              informações precisas e completas. Você é responsável por manter a
              confidencialidade de sua senha e por todas as atividades
              realizadas em sua conta.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
              4. Uso Aceitável
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Você concorda em usar o serviço apenas para fins legais e de
              acordo com estes termos. É proibido:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-4 space-y-2">
              <li>Usar o serviço para atividades ilegais</li>
              <li>Tentar acessar dados de outros usuários</li>
              <li>Interferir no funcionamento do sistema</li>
              <li>Compartilhar suas credenciais de acesso</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
              5. Pagamento e Assinatura
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              O FlowPDV opera em modelo de assinatura mensal. O pagamento deve
              ser realizado até a data de vencimento para manter o acesso ao
              sistema. Em caso de atraso superior a 10 dias, o acesso pode ser
              suspenso.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
              6. Propriedade Intelectual
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Todo o conteúdo, design, código e funcionalidades do FlowPDV são
              propriedade exclusiva e protegidos por leis de direitos autorais.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
              7. Limitação de Responsabilidade
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              O FlowPDV é fornecido &quot;como está&quot;. Não garantimos que o
              serviço será ininterrupto ou livre de erros. Não nos
              responsabilizamos por perdas decorrentes do uso ou impossibilidade
              de uso do serviço.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
              8. Alterações nos Termos
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Podemos modificar estes termos a qualquer momento. Alterações
              significativas serão comunicadas por e-mail ou através do sistema.
              O uso continuado do serviço após alterações constitui aceitação
              dos novos termos.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
              9. Contato
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Para dúvidas sobre estes termos, entre em contato através do
              e-mail:
              <a
                href="mailto:Brunoaraujodev0@gmail.com"
                className="text-blue-600 hover:underline ml-1"
              >
                Brunoaraujodev0@gmail.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
