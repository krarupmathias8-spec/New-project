"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateProjectForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="w-full"
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        toast.loading("Creating project…");
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
            toast.error(err || "Unable to create project");
            return;
          }
          toast.success("Project created");
          router.refresh();
        } finally {
          setLoading(false);
        }
      }}
    >
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>New project</CardTitle>
          <CardDescription>
            Paste your product URL to start ingestion and generation.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {error ? (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="orgName">Workspace (optional)</Label>
              <Input id="orgName" name="orgName" placeholder="Acme Inc." />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="projectName">Project name</Label>
              <Input id="projectName" name="projectName" placeholder="Acme Analytics" required />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="primaryUrl">Primary URL</Label>
              <Input id="primaryUrl" name="primaryUrl" placeholder="https://example.com" required type="url" />
            </div>
          </div>

          <div className="flex items-center justify-end">
            <Button type="submit" disabled={loading}>
              {loading ? "Creating…" : "Create project"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

