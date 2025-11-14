
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { NavBar } from '@/components/nav-bar';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, Package, DollarSign } from 'lucide-react';
import { prisma } from '@/lib/db';

export default async function MasterDashboard() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'master') {
    redirect('/vender');
  }

  // Buscar estatísticas gerais
  const totalEmpresas = await prisma.empresa.count();
  const totalUsuarios = await prisma.user.count({
    where: {
      role: {
        in: ['admin', 'caixa'],
      },
    },
  });
  const totalProdutos = await prisma.product.count();
  const totalVendas = await prisma.sale.count();

  const stats = [
    {
      title: 'Total de Empresas',
      value: totalEmpresas,
      icon: Building2,
      description: 'Empresas cadastradas no sistema',
    },
    {
      title: 'Total de Usuários',
      value: totalUsuarios,
      icon: Users,
      description: 'Admins e Caixas ativos',
    },
    {
      title: 'Total de Produtos',
      value: totalProdutos,
      icon: Package,
      description: 'Produtos cadastrados',
    },
    {
      title: 'Total de Vendas',
      value: totalVendas,
      icon: DollarSign,
      description: 'Vendas realizadas',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard Master</h1>
            <p className="text-gray-600 mt-1">Visão geral do sistema</p>
          </div>
          <Link href="/master/empresas">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Building2 className="h-4 w-4 mr-2" />
              Gerenciar Empresas
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>
              Acesso rápido às principais funcionalidades
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link href="/master/empresas">
                <Button variant="outline" className="w-full justify-start h-auto py-4">
                  <Building2 className="h-5 w-5 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">Gerenciar Empresas</div>
                    <div className="text-sm text-muted-foreground">
                      Ver, criar e editar empresas
                    </div>
                  </div>
                </Button>
              </Link>
              <Button variant="outline" className="w-full justify-start h-auto py-4" disabled>
                <Users className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Relatórios Globais</div>
                  <div className="text-sm text-muted-foreground">
                    Em breve
                  </div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
