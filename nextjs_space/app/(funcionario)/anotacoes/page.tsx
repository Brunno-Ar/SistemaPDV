import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import NotesBoard from "./_components/notes-board";

export const metadata = {
  title: "Minhas Anotações | PDV",
  description: "Gerencie suas notas e lembretes.",
};

export default async function NotesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  // Ensure user has a company context (optional, based on logic)
  if (!session.user.empresaId && session.user.role !== "master") {
    // If no empresa, maybe redirect or show empty
  }

  const notes = await prisma.note.findMany({
    where: {
      userId: session.user.id,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return (
    <div className="h-full p-6 lg:p-10 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Anotações</h1>
      </div>
      <NotesBoard initialNotes={notes} />
    </div>
  );
}
