import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";

export default async function AdminIndicacoes() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sistema de Indicação"
        description="Convide amigos e ganhe meses grátis!"
      />
      <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800">
        <p className="text-gray-500 dark:text-gray-400">
          Em breve: seu link único de indicação aparecerá aqui.
        </p>
      </div>
    </div>
  );
}
