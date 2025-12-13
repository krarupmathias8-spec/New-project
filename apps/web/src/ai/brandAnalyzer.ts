import { BrandDnaSchema } from "@/ai/schemas";
import { generateStructuredJson } from "@/ai/openaiJson";
import { SYSTEM_BRAND_ANALYZER, brandAnalyzerUserPrompt } from "@/ai/prompts";

export async function analyzeBrandFromPages(args: {
  primaryUrl: string;
  pages: { url: string; title?: string; content: string }[];
}) {
  return await generateStructuredJson({
    system: SYSTEM_BRAND_ANALYZER,
    user: brandAnalyzerUserPrompt(args),
    schema: BrandDnaSchema,
    temperature: 0.4,
  });
}

