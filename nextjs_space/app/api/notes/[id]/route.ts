import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { title, content, color } = body;

    // Verify ownership
    const existingNote = await prisma.note.findUnique({
      where: { id: params.id },
    });

    if (!existingNote) {
      return new NextResponse("Not Found", { status: 404 });
    }

    if (existingNote.userId !== session.user.id) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const updatedNote = await prisma.note.update({
      where: { id: params.id },
      data: {
        title,
        content,
        color,
      },
    });

    return NextResponse.json(updatedNote);
  } catch (error) {
    console.error("[NOTE_UPDATE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Verify ownership
    const existingNote = await prisma.note.findUnique({
      where: { id: params.id },
    });

    if (!existingNote) {
      return new NextResponse("Not Found", { status: 404 });
    }

    if (existingNote.userId !== session.user.id) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    await prisma.note.delete({
      where: { id: params.id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[NOTE_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
