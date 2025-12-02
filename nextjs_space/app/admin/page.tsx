import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

import DashboardClient from "./_components/dashboard-client";

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  if (
    session.user.role !== "admin" &&
    session.user.role !== "master" &&
    session.user.role !== "gerente"
  ) {
    redirect("/vender");
  }

  return (
    <>
      <div className="max-w-7xl mx-auto p-4">
        <DashboardClient />
      </div>
    </>
  );
}
