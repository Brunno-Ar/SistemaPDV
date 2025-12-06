import { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  Shield,
  Lock,
  Eye,
  Database,
  Bell,
  UserCheck,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Política de Privacidade - FlowPDV",
  description: "Política de Privacidade do FlowPDV - Sistema de Ponto de Venda",
};

export default function PrivacidadePage() {
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
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Política de Privacidade
            </h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            Última atualização: Dezembro de 2024
          </p>

          {/* Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
            <div className="bg-gray-50 dark:bg-zinc-800 rounded-xl p-4">
              <Lock className="w-6 h-6 text-green-600 mb-2" />
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                Dados Protegidos
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Criptografia de ponta a ponta
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-zinc-800 rounded-xl p-4">
              <Eye className="w-6 h-6 text-blue-600 mb-2" />
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                Transparência
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Você sabe como usamos seus dados
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-zinc-800 rounded-xl p-4">
              <UserCheck className="w-6 h-6 text-purple-600 mb-2" />
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                Seu Controle
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Gerencie suas preferências
              </p>
            </div>
          </div>

          <div className="prose prose-gray dark:prose-invert max-w-none">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4 flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              1. Dados que Coletamos
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Coletamos apenas os dados necessários para fornecer nossos
              serviços:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-4 space-y-2">
              <li>
                <strong>Dados de Conta:</strong> Nome, e-mail, telefone e nome
                da empresa
              </li>
              <li>
                <strong>Dados de Uso:</strong> Informações sobre como você
                utiliza o sistema
              </li>
              <li>
                <strong>Dados de Negócio:</strong> Produtos, vendas, estoque e
                movimentações
              </li>
              <li>
                <strong>Dados de Funcionários:</strong> Nome e e-mail dos
                usuários cadastrados
              </li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5 text-green-600" />
              2. Como Protegemos seus Dados
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              A segurança dos seus dados é nossa prioridade:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-4 space-y-2">
              <li>Senhas são armazenadas com criptografia bcrypt</li>
              <li>Conexões protegidas com HTTPS/TLS</li>
              <li>Servidores seguros com monitoramento 24/7</li>
              <li>Backups regulares dos dados</li>
              <li>Acesso restrito apenas a pessoal autorizado</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-600" />
              3. Como Usamos seus Dados
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Utilizamos seus dados para:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-4 space-y-2">
              <li>Fornecer e manter o serviço FlowPDV</li>
              <li>Processar vendas e gerenciar seu estoque</li>
              <li>Enviar notificações importantes sobre sua conta</li>
              <li>Fornecer suporte ao cliente</li>
              <li>Melhorar nossos serviços com base no uso</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
              4. Compartilhamento de Dados
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              <strong>Não vendemos seus dados.</strong> Compartilhamos
              informações apenas:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-4 space-y-2">
              <li>Com provedores de serviço essenciais (hospedagem, e-mail)</li>
              <li>Quando exigido por lei ou ordem judicial</li>
              <li>Para proteger direitos, propriedade ou segurança</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
              5. Seus Direitos (LGPD)
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              De acordo com a Lei Geral de Proteção de Dados, você tem direito
              a:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-4 space-y-2">
              <li>Acessar seus dados pessoais</li>
              <li>Corrigir dados incompletos ou desatualizados</li>
              <li>Solicitar a exclusão de seus dados</li>
              <li>Revogar seu consentimento a qualquer momento</li>
              <li>Portabilidade dos dados para outro serviço</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5 text-yellow-600" />
              6. Cookies e Tecnologias
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Utilizamos cookies e tecnologias similares para:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 mb-4 space-y-2">
              <li>Manter você logado no sistema</li>
              <li>Lembrar suas preferências (tema, idioma)</li>
              <li>Analisar o uso do sistema para melhorias</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
              7. Retenção de Dados
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Mantemos seus dados enquanto sua conta estiver ativa ou conforme
              necessário para fornecer serviços. Após cancelamento, os dados são
              retidos por até 90 dias e depois excluídos permanentemente.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
              8. Alterações nesta Política
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Podemos atualizar esta política periodicamente. Alterações
              significativas serão comunicadas por e-mail ou notificação no
              sistema.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-4">
              9. Contato
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Para exercer seus direitos ou esclarecer dúvidas sobre
              privacidade:
            </p>
            <div className="bg-gray-50 dark:bg-zinc-800 rounded-xl p-4 mt-4">
              <p className="text-gray-700 dark:text-gray-300">
                <strong>E-mail:</strong>{" "}
                <a
                  href="mailto:privacidade@flowpdv.com"
                  className="text-blue-600 hover:underline"
                >
                  privacidade@flowpdv.com
                </a>
              </p>
              <p className="text-gray-700 dark:text-gray-300 mt-2">
                <strong>Encarregado de Dados (DPO):</strong> Equipe FlowPDV
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
