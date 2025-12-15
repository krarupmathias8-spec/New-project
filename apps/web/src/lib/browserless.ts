import { getEnv } from "@/lib/env";

type BrowserlessContentResponse = string;

export async function fetchHtmlWithBrowserless(url: string): Promise<string | null> {
  const { BROWSERLESS_URL, BROWSERLESS_TOKEN } = getEnv();
  if (!BROWSERLESS_URL || !BROWSERLESS_TOKEN) return null;

  // Browserless content endpoint returns rendered HTML.
  // Common pattern: `${BROWSERLESS_URL}/content?token=${BROWSERLESS_TOKEN}`
  const endpoint = BROWSERLESS_URL.replace(/\/+$/, "");
  const contentUrl = `${endpoint}/content?token=${encodeURIComponent(BROWSERLESS_TOKEN)}`;

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 25_000);
  try {
    const res = await fetch(contentUrl, {
      method: "POST",
      signal: ctrl.signal,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url,
        // Try to minimize cost/latency while still allowing SPAs to render.
        waitUntil: "networkidle2",
        // Small safety net for slow sites
        timeout: 20000,
        // Block unnecessary resources? (Browserless may ignore; safe to pass)
        blockAds: true,
      }),
    });

    if (!res.ok) return null;
    const html = (await res.text()) as BrowserlessContentResponse;
    return html || null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

