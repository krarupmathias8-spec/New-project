import { redirect } from "next/navigation";

import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { CreateProjectForm } from "./CreateProjectForm";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <div>
        <div className="text-sm font-semibold">Overview</div>
        <div className="mt-1 text-sm text-muted-foreground">{user.name ?? user.email}</div>
      </div>

      <CreateProjectForm />

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Projects</CardTitle>
          <CardDescription>All projects in your workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-muted/20 p-8 text-sm text-muted-foreground">
              No projects yet. Create your first one above.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      <a className="hover:underline" href={`/dashboard/projects/${p.id}`}>
                        {p.name}
                      </a>
                    </TableCell>
                    <TableCell className="max-w-[360px] truncate text-muted-foreground">
                      {p.primaryUrl}
                    </TableCell>
                    <TableCell>
                      {p.activeBrandDnaId ? (
                        <Badge variant="success">Brand DNA ready</Badge>
                      ) : (
                        <Badge variant="warning">Needs ingestion</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

