import Link from "next/link";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { CreateProjectForm } from "./CreateProjectForm";
import { SignOutForm } from "./SignOutForm";

export default async function DashboardHome() {
  const session = await getSession();
  const email = session?.user?.email ?? undefined;
  if (!email) redirect("/auth/sign-in");

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true },
  });
  if (!user) redirect("/auth/sign-in");

  const projects = await prisma.project.findMany({
    where: { organization: { members: { some: { userId: user.id } } } },
    select: {
      id: true,
      name: true,
      primaryUrl: true,
      createdAt: true,
      activeBrandDnaId: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-zinc-900">Dashboard</div>
          <div className="mt-1 text-sm text-zinc-600">
            {user.name ?? user.email}
          </div>
        </div>

        <SignOutForm />
      </header>

      <div className="mt-8">
        <CreateProjectForm />
      </div>

      <section className="mt-8">
        <div className="mb-3 text-sm font-semibold text-zinc-900">Projects</div>
        {projects.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 shadow-sm">
            No projects yet. Create your first one above.
          </div>
        ) : (
          <div className="grid gap-3">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/dashboard/projects/${p.id}`}
                className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm hover:border-zinc-300"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-zinc-900">
                      {p.name}
                    </div>
                    <div className="mt-1 truncate text-sm text-zinc-600">
                      {p.primaryUrl}
                    </div>
                  </div>
                  <div className="text-xs font-medium text-zinc-500">
                    {p.activeBrandDnaId ? "Brand DNA ready" : "Needs ingestion"}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

