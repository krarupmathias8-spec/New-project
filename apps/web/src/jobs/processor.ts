import { Prisma, type CreativeType, type ImageFormat } from "@/generated/prisma";

import { prisma } from "@/lib/prisma";
import { scrapeBrandPages } from "@/ingestion/scrape";
import { analyzeBrandFromPages } from "@/ai/brandAnalyzer";
import { generateCreatives } from "@/ai/creativeEngine";
import { generateAdImage } from "@/ai/imageCreator";
import { enqueueJob } from "@/jobs/dbQueue";

function now() {
  return new Date();
}

export async function runIngestionJob(payload: { ingestionRunId: string }) {
  try {
    await prisma.ingestionRun.update({
      where: { id: payload.ingestionRunId },
      data: { status: "RUNNING", startedAt: now(), error: null },
    });

    const run = await prisma.ingestionRun.findUnique({
      where: { id: payload.ingestionRunId },
      select: { id: true, inputUrl: true, projectId: true },
    });
    if (!run) throw new Error("ingestion_run_not_found");

    const pages = await scrapeBrandPages(run.inputUrl);
    if (pages.length === 0) throw new Error("no_pages_scraped");

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
      where: { id: payload.ingestionRunId },
      data: {
        status: "SUCCEEDED",
        finishedAt: now(),
        brandDnaId: brandDna.id,
        stats: {
          pages: pages.length,
          model: analyzed.model,
          usage: analyzed.usage,
        } as unknown as Prisma.InputJsonValue,
      },
    });
  } catch (e) {
    const msg = String((e as Error)?.message ?? e);
    await prisma.ingestionRun
      .update({
        where: { id: payload.ingestionRunId },
        data: { status: "FAILED", finishedAt: now(), error: msg },
      })
      .catch(() => null);
    throw e;
  }
}

export async function runGenerationJob(payload: { generationRunId: string; type: CreativeType }) {
  try {
    await prisma.generationRun.update({
      where: { id: payload.generationRunId },
      data: { status: "RUNNING", startedAt: now(), error: null },
    });

    const run = await prisma.generationRun.findUnique({
      where: { id: payload.generationRunId },
      select: { id: true, type: true, brandDna: { select: { dna: true } } },
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

    // Auto-enqueue images (optional).
    const formats: ImageFormat[] = ["SQUARE_1_1", "PORTRAIT_4_5", "LANDSCAPE_16_9"];
    await enqueueJob({
      type: "IMAGES",
      payload: { generationRunId: run.id, formats },
    });
  } catch (e) {
    const msg = String((e as Error)?.message ?? e);
    await prisma.generationRun
      .update({
        where: { id: payload.generationRunId },
        data: { status: "FAILED", finishedAt: now(), error: msg },
      })
      .catch(() => null);
    throw e;
  }
}

export async function runImagesJob(payload: { generationRunId: string; formats: ImageFormat[] }) {
  const run = await prisma.generationRun.findUnique({
    where: { id: payload.generationRunId },
    select: { id: true, type: true, brandDna: { select: { dna: true } } },
  });
  if (!run) throw new Error("generation_run_not_found");

  for (const format of payload.formats) {
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
}

