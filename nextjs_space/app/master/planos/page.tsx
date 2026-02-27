import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import PlanosClient from "./_components/planos-client";

export default async function PlanosPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "master") {
    redirect("/vender");
  }

  return (
    <div className="h-full">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <header className="flex flex-col gap-1 mb-8">
          <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">
            Precificação Dinâmica
          </h1>
          <p className="text-base text-gray-500 dark:text-gray-400">
            Reajuste do valor da assinatura e sincronização manual em tempo
            real.
          </p>
        </header>

        <PlanosClient />
      </div>
    </div>
  );
}
