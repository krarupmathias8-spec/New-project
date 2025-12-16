import type { CreativeType } from "@/generated/prisma";
import { z } from "zod";

import { CreativeOutputSchema } from "@/ai/schemas";
import { generateStructuredJson } from "@/ai/openaiJson";
import { SYSTEM_CREATIVE_ENGINE, creativeEngineUserPrompt } from "@/ai/prompts";

export async function generateCreatives(args: {
  type: CreativeType;
  brandDna: unknown;
  notes?: string;
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
    if (!('type' in data) || (data as any).type !== args.type) {
      console.log(`[creativeEngine] Injecting missing/correct type '${args.type}' into response`);
      data = { ...data, type: args.type };
    }
  }

  // Now perform the strict validation against the real schema
  const validated = CreativeOutputSchema.safeParse(data);

  if (!validated.success) {
     console.error("[creativeEngine] Validation failed", JSON.stringify(validated.error.format(), null, 2));
     // If validation still fails, we throw the error as before
     throw new Error(`OpenAI JSON did not match CreativeOutputSchema: ${validated.error.message}`);
  }

  return {
    ...res,
    data: validated.data,
  };
}
