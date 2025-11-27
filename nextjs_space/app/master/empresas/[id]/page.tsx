import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import EmpresaDetalheClient from "./_components/empresa-detalhe-client";

interface PageProps {
  params: {
    id: string;
  };
}

export default async function EmpresaDetalhePage({ params }: PageProps) {
  const session = await getServerSession(authOptions);

  // Proteção: apenas masters
  if (!session?.user || session.user.role !== "master") {
    redirect("/login");
  }

  // Buscar dados da empresa
  try {
    const empresa = await prisma.empresa.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            users: true,
            products: true,
            sales: true,
          },
        },
      },
    });

    if (!empresa) {
      redirect("/master/empresas");
    }

    return <EmpresaDetalheClient empresa={empresa} companyId={empresa.id} />;
  } catch (error) {
    console.error("Erro ao buscar empresa:", error);
    redirect("/master/empresas");
  }
}
