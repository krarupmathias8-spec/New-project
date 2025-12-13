import Link from "next/link";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ProjectActions } from "./ProjectActions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <header className="space-y-2">
        <div className="text-sm text-muted-foreground">
          <Link className="font-medium text-foreground hover:underline" href="/dashboard">
            Dashboard
          </Link>{" "}
          <span className="text-muted-foreground/60">/</span> {project.name}
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
            <div className="mt-1 text-sm text-muted-foreground">{project.primaryUrl}</div>
          </div>
          {project.activeBrandDnaId ? (
            <Badge variant="success">Brand DNA ready</Badge>
          ) : (
            <Badge variant="warning">Brand DNA missing</Badge>
          )}
        </div>
      </header>

      <ProjectActions projectId={project.id} canGenerate={Boolean(project.activeBrandDnaId)} />

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Ingestion runs</CardTitle>
            <CardDescription>Latest ingestion attempts.</CardDescription>
          </CardHeader>
          <CardContent>
            {project.ingestions.length === 0 ? (
              <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-sm text-muted-foreground">
                No ingestion runs yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead className="text-right">Finished</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {project.ingestions.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.status}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(r.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {r.finishedAt ? new Date(r.finishedAt).toLocaleString() : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Generations</CardTitle>
            <CardDescription>Latest creative generation runs.</CardDescription>
          </CardHeader>
          <CardContent>
            {project.generations.length === 0 ? (
              <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-sm text-muted-foreground">
                No generations yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {project.generations.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell className="font-medium">
                        <a
                          className="hover:underline"
                          href={`/dashboard/projects/${project.id}/generations/${g.id}`}
                        >
                          {g.type}
                        </a>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{g.status}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {new Date(g.createdAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

