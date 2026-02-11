import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import UsuariosClient from "./_components/usuarios-client";

export default async function UsuariosPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "master") {
    redirect("/login");
  }

  return <UsuariosClient />;
}
