import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";

import { prisma } from "@/lib/prisma";
import { getEnv } from "@/lib/env";
import { QUEUE_NAMES } from "@/lib/queue";
import { scrapeBrandPages } from "@/ingestion/scrape";
import { analyzeBrandFromPages } from "@/ai/brandAnalyzer";
import { generateCreatives } from "@/ai/creativeEngine";
import { generateAdImage } from "@/ai/imageCreator";
import { Prisma, type ImageFormat } from "@/generated/prisma";

function now() {
  return new Date();
}

async function main() {
  const { REDIS_URL } = getEnv();
  if (!REDIS_URL) throw new Error("Missing REDIS_URL");

  const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null, enableReadyCheck: false });
  const imagesQueue = new Queue(QUEUE_NAMES.images, { connection });

  const ingestionWorker = new Worker(
    QUEUE_NAMES.ingestion,
    async (job) => {
      const { ingestionRunId } = job.data as { ingestionRunId: string };

      await prisma.ingestionRun.update({
        where: { id: ingestionRunId },
        data: { status: "RUNNING", startedAt: now(), error: null },
      });

      const run = await prisma.ingestionRun.findUnique({
        where: { id: ingestionRunId },
        select: { id: true, inputUrl: true, projectId: true },
      });
      if (!run) throw new Error("ingestion_run_not_found");

      const pages = await scrapeBrandPages(run.inputUrl);
      if (pages.length === 0) throw new Error("no_pages_scraped");

      // Store pages
      await prisma.brandPage.createMany({
        data: pages.map((p) => ({
          projectId: run.projectId,
          url: p.url,
          title: p.title,
          content: p.content,
          contentSha: p.contentSha,
        })),
        skipDuplicates: true,
      });

      const corpus = pages
        .map((p) => `URL: ${p.url}\nTITLE: ${p.title ?? ""}\nCONTENT:\n${p.content}\n`)
        .join("\n---\n");

      const analyzed = await analyzeBrandFromPages({
        primaryUrl: run.inputUrl,
        pages: pages.map((p) => ({ url: p.url, title: p.title, content: p.content })),
      });

      const brandDna = await prisma.brandDna.create({
        data: {
          projectId: run.projectId,
          dna: analyzed.data as unknown as Prisma.InputJsonValue,
          corpus,
        },
        select: { id: true },
      });

      await prisma.project.update({
        where: { id: run.projectId },
        data: { activeBrandDnaId: brandDna.id },
      });

      await prisma.ingestionRun.update({
        where: { id: ingestionRunId },
        data: {
          status: "SUCCEEDED",
          finishedAt: now(),
          brandDnaId: brandDna.id,
          stats: { pages: pages.length, model: analyzed.model, usage: analyzed.usage } as unknown as Prisma.InputJsonValue,
        },
      });
    },
    { connection, concurrency: 2 }
  );

  ingestionWorker.on("failed", async (job, err) => {
    const data = (job?.data ?? null) as unknown;
    const runId =
      data && typeof data === "object" && "ingestionRunId" in data
        ? String((data as { ingestionRunId?: unknown }).ingestionRunId ?? "")
        : "";
    if (runId) {
      await prisma.ingestionRun.update({
        where: { id: runId },
        data: { status: "FAILED", finishedAt: now(), error: String(err?.message ?? err) },
      }).catch(() => null);
    }
  });

  const generationWorker = new Worker(
    QUEUE_NAMES.generation,
    async (job) => {
      const { generationRunId } = job.data as { generationRunId: string };

      await prisma.generationRun.update({
        where: { id: generationRunId },
        data: { status: "RUNNING", startedAt: now(), error: null },
      });

      const run = await prisma.generationRun.findUnique({
        where: { id: generationRunId },
        select: { id: true, type: true, projectId: true, brandDnaId: true, brandDna: { select: { dna: true } } },
      });
      if (!run) throw new Error("generation_run_not_found");

      const generated = await generateCreatives({
        type: run.type,
        brandDna: run.brandDna.dna,
      });

      await prisma.generationRun.update({
        where: { id: run.id },
        data: {
          status: "SUCCEEDED",
          finishedAt: now(),
          output: generated.data as unknown as Prisma.InputJsonValue,
          usage: generated.usage as unknown as Prisma.InputJsonValue,
          model: generated.model,
        },
      });

      // Optional: auto-queue images for common formats.
      const defaultFormats: ImageFormat[] = ["SQUARE_1_1", "PORTRAIT_4_5", "LANDSCAPE_16_9"];
      await imagesQueue.add(
        "images",
        { generationRunId: run.id, formats: defaultFormats },
        { removeOnComplete: 1000, removeOnFail: 1000 }
      );
    },
    { connection, concurrency: 2 }
  );

  generationWorker.on("failed", async (job, err) => {
    const data = (job?.data ?? null) as unknown;
    const runId =
      data && typeof data === "object" && "generationRunId" in data
        ? String((data as { generationRunId?: unknown }).generationRunId ?? "")
        : "";
    if (runId) {
      await prisma.generationRun.update({
        where: { id: runId },
        data: { status: "FAILED", finishedAt: now(), error: String(err?.message ?? err) },
      }).catch(() => null);
    }
  });

  const imagesWorker = new Worker(
    QUEUE_NAMES.images,
    async (job) => {
      const { generationRunId, formats } = job.data as { generationRunId: string; formats: ImageFormat[] };

      const run = await prisma.generationRun.findUnique({
        where: { id: generationRunId },
        select: { id: true, type: true, brandDna: { select: { dna: true } } },
      });
      if (!run) throw new Error("generation_run_not_found");

      for (const format of formats) {
        const img = await generateAdImage({
          creativeType: run.type,
          brandDna: run.brandDna.dna,
          format,
        });

        await prisma.visualAsset.create({
          data: {
            generationRunId: run.id,
            format,
            width: img.width,
            height: img.height,
            prompt: img.prompt,
            resultUrl: img.resultUrl ?? undefined,
            openaiImageId: img.openaiImageId,
          },
        });
      }
    },
    { connection, concurrency: 2 }
  );

  imagesWorker.on("failed", async (_job, err) => {
    // For MVP, we keep image failures as job errors (visible in logs),
    // but do not mark the whole generation as FAILED.
    console.error("images job failed", err);
  });

  console.log("Worker started", {
    queues: QUEUE_NAMES,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

