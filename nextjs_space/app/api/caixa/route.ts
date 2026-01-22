import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TipoMovimentacaoCaixa, MetodoPagamento, Caixa } from "@prisma/client";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

/**
 * Calcula valores esperados do caixa usando a tabela SalePayment
 * para suportar vendas com múltiplos métodos de pagamento
 */
export async function calcularValoresEsperados(
  userId: string,
  caixaAberto: Partial<Caixa>,
) {
  // 1. Buscar vendas do período para identificar quais devem ser consideradas
  const vendas = await prisma.sale.findMany({
    where: {
      userId: userId,
      dataHora: { gte: caixaAberto.dataAbertura },
    },
    select: {
      id: true,
      valorTotal: true,
      metodoPagamento: true,
      troco: true, // IMPORTANTE: buscar troco para descontar do dinheiro
      payments: true, // Incluir pagamentos múltiplos
    },
  });

  // 2. Calcular totais por método de pagamento usando SalePayment
  let vendasDinheiro = 0;
  let vendasPix = 0;
  let vendasCredito = 0;
  let vendasDebito = 0;

  for (const venda of vendas) {
    const trocoVenda = Number(venda.troco) || 0;

    if (venda.payments && venda.payments.length > 0) {
      // Calcular o total recebido em dinheiro nesta venda específica
      let dinheiroRecebidoNestaVenda = 0;

      for (const payment of venda.payments) {
        const valor = Number(payment.amount) || 0;
        switch (payment.method) {
          case "dinheiro":
            dinheiroRecebidoNestaVenda += valor;
            break;
          case "pix":
            vendasPix += valor;
            break;
          case "credito":
            vendasCredito += valor;
            break;
          case "debito":
            vendasDebito += valor;
            break;
        }
      }

      // O valor que realmente ficou no caixa é o recebido menos o troco
      vendasDinheiro += Math.max(0, dinheiroRecebidoNestaVenda - trocoVenda);
    } else {
      // Formato antigo: usar metodoPagamento diretamente
      const valor = Number(venda.valorTotal) || 0;
      switch (venda.metodoPagamento) {
        case "dinheiro":
          // No formato antigo, valorTotal já é o valor líquido da venda
          vendasDinheiro += valor;
          break;
        case "pix":
          vendasPix += valor;
          break;
        case "credito":
          vendasCredito += valor;
          break;
        case "debito":
          vendasDebito += valor;
          break;
      }
    }
  }

  const vendasCartao = vendasCredito + vendasDebito;

  // 3. Calculate Movements (Sangrias and Suprimentos) - SEPARADO POR MÉTODO DE PAGAMENTO
  const todasMovimentacoes = await prisma.movimentacaoCaixa.findMany({
    where: { caixaId: caixaAberto.id },
  });

  // Separar movimentações por método de pagamento
  let sangriasDinheiro = 0;
  let sangriasMaquininha = 0; // PIX + Cartão
  let suprimentosDinheiro = 0;
  let suprimentosMaquininha = 0; // PIX + Cartão

  todasMovimentacoes.forEach((mov) => {
    const valor = Number(mov.valor || 0);
    const metodo = mov.metodoPagamento;

    // Determinar se é movimentação de dinheiro ou maquininha
    const isDinheiro = !metodo || metodo === "dinheiro";

    if (mov.tipo === TipoMovimentacaoCaixa.SANGRIA) {
      if (isDinheiro) {
        sangriasDinheiro += valor;
      } else {
        sangriasMaquininha += valor;
      }
    } else if (mov.tipo === TipoMovimentacaoCaixa.SUPRIMENTO) {
      if (isDinheiro) {
        suprimentosDinheiro += valor;
      } else {
        suprimentosMaquininha += valor;
      }
    }
  });

  // Totais legados (para compatibilidade)
  const totalSangrias = sangriasDinheiro + sangriasMaquininha;
  const totalSuprimentos = suprimentosDinheiro + suprimentosMaquininha;

  // 4. Calculate Theoretical Balances
  // AGORA INCLUÍMOS O SALDO INICIAL no cálculo do dinheiro
  // O funcionário conta o dinheiro físico na gaveta, então precisamos incluir o fundo de troco

  // Saldo Inicial (fundo de troco)
  const saldoInicial = Number(caixaAberto.saldoInicial || 0);

  // Expected Cash = Saldo Inicial + Sales(Cash) + Supplies(Cash) - Bleeds(Cash)
  const saldoTeoricoDinheiro =
    saldoInicial + vendasDinheiro + suprimentosDinheiro - sangriasDinheiro;

  // Expected Machine (Pix + Card) + Supplies(Machine) - Bleeds(Machine)
  // Maquininha não tem saldo inicial pois começa do zero todo dia
  const saldoTeoricoMaquininha =
    vendasPix + vendasCartao + suprimentosMaquininha - sangriasMaquininha;

  // Total Theoretical Drawer (agora com saldo inicial)
  const totalTeoricoSistema = saldoTeoricoDinheiro + saldoTeoricoMaquininha;

  return {
    vendasDinheiro,
    vendasPix,
    vendasCartao,
    vendasCredito,
    vendasDebito,
    totalSangrias,
    totalSuprimentos,
    saldoTeoricoDinheiro,
    saldoTeoricoMaquininha,
    totalTeoricoSistema,
  };
}

// GET - Buscar caixa aberto do usuário e status
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const caixaAberto = await prisma.caixa.findFirst({
      where: {
        usuarioId: session.user.id,
        status: "ABERTO",
      },
      include: {
        movimentacoes: {
          orderBy: {
            dataHora: "desc",
          },
        },
      },
      orderBy: {
        dataAbertura: "desc",
      },
    });

    if (caixaAberto) {
      // Buscar vendas com seus pagamentos múltiplos
      const vendas = await prisma.sale.findMany({
        where: {
          userId: session.user.id,
          dataHora: {
            gte: caixaAberto.dataAbertura,
          },
        },
        include: {
          payments: true, // Incluir pagamentos múltiplos
        },
        orderBy: {
          dataHora: "desc",
        },
      });

      // Unificar movimentações e vendas - AGORA COM metodoPagamento
      const movimentosUnificados = [
        ...caixaAberto.movimentacoes.map((m) => ({
          id: m.id,
          tipo: m.tipo,
          valor: Number(m.valor),
          descricao: m.descricao,
          dataHora: m.dataHora,
          metodoPagamento: m.metodoPagamento || null,
        })),
        ...vendas.map((v) => {
          // Determinar método de pagamento para exibição
          let metodoDisplay: string | null;
          if (v.payments && v.payments.length > 1) {
            // Múltiplos pagamentos: mostrar como "COMBINADO" ou listar
            metodoDisplay = "COMBINADO";
          } else if (v.payments && v.payments.length === 1) {
            metodoDisplay = v.payments[0].method;
          } else {
            metodoDisplay = v.metodoPagamento;
          }

          // Formatar descrição com detalhes de pagamento
          let descricao = "Venda";
          if (v.payments && v.payments.length > 1) {
            const detalhes = v.payments
              .map((p) => `${p.method}: R$ ${Number(p.amount).toFixed(2)}`)
              .join(" + ");
            descricao = `Venda (${detalhes})`;
          } else if (v.troco) {
            descricao = `Venda (Troco: R$ ${Number(v.troco).toFixed(2)})`;
          }

          return {
            id: v.id,
            tipo: "VENDA",
            valor: Number(v.valorTotal),
            descricao,
            dataHora: v.dataHora,
            metodoPagamento: metodoDisplay,
            payments: v.payments?.map((p) => ({
              method: p.method,
              amount: Number(p.amount),
            })),
          };
        }),
      ].sort(
        (a, b) =>
          new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime(),
      );

      return NextResponse.json({
        caixaAberto: {
          ...caixaAberto,
          saldoInicial: Number(caixaAberto.saldoInicial), // Converter Decimal para número
          movimentacoes: movimentosUnificados,
          resumo: await calcularValoresEsperados(session.user.id, caixaAberto),
        },
      });
    }

    return NextResponse.json({ caixaAberto });
  } catch (error) {
    console.error("Erro ao buscar caixa:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

// POST - Ações do Caixa
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const {
      action,
      saldoInicial,
      valor,
      descricao,
      metodoPagamento,
      // Novos campos de fechamento
      valorInformadoDinheiro,
      valorInformadoMaquininha, // Novo campo
      justificativa,
      authPassword,
    } = body;

    // === ABRIR CAIXA ===
    if (action === "abrir") {
      const caixaExistente = await prisma.caixa.findFirst({
        where: {
          usuarioId: session.user.id,
          status: "ABERTO",
        },
      });

      if (caixaExistente) {
        return NextResponse.json(
          { error: "Você já possui um caixa aberto! Recarregue a página." },
          { status: 400 },
        );
      }

      const saldoNum = Number(saldoInicial);
      if (
        saldoInicial === undefined ||
        saldoInicial === null ||
        isNaN(saldoNum) ||
        saldoNum < 0
      ) {
        return NextResponse.json(
          { error: "Saldo inicial inválido. Insira um valor positivo." },
          { status: 400 },
        );
      }

      if (!session.user.empresaId) {
        return NextResponse.json(
          { error: "Erro de permissão: Usuário não vinculado a uma empresa." },
          { status: 400 },
        );
      }

      const result = await prisma.$transaction(async (tx) => {
        const novoCaixa = await tx.caixa.create({
          data: {
            usuarioId: session.user.id,
            empresaId: session.user.empresaId!,
            saldoInicial: Number(saldoInicial),
            status: "ABERTO",
          },
        });

        await tx.movimentacaoCaixa.create({
          data: {
            caixaId: novoCaixa.id,
            usuarioId: session.user.id,
            tipo: TipoMovimentacaoCaixa.ABERTURA,
            valor: Number(saldoInicial),
            descricao: "Abertura de Caixa",
          },
        });

        return novoCaixa;
      });

      return NextResponse.json({
        success: true,
        message: "Caixa aberto com sucesso!",
        caixa: result,
      });
    }

    // Para ações que exigem caixa aberto
    const caixaAberto = await prisma.caixa.findFirst({
      where: {
        usuarioId: session.user.id,
        status: "ABERTO",
      },
    });

    if (!caixaAberto) {
      return NextResponse.json(
        { error: "Você não possui um caixa aberto!" },
        { status: 400 },
      );
    }

    // === SANGRIA / SUPRIMENTO ===
    if (action === "sangria" || action === "suprimento") {
      const valorNum = Number(valor);
      if (!valor || isNaN(valorNum) || valorNum <= 0) {
        return NextResponse.json(
          { error: "Valor inválido. Insira um valor maior que zero." },
          { status: 400 },
        );
      }

      const tipo =
        action === "sangria"
          ? TipoMovimentacaoCaixa.SANGRIA
          : TipoMovimentacaoCaixa.SUPRIMENTO;

      const mov = await prisma.movimentacaoCaixa.create({
        data: {
          caixaId: caixaAberto.id,
          usuarioId: session.user.id,
          tipo: tipo,
          valor: Number(valor),
          descricao: descricao || "",
          metodoPagamento: metodoPagamento as MetodoPagamento,
        },
      });

      return NextResponse.json({
        success: true,
        message: `${
          action === "sangria" ? "Sangria" : "Suprimento"
        } realizado com sucesso!`,
        movimentacao: mov,
      });
    }

    // === CONFERIR / FECHAR (LÓGICA UNIFICADA) ===
    if (action === "conferir" || action === "fechar") {
      // 1. Get Inputs (Informed)
      const infDinheiro = Number(valorInformadoDinheiro ?? 0);
      const infMaquininha = Number(valorInformadoMaquininha ?? 0);

      // 2. Get Theoretical (System) - AGORA USA SalePayment
      const dados = await calcularValoresEsperados(
        session.user.id,
        caixaAberto,
      );

      // 3. Calculate Divergence (General)
      const totalInformado = infDinheiro + infMaquininha;
      const totalSistema = dados.totalTeoricoSistema;
      const divergenciaGeral = totalInformado - totalSistema;

      // Check if there is a significant divergence (> 1 cent)
      const temDivergencia = Math.abs(divergenciaGeral) > 0.009;

      // 4. Internal Audit (Cash Only)
      const diffDinheiro = infDinheiro - dados.saldoTeoricoDinheiro;
      const diffMaquininha = infMaquininha - dados.saldoTeoricoMaquininha;

      const detalhes = {
        esperado: {
          dinheiro: dados.saldoTeoricoDinheiro,
          maquininha: dados.saldoTeoricoMaquininha,
          total: totalSistema,
        },
        informado: {
          dinheiro: infDinheiro,
          maquininha: infMaquininha,
          total: totalInformado,
        },
        diferenca: {
          dinheiro: diffDinheiro,
          maquininha: diffMaquininha,
          total: divergenciaGeral,
        },
        // Detalhamento de vendas por método
        vendasPorMetodo: {
          dinheiro: dados.vendasDinheiro,
          pix: dados.vendasPix,
          credito: dados.vendasCredito,
          debito: dados.vendasDebito,
          cartaoTotal: dados.vendasCartao,
        },
      };

      // If just checking, return details
      if (action === "conferir") {
        return NextResponse.json({
          success: true,
          temDivergencia,
          detalhes,
        });
      }

      // === ACTION: FECHAR ===

      // Backend Validation: Divergence requires Justification and Manager Auth
      if (temDivergencia) {
        if (!justificativa || justificativa.trim() === "") {
          return NextResponse.json(
            {
              error:
                "Justificativa é obrigatória quando há divergência de valores.",
            },
            { status: 400 },
          );
        }

        // Validate Auth Password
        if (!authPassword) {
          return NextResponse.json(
            {
              error: "Senha de Autorização é obrigatória para divergências.",
            },
            { status: 400 },
          );
        }

        // Verify Company Auth Password
        const empresa = await prisma.empresa.findUnique({
          where: { id: session.user.empresaId! },
        });

        if (!empresa) {
          return NextResponse.json(
            { error: "Empresa não encontrada." },
            { status: 404 },
          );
        }

        if (!empresa.senhaAutorizacao) {
          // FALLBACK: usar senha do admin da empresa
          const adminUser = await prisma.user.findFirst({
            where: {
              empresaId: session.user.empresaId!,
              role: "admin",
            },
          });

          if (!adminUser || !adminUser.password) {
            return NextResponse.json(
              {
                error:
                  "Senha de autorização não configurada e administrador não encontrado.",
              },
              { status: 403 },
            );
          }

          const validAdminPass = await bcrypt.compare(
            authPassword,
            adminUser.password,
          );

          if (!validAdminPass) {
            return NextResponse.json(
              { error: "Senha de autorização incorreta." },
              { status: 403 },
            );
          }
        } else {
          const validPass = await bcrypt.compare(
            authPassword,
            empresa.senhaAutorizacao,
          );

          if (!validPass) {
            return NextResponse.json(
              { error: "Senha de autorização incorreta." },
              { status: 403 },
            );
          }
        }
      }

      // Update Caixa
      const caixaFechado = await prisma.caixa.update({
        where: { id: caixaAberto.id },
        data: {
          saldoFinal: totalInformado,
          valorInformadoDinheiro: infDinheiro,
          valorInformadoMaquininha: infMaquininha,
          // Deprecated fields set to 0 to avoid null issues if they are required in some legacy view,
          // or we can leave them null if schema allows. Schema allows null.
          valorInformadoPix: 0,
          valorInformadoCartao: 0,

          justificativa: justificativa,
          quebraDeCaixa: divergenciaGeral, // Total monetário da divergência (pode ser positivo ou negativo)
          divergenciaDinheiro: diffDinheiro, // Internal Audit Log

          status: "FECHADO",
          dataFechamento: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: temDivergencia
          ? "Caixa fechado com divergência."
          : "Caixa fechado com sucesso!",
        caixa: caixaFechado,
        divergencia: temDivergencia,
        detalhes: {
          diferencaTotal: divergenciaGeral,
          vendasPorMetodo: detalhes.vendasPorMetodo,
        },
      });
    }

    // === VERIFY MANAGER (NOVO - AGORA APENAS SENHA DA EMPRESA) ===
    if (action === "verify_manager") {
      if (!authPassword) {
        return NextResponse.json(
          { error: "Senha de autorização não informada." },
          { status: 400 },
        );
      }

      if (!session.user.empresaId) {
        return NextResponse.json(
          { error: "Usuário sem empresa." },
          { status: 400 },
        );
      }

      const empresa = await prisma.empresa.findUnique({
        where: { id: session.user.empresaId! },
      });

      if (!empresa?.senhaAutorizacao) {
        // FALLBACK: usar senha do admin da empresa
        const adminUser = await prisma.user.findFirst({
          where: {
            empresaId: session.user.empresaId!,
            role: "admin",
          },
        });

        if (!adminUser || !adminUser.password) {
          return NextResponse.json(
            {
              error:
                "Senha de autorização não configurada e administrador não encontrado.",
            },
            { status: 403 },
          );
        }

        const validAdminPass = await bcrypt.compare(
          authPassword,
          adminUser.password,
        );

        if (!validAdminPass) {
          return NextResponse.json(
            { error: "Senha incorreta." },
            { status: 403 },
          );
        }
      } else {
        const validPass = await bcrypt.compare(
          authPassword,
          empresa.senhaAutorizacao,
        );

        if (!validPass) {
          return NextResponse.json(
            { error: "Senha incorreta." },
            { status: 403 },
          );
        }
      }

      return NextResponse.json({ success: true, message: "Autorizado" });
    }

    // === TROCA PIX (NOVO) ===
    if (action === "troca_pix") {
      const valorPix = Number(body.valorPix); // Valor que entrou (Pix)
      const valorSaida = Number(body.valorDinheiro); // Valor que saiu (Dinheiro)

      if (
        isNaN(valorPix) ||
        valorPix <= 0 ||
        isNaN(valorSaida) ||
        valorSaida <= 0
      ) {
        return NextResponse.json(
          { error: "Valores inválidos para troca Pix." },
          { status: 400 },
        );
      }

      const taxa = valorPix - valorSaida;

      // Transaction:
      // 1. Venda (Pix) = Taxa (Lucro)
      // 2. Suprimento (Pix) = Valor Principal (Para compor o saldo Pix total: Taxa + Principal = Total Pix)
      // 3. Sangria (Dinheiro) = Valor Principal (Saída física)
      await prisma.$transaction(async (tx) => {
        // Gerar ID de referência para agrupar as movimentações na UI
        const refId = `REF-${Date.now()}`;

        // 1. Registrar Venda da Taxa (Entrada Pix - Lucro)
        if (taxa > 0) {
          await tx.sale.create({
            data: {
              userId: session.user.id,
              empresaId: session.user.empresaId!,
              valorTotal: taxa,
              metodoPagamento: "pix",
              valorRecebido: taxa,
              troco: 0,
              // Criar também o registro na nova tabela de pagamentos
              payments: {
                create: {
                  method: "pix",
                  amount: taxa,
                },
              },
            },
          });
        }

        // 2. Registrar Suprimento do Principal (Entrada Pix - Troca)
        // Guardamos os metadados na descrição para o frontend ler
        await tx.movimentacaoCaixa.create({
          data: {
            caixaId: caixaAberto.id,
            usuarioId: session.user.id,
            tipo: TipoMovimentacaoCaixa.SUPRIMENTO,
            valor: valorSaida, // Valor do Principal
            // Formato: Troca PIX - Principal (Entrada) - Taxa: {taxa} - Demos: {valorSaida} - Recebemos: {valorPix} [REF:{refId}]
            descricao: `Troca PIX - Principal (Entrada) - Taxa: ${taxa.toFixed(
              2,
            )} - Demos: ${valorSaida.toFixed(
              2,
            )} - Recebemos: ${valorPix.toFixed(2)} [${refId}]`,
            metodoPagamento: "pix",
          },
        });

        // 3. Registrar Sangria (Saída Dinheiro)
        await tx.movimentacaoCaixa.create({
          data: {
            caixaId: caixaAberto.id,
            usuarioId: session.user.id,
            tipo: TipoMovimentacaoCaixa.SANGRIA,
            valor: valorSaida,
            descricao: `Troca PIX - Entrega (Saída) [${refId}]`,
            metodoPagamento: "dinheiro",
          },
        });
      });

      return NextResponse.json({
        success: true,
        message: "Troca PIX registrada com sucesso!",
      });
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch (error) {
    console.error("Erro na operação de caixa:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
