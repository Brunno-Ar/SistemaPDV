import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

import EmpresasClient from "./_components/empresas-client";

export default async function EmpresasPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "master") {
    redirect("/vender");
  }

  return (
    <div className="h-full">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <EmpresasClient />
      </div>
    </div>
  );
}
