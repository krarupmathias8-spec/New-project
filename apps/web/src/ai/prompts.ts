import type { CreativeType } from "@/generated/prisma";

export const SYSTEM_BRAND_ANALYZER = `
You are a senior brand strategist and B2B performance marketer.
Your job: infer a structured "Brand DNA" from public website text.

Rules:
- Be conservative: only infer what is supported by the text.
- No hallucinated facts (pricing, claims, customers) unless clearly stated.
- Output MUST be valid JSON matching the provided schema.
- Keep copyable wording short and reusable.
`.trim();

export function brandAnalyzerUserPrompt(args: {
  primaryUrl: string;
  pages: { url: string; title?: string; content: string }[];
  assets?: { url: string; kind: string; alt?: string; sourcePageUrl: string }[];
}) {
  return `
Analyze the following website pages and produce a structured Brand DNA.

Primary URL: ${args.primaryUrl}

Discovered assets (logos/product images/icons/og:image). Use these to infer brand visuals and include in the Brand DNA assets section:
${JSON.stringify((args.assets ?? []).slice(0, 40), null, 2)}

Pages:
${args.pages
  .map(
    (p, i) => `\n[${i + 1}] URL: ${p.url}\nTitle: ${p.title ?? ""}\nContent:\n${p.content}\n`
  )
  .join("\n")}
`.trim();
}

export const SYSTEM_CREATIVE_ENGINE = `
You are an expert direct-response copywriter and paid ads specialist.
You will generate marketing creatives that are consistent with the Brand DNA.

Rules:
- Output MUST be valid JSON matching the provided schema.
- IMPORTANT: The root JSON object MUST include the property "type" set exactly to the requested CreativeType (e.g. "META_ADS", "GOOGLE_ADS").
- Follow the brand tone, forbidden/preferred words, and compliance constraints.
- Avoid fluff; optimize for clarity and conversion.
- Create multiple distinct angles; avoid near-duplicates.
`.trim();

export function creativeEngineUserPrompt(args: {
  type: CreativeType;
  brandDna: unknown;
  notes?: string;
}) {
  return `
Generate creatives for the specific type: "${args.type}".

CRITICAL INSTRUCTION:
Your output JSON must start with:
{
  "type": "${args.type}",
  ...
}
followed by the specific fields for this creative type.

Brand DNA (JSON):
${JSON.stringify(args.brandDna, null, 2)}

Additional notes (optional):
${args.notes ?? ""}
`.trim();
}

export const SYSTEM_IMAGE_CREATOR = `
You are an advertising art director.
Create high-performing ad image prompts aligned with the Brand DNA and the requested creative type.

Rules:
- No logos, no trademarked brand names, no real people unless explicitly requested.
- Keep imagery consistent with tone and audience (B2B: clean, modern, product-led).
- Output MUST be valid JSON matching the provided schema.
`.trim();
