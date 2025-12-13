import Link from "next/link";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/session";

export default async function Home() {
  const session = await getSession();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-zinc-50">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-16">
        <header className="flex items-center justify-between">
          <div className="text-sm font-semibold tracking-tight text-zinc-900">
            AI Marketing Generator
          </div>
          <div className="flex items-center gap-3">
            <Link
              className="text-sm font-medium text-zinc-700 hover:text-zinc-900"
              href="/auth/sign-in"
            >
              Sign in
            </Link>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-800"
              href="/auth/sign-up"
            >
              Create account
            </Link>
          </div>
        </header>

        <section className="rounded-3xl border border-zinc-200 bg-white p-10 shadow-sm">
          <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-zinc-900">
            Turn your website into ads, emails, and social content — automatically.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-600">
            Paste a product URL. We ingest public pages, build a structured Brand DNA, then
            generate coherent A/B variants and ad visuals aligned with your brand and audience.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              className="inline-flex h-11 items-center justify-center rounded-lg bg-zinc-900 px-5 text-sm font-semibold text-white hover:bg-zinc-800"
              href="/auth/sign-up"
            >
              Get started
            </Link>
            <Link
              className="inline-flex h-11 items-center justify-center rounded-lg border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
              href="/auth/sign-in"
            >
              I already have an account
            </Link>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Brand ingestion",
              body: "Scrape home/pricing/about/FAQ, extract value prop, tone, ICP, objections, do/don’t words.",
            },
            {
              title: "Creative engine",
              body: "Meta/TikTok/Google ads, marketing emails, social posts, angles & hooks — structured JSON outputs.",
            },
            {
              title: "Visual generator",
              body: "Brand-consistent image prompts and exports for square/portrait/landscape formats.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
            >
              <div className="text-sm font-semibold text-zinc-900">{f.title}</div>
              <div className="mt-2 text-sm leading-6 text-zinc-600">{f.body}</div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
