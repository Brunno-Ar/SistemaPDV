import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { MemberLinkCopier } from "./_components/member-link-copier";
import { MemberFunnelStats } from "./_components/member-funnel-stats";
import { MemberConversionsTable } from "./_components/member-conversions-table";

export default async function AdminIndicacoes() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "admin" || !session.user.empresaId) {
    redirect("/dashboard");
  }

  const empresaId = session.user.empresaId;

  let link = await prisma.memberLink.findUnique({
    where: { empresaId },
    include: {
      conversoes: {
        include: {
          novaEmpresa: {
            select: { nome: true },
          },
        },
        orderBy: { criadoEm: "desc" },
      },
    },
  });

  if (!link) {
    const defaultCodigo = `ref-${empresaId.substring(0, 8)}`;
    link = await prisma.memberLink.create({
      data: {
        empresaId,
        codigoURL: defaultCodigo,
      },
      include: {
        conversoes: {
          include: {
            novaEmpresa: {
              select: { nome: true },
            },
          },
          orderBy: { criadoEm: "desc" },
        },
      },
    });
  }

  const trialCount = link.conversoes.filter((c) => c.status === "TRIAL").length;
  const pagoCount = link.conversoes.filter((c) => c.status === "PAGO").length;
  const mesesGratis = link.conversoes.filter((c) => c.mesGratisGerado).length;

  const conversoesSerializadas = link.conversoes.map((c) => ({
    id: c.id,
    novaEmpresaId: c.novaEmpresaId,
    status: c.status,
    mesGratisGerado: c.mesGratisGerado,
    criadoEm: c.criadoEm.toISOString(),
    novaEmpresa: c.novaEmpresa,
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Indique e Ganhe"
        description="Compartilhe seu link e ganhe 1 mês grátis para cada indicação que assinar!"
      />

      {/* 1. Link de Indicação */}
      <section className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Seu Link de Indicação
        </h2>
        <MemberLinkCopier initialCode={link.codigoURL} />
      </section>

      {/* 2. Métricas do Funil */}
      <section>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Suas Métricas
        </h2>
        <MemberFunnelStats
          cliques={link.cliques}
          trialCount={trialCount}
          pagoCount={pagoCount}
          mesesGratis={mesesGratis}
        />
      </section>

      {/* 3. Tabela de Conversões */}
      <section className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Histórico de Indicações
        </h2>
        <MemberConversionsTable conversoes={conversoesSerializadas} />
      </section>
    </div>
  );
}
