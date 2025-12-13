import { NextResponse } from "next/server";

import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { enqueueJob } from "@/jobs/dbQueue";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;

  const session = await getSession();
  const email = session?.user?.email ?? undefined;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      organization: { members: { some: { userId: user.id } } },
    },
    select: { id: true, primaryUrl: true },
  });
  if (!project) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const run = await prisma.ingestionRun.create({
    data: {
      projectId: project.id,
      inputUrl: project.primaryUrl,
      requestedById: user.id,
      status: "QUEUED",
    },
    select: { id: true, status: true, createdAt: true },
  });

  await enqueueJob({
    type: "INGESTION",
    payload: { ingestionRunId: run.id },
  });

  return NextResponse.json({ ingestionRun: run }, { status: 202 });
}

