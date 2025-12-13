import Link from "next/link";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function Home() {
  const session = await getSession();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(0,0,0,0.10),transparent_60%)]" />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-14 px-6 py-16">
        <header className="flex items-center justify-between">
          <div className="text-sm font-semibold tracking-tight">AI Marketing Generator</div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link href="/auth/sign-in">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/sign-up">Create account</Link>
            </Button>
          </div>
        </header>

        <section className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div className="space-y-5">
            <h1 className="text-4xl font-semibold tracking-tight">
              Generate ads, emails, and social content from your website.
            </h1>
            <p className="max-w-xl text-base leading-7 text-muted-foreground">
              Paste a product URL. We ingest public pages, build structured Brand DNA, then generate coherent
              A/B variants and ad visuals aligned with your brand and audience.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/auth/sign-up">Get started</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/auth/sign-in">I already have an account</Link>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Built for B2B teams who want speed + consistency.
            </p>
          </div>

          <div className="grid gap-4">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle>Brand ingestion</CardTitle>
                <CardDescription>Scrape public pages and extract a reusable Brand DNA.</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Value prop, tone, ICP, objections, do/don’t words — stored as JSON.
              </CardContent>
            </Card>
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle>Creative engine</CardTitle>
                <CardDescription>Multi-agent generation with strict JSON outputs.</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Meta/TikTok/Google ads, marketing emails, social posts, angles, headlines, A/B variants.
              </CardContent>
            </Card>
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle>Visual generator</CardTitle>
                <CardDescription>Brand-consistent ad visuals in multiple formats.</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Square, portrait and landscape formats, export-ready.
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}
