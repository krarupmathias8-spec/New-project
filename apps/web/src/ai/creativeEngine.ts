import type { CreativeType } from "@/generated/prisma";
import { z } from "zod";

import { CreativeOutputSchema } from "@/ai/schemas";
import { generateStructuredJson } from "@/ai/openaiJson";
import { SYSTEM_CREATIVE_ENGINE, creativeEngineUserPrompt } from "@/ai/prompts";

export async function generateCreatives(args: {
  type: CreativeType;
  brandDna: unknown;
  notes?: string;
  creativeCount?: number;
}) {
  // We use z.any() here to bypass the strict schema validation inside generateStructuredJson initially.
  // This allows us to "fix" the JSON if the model forgot the discriminator field.
  const res = await generateStructuredJson({
    system: SYSTEM_CREATIVE_ENGINE,
    user: creativeEngineUserPrompt(args),
    schema: z.any(), 
    temperature: 0.8,
  });

  let data = res.data;

  // Manual fix: Inject the missing discriminator if needed
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const obj = data as { type?: unknown };
    if (!('type' in obj) || obj.type !== args.type) {
      console.log(`[creativeEngine] Injecting missing/correct type '${args.type}' into response`);
      data = { ...data, type: args.type };
    }
  }

  // Now perform the strict validation against the real schema
  const validated = CreativeOutputSchema.safeParse(data);

  if (!validated.success) {
    const formatted = JSON.stringify(validated.error.format(), null, 2);
    console.error("[creativeEngine] Validation failed", formatted);

    // Auto-repair pass: ask the model to transform the invalid JSON into a valid object
    // matching CreativeOutputSchema (this prevents runs failing due to minor schema drift).
    const repair = await generateStructuredJson({
      system: `${SYSTEM_CREATIVE_ENGINE}

You are now in STRICT REPAIR MODE.
- You will be given (a) the requested CreativeType, (b) Brand DNA, (c) optional notes, and (d) an INVALID JSON object.
- Your task: output a SINGLE valid JSON object that matches the required schema for that CreativeType.
- Do NOT add any extra top-level keys beyond the schema.
- Ensure required arrays exist and have at least 1 item.
- Preserve as much intent/content from the invalid JSON as possible.
`.trim(),
      user: [
        `Requested CreativeType: "${args.type}"`,
        args.creativeCount ? `Requested count: ${args.creativeCount}` : "",
        `Brand DNA (JSON):`,
        JSON.stringify(args.brandDna, null, 2),
        `Notes (optional):`,
        args.notes ?? "",
        `Validation errors (for reference):`,
        formatted,
        `Invalid JSON to repair:`,
        JSON.stringify(data ?? {}, null, 2),
      ]
        .filter(Boolean)
        .join("\n\n"),
      schema: CreativeOutputSchema,
      temperature: 0.2,
    });

    return {
      ...repair,
      data: repair.data,
    };
  }

  return {
    ...res,
    data: validated.data,
  };
}
