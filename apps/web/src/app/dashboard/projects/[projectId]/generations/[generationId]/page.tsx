import Link from "next/link";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <header className="space-y-2">
        <div className="text-sm text-muted-foreground">
          <Link className="font-medium text-foreground hover:underline" href={`/dashboard/projects/${projectId}`}>
            Project
          </Link>{" "}
          <span className="text-muted-foreground/60">/</span> Generation
        </div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{gen.type}</h1>
            <div className="mt-1 text-sm text-muted-foreground">
              {new Date(gen.createdAt).toLocaleString()}
            </div>
          </div>
          <Badge variant={gen.status === "SUCCEEDED" ? "success" : gen.status === "FAILED" ? "destructive" : "secondary"}>
            {gen.status}
          </Badge>
        </div>
      </header>

      {gen.error ? (
        <Card className="border-destructive/20 bg-destructive/10 shadow-soft">
          <CardHeader>
            <CardTitle className="text-destructive">Run failed</CardTitle>
            <CardDescription className="text-destructive/80">{gen.error}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <Card className="shadow-soft">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="space-y-1">
            <CardTitle>Output</CardTitle>
            <CardDescription>Structured JSON (copy/export-ready).</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <a href={`/api/generations/${gen.id}/export?format=json`}>Download JSON</a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={`/api/generations/${gen.id}/export?format=csv`}>Download CSV</a>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <pre className="max-h-[560px] overflow-auto rounded-lg border bg-muted/20 p-4 text-xs leading-5">
            {JSON.stringify(gen.output ?? {}, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Visual assets</CardTitle>
          <CardDescription>Generated ad images (square/portrait/landscape).</CardDescription>
        </CardHeader>
        <CardContent>
          {gen.visualAssets.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-sm text-muted-foreground">
              No images generated for this run yet.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {gen.visualAssets.map((a) => (
                <div key={a.id} className="rounded-xl border bg-background p-4 shadow-sm">
                  <div className="text-xs font-medium text-muted-foreground">
                    {a.format} · {a.width}×{a.height}
                  </div>
                  {a.resultUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="mt-3 w-full rounded-lg border" src={a.resultUrl} alt="" />
                  ) : (
                    <div className="mt-3 rounded-lg border border-dashed bg-muted/20 p-6 text-sm text-muted-foreground">
                      Image pending…
                    </div>
                  )}
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm font-medium">Prompt</summary>
                    <div className="mt-2 whitespace-pre-wrap text-xs leading-5 text-muted-foreground">
                      {a.prompt}
                    </div>
                  </details>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

