"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { CreativeType } from "@/generated/prisma";

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

  return (
    <div className="grid gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-zinc-900">Actions</div>
          <div className="mt-1 text-sm text-zinc-600">
            Ingest the site, then generate structured creatives.
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
          disabled={Boolean(loading)}
          onClick={async () => {
            setLoading("ingest");
            setError(null);
            try {
              const res = await fetch(`/api/projects/${projectId}/ingest`, { method: "POST" });
              if (!res.ok) {
                const json = (await res.json().catch(() => null)) as { error?: string } | null;
                setError(json?.error ?? "Unable to start ingestion");
                return;
              }
              router.refresh();
            } finally {
              setLoading(null);
            }
          }}
        >
          {loading === "ingest" ? "Starting…" : "Run ingestion"}
        </button>

        {CREATIVE_TYPES.map((t) => (
          <button
            key={t.value}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 disabled:opacity-60"
            disabled={!canGenerate || Boolean(loading)}
            title={!canGenerate ? "Run ingestion first" : undefined}
            onClick={async () => {
              setLoading(t.value);
              setError(null);
              try {
                const res = await fetch(`/api/projects/${projectId}/generate`, {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ type: t.value }),
                });
                const json = (await res.json().catch(() => null)) as unknown;
                if (!res.ok) {
                  const err =
                    json && typeof json === "object" && "error" in json
                      ? String((json as { error?: unknown }).error ?? "")
                      : "";
                  setError(err || "Unable to start generation");
                  return;
                }
                router.refresh();
              } finally {
                setLoading(null);
              }
            }}
          >
            {loading === t.value ? "Queued…" : `Generate ${t.label}`}
          </button>
        ))}
      </div>
    </div>
  );
}

