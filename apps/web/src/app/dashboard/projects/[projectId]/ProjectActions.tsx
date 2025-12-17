"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import type { CreativeType } from "@/generated/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const CREATIVE_TYPES: { label: string; value: CreativeType }[] = [
  { label: "Meta Ads", value: "META_ADS" },
  { label: "Google Ads", value: "GOOGLE_ADS" },
  { label: "TikTok Hooks", value: "TIKTOK_HOOKS" },
  { label: "Marketing Email", value: "MARKETING_EMAIL" },
  { label: "Social Posts", value: "SOCIAL_POSTS" },
  { label: "Angles / Hooks / Headlines", value: "ANGLES_HOOKS_HEADLINES" },
  { label: "A/B Variants", value: "AB_VARIANTS" },
];

export function ProjectActions({
  projectId,
  canGenerate,
}: {
  projectId: string;
  canGenerate: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>("");
  const [creativeCount, setCreativeCount] = useState<number>(1);

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle>Actions</CardTitle>
        <CardDescription>Ingest the site, then generate structured creatives + images.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {error ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <div className="grid gap-2">
          <Label htmlFor="creative-notes">Creative brief (optional)</Label>
          <Input
            id="creative-notes"
            placeholder='Ex: "Black Friday -20% pendant 7 jours", "cible: e-com", "ton: premium"'
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={Boolean(loading)}
          />
          <div className="text-xs text-muted-foreground">
            These notes are passed to the generation job and stored in run parameters.
          </div>
        </div>

        <div className="grid gap-2 sm:max-w-xs">
          <Label htmlFor="creative-count">Number of creatives</Label>
          <Input
            id="creative-count"
            type="number"
            min={1}
            max={6}
            value={creativeCount}
            onChange={(e) => {
              const n = Number(e.target.value);
              setCreativeCount(Number.isFinite(n) ? Math.min(6, Math.max(1, Math.floor(n))) : 4);
            }}
            disabled={Boolean(loading)}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={creativeCount === 1 ? "default" : "outline"}
              disabled={Boolean(loading)}
              onClick={() => setCreativeCount(1)}
            >
              Test (1)
            </Button>
            <Button
              type="button"
              size="sm"
              variant={creativeCount === 4 ? "default" : "outline"}
              disabled={Boolean(loading)}
              onClick={() => setCreativeCount(4)}
            >
              4
            </Button>
            <Button
              type="button"
              size="sm"
              variant={creativeCount === 6 ? "default" : "outline"}
              disabled={Boolean(loading)}
              onClick={() => setCreativeCount(6)}
            >
              6
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">
            We generate this many distinct angles and create images in 1:1, 4:5, and 16:9 (so 1 creative = 3 images).
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            disabled={Boolean(loading)}
            onClick={async () => {
              setLoading("ingest");
              setError(null);
              toast.loading("Starting ingestion…");
              try {
                const res = await fetch(`/api/projects/${projectId}/ingest`, { method: "POST" });
                if (!res.ok) {
                  const json = (await res.json().catch(() => null)) as { error?: string } | null;
                  const msg = json?.error ?? "Unable to start ingestion";
                  setError(msg);
                  toast.error(msg);
                  return;
                }
                toast.success("Ingestion queued");
                router.refresh();
              } finally {
                setLoading(null);
              }
            }}
          >
            {loading === "ingest" ? "Starting…" : "Run ingestion"}
          </Button>

          {CREATIVE_TYPES.map((t) => (
            <Button
              key={t.value}
              variant="outline"
              disabled={!canGenerate || Boolean(loading)}
              title={!canGenerate ? "Run ingestion first" : undefined}
              onClick={async () => {
                setLoading(t.value);
                setError(null);
                toast.loading(`Queuing ${t.label}…`);
                try {
                  const res = await fetch(`/api/projects/${projectId}/generate`, {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({
                      type: t.value,
                      parameters: {
                        notes: notes.trim() ? notes.trim() : undefined,
                        creativeCount,
                        useBrandAssets: true,
                        // Override if needed: imageFormats: ["SQUARE_1_1","PORTRAIT_4_5","LANDSCAPE_16_9"]
                      },
                    }),
                  });
                  const json = (await res.json().catch(() => null)) as unknown;
                  if (!res.ok) {
                    const err =
                      json && typeof json === "object" && "error" in json
                        ? String((json as { error?: unknown }).error ?? "")
                        : "";
                    const msg = err || "Unable to start generation";
                    setError(msg);
                    toast.error(msg);
                    return;
                  }
                  toast.success(`${t.label} queued`);
                  router.refresh();
                } finally {
                  setLoading(null);
                }
              }}
            >
              {loading === t.value ? "Queued…" : `Generate ${t.label}`}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

