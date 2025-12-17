import { NextResponse } from "next/server";

import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { recoverStuckJobs, processNextJobs } from "@/jobs/runner";

export async function POST(req: Request) {
  const session = await getSession();
  const email = session?.user?.email ?? undefined;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const raw = url.searchParams.get("maxJobs");
  const requested = raw ? Number(raw) : 5;
  const maxJobs = Number.isFinite(requested) ? Math.min(10, Math.max(1, Math.floor(requested))) : 5;

  await recoverStuckJobs();
  const result = await processNextJobs(maxJobs);

  return NextResponse.json({ ok: true, ...result });
}
