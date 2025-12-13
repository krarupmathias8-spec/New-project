"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  callbackUrl: string;
  showGoogle: boolean;
};

export function SignInForm({ callbackUrl, showGoogle }: Props) {
  const [csrfToken, setCsrfToken] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const actionUrl = useMemo(() => "/api/auth/callback/credentials", []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/csrf", { cache: "no-store" });
        const json = (await res.json()) as { csrfToken?: string };
        if (!cancelled) setCsrfToken(json.csrfToken ?? "");
      } catch {
        if (!cancelled) setError("Unable to load sign-in form. Please refresh.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex w-full flex-col gap-4"
    >
      {showGoogle ? (
        <a
          className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent"
          href={`/api/auth/signin/google?callbackUrl=${encodeURIComponent(callbackUrl)}`}
        >
          Continue with Google
        </a>
      ) : null}

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs font-medium text-muted-foreground">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <form
        className="flex flex-col gap-3"
        method="post"
        action={actionUrl}
        onSubmit={() => toast.loading("Signing in…")}
      >
        <input type="hidden" name="csrfToken" value={csrfToken} />
        <input type="hidden" name="callbackUrl" value={callbackUrl} />

        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>

        <Button type="submit" disabled={!csrfToken} className="mt-1">
          Sign in
        </Button>
      </form>
    </motion.div>
  );
}

