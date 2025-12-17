import * as crypto from "node:crypto";
import * as cheerio from "cheerio";

import { fetchHtmlWithBrowserless } from "@/lib/browserless";

export type ScrapedPage = {
  url: string;
  title?: string;
  content: string;
  contentSha: string;
};

export type ExtractedAsset = {
  url: string;
  kind: "logo" | "product_image" | "og_image" | "icon";
  alt?: string;
  sourcePageUrl: string;
};

export type ScrapeResult = {
  pages: ScrapedPage[];
  assets: ExtractedAsset[];
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

function absolutizeUrl(baseUrl: string, maybeUrl: string) {
  try {
    return new URL(maybeUrl, baseUrl).toString();
  } catch {
    return null;
  }
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function asObj(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asStr(value: unknown): string {
  return typeof value === "string" ? normalizeText(value) : "";
}

function extractJsonLd(html: string): Array<Record<string, unknown>> {
  const $ = cheerio.load(html);
  const out: Array<Record<string, unknown>> = [];
  $('script[type="application/ld+json"]').each((_i, el) => {
    const raw = $(el).text();
    const parsed = safeJsonParse(raw);
    if (!parsed) return;
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        const o = asObj(item);
        if (Object.keys(o).length) out.push(o);
      }
      return;
    }
    const o = asObj(parsed);
    if (Object.keys(o).length) out.push(o);
  });
  return out;
}

function extractAssets(html: string, pageUrl: string): ExtractedAsset[] {
  const $ = cheerio.load(html);
  const out: ExtractedAsset[] = [];

  // Icons / favicons
  const iconSelectors = [
    'link[rel="icon"]',
    'link[rel="shortcut icon"]',
    'link[rel="apple-touch-icon"]',
  ];
  for (const sel of iconSelectors) {
    const href = $(sel).attr("href");
    if (!href) continue;
    const abs = absolutizeUrl(pageUrl, href);
    if (!abs) continue;
    out.push({ url: abs, kind: "icon", sourcePageUrl: pageUrl });
  }

  // OG images
  const ogImage = pickMeta($, 'meta[property="og:image"]');
  if (ogImage) {
    const abs = absolutizeUrl(pageUrl, ogImage);
    if (abs) out.push({ url: abs, kind: "og_image", sourcePageUrl: pageUrl });
  }

  // JSON-LD logos (Organization / WebSite)
  const jsonLd = extractJsonLd(html);
  for (const node of jsonLd) {
    const logo = asObj(node.logo);
    const logoUrl =
      asStr(node.logo) ||
      asStr(logo.url) ||
      asStr(logo["@id"]);
    if (logoUrl) {
      const abs = absolutizeUrl(pageUrl, logoUrl);
      if (abs) out.push({ url: abs, kind: "logo", sourcePageUrl: pageUrl });
    }
    // Some schemas put the organization under publisher
    const publisher = asObj(node.publisher);
    const pubLogo = asObj(publisher.logo);
    const pubLogoUrl = asStr(pubLogo.url) || asStr(pubLogo["@id"]) || asStr(publisher.logo);
    if (pubLogoUrl) {
      const abs = absolutizeUrl(pageUrl, pubLogoUrl);
      if (abs) out.push({ url: abs, kind: "logo", sourcePageUrl: pageUrl });
    }
  }

  // Images
  $("img").each((_i, el) => {
    const src = $(el).attr("src") || "";
    const alt = normalizeText($(el).attr("alt") || "") || undefined;
    const abs = absolutizeUrl(pageUrl, src);
    if (!abs) return;

    const lower = abs.toLowerCase();
    const isSvg = lower.endsWith(".svg");
    const isIconish = lower.includes("favicon") || lower.includes("icon");
    const isLogoish = lower.includes("logo") || (alt ? alt.toLowerCase().includes("logo") : false);

    if (isIconish) out.push({ url: abs, kind: "icon", alt, sourcePageUrl: pageUrl });
    else if (isLogoish) out.push({ url: abs, kind: "logo", alt, sourcePageUrl: pageUrl });
    else if (!isSvg) out.push({ url: abs, kind: "product_image", alt, sourcePageUrl: pageUrl });
  });

  // De-dupe
  const seen = new Set<string>();
  return out.filter((a) => {
    const k = `${a.kind}:${a.url}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
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

  const ogSiteName = pickMeta($, 'meta[property="og:site_name"]');
  const applicationName = pickMeta($, 'meta[name="application-name"]');
  const ogType = pickMeta($, 'meta[property="og:type"]');
  const keywords = pickMeta($, 'meta[name="keywords"]');

  const jsonLd = extractJsonLd(html);
  const orgNode =
    jsonLd.find((n) => /organization/i.test(asStr(n["@type"]))) ??
    jsonLd.find((n) => /website/i.test(asStr(n["@type"])));
  const orgName = orgNode ? asStr(orgNode.name) : "";
  const orgDesc = orgNode ? asStr(orgNode.description) : "";
  const orgCategory = orgNode ? asStr(orgNode.category) : "";

  const headings = normalizeText($("h1,h2,h3").text());

  // If it's a SPA, body text might be minimal; <noscript> sometimes contains useful text.
  const raw = normalizeText(root.text());
  const noScript = normalizeText($("noscript").text());

  const parts = [
    title ?? "",
    ogTitle,
    ogSiteName,
    applicationName,
    ogType,
    metaDescription,
    keywords,
    orgName,
    orgCategory,
    orgDesc,
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
    `${base}/contact`,
    `${base}/contact-us`,
    `${base}/how-it-works`,
    `${base}/solutions`,
    `${base}/services`,
    `${base}/products`,
    `${base}/marketplace`,
    `${base}/listings`,
  ];
  // de-dupe while keeping order
  return [...new Set(candidates.map((x) => new URL(x, base).toString()))];
}

export async function scrapeBrandSite(primaryUrl: string): Promise<ScrapeResult> {
  const urls = getCandidateUrls(primaryUrl);
  const pages: ScrapedPage[] = [];
  const assets: ExtractedAsset[] = [];

  for (const url of urls) {
    try {
      let html = await fetchHtml(url, 18_000);
      let { title, content } = extractText(html);

      // If content is low-signal (common for SPAs even with large HTML), try Browserless.
      if (!content || content.length < 800) {
        const rendered = await fetchHtmlWithBrowserless(url);
        if (rendered) {
          html = rendered;
          ({ title, content } = extractText(html));
        }
      }

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

      // Extract assets from this page (logos, screenshots, og:image, icons)
      for (const a of extractAssets(html, url)) assets.push(a);
    } catch {
      // ignore individual page failures
    }
  }

  // Keep at most N pages to bound token cost and avoid timeouts on Vercel.
  return {
    pages: pages.slice(0, 8),
    assets: assets.slice(0, 120),
  };
}

// Back-compat helper
export async function scrapeBrandPages(primaryUrl: string): Promise<ScrapedPage[]> {
  const res = await scrapeBrandSite(primaryUrl);
  return res.pages;
}

