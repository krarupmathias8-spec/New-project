import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).optional(),

  // NOTE: Optional to allow `next build` in environments that don't provide runtime secrets.
  // Runtime code that needs DB access should still expect this to be set.
  DATABASE_URL: z.string().min(1).optional(),

  // NOTE: Optional to allow builds without auth secrets.
  AUTH_SECRET: z.string().min(1).optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(1).optional(),
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),

  // Used by the Vercel Cron endpoint to authorize job processing.
  CRON_SECRET: z.string().min(1).optional(),

  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_TEXT_MODEL: z.string().min(1).optional(),
  OPENAI_IMAGE_MODEL: z.string().min(1).optional(),

  // Optional: Browserless/Playwright rendering for JS-heavy sites.
  BROWSERLESS_URL: z.string().url().optional(),
  BROWSERLESS_TOKEN: z.string().min(1).optional(),
});

export type Env = z.infer<typeof EnvSchema>;

export function getEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables");
  }
  return parsed.data;
}
