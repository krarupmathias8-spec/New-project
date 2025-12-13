import { redirect } from "next/navigation";

import { getSession } from "@/lib/session";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/auth/sign-in");

  return (
    <DashboardShell user={{ name: session.user.name, email: session.user.email }}>
      {children}
    </DashboardShell>
  );
}

