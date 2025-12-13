import type { CreativeType, ImageFormat } from "@/generated/prisma";

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
      return { width: 1024, height: 1536, size: "1024x1536" };
    case "LANDSCAPE_16_9":
      return { width: 1536, height: 1024, size: "1536x1024" };
    default:
      return { width: 1024, height: 1024, size: "1024x1024" };
  }
}

export function buildImagePrompt(args: {
  creativeType: CreativeType;
  brandDna: unknown;
  format: ImageFormat;
}) {
  const dna = asRecord(args.brandDna);
  const b = asRecord(dna.brand);
  const t = asRecord(dna.tone);
  const a = asRecord(dna.audience);

  const prefer = Array.isArray(t.wordsToPrefer) ? (t.wordsToPrefer as string[]).slice(0, 8).join(", ") : "";
  const avoid = Array.isArray(t.wordsToAvoid) ? (t.wordsToAvoid as string[]).slice(0, 8).join(", ") : "";
  const adjectives = Array.isArray(t.adjectives) ? (t.adjectives as string[]).join(", ") : "";

  return `
Create a high-performing B2B ad image concept for a brand.

Brand: ${String(b.name ?? "Unknown")}
Category: ${String(b.category ?? "Unknown")}
Value prop: ${String(b.valueProp ?? "")}
Audience: ${String(a.icpSummary ?? "")}
Tone adjectives: ${adjectives}
Preferred words: ${prefer}
Words to avoid: ${avoid}

Creative type: ${args.creativeType}
Format: ${args.format}

Art direction:
- clean, modern, product-led composition
- strong contrast and readable hierarchy
- no logos, no brand names, no watermarks
- no text baked into the image (we overlay copy in UI)

Return a single image matching the direction.
`.trim();
}

export async function generateAdImage(args: {
  creativeType: CreativeType;
  brandDna: unknown;
  format: ImageFormat;
}) {
  const client = getOpenAI();
  const { OPENAI_IMAGE_MODEL } = getEnv();
  const model = OPENAI_IMAGE_MODEL ?? "gpt-image-1";

  const prompt = buildImagePrompt(args);
  const { width, height, size } = formatToSize(args.format);

  const res = (await client.images.generate({
    model,
    prompt,
    size,
  })) as unknown;

  const first = (res as { data?: Array<{ b64_json?: string; url?: string }> })?.data?.[0];
  const b64 = first?.b64_json;
  const url = first?.url;

  // MVP: keep a data URL if no hosted URL is returned.
  const resultUrl = url ?? (b64 ? `data:image/png;base64,${b64}` : null);

  return {
    model,
    prompt,
    width,
    height,
    resultUrl,
    openaiImageId: undefined,
  };
}

