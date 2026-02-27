import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default async function MasterIndicacoes() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "master") {
    redirect("/dashboard");
  }

  const allLinks = await prisma.memberLink.findMany({
    include: {
      empresa: { select: { nome: true } },
      conversoes: {
        include: {
          novaEmpresa: { select: { nome: true, status: true } },
        },
        orderBy: { criadoEm: "desc" },
      },
    },
    orderBy: { criadoEm: "desc" },
  });

  const totalCliques = allLinks.reduce((acc, l) => acc + l.cliques, 0);
  const totalConversoes = allLinks.reduce(
    (acc, l) => acc + l.conversoes.length,
    0,
  );
  const totalPagos = allLinks.reduce(
    (acc, l) => acc + l.conversoes.filter((c) => c.status === "PAGO").length,
    0,
  );
  const totalMesesGratis = allLinks.reduce(
    (acc, l) => acc + l.conversoes.filter((c) => c.mesGratisGerado).length,
    0,
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard de Indicações"
        description="Visão geral do programa Member Get Member"
      />

      {/* Métricas Globais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Cliques Totais" value={totalCliques} color="blue" />
        <StatCard
          label="Cadastros (Trial)"
          value={totalConversoes}
          color="amber"
        />
        <StatCard label="Assinaturas Pagas" value={totalPagos} color="green" />
        <StatCard
          label="Meses Grátis Gerados"
          value={totalMesesGratis}
          color="purple"
        />
      </div>

      {/* Tabela por Empresa Indicadora */}
      <section className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Empresas Indicadoras
        </h2>
        {allLinks.length === 0 ? (
          <p className="text-gray-400 dark:text-gray-500 py-8 text-center">
            Nenhum link de indicação gerado ainda.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-zinc-800">
                  <th className="py-3 px-4 font-medium">Empresa</th>
                  <th className="py-3 px-4 font-medium">Código</th>
                  <th className="py-3 px-4 font-medium text-center">Cliques</th>
                  <th className="py-3 px-4 font-medium text-center">Trials</th>
                  <th className="py-3 px-4 font-medium text-center">Pagos</th>
                  <th className="py-3 px-4 font-medium">Criado em</th>
                </tr>
              </thead>
              <tbody>
                {allLinks.map((link) => {
                  const trials = link.conversoes.filter(
                    (c) => c.status === "TRIAL",
                  ).length;
                  const pagos = link.conversoes.filter(
                    (c) => c.status === "PAGO",
                  ).length;
                  return (
                    <tr
                      key={link.id}
                      className="border-b border-gray-100 dark:border-zinc-800/50 hover:bg-gray-50 dark:hover:bg-zinc-900/50 transition-colors"
                    >
                      <td className="py-3 px-4 font-medium text-gray-800 dark:text-gray-200">
                        {link.empresa.nome}
                      </td>
                      <td className="py-3 px-4">
                        <code className="text-xs bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded">
                          {link.codigoURL}
                        </code>
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-blue-600 dark:text-blue-400">
                        {link.cliques}
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-amber-600 dark:text-amber-400">
                        {trials}
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-green-600 dark:text-green-400">
                        {pagos}
                      </td>
                      <td className="py-3 px-4 text-gray-500 dark:text-gray-400">
                        {format(new Date(link.criadoEm), "dd/MM/yyyy", {
                          locale: ptBR,
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    blue: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/40",
    amber:
      "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/40",
    green:
      "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900/40",
    purple:
      "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900/40",
  };

  return (
    <div
      className={`flex flex-col gap-2 p-4 rounded-xl border ${colorMap[color]} transition-all hover:shadow-md`}
    >
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs font-medium opacity-70">{label}</p>
    </div>
  );
}
