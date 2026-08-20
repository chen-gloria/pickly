// Real product search across a known set of Australian retailers, backed by
// SerpAPI's Google Shopping engine (serpapi.com) — not invented data. Runs
// server-side for the same reason deals.js proxies OzBargain: the API key
// must never reach the client, and the browser shouldn't be the one making
// a paid, rate-limited third-party call directly.
//
// Results are filtered down to a fixed retailer allow-list rather than
// showing whatever random seller Google surfaces — same reasoning as the
// deals feed's category allow-list (scripts/lib/ozbargain.js): a smaller,
// trusted, predictable set beats "anything on the internet" for a
// price-comparison tool people are meant to actually trust.
const RETAILERS = [
  { name: "Woolworths", pattern: /woolworths/i, color: "#1E7A34" },
  { name: "Coles", pattern: /coles/i, color: "#E2231A" },
  { name: "ALDI", pattern: /aldi/i, color: "#0060A9" },
  { name: "Alpha Fresh", pattern: /alpha\s*fresh/i, color: "#2E7D32" },
  { name: "Amazon AU", pattern: /amazon/i, color: "#FF9900" },
  { name: "Chemist Warehouse", pattern: /chemist\s*warehouse/i, color: "#E4002B" },
  { name: "Priceline", pattern: /priceline/i, color: "#E4007C" },
  { name: "JB Hi-Fi", pattern: /jb\s*hi-?fi/i, color: "#FFDE00" },
  { name: "Officeworks", pattern: /officeworks/i, color: "#0072CE" },
  { name: "Bunnings", pattern: /bunnings/i, color: "#088A3C" },
  { name: "Kmart", pattern: /kmart/i, color: "#CC0000" },
];

function matchRetailer(sourceName) {
  if (!sourceName) return null;
  return RETAILERS.find((r) => r.pattern.test(sourceName)) || null;
}

// Warm Netlify Function containers stick around between invocations for a
// while, so an in-memory cache genuinely cuts repeat calls for the same
// term without needing an external store — it just doesn't survive a cold
// start, which is fine for what this is protecting (a 100-searches/month
// free-tier API budget, not correctness).
const CACHE = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour — shopping prices don't move that fast

exports.handler = async (event) => {
  const q = (event.queryStringParameters?.q || "").trim();
  if (q.length < 2) {
    return json(200, { query: q, results: [] });
  }

  const cacheKey = q.toLowerCase();
  const cached = CACHE.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return json(200, { query: q, results: cached.results, cached: true });
  }

  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) {
    // Fails honest and empty rather than falling back to fabricated
    // results — the whole point of this function existing is that the
    // catalogue it replaced was fake.
    return json(200, { query: q, results: [], error: "search is not configured" });
  }

  try {
    const url = new URL("https://serpapi.com/search.json");
    url.searchParams.set("engine", "google_shopping");
    url.searchParams.set("q", q);
    url.searchParams.set("gl", "au");
    url.searchParams.set("hl", "en");
    url.searchParams.set("api_key", apiKey);

    const res = await fetch(url);
    if (!res.ok) {
      return json(200, { query: q, results: [], error: `search upstream ${res.status}` });
    }
    const data = await res.json();
    const raw = Array.isArray(data.shopping_results) ? data.shopping_results : [];

    const results = raw
      .map((r) => {
        const retailer = matchRetailer(r.source);
        if (!retailer || r.extracted_price == null) return null;
        return {
          id: r.product_id || `${retailer.name}-${r.title}`,
          title: r.title,
          store: { name: retailer.name, color: retailer.color },
          price: r.extracted_price,
          oldPrice: r.extracted_old_price ?? null,
          rating: r.rating ?? null,
          reviews: r.reviews ?? null,
          image: r.thumbnail || null,
          link: r.product_link || null,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.price - b.price);

    CACHE.set(cacheKey, { at: Date.now(), results });
    return json(200, { query: q, results });
  } catch (err) {
    return json(200, { query: q, results: [], error: String(err) });
  }
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify(body),
  };
}
