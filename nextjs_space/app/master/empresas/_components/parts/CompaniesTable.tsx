import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import {
  CheckCircle,
  PauseCircle,
  Trash2,
  Eye,
  Eraser,
  MessageSquare,
  Key,
  MoreVertical,
  Calendar,
  RefreshCw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Empresa } from "./types";

interface CompaniesTableProps {
  empresas: Empresa[];
  onAction: (action: string, empresaId: string) => void;
  onDelete: (empresa: Empresa) => void;
  onClearData: (empresa: Empresa) => void;
  onResetPassword: (empresa: Empresa) => void;
  onSendAviso: (empresa: Empresa) => void;
  onUpdatePlan: (empresa: Empresa) => void;
  formatDate: (date: string | null) => string;
  formatCurrency: (value: number) => string;
  isInadimplente: (empresa: Empresa) => boolean;
}

export function CompaniesTable({
  empresas,
  onAction,
  onDelete,
  onClearData,
  onResetPassword,
  onSendAviso,
  onUpdatePlan,
  formatDate,
  formatCurrency,
  isInadimplente,
}: CompaniesTableProps) {
  const router = useRouter();

  return (
    <div className="overflow-x-auto bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
      <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
        <thead className="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-zinc-800/50">
          <tr>
            <th className="px-6 py-3" scope="col">
              Empresa
            </th>
            <th className="px-6 py-3" scope="col">
              Data de Cadastro
            </th>
            <th className="px-6 py-3" scope="col">
              Faturamento
            </th>
            <th className="px-6 py-3 text-center" scope="col">
              Status
            </th>
            <th className="px-6 py-3" scope="col">
              Vencimento
            </th>
            <th className="px-6 py-3 text-right" scope="col">
              Ações
            </th>
          </tr>
        </thead>
        <tbody>
          {empresas.map((empresa) => {
            const inadimplente = isInadimplente(empresa);
            return (
              <tr
                key={empresa.id}
                className="bg-white dark:bg-zinc-900 border-b dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors"
              >
                <th
                  className="px-6 py-4 font-bold text-gray-900 dark:text-white whitespace-nowrap align-middle"
                  scope="row"
                >
                  {empresa.nome}
                </th>
                <td className="px-6 py-4 text-gray-500 dark:text-gray-400 align-middle">
                  {formatDate(empresa.createdAt)}
                </td>
                <td className="px-6 py-4 font-bold text-green-600 dark:text-green-400 align-middle">
                  {formatCurrency(empresa.faturamentoTotal)}
                </td>
                <td className="px-6 py-4 align-middle text-center">
                  {empresa.status === "ATIVO" && !inadimplente && (
                    <span className="inline-flex items-center justify-center gap-1.5 py-1 pl-2.5 pr-5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 border border-green-200 dark:border-green-800">
                      <span className="size-2 inline-block bg-green-500 rounded-full"></span>
                      Ativa
                    </span>
                  )}
                  {empresa.status === "PENDENTE" && (
                    <span className="inline-flex items-center justify-center gap-1.5 py-1 pl-2.5 pr-5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800">
                      <span className="size-2 inline-block bg-yellow-500 rounded-full"></span>
                      Pendente
                    </span>
                  )}
                  {inadimplente && (
                    <span className="inline-flex items-center justify-center gap-1.5 py-1 pl-2.5 pr-5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 border border-red-200 dark:border-red-800">
                      <span className="size-2 inline-block bg-red-500 rounded-full"></span>
                      Inadimplente
                    </span>
                  )}
                  {empresa.status === "PAUSADO" && (
                    <span className="inline-flex items-center justify-center gap-1.5 py-1 pl-2.5 pr-5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                      <span className="size-2 inline-block bg-gray-500 rounded-full"></span>
                      Pausada
                    </span>
                  )}
                  {empresa.status === "EM_TESTE" && (
                    <span className="inline-flex items-center justify-center gap-1.5 py-1 pl-2.5 pr-5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      <span className="size-2 inline-block bg-blue-500 rounded-full"></span>
                      Em Teste
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 align-middle">
                  {formatDate(empresa.vencimentoPlano)}
                </td>
                <td className="px-6 py-4 text-right align-middle">
                  <div className="flex items-center justify-end gap-2">
                    <InteractiveHoverButton
                      className="w-10 min-w-10 px-0 border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center justify-center"
                      title="Detalhes"
                      onClick={() =>
                        router.push(`/master/empresas/${empresa.id}`)
                      }
                    >
                      <Eye className="h-5 w-5" />
                    </InteractiveHoverButton>

                    {empresa.status === "PENDENTE" && (
                      <InteractiveHoverButton
                        className="w-10 min-w-10 px-0 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800 border-green-200 flex items-center justify-center"
                        title="Aprovar Cadastro"
                        onClick={() => onAction("aprovar", empresa.id)}
                      >
                        <CheckCircle className="h-5 w-5" />
                      </InteractiveHoverButton>
                    )}

                    {empresa.status === "ATIVO" && (
                      <>
                        <InteractiveHoverButton
                          className="w-10 min-w-10 px-0 hover:bg-gray-200 dark:hover:bg-gray-700 border-gray-200 flex items-center justify-center"
                          title="Renovar/Alterar Data"
                          onClick={() => onUpdatePlan(empresa)}
                        >
                          <Calendar className="h-5 w-5" />
                        </InteractiveHoverButton>
                        <InteractiveHoverButton
                          className="w-10 min-w-10 px-0 hover:bg-gray-200 dark:hover:bg-gray-700 text-yellow-600 border-yellow-200 flex items-center justify-center"
                          title="Pausar"
                          onClick={() => onAction("pausar", empresa.id)}
                        >
                          <PauseCircle className="h-5 w-5" />
                        </InteractiveHoverButton>
                      </>
                    )}

                    {empresa.status === "PAUSADO" && (
                      <InteractiveHoverButton
                        className="w-10 min-w-10 px-0 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800 border-green-200 flex items-center justify-center"
                        title="Reativar"
                        onClick={() => onAction("reativar", empresa.id)}
                      >
                        <CheckCircle className="h-5 w-5" />
                      </InteractiveHoverButton>
                    )}

                    {empresa.status === "EM_TESTE" && (
                      <>
                        <InteractiveHoverButton
                          className="w-10 min-w-10 px-0 hover:bg-gray-200 dark:hover:bg-gray-700 border-gray-200 flex items-center justify-center"
                          title="Alterar Data/Ativar"
                          onClick={() => onUpdatePlan(empresa)}
                        >
                          <Calendar className="h-5 w-5" />
                        </InteractiveHoverButton>
                        <InteractiveHoverButton
                          className="w-10 min-w-10 px-0 hover:bg-gray-200 dark:hover:bg-gray-700 text-yellow-600 border-yellow-200 flex items-center justify-center"
                          title="Pausar"
                          onClick={() => onAction("pausar", empresa.id)}
                        >
                          <PauseCircle className="h-5 w-5" />
                        </InteractiveHoverButton>
                      </>
                    )}

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <InteractiveHoverButton
                          className="w-10 min-w-10 px-0 hover:bg-gray-200 dark:hover:bg-gray-700 border-gray-200 flex items-center justify-center"
                          title="Mais Opções"
                        >
                          <MoreVertical className="h-5 w-5" />
                        </InteractiveHoverButton>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.preventDefault();
                            onResetPassword(empresa);
                          }}
                        >
                          <Key className="mr-2 h-4 w-4" /> Resetar Senha
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            onSendAviso(empresa);
                          }}
                        >
                          <MessageSquare className="mr-2 h-4 w-4" /> Enviar
                          Aviso
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onAction("syncAsaas", empresa.id)}
                          className="text-blue-600 focus:text-blue-600"
                        >
                          <RefreshCw className="mr-2 h-4 w-4" /> Sincronizar
                          Asaas
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-orange-600 focus:text-orange-600"
                          onClick={() => onClearData(empresa)}
                        >
                          <Eraser className="mr-2 h-4 w-4" /> Limpar Dados
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600"
                          onClick={() => onDelete(empresa)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Excluir Empresa
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
