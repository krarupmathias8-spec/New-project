import { z } from "zod";

export const BrandDnaSchema = z.object({
  version: z.string().default("1.0"),
  brand: z.object({
    name: z.string().min(1),
    website: z.string().url(),
    category: z.string().min(1),
    oneLiner: z.string().min(1),
    valueProp: z.string().min(1),
  }),
  tone: z.object({
    adjectives: z.array(z.string().min(1)).min(3),
    voice: z.string().min(1),
    styleGuidelines: z.array(z.string().min(1)).min(3),
    wordsToPrefer: z.array(z.string().min(1)).default([]),
    wordsToAvoid: z.array(z.string().min(1)).default([]),
  }),
  audience: z.object({
    icpSummary: z.string().min(1),
    personas: z
      .array(
        z.object({
          name: z.string().min(1),
          role: z.string().min(1),
          industry: z.string().min(1),
          pains: z.array(z.string().min(1)).min(2),
          desiredOutcomes: z.array(z.string().min(1)).min(2),
        })
      )
      .min(1),
    segments: z.array(z.string().min(1)).default([]),
  }),
  offer: z.object({
    keyBenefits: z.array(z.string().min(1)).min(3),
    differentiators: z.array(z.string().min(1)).min(2),
    objections: z
      .array(
        z.object({
          objection: z.string().min(1),
          rebuttal: z.string().min(1),
        })
      )
      .min(3),
  }),
  constraints: z.object({
    complianceNotes: z.array(z.string().min(1)).default([]),
    claimsToAvoid: z.array(z.string().min(1)).default([]),
  }),
});

export type BrandDna = z.infer<typeof BrandDnaSchema>;

const MetaAdSchema = z.object({
  angle: z.string().min(1),
  audienceSegment: z.string().min(1),
  primaryText: z.string().min(1),
  headline: z.string().min(1),
  description: z.string().min(1),
  cta: z.string().min(1),
});

const GoogleAdSchema = z.object({
  angle: z.string().min(1),
  headlines: z.array(z.string().min(1)).min(6).max(15),
  descriptions: z.array(z.string().min(1)).min(3).max(6),
  keywords: z.array(z.string().min(1)).min(8).max(25),
});

const TikTokHookSchema = z.object({
  angle: z.string().min(1),
  hook: z.string().min(1),
  onScreenText: z.string().min(1),
  voiceover: z.string().min(1),
  shotList: z.array(z.string().min(1)).min(3).max(8),
});

const EmailSchema = z.object({
  angle: z.string().min(1),
  subjectLines: z.array(z.string().min(1)).min(5).max(10),
  previewText: z.string().min(1),
  bodyMarkdown: z.string().min(1),
});

const SocialPostSchema = z.object({
  platform: z.enum(["linkedin", "x", "instagram"]),
  angle: z.string().min(1),
  post: z.string().min(1),
  hashtags: z.array(z.string().min(1)).default([]),
});

export const CreativeOutputSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("META_ADS"),
    ads: z.array(MetaAdSchema).min(6).max(12),
  }),
  z.object({
    type: z.literal("GOOGLE_ADS"),
    campaigns: z.array(GoogleAdSchema).min(3).max(6),
  }),
  z.object({
    type: z.literal("TIKTOK_HOOKS"),
    hooks: z.array(TikTokHookSchema).min(10).max(25),
  }),
  z.object({
    type: z.literal("MARKETING_EMAIL"),
    email: EmailSchema,
  }),
  z.object({
    type: z.literal("SOCIAL_POSTS"),
    posts: z.array(SocialPostSchema).min(9).max(18),
  }),
  z.object({
    type: z.literal("ANGLES_HOOKS_HEADLINES"),
    angles: z.array(z.string().min(1)).min(12).max(30),
    hooks: z.array(z.string().min(1)).min(12).max(30),
    headlines: z.array(z.string().min(1)).min(12).max(30),
  }),
  z.object({
    type: z.literal("AB_VARIANTS"),
    variants: z
      .array(
        z.object({
          angle: z.string().min(1),
          a: z.object({
            headline: z.string().min(1),
            primaryText: z.string().min(1),
          }),
          b: z.object({
            headline: z.string().min(1),
            primaryText: z.string().min(1),
          }),
        })
      )
      .min(4)
      .max(10),
  }),
]);

export type CreativeOutput = z.infer<typeof CreativeOutputSchema>;

