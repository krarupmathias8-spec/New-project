import { z } from "zod";

// Helper to ensure we always get an object, even if input is undefined or array
const ensureObject = (val: unknown) => {
  if (!val || typeof val !== 'object' || Array.isArray(val)) return {};
  return val;
};

export const BrandDnaSchema = z.object({
  version: z.string().default("1.0"),
  citations: z
    .array(
      z.object({
        field: z.string().min(1).default(""),
        url: z.string().url(),
        quote: z.string().min(1).default(""),
        confidence: z.number().min(0).max(1).default(0.6),
      })
    )
    .default([]),
  assets: z.preprocess(ensureObject, z
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
      icons: z
        .array(
          z.object({
            url: z.string().url(),
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
    .default({ logos: [], icons: [], productImages: [], ogImages: [] })
  ),
  brand: z.preprocess(ensureObject, z.object({
    name: z.string().min(1).default("Unknown Brand"),
    website: z.string().url().optional(),
    category: z.string().min(1).default("General"), // human-friendly category
    industry: z.string().min(1).optional(), // ex: "M&A marketplace"
    businessModel: z
      .preprocess((val) => {
        if (val == null) return undefined;
        const raw = typeof val === "string" ? val.trim().toLowerCase() : "";
        if (!raw) return undefined;
        // Normalize common variants/synonyms to our canonical set.
        if (raw.includes("market")) return "marketplace";
        if (raw.includes("saas") || raw.includes("software as a service")) return "saas";
        if (raw.includes("agency") || raw.includes("studio")) return "agency";
        if (raw.includes("ecommerce") || raw.includes("e-commerce") || raw.includes("shop") || raw.includes("store"))
          return "ecommerce";
        if (raw.includes("media") || raw.includes("publisher") || raw.includes("newsletter")) return "media";
        if (raw.includes("service") || raw.includes("consult")) return "services";
        return "other";
      }, z.enum(["marketplace", "saas", "agency", "ecommerce", "media", "services", "other"]))
      .optional(),
    tagline: z.string().optional(),
    description: z.string().optional(),
    oneLiner: z.string().min(1).default(""),
    valueProp: z.string().min(1).default(""),
    positioning: z.array(z.string().min(1)).default([]),
    competitors: z.array(z.string().min(1)).default([]),
    proofPoints: z.array(z.string().min(1)).default([]),
  }).default({
    name: "Unknown Brand",
    category: "General",
    oneLiner: "",
    valueProp: "",
    positioning: [],
    competitors: [],
    proofPoints: []
  })),
  tone: z.preprocess(ensureObject, z.object({
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
  })),
  audience: z.preprocess(ensureObject, z.object({
    icpSummary: z.string().min(1).default("General Audience"),
    industries: z.array(z.string().min(1)).default([]),
    companySizes: z.array(z.string().min(1)).default([]),
    geos: z.array(z.string().min(1)).default([]),
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
    industries: [],
    companySizes: [],
    geos: [],
    personas: [],
    segments: []
  })),
  offer: z.preprocess(ensureObject, z.object({
    keyBenefits: z.array(z.string().min(1)).default([]),
    differentiators: z.array(z.string().min(1)).default([]),
    features: z.array(z.string().min(1)).default([]),
    useCases: z.array(z.string().min(1)).default([]),
    pricingModel: z.string().optional(),
    onboarding: z.array(z.string().min(1)).default([]),
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
    features: [],
    useCases: [],
    onboarding: [],
    objections: []
  })),
  constraints: z.preprocess(ensureObject, z.object({
    complianceNotes: z.array(z.string().min(1)).default([]),
    claimsToAvoid: z.array(z.string().min(1)).default([]),
    requiredDisclaimers: z.array(z.string().min(1)).default([]),
  }).default({
    complianceNotes: [],
    claimsToAvoid: [],
    requiredDisclaimers: []
  })),
});

export type BrandDna = z.infer<typeof BrandDnaSchema>;

const MetaAdSchema = z.object({
  angle: z.string().min(1).default("Default Angle"),
  audienceSegment: z.string().min(1).default("General"),
  primaryText: z.string().min(1).default("Ad Text"),
  headline: z.string().min(1).default("Headline"),
  description: z.string().min(1).default("Description"),
  cta: z.string().min(1).default("Learn More"),
});

const GoogleAdSchema = z.object({
  angle: z.string().min(1).default("Angle"),
  headlines: z.array(z.string().min(1)).min(1).default(["Headline"]),
  descriptions: z.array(z.string().min(1)).min(1).default(["Description"]),
  keywords: z.array(z.string().min(1)).min(1).default(["keyword"]),
});

const TikTokHookSchema = z.object({
  angle: z.string().min(1).default("Angle"),
  hook: z.string().min(1).default("Hook"),
  onScreenText: z.string().min(1).default("Text"),
  voiceover: z.string().min(1).default("VO"),
  shotList: z.array(z.string().min(1)).min(1).default(["Shot 1"]),
});

const EmailSchema = z.object({
  angle: z.string().min(1).default("Angle"),
  subjectLines: z.array(z.string().min(1)).min(1).default(["Subject"]),
  previewText: z.string().min(1).default("Preview"),
  bodyMarkdown: z.string().min(1).default("Body"),
});

const SocialPostSchema = z.object({
  platform: z.enum(["linkedin", "x", "instagram"]).default("linkedin"),
  angle: z.string().min(1).default("Angle"),
  post: z.string().min(1).default("Post"),
  hashtags: z.array(z.string().min(1)).default([]),
});

export const CreativeOutputSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("META_ADS"),
    ads: z.array(MetaAdSchema).min(1).default([]),
  }),
  z.object({
    type: z.literal("GOOGLE_ADS"),
    campaigns: z.array(GoogleAdSchema).min(1).default([]),
  }),
  z.object({
    type: z.literal("TIKTOK_HOOKS"),
    hooks: z.array(TikTokHookSchema).min(1).default([]),
  }),
  z.object({
    type: z.literal("MARKETING_EMAIL"),
    email: EmailSchema.default({
      angle: "Angle",
      subjectLines: ["Subject"],
      previewText: "Preview",
      bodyMarkdown: "Body",
    }),
  }),
  z.object({
    type: z.literal("SOCIAL_POSTS"),
    posts: z.array(SocialPostSchema).min(1).default([]),
  }),
  z.object({
    type: z.literal("ANGLES_HOOKS_HEADLINES"),
    angles: z.array(z.string().min(1)).min(1).default(["Angle"]),
    hooks: z.array(z.string().min(1)).min(1).default(["Hook"]),
    headlines: z.array(z.string().min(1)).min(1).default(["Headline"]),
  }),
  z.object({
    type: z.literal("AB_VARIANTS"),
    variants: z
      .array(
        z.object({
          angle: z.string().min(1).default("Angle"),
          a: z.object({
            headline: z.string().min(1).default("H"),
            primaryText: z.string().min(1).default("T"),
          }),
          b: z.object({
            headline: z.string().min(1).default("H"),
            primaryText: z.string().min(1).default("T"),
          }),
        })
      )
      .min(1)
      .default([]),
  }),
]);

export type CreativeOutput = z.infer<typeof CreativeOutputSchema>;
