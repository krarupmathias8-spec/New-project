"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function ProcessJobsButton({ maxJobs = 8 }: { maxJobs?: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        toast.loading("Generating creatives…");
        try {
          const res = await fetch(`/api/jobs/process?maxJobs=${maxJobs}`, { method: "POST" });
          const json = (await res.json().catch(() => null)) as { error?: string } | null;
          if (!res.ok) {
            const msg = json?.error ?? "Unable to process jobs";
            toast.error(msg);
            return;
          }
          toast.success("Jobs processed");
          router.refresh();
        } finally {
          setLoading(false);
        }
      }}
    >
      {loading ? "Working…" : "Generate images now"}
    </Button>
  );
}
