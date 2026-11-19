import { NextRequest, NextResponse } from "next/server";
import { exigirAdminEmpresa } from "@/lib/empresa-guard";
import {
  obterPerfilEmpresa,
  atualizarPerfilEmpresa,
} from "@/lib/empresa-perfil";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const guarda = await exigirAdminEmpresa(request);
    if (!guarda.ok) {
      return NextResponse.json({ error: guarda.erro }, { status: guarda.status });
    }

    const res = await obterPerfilEmpresa(guarda.empresaId);
    if (!res.ok) {
      return NextResponse.json({ error: res.erro }, { status: res.status });
    }

    return NextResponse.json({ success: true, empresa: res.empresa });
  } catch (error) {
    console.error("Erro no GET /api/admin/empresa:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const guarda = await exigirAdminEmpresa(request, { mutacao: true });
    if (!guarda.ok) {
      return NextResponse.json({ error: guarda.erro }, { status: guarda.status });
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Corpo da requisição inválido" },
        { status: 400 },
      );
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Corpo da requisição deve ser um objeto JSON" },
        { status: 400 },
      );
    }

    const res = await atualizarPerfilEmpresa(guarda.empresaId, body);
    if (!res.ok) {
      return NextResponse.json({ error: res.erro }, { status: res.status });
    }

    return NextResponse.json({ success: true, empresa: res.empresa });
  } catch (error) {
    console.error("Erro no PATCH /api/admin/empresa:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
