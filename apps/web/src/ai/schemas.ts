import { z } from "zod";

export const BrandDnaSchema = z.object({
  version: z.string().default("1.0"),
  assets: z
    .object({
      logos: z
        .array(
          z.object({
            url: z.string().url(),
            alt: z.string().optional(),
            sourcePageUrl: z.string().url().optional(),
          })
        )
        .default([]),
      productImages: z
        .array(
          z.object({
            url: z.string().url(),
            alt: z.string().optional(),
            sourcePageUrl: z.string().url().optional(),
          })
        )
        .default([]),
      ogImages: z
        .array(
          z.object({
            url: z.string().url(),
            sourcePageUrl: z.string().url().optional(),
          })
        )
        .default([]),
    })
    .default({ logos: [], productImages: [], ogImages: [] }),
  brand: z.object({
    name: z.string().min(1).default("Unknown Brand"),
    website: z.string().url().optional(),
    category: z.string().min(1).default("General"),
    oneLiner: z.string().min(1).default(""),
    valueProp: z.string().min(1).default(""),
  }).default({
    name: "Unknown Brand",
    category: "General",
    oneLiner: "",
    valueProp: ""
  }),
  tone: z.object({
    adjectives: z.array(z.string().min(1)).default([]),
    voice: z.string().min(1).default("Neutral"),
    styleGuidelines: z.array(z.string().min(1)).default([]),
    wordsToPrefer: z.array(z.string().min(1)).default([]),
    wordsToAvoid: z.array(z.string().min(1)).default([]),
  }).default({
    adjectives: [],
    voice: "Neutral",
    styleGuidelines: [],
    wordsToPrefer: [],
    wordsToAvoid: []
  }),
  audience: z.object({
    icpSummary: z.string().min(1).default("General Audience"),
    personas: z
      .array(
        z.object({
          name: z.string().min(1).default("Persona"),
          role: z.string().min(1).default("User"),
          industry: z.string().min(1).default("Any"),
          pains: z.array(z.string().min(1)).default([]),
          desiredOutcomes: z.array(z.string().min(1)).default([]),
        })
      )
      .default([]),
    segments: z.array(z.string().min(1)).default([]),
  }).default({
    icpSummary: "General Audience",
    personas: [],
    segments: []
  }),
  offer: z.object({
    keyBenefits: z.array(z.string().min(1)).default([]),
    differentiators: z.array(z.string().min(1)).default([]),
    objections: z
      .array(
        z.object({
          objection: z.string().min(1).default("Cost"),
          rebuttal: z.string().min(1).default("Value"),
        })
      )
      .default([]),
  }).default({
    keyBenefits: [],
    differentiators: [],
    objections: []
  }),
  constraints: z.object({
    complianceNotes: z.array(z.string().min(1)).default([]),
    claimsToAvoid: z.array(z.string().min(1)).default([]),
  }).default({
    complianceNotes: [],
    claimsToAvoid: []
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
