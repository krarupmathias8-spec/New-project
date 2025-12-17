import type { CreativeType, ImageFormat } from "@/generated/prisma";
import sharp from "sharp";

import { getOpenAI } from "@/lib/openai";
import { getEnv } from "@/lib/env";

type OpenAIImageSize =
  | "1024x1024"
  | "1024x1536"
  | "1536x1024"
  | "256x256"
  | "512x512"
  | "1024x1792"
  | "1792x1024"
  | "auto";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function formatToSize(format: ImageFormat): { width: number; height: number; size: OpenAIImageSize } {
  switch (format) {
    case "SQUARE_1_1":
      return { width: 1024, height: 1024, size: "1024x1024" };
    case "PORTRAIT_4_5":
      // closest allowed size for most image APIs
      return { width: 1024, height: 1792, size: "1024x1792" };
    case "LANDSCAPE_16_9":
      return { width: 1792, height: 1024, size: "1792x1024" };
    default:
      return { width: 1024, height: 1024, size: "1024x1024" };
  }
}

type BrandAssetPick = {
  logoUrl?: string;
  productImageUrl?: string;
};

function asString(val: unknown): string | undefined {
  return typeof val === "string" && val.trim() ? val.trim() : undefined;
}

function pickBrandAssets(brandDna: unknown): BrandAssetPick {
  const dna = asRecord(brandDna);
  const assets = asRecord(dna.assets);
  const logos = Array.isArray(assets.logos) ? (assets.logos as unknown[]) : [];
  const productImages = Array.isArray(assets.productImages) ? (assets.productImages as unknown[]) : [];
  const ogImages = Array.isArray(assets.ogImages) ? (assets.ogImages as unknown[]) : [];

  const logoUrl = asString(asRecord(logos[0]).url) ?? asString(asRecord(logos[1]).url);
  const productImageUrl =
    asString(asRecord(productImages[0]).url) ??
    asString(asRecord(productImages[1]).url) ??
    asString(asRecord(ogImages[0]).url);

  return { logoUrl, productImageUrl };
}

async function fetchImageBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`asset_fetch_failed:${res.status}`);
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

async function toPng(buf: Buffer): Promise<Buffer> {
  return await sharp(buf).png().toBuffer();
}

async function getBackgroundPng(args: { model: string; prompt: string; size: OpenAIImageSize }): Promise<Buffer> {
  const client = getOpenAI();
  const res = (await client.images.generate({
    model: args.model,
    prompt: args.prompt,
    size: args.size,
    // We keep this permissive for cross-model compatibility.
    quality: args.model === "gpt-image-1" ? ("high" as unknown as "standard") : ("hd" as unknown as "standard"),
    output_format: "png" as unknown as undefined,
    n: 1,
  })) as unknown;

  const first = (res as { data?: Array<{ b64_json?: string; url?: string }> })?.data?.[0];
  if (first?.b64_json) return Buffer.from(first.b64_json, "base64");
  if (first?.url) return await toPng(await fetchImageBuffer(first.url));
  throw new Error("openai_image_empty");
}

async function compositeBrandAssets(args: {
  width: number;
  height: number;
  backgroundPng: Buffer;
  logoUrl?: string;
  productImageUrl?: string;
}): Promise<Buffer> {
  let base = sharp(args.backgroundPng).resize(args.width, args.height, { fit: "cover" }).png();

  const composites: sharp.OverlayOptions[] = [];

  if (args.productImageUrl) {
    try {
      const productBuf = await fetchImageBuffer(args.productImageUrl);
      const productPng = await sharp(productBuf)
        .resize(Math.round(args.width * 0.72), Math.round(args.height * 0.72), {
          fit: "inside",
          withoutEnlargement: true,
        })
        .png()
        .toBuffer();
      composites.push({
        input: productPng,
        gravity: "center",
      });
    } catch {
      // Best-effort: if product fetch/parse fails, skip compositing.
    }
  }

  if (args.logoUrl) {
    try {
      const logoBuf = await fetchImageBuffer(args.logoUrl);
      const logoMaxW = Math.max(160, Math.round(args.width * 0.22));
      const logoPng = await sharp(logoBuf)
        .resize(logoMaxW, Math.round(args.height * 0.18), { fit: "inside", withoutEnlargement: true })
        .png()
        .toBuffer();

      // Put logo on a subtle white pill to ensure readability on any background.
      const pad = Math.max(18, Math.round(args.width * 0.02));
      const pillW = Math.min(args.width, logoMaxW + pad * 2);
      const pillH = Math.max(80, Math.round(args.height * 0.12));
      const pill = await sharp({
        create: {
          width: pillW,
          height: pillH,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 0.86 },
        },
      })
        .png()
        .toBuffer();

      composites.push({ input: pill, left: pad, top: pad });
      composites.push({
        input: logoPng,
        left: pad + Math.round((pillW - logoMaxW) / 2),
        top: pad + Math.round((pillH - Math.round(args.height * 0.18)) / 2),
      });
    } catch {
      // Best-effort: if logo fetch/parse fails, skip compositing.
    }
  }

  if (composites.length) base = base.composite(composites);
  return await base.png().toBuffer();
}

export function buildImagePrompt(args: {
  creativeType: CreativeType;
  brandDna: unknown;
  format: ImageFormat;
  variant?: { index: number; angle?: string; headline?: string };
  useBrandAssets?: boolean;
}) {
  const dna = asRecord(args.brandDna);
  const b = asRecord(dna.brand);
  const t = asRecord(dna.tone);
  const a = asRecord(dna.audience);
  const offer = asRecord(dna.offer);
  const constraints = asRecord(dna.constraints);

  const prefer = Array.isArray(t.wordsToPrefer) ? (t.wordsToPrefer as string[]).slice(0, 8).join(", ") : "";
  const avoid = Array.isArray(t.wordsToAvoid) ? (t.wordsToAvoid as string[]).slice(0, 8).join(", ") : "";
  const adjectives = Array.isArray(t.adjectives) ? (t.adjectives as string[]).join(", ") : "";
  const keyBenefits = Array.isArray(offer.keyBenefits) ? (offer.keyBenefits as string[]).slice(0, 6).join(", ") : "";
  const claimsToAvoid = Array.isArray(constraints.claimsToAvoid)
    ? (constraints.claimsToAvoid as string[]).slice(0, 8).join(", ")
    : "";

  return `
Create a high-performing paid ads BACKGROUND image for a brand.
This background will have the brand's PRODUCT image and LOGO composited on top later.

Brand: ${String(b.name ?? "Unknown")}
Category: ${String(b.category ?? "Unknown")}
Value prop: ${String(b.valueProp ?? "")}
Audience: ${String(a.icpSummary ?? "")}
Key benefits (if any): ${keyBenefits}
Tone adjectives: ${adjectives}
Preferred words: ${prefer}
Words to avoid: ${avoid}
Claims to avoid (if any): ${claimsToAvoid}

Creative type: ${args.creativeType}
Format: ${args.format}
Variant: ${args.variant ? `${args.variant.index + 1}` : "1"}
Angle (if any): ${args.variant?.angle ?? ""}
Headline (if any): ${args.variant?.headline ?? ""}

Art direction:
- clean, modern, product-led composition
- strong contrast and readable hierarchy
- IMPORTANT: DO NOT include any logos, brand names, or text
- IMPORTANT: Leave clear negative space (top-left for logo, center for product)
- avoid disallowed claims and sensitive topics

Return a single image matching the direction.
`.trim();
}

export async function generateAdImage(args: {
  creativeType: CreativeType;
  brandDna: unknown;
  format: ImageFormat;
  variant?: { index: number; angle?: string; headline?: string };
  useBrandAssets?: boolean;
}) {
  const { OPENAI_IMAGE_MODEL } = getEnv();
  // Prefer modern image model by default. Some accounts require org verification.
  const model = OPENAI_IMAGE_MODEL ?? "gpt-image-1";

  const prompt = buildImagePrompt(args);
  const { width, height, size } = formatToSize(args.format);

  const backgroundPng = await getBackgroundPng({ model, prompt, size });
  const useAssets = args.useBrandAssets ?? true;
  const assets = useAssets ? pickBrandAssets(args.brandDna) : {};
  const finalPng =
    assets.logoUrl || assets.productImageUrl
      ? await compositeBrandAssets({
          width,
          height,
          backgroundPng,
          logoUrl: assets.logoUrl,
          productImageUrl: assets.productImageUrl,
        })
      : backgroundPng;

  const resultUrl = `data:image/png;base64,${finalPng.toString("base64")}`;

  return {
    model,
    prompt,
    width,
    height,
    resultUrl,
    openaiImageId: undefined,
    usedAssets: assets,
  };
}
