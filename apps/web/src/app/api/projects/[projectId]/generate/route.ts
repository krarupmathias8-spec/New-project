import { NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { CreativeType, Prisma } from "@/generated/prisma";
import { enqueueJob } from "@/jobs/dbQueue";

const GenerateSchema = z.object({
  type: z.nativeEnum(CreativeType),
  parameters: z.record(z.string(), z.unknown()).optional(),
});

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
    select: { id: true, activeBrandDnaId: true },
  });
  if (!project) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!project.activeBrandDnaId) {
    return NextResponse.json({ error: "brand_dna_required" }, { status: 409 });
  }

  const body = await req.json().catch(() => null);
  const parsed = GenerateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const run = await prisma.generationRun.create({
    data: {
      projectId: project.id,
      brandDnaId: project.activeBrandDnaId,
      type: parsed.data.type,
      status: "QUEUED",
      parameters: (parsed.data.parameters ?? {}) as Prisma.InputJsonValue,
      requestedById: user.id,
    },
    select: { id: true, status: true, type: true, createdAt: true },
  });

  await enqueueJob({
    type: "GENERATION",
    payload: { generationRunId: run.id, type: run.type },
  });

  return NextResponse.json({ generationRun: run }, { status: 202 });
}

