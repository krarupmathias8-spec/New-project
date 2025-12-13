"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignUpForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        toast.loading("Creating account…");

        const form = e.currentTarget;
        const formData = new FormData(form);
        const payload = {
          name: String(formData.get("name") ?? "").trim() || undefined,
          email: String(formData.get("email") ?? "").trim(),
          password: String(formData.get("password") ?? ""),
        };

        try {
          const res = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!res.ok) {
            const json = (await res.json().catch(() => null)) as { error?: string } | null;
            setError(json?.error ?? "Unable to create account");
            toast.error(json?.error ?? "Unable to create account");
            return;
          }
          toast.success("Account created. Please sign in.");
          router.push("/auth/sign-in");
        } finally {
          setLoading(false);
        }
      }}
    >
      {error ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="grid gap-2">
        <Label htmlFor="name">Name (optional)</Label>
        <Input id="name" name="name" type="text" autoComplete="name" />
      </div>

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
          autoComplete="new-password"
          required
          minLength={8}
        />
      </div>

      <Button className="mt-1" type="submit" disabled={loading}>
        {loading ? "Creating…" : "Create account"}
      </Button>
    </form>
  );
}

