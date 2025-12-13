"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
            return;
          }
          router.push("/auth/sign-in");
        } finally {
          setLoading(false);
        }
      }}
    >
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-zinc-900">Name (optional)</span>
        <input
          className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none ring-0 focus:border-zinc-400"
          name="name"
          type="text"
          autoComplete="name"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-zinc-900">Email</span>
        <input
          className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none ring-0 focus:border-zinc-400"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-zinc-900">Password</span>
        <input
          className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none ring-0 focus:border-zinc-400"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
      </label>

      <button
        className="mt-1 inline-flex h-11 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
        type="submit"
        disabled={loading}
      >
        {loading ? "Creating…" : "Create account"}
      </button>
    </form>
  );
}

