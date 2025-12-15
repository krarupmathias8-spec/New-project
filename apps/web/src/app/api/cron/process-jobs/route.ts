import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { runGenerationJob, runImagesJob, runIngestionJob } from "@/jobs/processor";
import type { CreativeType, ImageFormat } from "@/generated/prisma";

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

async function handler(req: Request) {
  // Auth (Vercel Cron recommended pattern):
  // - Set CRON_SECRET in Vercel env vars
  // - Vercel will call this endpoint with: Authorization: Bearer <CRON_SECRET>
  const auth = req.headers.get("authorization") ?? "";
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : null;
  const legacy = req.headers.get("x-cron-secret");
  const ok = Boolean(env.CRON_SECRET) && (bearer === env.CRON_SECRET || legacy === env.CRON_SECRET);
  if (!ok) return unauthorized();

  // Recover stuck jobs (previous invocation timed out).
  await prisma.$executeRaw`
    UPDATE "Job"
    SET status = 'QUEUED',
        "lockedAt" = NULL,
        "lockedBy" = NULL
    WHERE status = 'RUNNING'
      AND "lockedAt" IS NOT NULL
      AND "lockedAt" < NOW() - INTERVAL '15 minutes';
  `;

  // Process a tiny batch to avoid serverless timeouts.
  const workerId = `vercel-${Date.now()}`;
  const maxJobs = 1;

  const claimed = await prisma.$transaction(async (tx) => {
    // Atomically claim jobs using SKIP LOCKED to avoid concurrent workers processing the same rows.
    const rows = (await tx.$queryRaw`
      WITH picked AS (
        SELECT id
        FROM "Job"
        WHERE status = 'QUEUED'
          AND "availableAt" <= NOW()
        ORDER BY "createdAt" ASC
        FOR UPDATE SKIP LOCKED
        LIMIT ${maxJobs}
      )
      UPDATE "Job"
      SET status = 'RUNNING',
          "lockedAt" = NOW(),
          "lockedBy" = ${workerId},
          attempts = attempts + 1,
          "lastError" = NULL
      WHERE id IN (SELECT id FROM picked)
      RETURNING id, type, payload, attempts, "maxAttempts";
    `) as Array<{
      id: string;
      type: "INGESTION" | "GENERATION" | "IMAGES";
      payload: unknown;
      attempts: number;
      maxAttempts: number;
    }>;

    return rows;
  });

  const results: Array<{ id: string; type: string; status: string }> = [];

  for (const job of claimed) {
    try {
      if (job.type === "INGESTION") {
        const p = job.payload as { ingestionRunId: string };
        await runIngestionJob(p);
      } else if (job.type === "GENERATION") {
        const p = job.payload as { generationRunId: string; type: string };
        await runGenerationJob(p as unknown as { generationRunId: string; type: CreativeType });
      } else if (job.type === "IMAGES") {
        const p = job.payload as { generationRunId: string; formats: string[] };
        await runImagesJob(p as unknown as { generationRunId: string; formats: ImageFormat[] });
      }

      await prisma.job.update({
        where: { id: job.id },
        data: { status: "SUCCEEDED" },
      });
      results.push({ id: job.id, type: job.type, status: "SUCCEEDED" });
    } catch (e) {
      const msg = String((e as Error)?.message ?? e);
      const shouldRetry = job.attempts < job.maxAttempts;

      await prisma.job.update({
        where: { id: job.id },
        data: {
          status: shouldRetry ? "QUEUED" : "FAILED",
          lastError: msg,
          // Backoff: retry later
          availableAt: shouldRetry ? new Date(Date.now() + 60_000 * job.attempts) : new Date(),
        },
      });
      results.push({ id: job.id, type: job.type, status: shouldRetry ? "RETRY" : "FAILED" });
    }
  }

  return NextResponse.json({ claimed: claimed.length, results });
}

export async function GET(req: Request) {
  return handler(req);
}

export async function POST(req: Request) {
  return handler(req);
}

