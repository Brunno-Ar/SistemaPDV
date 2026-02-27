import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";

export default async function MasterIndicacoes() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "master") {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard de Indicações"
        description="Funil de conversões do Member Get Member"
      />
      <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800">
        <p className="text-gray-500 dark:text-gray-400">
          Métricas de cliques, novos trials e assinaturas convertidas via
          indicação.
        </p>
      </div>
    </div>
  );
}
