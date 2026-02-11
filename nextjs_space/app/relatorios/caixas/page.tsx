import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { CaixasTable } from "./_components/caixas-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function RelatoriosCaixasPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  if (
    session.user.role !== "admin" &&
    session.user.role !== "master" &&
    session.user.role !== "gerente"
  ) {
    redirect("/vender");
  }

  if (!session.user.empresaId) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Usuário não vinculado a uma empresa.
      </div>
    );
  }

  // Fetch last 30 days of Caixas
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const caixas = await prisma.caixa.findMany({
    where: {
      empresaId: session.user.empresaId,
      dataAbertura: {
        gte: thirtyDaysAgo,
      },
    },
    include: {
      usuario: {
        select: {
          nome: true,
          email: true,
        },
      },
    },
    orderBy: {
      dataAbertura: "desc",
    },
  });

  // Serialize Decimal to number for Client Component
  const formattedCaixas = caixas.map((c) => ({
    ...c,
    saldoInicial: Number(c.saldoInicial),
    saldoFinal: c.saldoFinal ? Number(c.saldoFinal) : null,
    quebraDeCaixa: c.quebraDeCaixa ? Number(c.quebraDeCaixa) : null,
    // Date objects to ISO strings
    dataAbertura: c.dataAbertura.toISOString(),
    dataFechamento: c.dataFechamento ? c.dataFechamento.toISOString() : null,
    dataCriacao: undefined, // Avoid passing unused large objects if any
  }));

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      <PageHeader
        title="Auditoria de Caixas"
        description="Histórico de aberturas e fechamentos dos últimos 30 dias."
      />

      <Card>
        <CardHeader>
          <CardTitle>Turnos de Trabalho</CardTitle>
          <CardDescription>
            Visualize os horários e valores de fechamento de cada funcionário.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CaixasTable data={formattedCaixas} />
        </CardContent>
      </Card>
    </div>
  );
}
