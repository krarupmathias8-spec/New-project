import Link from "next/link";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AutoRefresh } from "./AutoRefresh";
import { ProcessJobsButton } from "./ProcessJobsButton";

function asObj(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function safeJsonParse(value: unknown): unknown {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function renderMetaAds(output: unknown) {
  const obj = asObj(output);
  const ads = Array.isArray(obj.ads) ? (obj.ads as unknown[]) : [];
  if (ads.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-sm text-muted-foreground">
        No Meta ads generated yet.
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {ads.map((ad, i) => {
        const a = asObj(ad);
        return (
          <Card key={i} className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-base">Creative #{i + 1}</CardTitle>
              <CardDescription>
                {asString(a.angle) ? `Angle: ${asString(a.angle)}` : "Angle: —"}{" "}
                {asString(a.audienceSegment) ? `· Audience: ${asString(a.audienceSegment)}` : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <div>
                <div className="text-xs font-medium text-muted-foreground">Primary text</div>
                <div className="mt-1 whitespace-pre-wrap">{asString(a.primaryText) || "—"}</div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-xs font-medium text-muted-foreground">Headline</div>
                  <div className="mt-1">{asString(a.headline) || "—"}</div>
                </div>
                <div>
                  <div className="text-xs font-medium text-muted-foreground">Description</div>
                  <div className="mt-1">{asString(a.description) || "—"}</div>
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground">CTA</div>
                <div className="mt-1">{asString(a.cta) || "—"}</div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function renderGoogleAds(output: unknown) {
  const obj = asObj(output);
  const campaigns = Array.isArray(obj.campaigns) ? (obj.campaigns as unknown[]) : [];
  if (campaigns.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-sm text-muted-foreground">
        No Google campaigns generated yet.
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {campaigns.map((c, i) => {
        const cc = asObj(c);
        const headlines = Array.isArray(cc.headlines) ? (cc.headlines as unknown[]).map((v) => asString(v)).filter(Boolean) : [];
        const descriptions = Array.isArray(cc.descriptions)
          ? (cc.descriptions as unknown[]).map((v) => asString(v)).filter(Boolean)
          : [];
        const keywords = Array.isArray(cc.keywords) ? (cc.keywords as unknown[]).map((v) => asString(v)).filter(Boolean) : [];

        return (
          <Card key={i} className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-base">Campaign #{i + 1}</CardTitle>
              <CardDescription>{asString(cc.angle) ? `Angle: ${asString(cc.angle)}` : "Angle: —"}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="text-xs font-medium text-muted-foreground">Headlines</div>
                  <ul className="mt-2 list-inside list-disc space-y-1">
                    {headlines.length ? headlines.map((h, idx) => <li key={idx}>{h}</li>) : <li>—</li>}
                  </ul>
                </div>
                <div>
                  <div className="text-xs font-medium text-muted-foreground">Descriptions</div>
                  <ul className="mt-2 list-inside list-disc space-y-1">
                    {descriptions.length ? descriptions.map((d, idx) => <li key={idx}>{d}</li>) : <li>—</li>}
                  </ul>
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground">Keywords</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {keywords.length ? (
                    keywords.slice(0, 24).map((k, idx) => (
                      <span key={idx} className="rounded-md border bg-muted/20 px-2 py-1 text-xs">
                        {k}
                      </span>
                    ))
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default async function GenerationPage({
  params,
}: {
  params: Promise<{ projectId: string; generationId: string }>;
}) {
  const { projectId, generationId } = await params;
  const session = await getSession();
  const email = session?.user?.email ?? undefined;
  if (!email) redirect("/auth/sign-in");

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) redirect("/auth/sign-in");

  const gen = await prisma.generationRun.findFirst({
    where: {
      id: generationId,
      projectId,
      project: { organization: { members: { some: { userId: user.id } } } },
    },
    select: {
      id: true,
      type: true,
      status: true,
      createdAt: true,
      finishedAt: true,
      parameters: true,
      output: true,
      error: true,
      visualAssets: {
        select: { id: true, format: true, resultUrl: true, prompt: true, width: true, height: true, negativePrompt: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!gen) redirect(`/dashboard/projects/${projectId}`);

  const outputObj = gen.output ?? {};
  const paramsObj = asObj(gen.parameters);
  const requestedCount =
    typeof paramsObj.creativeCount === "number" ? paramsObj.creativeCount : Number(paramsObj.creativeCount);
  const creativeCount = Number.isFinite(requestedCount) ? Math.min(6, Math.max(1, Math.floor(requestedCount))) : 4;
  const expectedImages = creativeCount * 3; // 1:1, 4:5, 16:9
  const isImagesStillGenerating = gen.status !== "FAILED" && gen.visualAssets.length < expectedImages;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <AutoRefresh enabled={isImagesStillGenerating} />
      <header className="space-y-2">
        <div className="text-sm text-muted-foreground">
          <Link className="font-medium text-foreground hover:underline" href={`/dashboard/projects/${projectId}`}>
            Project
          </Link>{" "}
          <span className="text-muted-foreground/60">/</span> Generation
        </div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{gen.type}</h1>
            <div className="mt-1 text-sm text-muted-foreground">
              {new Date(gen.createdAt).toLocaleString()}
            </div>
          </div>
          <Badge variant={gen.status === "SUCCEEDED" ? "success" : gen.status === "FAILED" ? "destructive" : "secondary"}>
            {gen.status}
          </Badge>
        </div>
      </header>

      {gen.error ? (
        <Card className="border-destructive/20 bg-destructive/10 shadow-soft">
          <CardHeader>
            <CardTitle className="text-destructive">Run failed</CardTitle>
            <CardDescription className="text-destructive/80">{gen.error}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <Card className="shadow-soft">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="space-y-1">
            <CardTitle>Copy</CardTitle>
            <CardDescription>Human-readable ad copy (export optional).</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <a href={`/api/generations/${gen.id}/export?format=csv`}>Download CSV</a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={`/api/generations/${gen.id}/export?format=json`}>Download JSON</a>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {gen.type === "META_ADS"
            ? renderMetaAds(outputObj)
            : gen.type === "GOOGLE_ADS"
              ? renderGoogleAds(outputObj)
              : (
                  <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-sm text-muted-foreground">
                    This creative type is generated successfully, but doesn&apos;t have a dedicated UI yet. Use the exports above.
                  </div>
                )}
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Visual assets</CardTitle>
          <CardDescription>
            Generated creatives ({gen.visualAssets.length}/{expectedImages}) · square/portrait/landscape.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {gen.visualAssets.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-sm text-muted-foreground">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>{isImagesStillGenerating ? "Generating images…" : "No images generated for this run yet."}</div>
                {isImagesStillGenerating ? <ProcessJobsButton /> : null}
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {gen.visualAssets.map((a) => {
                const meta = asObj(safeJsonParse(a.negativePrompt));
                const variantIndex = typeof meta.variantIndex === "number" ? meta.variantIndex : Number(meta.variantIndex);
                const variantLabel = Number.isFinite(variantIndex) ? `Creative #${Math.floor(variantIndex) + 1}` : null;

                return (
                  <div key={a.id} className="rounded-xl border bg-background p-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs font-medium text-muted-foreground">
                        {variantLabel ? `${variantLabel} · ` : ""}
                        {a.format} · {a.width}×{a.height}
                      </div>
                      {a.resultUrl ? (
                        <Button asChild size="sm" variant="outline">
                          <a
                            href={a.resultUrl}
                            download={`${gen.type.toLowerCase()}-${variantLabel ? variantLabel.replace(" ", "-").toLowerCase() : "creative"}-${a.format.toLowerCase()}.png`}
                          >
                            Download
                          </a>
                        </Button>
                      ) : null}
                    </div>
                    {asString(meta.angle) || asString(meta.headline) ? (
                      <div className="mt-2 text-xs text-muted-foreground">
                        {asString(meta.angle) ? <span>Angle: {asString(meta.angle)}</span> : null}
                        {asString(meta.angle) && asString(meta.headline) ? <span> · </span> : null}
                        {asString(meta.headline) ? <span>Headline: {asString(meta.headline)}</span> : null}
                      </div>
                    ) : null}
                  {a.resultUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="mt-3 w-full rounded-lg border" src={a.resultUrl} alt="" />
                  ) : (
                    <div className="mt-3 rounded-lg border border-dashed bg-muted/20 p-6 text-sm text-muted-foreground">
                      Image pending…
                    </div>
                  )}
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm font-medium">Details</summary>
                    <div className="mt-2 whitespace-pre-wrap text-xs leading-5 text-muted-foreground">
                      <div className="font-medium text-foreground/80">Prompt</div>
                      <div className="mt-1">{a.prompt}</div>
                      {a.negativePrompt ? (
                        <>
                          <div className="mt-3 font-medium text-foreground/80">Metadata</div>
                          <div className="mt-1">{a.negativePrompt}</div>
                        </>
                      ) : null}
                    </div>
                  </details>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

