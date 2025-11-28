import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { NavBar } from "@/components/nav-bar";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Building2, Users, Package, DollarSign } from "lucide-react";
import { prisma } from "@/lib/db";

export default async function MasterDashboard() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "master") {
    redirect("/vender");
  }

  // Buscar estatísticas gerais
  const totalEmpresas = await prisma.empresa.count();
  const empresasAtivas = await prisma.empresa.count({
    where: { status: "ATIVO" },
  });
  const empresasPendentes = await prisma.empresa.count({
    where: { status: "PENDENTE" },
  });

  // Volume Transacionado Total
  const todasVendas = await prisma.sale.findMany({
    select: { valorTotal: true },
  });
  const volumeTransacionado = todasVendas.reduce(
    (acc, sale) => acc + Number(sale.valorTotal),
    0
  );

  // Vendas Hoje
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const vendasHoje = await prisma.sale.count({
    where: {
      dataHora: {
        gte: hoje,
      },
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Dashboard Master
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              Visão geral do sistema
            </p>
          </div>
          <Link href="/master/empresas" className="w-full sm:w-auto">
            <Button className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
              <Building2 className="h-4 w-4 mr-2" />
              Gerenciar Empresas
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Empresas Ativas
              </CardTitle>
              <Building2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{empresasAtivas}</div>
              <p className="text-xs text-muted-foreground mt-1">
                De um total de {totalEmpresas} empresas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Empresas Pendentes
              </CardTitle>
              <Building2 className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{empresasPendentes}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Aguardando aprovação
              </p>
              {empresasPendentes > 0 && (
                <Link href="/master/empresas">
                  <Button
                    variant="link"
                    className="p-0 h-auto text-xs text-blue-600 mt-1"
                  >
                    Ver pendentes
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Volume Transacionado
              </CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(volumeTransacionado)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Total acumulado no sistema
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vendas Hoje</CardTitle>
              <Package className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{vendasHoje}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Vendas realizadas hoje (00:00+)
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Ações Rápidas</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Acesso rápido às principais funcionalidades
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <Link href="/master/empresas">
                <Button
                  variant="outline"
                  className="w-full justify-start h-auto py-3 sm:py-4"
                >
                  <Building2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 flex-shrink-0" />
                  <div className="text-left">
                    <div className="font-medium text-sm sm:text-base">
                      Gerenciar Empresas
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      Ver, criar e editar empresas
                    </div>
                  </div>
                </Button>
              </Link>
              <Link href="/master/usuarios">
                <Button
                  variant="outline"
                  className="w-full justify-start h-auto py-3 sm:py-4"
                >
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 flex-shrink-0" />
                  <div className="text-left">
                    <div className="font-medium text-sm sm:text-base">
                      Gerenciar Masters
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      Ver e criar usuários master
                    </div>
                  </div>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
