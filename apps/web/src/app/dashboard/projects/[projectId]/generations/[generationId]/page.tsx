import Link from "next/link";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export default async function GenerationPage({
  params,
}: {
  params: Promise<{ projectId: string; generationId: string }>;
}) {
  const { projectId, generationId } = await params;
  const session = await getSession();
  const email = session?.user?.email ?? undefined;
  if (!email) redirect("/auth/sign-in");

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) redirect("/auth/sign-in");

  const gen = await prisma.generationRun.findFirst({
    where: {
      id: generationId,
      projectId,
      project: { organization: { members: { some: { userId: user.id } } } },
    },
    select: {
      id: true,
      type: true,
      status: true,
      createdAt: true,
      finishedAt: true,
      output: true,
      error: true,
      visualAssets: {
        select: { id: true, format: true, resultUrl: true, prompt: true, width: true, height: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!gen) redirect(`/dashboard/projects/${projectId}`);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <header className="flex flex-col gap-2">
        <div className="text-sm text-zinc-600">
          <Link className="font-medium text-zinc-900" href={`/dashboard/projects/${projectId}`}>
            Project
          </Link>{" "}
          <span className="text-zinc-400">/</span> Generation
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-zinc-900">{gen.type}</h1>
            <div className="mt-1 text-sm text-zinc-600">
              Status: <span className="font-medium text-zinc-900">{gen.status}</span>
            </div>
          </div>
          <div className="text-xs text-zinc-500">{new Date(gen.createdAt).toLocaleString()}</div>
        </div>
      </header>

      {gen.error ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
          {gen.error}
        </div>
      ) : null}

      <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-semibold text-zinc-900">Output (JSON)</div>
          <div className="flex items-center gap-2">
            <a
              className="inline-flex h-9 items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-900 hover:bg-zinc-50"
              href={`/api/generations/${gen.id}/export?format=json`}
            >
              Download JSON
            </a>
            <a
              className="inline-flex h-9 items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-900 hover:bg-zinc-50"
              href={`/api/generations/${gen.id}/export?format=csv`}
            >
              Download CSV
            </a>
          </div>
        </div>
        <pre className="max-h-[560px] overflow-auto rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-xs leading-5 text-zinc-800">
          {JSON.stringify(gen.output ?? {}, null, 2)}
        </pre>
      </section>

      <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="mb-3 text-sm font-semibold text-zinc-900">Visual assets</div>
        {gen.visualAssets.length === 0 ? (
          <div className="text-sm text-zinc-600">No images generated for this run yet.</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {gen.visualAssets.map((a) => (
              <div key={a.id} className="rounded-xl border border-zinc-200 p-4">
                <div className="text-xs font-medium text-zinc-500">
                  {a.format} · {a.width}×{a.height}
                </div>
                {a.resultUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="mt-3 w-full rounded-lg border border-zinc-200" src={a.resultUrl} alt="" />
                ) : (
                  <div className="mt-3 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-6 text-sm text-zinc-600">
                    Image pending…
                  </div>
                )}
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-medium text-zinc-900">Prompt</summary>
                  <div className="mt-2 whitespace-pre-wrap text-xs leading-5 text-zinc-700">{a.prompt}</div>
                </details>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

