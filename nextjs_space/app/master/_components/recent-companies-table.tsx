import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

interface EmpresaRecente {
  id: string;
  nome: string;
  status: "PENDENTE" | "ATIVO" | "PAUSADO" | "EM_TESTE";
  vencimentoPlano: Date | null;
  faturamentoMensal: number;
  totalProdutos: number;
  totalVendas: number;
}

interface RecentCompaniesTableProps {
  empresas: EmpresaRecente[];
}

export function RecentCompaniesTable({ empresas }: RecentCompaniesTableProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 overflow-hidden shadow-sm">
      <Table>
        <TableHeader className="bg-gray-50 dark:bg-zinc-800/50">
          <TableRow>
            <TableHead className="font-medium text-gray-600 dark:text-gray-400">
              Empresa
            </TableHead>
            <TableHead className="font-medium text-gray-600 dark:text-gray-400">
              Fat. Mês
            </TableHead>
            <TableHead className="font-medium text-gray-600 dark:text-gray-400">
              Produtos
            </TableHead>
            <TableHead className="font-medium text-gray-600 dark:text-gray-400">
              Vendas
            </TableHead>
            <TableHead className="font-medium text-gray-600 dark:text-gray-400">
              Vencimento
            </TableHead>
            <TableHead className="font-medium text-gray-600 dark:text-gray-400">
              Status
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {empresas.map((empresa) => (
            <TableRow
              key={empresa.id}
              className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors"
            >
              <TableCell className="font-medium text-gray-900 dark:text-white">
                {empresa.nome}
              </TableCell>
              <TableCell className="font-medium text-green-600 dark:text-green-400">
                {formatCurrency(empresa.faturamentoMensal)}
              </TableCell>
              <TableCell className="text-gray-600 dark:text-gray-400">
                {empresa.totalProdutos}
              </TableCell>
              <TableCell className="text-gray-600 dark:text-gray-400">
                {empresa.totalVendas}
              </TableCell>
              <TableCell className="text-gray-600 dark:text-gray-400">
                {empresa.vencimentoPlano
                  ? new Date(empresa.vencimentoPlano).toLocaleDateString(
                      "pt-BR"
                    )
                  : "-"}
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={
                    empresa.status === "ATIVO"
                      ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-900/50"
                      : empresa.status === "PENDENTE"
                      ? "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-900/50"
                      : empresa.status === "EM_TESTE"
                      ? "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-900/50"
                      : "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-900/50"
                  }
                >
                  {empresa.status === "ATIVO"
                    ? "Ativo"
                    : empresa.status === "PENDENTE"
                    ? "Pendente"
                    : empresa.status === "EM_TESTE"
                    ? "Em Teste"
                    : "Inativo"}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
