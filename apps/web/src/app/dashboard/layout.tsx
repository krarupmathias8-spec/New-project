import { redirect } from "next/navigation";

import { getSession } from "@/lib/session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/auth/sign-in");

  return <div className="min-h-screen bg-zinc-50">{children}</div>;
}

