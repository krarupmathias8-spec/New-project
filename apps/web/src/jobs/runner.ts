import { prisma } from "@/lib/prisma";
import { runGenerationJob, runImagesJob, runIngestionJob } from "@/jobs/processor";
import type { CreativeType } from "@/generated/prisma";

export async function recoverStuckJobs() {
  // Recover stuck jobs (previous invocation timed out).
  // 1. Mark as FAILED if max attempts reached
  await prisma.$executeRaw`
    UPDATE "Job"
    SET status = 'FAILED',
        "lockedAt" = NULL,
        "lockedBy" = NULL,
        "lastError" = 'Timeout (max attempts reached)'
    WHERE status = 'RUNNING'
      AND "lockedAt" IS NOT NULL
      AND "lockedAt" < NOW() - INTERVAL '15 minutes'
      AND attempts >= "maxAttempts";
  `;

  // 2. Mark as QUEUED if retry attempts remain
  await prisma.$executeRaw`
    UPDATE "Job"
    SET status = 'QUEUED',
        "lockedAt" = NULL,
        "lockedBy" = NULL
    WHERE status = 'RUNNING'
      AND "lockedAt" IS NOT NULL
      AND "lockedAt" < NOW() - INTERVAL '15 minutes'
      AND attempts < "maxAttempts";
  `;
}

export async function processNextJobs(maxJobs = 1) {
  const workerId = `vercel-${Date.now()}`;
  console.log("[cron] tick", { workerId, maxJobs });

  const claimed = await prisma.$transaction(async (tx) => {
    // Atomically claim jobs using SKIP LOCKED to avoid concurrent workers processing the same rows.
    const rows = (await tx.$queryRaw`
      WITH picked AS (
        SELECT id
        FROM "Job"
        WHERE status = 'QUEUED'
          AND "availableAt" <= NOW()
          AND attempts < "maxAttempts"
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
      console.log("[cron] processing", { id: job.id, type: job.type, attempts: job.attempts });
      if (job.type === "INGESTION") {
        const p = job.payload as { ingestionRunId: string };
        await runIngestionJob(p);
      } else if (job.type === "GENERATION") {
        const p = job.payload as { generationRunId: string; type: string };
        await runGenerationJob(p as unknown as { generationRunId: string; type: CreativeType });
      } else if (job.type === "IMAGES") {
        await runImagesJob(job.payload);
      }

      await prisma.job.update({
        where: { id: job.id },
        data: { status: "SUCCEEDED" },
      });
      results.push({ id: job.id, type: job.type, status: "SUCCEEDED" });
    } catch (e) {
      const msg = String((e as Error)?.message ?? e);
      const shouldRetry = job.attempts < job.maxAttempts;
      console.error("[cron] failed", { id: job.id, type: job.type, msg });

      await prisma.job.update({
        where: { id: job.id },
        data: {
          status: shouldRetry ? "QUEUED" : "FAILED",
          lastError: msg,
          // Backoff: retry later (exponential backoff could be better, but linear is fine)
          availableAt: shouldRetry ? new Date(Date.now() + 60_000 * job.attempts) : new Date(),
        },
      });
      results.push({ id: job.id, type: job.type, status: shouldRetry ? "RETRY" : "FAILED" });
    }
  }

  return { claimed: claimed.length, results };
}
