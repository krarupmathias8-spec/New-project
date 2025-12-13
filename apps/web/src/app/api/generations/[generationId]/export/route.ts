import { NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const QuerySchema = z.object({
  format: z.enum(["json", "csv"]).default("json"),
});

function csvEscape(value: string) {
  const v = value.replace(/"/g, '""');
  return `"${v}"`;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ generationId: string }> }
) {
  const { generationId } = await params;
  const session = await getSession();
  const email = session?.user?.email ?? undefined;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const parsedQuery = QuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  const format = parsedQuery.success ? parsedQuery.data.format : "json";

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const gen = await prisma.generationRun.findFirst({
    where: {
      id: generationId,
      project: { organization: { members: { some: { userId: user.id } } } },
    },
    select: { id: true, type: true, output: true, createdAt: true },
  });
  if (!gen) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (format === "json") {
    const body = JSON.stringify(gen.output ?? {}, null, 2);
    return new NextResponse(body, {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="generation-${gen.id}.json"`,
      },
    });
  }

  // Minimal CSV support for common ad exports.
  const out = (gen.output ?? {}) as unknown;
  const outObj = out && typeof out === "object" ? (out as Record<string, unknown>) : {};
  let csv = "";

  if (gen.type === "META_ADS" && Array.isArray(outObj.ads)) {
    const header = ["angle", "audienceSegment", "primaryText", "headline", "description", "cta"];
    csv += `${header.join(",")}\n`;
    for (const ad of outObj.ads) {
      const adObj = ad && typeof ad === "object" ? (ad as Record<string, unknown>) : {};
      const row = header.map((k) => csvEscape(String(adObj[k] ?? "")));
      csv += `${row.join(",")}\n`;
    }
  } else if (gen.type === "GOOGLE_ADS" && Array.isArray(outObj.campaigns)) {
    const header = ["angle", "headlines", "descriptions", "keywords"];
    csv += `${header.join(",")}\n`;
    for (const c of outObj.campaigns) {
      const cObj = c && typeof c === "object" ? (c as Record<string, unknown>) : {};
      const headlines = Array.isArray(cObj.headlines) ? (cObj.headlines as unknown[]).map(String) : [];
      const descriptions = Array.isArray(cObj.descriptions) ? (cObj.descriptions as unknown[]).map(String) : [];
      const keywords = Array.isArray(cObj.keywords) ? (cObj.keywords as unknown[]).map(String) : [];
      const row = [
        csvEscape(String(cObj.angle ?? "")),
        csvEscape(headlines.join(" | ")),
        csvEscape(descriptions.join(" | ")),
        csvEscape(keywords.join(" | ")),
      ];
      csv += `${row.join(",")}\n`;
    }
  } else {
    return NextResponse.json(
      { error: "csv_not_supported_for_type", type: gen.type },
      { status: 400 }
    );
  }

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="generation-${gen.id}.csv"`,
    },
  });
}

