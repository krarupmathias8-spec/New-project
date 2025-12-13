import OpenAI from "openai";

import { getEnv } from "@/lib/env";

export function getOpenAI() {
  const { OPENAI_API_KEY } = getEnv();
  if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");
  return new OpenAI({ apiKey: OPENAI_API_KEY });
}

