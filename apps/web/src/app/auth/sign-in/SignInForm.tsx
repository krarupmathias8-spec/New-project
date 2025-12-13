"use client";

import { useEffect, useMemo, useState } from "react";

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
    <div className="flex w-full flex-col gap-4">
      {showGoogle ? (
        <a
          className="inline-flex h-11 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
          href={`/api/auth/signin/google?callbackUrl=${encodeURIComponent(callbackUrl)}`}
        >
          Continue with Google
        </a>
      ) : null}

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-zinc-200" />
        <span className="text-xs font-medium text-zinc-500">or</span>
        <div className="h-px flex-1 bg-zinc-200" />
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <form className="flex flex-col gap-3" method="post" action={actionUrl}>
        <input type="hidden" name="csrfToken" value={csrfToken} />
        <input type="hidden" name="callbackUrl" value={callbackUrl} />

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
            autoComplete="current-password"
            required
          />
        </label>

        <button
          className="mt-1 inline-flex h-11 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-800"
          type="submit"
          disabled={!csrfToken}
          title={!csrfToken ? "Loading…" : undefined}
        >
          Sign in
        </button>
      </form>
    </div>
  );
}

