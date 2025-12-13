"use client";

import { useEffect, useState } from "react";

export function SignOutForm() {
  const [csrfToken, setCsrfToken] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/auth/csrf", { cache: "no-store" });
      const json = (await res.json()) as { csrfToken?: string };
      if (!cancelled) setCsrfToken(json.csrfToken ?? "");
    })().catch(() => {
      if (!cancelled) setCsrfToken("");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <form method="post" action="/api/auth/signout">
      <input type="hidden" name="csrfToken" value={csrfToken} />
      <button
        className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 disabled:opacity-60"
        type="submit"
        disabled={!csrfToken}
      >
        Sign out
      </button>
    </form>
  );
}

