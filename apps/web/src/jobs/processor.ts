import { Prisma, type CreativeType, type ImageFormat } from "@/generated/prisma";

import { prisma } from "@/lib/prisma";
import { scrapeBrandSite } from "@/ingestion/scrape";
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

    const scraped = await scrapeBrandSite(run.inputUrl);
    const pages = scraped.pages;
    const assets = scraped.assets;
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
      assets,
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
      select: { id: true, type: true, parameters: true, brandDna: { select: { dna: true } } },
    });
    if (!run) throw new Error("generation_run_not_found");

    const params = (run.parameters ?? {}) as unknown;
    const paramsObj = params && typeof params === "object" && !Array.isArray(params) ? (params as Record<string, unknown>) : {};
    const notes = typeof paramsObj.notes === "string" && paramsObj.notes.trim() ? paramsObj.notes.trim() : undefined;
    const requestedCount =
      typeof paramsObj.creativeCount === "number" ? paramsObj.creativeCount : Number(paramsObj.creativeCount);
    const creativeCount = Number.isFinite(requestedCount) ? Math.min(6, Math.max(1, Math.floor(requestedCount))) : undefined;

    const generated = await generateCreatives({
      type: run.type,
      brandDna: run.brandDna.dna,
      notes,
      creativeCount,
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
    const maybeFormats = paramsObj.imageFormats;
    const formats: ImageFormat[] =
      Array.isArray(maybeFormats) && maybeFormats.every((v) => typeof v === "string")
        ? (maybeFormats as ImageFormat[])
        : ["SQUARE_1_1", "PORTRAIT_4_5", "LANDSCAPE_16_9"];
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
    select: { id: true, type: true, output: true, parameters: true, brandDna: { select: { dna: true } } },
  });
  if (!run) throw new Error("generation_run_not_found");

  const params = (run.parameters ?? {}) as unknown;
  const paramsObj = params && typeof params === "object" && !Array.isArray(params) ? (params as Record<string, unknown>) : {};
  const requestedCount = typeof paramsObj.creativeCount === "number" ? paramsObj.creativeCount : Number(paramsObj.creativeCount);
  const creativeCount = Number.isFinite(requestedCount) ? Math.min(6, Math.max(1, Math.floor(requestedCount))) : 4;
  const useBrandAssets = paramsObj.useBrandAssets === false ? false : true;

  const out = (run.output ?? {}) as unknown;
  const outObj = out && typeof out === "object" && !Array.isArray(out) ? (out as Record<string, unknown>) : {};

  const variants: Array<{ index: number; angle?: string; headline?: string }> = [];

  if (run.type === "META_ADS" && Array.isArray(outObj.ads)) {
    const ads = outObj.ads as unknown[];
    for (let i = 0; i < Math.min(creativeCount, ads.length); i++) {
      const ad = ads[i] && typeof ads[i] === "object" ? (ads[i] as Record<string, unknown>) : {};
      variants.push({
        index: i,
        angle: typeof ad.angle === "string" ? ad.angle : undefined,
        headline: typeof ad.headline === "string" ? ad.headline : undefined,
      });
    }
  } else if (run.type === "GOOGLE_ADS" && Array.isArray(outObj.campaigns)) {
    const campaigns = outObj.campaigns as unknown[];
    for (let i = 0; i < Math.min(creativeCount, campaigns.length); i++) {
      const c = campaigns[i] && typeof campaigns[i] === "object" ? (campaigns[i] as Record<string, unknown>) : {};
      const headlines = Array.isArray(c.headlines) ? (c.headlines as unknown[]).map(String) : [];
      variants.push({
        index: i,
        angle: typeof c.angle === "string" ? c.angle : undefined,
        headline: headlines[0] ? String(headlines[0]) : undefined,
      });
    }
  }

  if (variants.length === 0) {
    for (let i = 0; i < creativeCount; i++) variants.push({ index: i });
  }

  for (const variant of variants) {
    for (const format of payload.formats) {
      const img = await generateAdImage({
        creativeType: run.type,
        brandDna: run.brandDna.dna,
        format,
        variant,
        useBrandAssets,
      });

      const meta = {
        variantIndex: variant.index,
        angle: variant.angle,
        headline: variant.headline,
        usedAssets: (img as unknown as { usedAssets?: unknown }).usedAssets ?? null,
      };

      await prisma.visualAsset.create({
        data: {
          generationRunId: run.id,
          format,
          width: img.width,
          height: img.height,
          prompt: img.prompt,
          negativePrompt: JSON.stringify(meta),
          resultUrl: img.resultUrl ?? undefined,
          openaiImageId: img.openaiImageId,
        },
      });
    }
  }
}

