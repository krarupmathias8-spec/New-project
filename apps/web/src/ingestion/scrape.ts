import * as crypto from "node:crypto";
import * as cheerio from "cheerio";

export type ScrapedPage = {
  url: string;
  title?: string;
  content: string;
  contentSha: string;
};

function normalizeText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

async function fetchHtml(url: string, timeoutMs = 12_000): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: ctrl.signal,
      cache: "no-store",
      headers: {
        "user-agent":
          "AI-Marketing-Generator/1.0 (+https://example.invalid; ingestion bot)",
        accept: "text/html,application/xhtml+xml",
        "accept-language": "en-US,en;q=0.9,fr;q=0.8",
      },
    });
    if (!res.ok) throw new Error(`fetch_failed:${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

function pickMeta($: cheerio.CheerioAPI, selector: string) {
  const v = $(selector).attr("content");
  return v ? normalizeText(v) : "";
}

function extractText(html: string): { title?: string; content: string } {
  const $ = cheerio.load(html);
  // Keep <noscript> (many SPA sites put real content there). Remove scripts/styles only.
  $("script,style,svg").remove();
  const title = normalizeText($("title").text()) || undefined;

  // Prefer common "main" containers; fallback to body
  const main = $("main");
  const root = main.length ? main : $("body");

  // Fallback-friendly extraction for JS-heavy sites:
  // - meta description / og description
  // - headings
  // - body text
  const metaDescription =
    pickMeta($, 'meta[name="description"]') ||
    pickMeta($, 'meta[property="og:description"]') ||
    pickMeta($, 'meta[name="twitter:description"]');

  const ogTitle =
    pickMeta($, 'meta[property="og:title"]') || pickMeta($, 'meta[name="twitter:title"]');

  const headings = normalizeText($("h1,h2,h3").text());

  // If it's a SPA, body text might be minimal; <noscript> sometimes contains useful text.
  const raw = normalizeText(root.text());
  const noScript = normalizeText($("noscript").text());

  const parts = [
    title ?? "",
    ogTitle,
    metaDescription,
    headings,
    raw,
    noScript,
  ].filter(Boolean);

  const content = normalizeText(parts.join("\n\n"));
  return { title, content };
}

export function getCandidateUrls(primaryUrl: string): string[] {
  const u = new URL(primaryUrl);
  const base = `${u.protocol}//${u.host}`;
  const candidates = [
    primaryUrl,
    `${base}/`,
    `${base}/pricing`,
    `${base}/about`,
    `${base}/about-us`,
    `${base}/faq`,
    `${base}/features`,
  ];
  // de-dupe while keeping order
  return [...new Set(candidates.map((x) => new URL(x, base).toString()))];
}

export async function scrapeBrandPages(primaryUrl: string): Promise<ScrapedPage[]> {
  const urls = getCandidateUrls(primaryUrl);
  const pages: ScrapedPage[] = [];

  for (const url of urls) {
    try {
      const html = await fetchHtml(url, 18_000);
      const { title, content } = extractText(html);
      // Lower threshold: meta/headings can still be valuable even if body text is short.
      if (!content || content.length < 80) continue;

      // Keep content bounded for serverless + LLM latency/cost.
      const trimmed = content.slice(0, 20_000);
      pages.push({
        url,
        title,
        content: trimmed,
        contentSha: sha256(trimmed),
      });
    } catch {
      // ignore individual page failures
    }
  }

  // Keep at most N pages to bound token cost and avoid timeouts on Vercel.
  return pages.slice(0, 4);
}

