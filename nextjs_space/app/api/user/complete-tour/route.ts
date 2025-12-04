import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    await prisma.user.update({
      where: {
        id: session.user.id,
      },
      data: {
        tourCompleted: true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[TOUR_COMPLETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
