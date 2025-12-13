import Link from "next/link";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ProjectActions } from "./ProjectActions";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const session = await getSession();
  const email = session?.user?.email ?? undefined;
  if (!email) redirect("/auth/sign-in");

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) redirect("/auth/sign-in");

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      organization: { members: { some: { userId: user.id } } },
    },
    select: {
      id: true,
      name: true,
      primaryUrl: true,
      activeBrandDnaId: true,
      ingestions: {
        select: { id: true, status: true, createdAt: true, finishedAt: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      generations: {
        select: { id: true, status: true, type: true, createdAt: true, finishedAt: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });
  if (!project) redirect("/dashboard");

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <header className="flex flex-col gap-2">
        <div className="text-sm text-zinc-600">
          <Link className="font-medium text-zinc-900" href="/dashboard">
            Dashboard
          </Link>{" "}
          <span className="text-zinc-400">/</span> {project.name}
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-zinc-900">{project.name}</h1>
            <div className="mt-1 text-sm text-zinc-600">{project.primaryUrl}</div>
          </div>
          <div className="text-xs font-medium text-zinc-500">
            {project.activeBrandDnaId ? "Brand DNA ready" : "Brand DNA missing"}
          </div>
        </div>
      </header>

      <div className="mt-8">
        <ProjectActions projectId={project.id} canGenerate={Boolean(project.activeBrandDnaId)} />
      </div>

      <section className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-semibold text-zinc-900">Ingestion runs</div>
          <div className="mt-3 grid gap-2">
            {project.ingestions.length === 0 ? (
              <div className="text-sm text-zinc-600">No ingestion runs yet.</div>
            ) : (
              project.ingestions.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                >
                  <div className="text-zinc-900">{r.status}</div>
                  <div className="text-zinc-500">
                    {new Date(r.createdAt).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-semibold text-zinc-900">Generations</div>
          <div className="mt-3 grid gap-2">
            {project.generations.length === 0 ? (
              <div className="text-sm text-zinc-600">No generations yet.</div>
            ) : (
              project.generations.map((g) => (
                <Link
                  key={g.id}
                  href={`/dashboard/projects/${project.id}/generations/${g.id}`}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:border-zinc-300"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium text-zinc-900">{g.type}</div>
                    <div className="text-xs text-zinc-500">
                      {new Date(g.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-zinc-600">{g.status}</div>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

