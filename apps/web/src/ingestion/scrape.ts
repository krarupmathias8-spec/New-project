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
      headers: {
        "user-agent":
          "AI-Marketing-Generator/1.0 (+https://example.invalid; ingestion bot)",
        accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) throw new Error(`fetch_failed:${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

function extractText(html: string): { title?: string; content: string } {
  const $ = cheerio.load(html);
  $("script,noscript,style,svg").remove();
  const title = normalizeText($("title").text()) || undefined;

  // Prefer common "main" containers; fallback to body
  const main = $("main");
  const root = main.length ? main : $("body");

  const raw = root.text();
  const content = normalizeText(raw);
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
      const html = await fetchHtml(url);
      const { title, content } = extractText(html);
      if (!content || content.length < 200) continue;

      const trimmed = content.slice(0, 60_000);
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

  // Keep at most N pages to bound token cost.
  return pages.slice(0, 6);
}

