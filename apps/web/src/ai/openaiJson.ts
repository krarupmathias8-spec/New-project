import { z } from "zod";

import { getOpenAI } from "@/lib/openai";
import { getEnv } from "@/lib/env";

export async function generateStructuredJson<TSchema extends z.ZodTypeAny>(args: {
  system: string;
  user: string;
  schema: TSchema;
  model?: string;
  temperature?: number;
}) {
  const client = getOpenAI();
  const { OPENAI_TEXT_MODEL } = getEnv();
  const model = args.model ?? OPENAI_TEXT_MODEL ?? "gpt-4.1";

  const completion = await client.chat.completions.create({
    model,
    temperature: args.temperature ?? 0.7,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: args.system },
      { role: "user", content: args.user },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned empty content");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("OpenAI returned non-JSON output");
  }

  const validated = args.schema.safeParse(parsed);
  if (!validated.success) {
    throw new Error(`OpenAI JSON did not match schema: ${validated.error.message}`);
  }

  return {
    data: validated.data as z.infer<TSchema>,
    usage: completion.usage ?? null,
    model,
  };
}

