"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface CaixaAudit {
  id: string;
  usuario: {
    nome: string | null;
    email: string;
  };
  dataAbertura: string;
  dataFechamento: string | null;
  saldoFinal: number | null; // Total Informado
  quebraDeCaixa: number | null; // Divergência
  status: string;
}

interface CaixasTableProps {
  data: CaixaAudit[];
}

export function CaixasTable({ data }: CaixasTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Funcionário</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Abertura</TableHead>
            <TableHead>Fechamento</TableHead>
            <TableHead className="text-right">Total Fechamento</TableHead>
            <TableHead className="text-center">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                Nenhum fechamento encontrado nos últimos 30 dias.
              </TableCell>
            </TableRow>
          ) : (
            data.map((item) => {
              const fechamento = item.dataFechamento
                ? new Date(item.dataFechamento)
                : null;
              const divergencia = Number(item.quebraDeCaixa || 0);
              const temDivergencia = Math.abs(divergencia) > 0.009;

              return (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {item.usuario.nome || item.usuario.email}
                  </TableCell>
                  <TableCell>
                    {format(new Date(item.dataAbertura), "dd/MM/yyyy")}
                  </TableCell>
                  <TableCell>
                    {format(new Date(item.dataAbertura), "HH:mm")}
                  </TableCell>
                  <TableCell>
                    {fechamento ? format(fechamento, "HH:mm") : "-"}
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {item.saldoFinal
                      ? formatCurrency(Number(item.saldoFinal))
                      : "-"}
                  </TableCell>
                  <TableCell className="text-center">
                    {item.status === "ABERTO" ? (
                      <Badge
                        variant="outline"
                        className="bg-blue-50 text-blue-700 border-blue-200"
                      >
                        Em Aberto
                      </Badge>
                    ) : temDivergencia ? (
                      <Badge variant="destructive">
                        Divergência ({formatCurrency(divergencia)})
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-green-50 text-green-700 border-green-200"
                      >
                        Fechado OK
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
