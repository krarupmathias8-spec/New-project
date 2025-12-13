import { NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ImageFormat } from "@/generated/prisma";
import { enqueueJob } from "@/jobs/dbQueue";

const ImagesSchema = z.object({
  generationRunId: z.string().min(1),
  formats: z.array(z.nativeEnum(ImageFormat)).min(1),
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

  const body = await req.json().catch(() => null);
  const parsed = ImagesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const run = await prisma.generationRun.findFirst({
    where: {
      id: parsed.data.generationRunId,
      projectId,
      project: { organization: { members: { some: { userId: user.id } } } },
    },
    select: { id: true },
  });
  if (!run) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await enqueueJob({
    type: "IMAGES",
    payload: { generationRunId: run.id, formats: parsed.data.formats },
  });

  return NextResponse.json({ ok: true }, { status: 202 });
}

