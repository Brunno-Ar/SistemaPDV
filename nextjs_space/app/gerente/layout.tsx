import RoleBasedLayout from "@/components/layout/role-based-layout";

export default function GerenteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RoleBasedLayout>{children}</RoleBasedLayout>;
}
