"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CreateProjectForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="grid gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        const fd = new FormData(e.currentTarget);
        const payload = {
          orgName: String(fd.get("orgName") ?? "").trim() || undefined,
          projectName: String(fd.get("projectName") ?? "").trim(),
          primaryUrl: String(fd.get("primaryUrl") ?? "").trim(),
        };
        try {
          const res = await fetch("/api/projects", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
          });
          const json = (await res.json().catch(() => null)) as unknown;
          if (!res.ok) {
            const err =
              json && typeof json === "object" && "error" in json
                ? String((json as { error?: unknown }).error ?? "")
                : "";
            setError(err || "Unable to create project");
            return;
          }
          router.refresh();
        } finally {
          setLoading(false);
        }
      }}
    >
      <div className="grid gap-1">
        <div className="text-sm font-semibold text-zinc-900">New project</div>
        <div className="text-sm text-zinc-600">
          Paste your product URL to start ingestion and generation.
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        <label className="flex flex-col gap-1 md:col-span-1">
          <span className="text-sm font-medium text-zinc-900">Workspace (optional)</span>
          <input
            className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400"
            name="orgName"
            placeholder="Acme Inc."
          />
        </label>

        <label className="flex flex-col gap-1 md:col-span-1">
          <span className="text-sm font-medium text-zinc-900">Project name</span>
          <input
            className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400"
            name="projectName"
            placeholder="Acme Analytics"
            required
          />
        </label>

        <label className="flex flex-col gap-1 md:col-span-1">
          <span className="text-sm font-medium text-zinc-900">Primary URL</span>
          <input
            className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400"
            name="primaryUrl"
            placeholder="https://example.com"
            required
            type="url"
          />
        </label>
      </div>

      <div className="flex items-center justify-end">
        <button
          className="inline-flex h-11 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
          type="submit"
          disabled={loading}
        >
          {loading ? "Creating…" : "Create project"}
        </button>
      </div>
    </form>
  );
}

