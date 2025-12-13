import type { CreativeType } from "@/generated/prisma";

import { CreativeOutputSchema } from "@/ai/schemas";
import { generateStructuredJson } from "@/ai/openaiJson";
import { SYSTEM_CREATIVE_ENGINE, creativeEngineUserPrompt } from "@/ai/prompts";

export async function generateCreatives(args: {
  type: CreativeType;
  brandDna: unknown;
  notes?: string;
}) {
  const res = await generateStructuredJson({
    system: SYSTEM_CREATIVE_ENGINE,
    user: creativeEngineUserPrompt(args),
    schema: CreativeOutputSchema,
    temperature: 0.8,
  });

  // Safety: ensure discriminator aligns with requested type.
  if (res.data.type !== args.type) {
    throw new Error(`Model returned type ${res.data.type} but requested ${args.type}`);
  }

  return res;
}

