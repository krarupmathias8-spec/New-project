import { NextResponse } from "next/server";

import { getEnv } from "@/lib/env";
import { recoverStuckJobs, processNextJobs } from "@/jobs/runner";

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

async function handler(req: Request) {
  const env = getEnv();
  // Auth (Vercel Cron recommended pattern):
  // - Real Vercel Cron invocations include the `x-vercel-cron` header.
  // - For manual/debug invocations, use Authorization: Bearer <CRON_SECRET>.
  const auth = req.headers.get("authorization") ?? "";
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : null;
  const legacy = req.headers.get("x-cron-secret");
  const isVercelCron = req.headers.get("x-vercel-cron") === "1";
  const okSecret =
    Boolean(env.CRON_SECRET) && (bearer === env.CRON_SECRET || legacy === env.CRON_SECRET);
  if (!isVercelCron && !okSecret) return unauthorized();

  await recoverStuckJobs();

  // Process a small batch. Keep this low to avoid serverless timeouts.
  const url = new URL(req.url);
  const raw = url.searchParams.get("maxJobs");
  const requested = raw ? Number(raw) : 3;
  const maxJobs = Number.isFinite(requested) ? Math.min(10, Math.max(1, Math.floor(requested))) : 3;
  const result = await processNextJobs(maxJobs);

  console.log("[cron] done", result);
  return NextResponse.json(result);
}

export async function GET(req: Request) {
  return handler(req);
}

export async function POST(req: Request) {
  return handler(req);
}
