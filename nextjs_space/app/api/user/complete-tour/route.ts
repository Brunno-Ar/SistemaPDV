import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST() {
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

export async function PUT(req: Request) {
    try {
      const session = await getServerSession(authOptions);

      if (!session || !session.user) {
        return new NextResponse("Unauthorized", { status: 401 });
      }

      const body = await req.json();

      if (body.reset) {
          await prisma.user.update({
            where: {
              id: session.user.id,
            },
            data: {
              tourCompleted: false,
            },
          });
          return NextResponse.json({ success: true });
      }

      return new NextResponse("Bad Request", { status: 400 });
    } catch (error) {
      console.error("[TOUR_RESET]", error);
      return new NextResponse("Internal Error", { status: 500 });
    }
  }
