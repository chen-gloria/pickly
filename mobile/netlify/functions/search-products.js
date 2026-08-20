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
//
// Two real problems fixed here beyond the retailer allow-list:
//   1. SerpAPI's own relevance ranking isn't always this app's idea of
//      relevant — a query for "cherry juice" could come back with results
//      that only loosely relate. matchesQuery() (scripts/lib/fuzzySearch.js)
//      re-checks every SerpAPI result locally before accepting it, rather
//      than trusting Google Shopping's ranking wholesale.
//   2. A small independent grocer like Alpha Fresh is unlikely to be well
//      indexed by Google Shopping at all, so it rarely appeared in SerpAPI
//      results regardless of relevance. Alpha Fresh's own full catalogue
//      (netlify/functions/lib/alphafresh.js's toSearchableProducts,
//      refreshed daily into src/api/alphaFreshCatalog.json — same pattern
//      as dealsSnapshot.json) is searched locally and merged in, so a
//      regular-priced or differently-worded Alpha Fresh product is
//      findable at all, not just ones that happened to be on sale AND
//      phrased the way the deals feed generated its title.
const { matchesQuery, matchScore } = require("../../scripts/lib/fuzzySearch");
const alphaFreshCatalog = require("../../src/api/alphaFreshCatalog.json");

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

function searchLocalAlphaFresh(q) {
  return (alphaFreshCatalog.products || [])
    .filter((p) => matchesQuery(q, p.title))
    .map((p) => ({
      id: p.id,
      title: p.title,
      store: { name: "Alpha Fresh", color: "#2E7D32" },
      price: p.price,
      oldPrice: p.oldPrice,
      rating: p.rating,
      reviews: p.reviews,
      image: p.image,
      link: p.link,
    }));
}

async function searchSerpApi(q) {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) return { results: [], error: "search is not configured" };

  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google_shopping");
  url.searchParams.set("q", q);
  url.searchParams.set("gl", "au");
  url.searchParams.set("hl", "en");
  url.searchParams.set("api_key", apiKey);

  const res = await fetch(url);
  if (!res.ok) return { results: [], error: `search upstream ${res.status}` };

  const data = await res.json();
  const raw = Array.isArray(data.shopping_results) ? data.shopping_results : [];

  const results = raw
    .map((r) => {
      const retailer = matchRetailer(r.source);
      // matchesQuery() re-checks relevance locally rather than trusting
      // SerpAPI's own ranking wholesale — see the file header comment.
      if (!retailer || r.extracted_price == null || !matchesQuery(q, r.title)) return null;
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
    .filter(Boolean);

  return { results };
}

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

  // Alpha Fresh's local catalogue search never depends on SerpAPI being
  // configured/reachable — it's a bundled file, not a network call — so it
  // always runs, even on a SerpAPI failure or a missing key.
  const localResults = searchLocalAlphaFresh(q);

  let serpError = null;
  let serpResults = [];
  try {
    const serp = await searchSerpApi(q);
    serpResults = serp.results;
    serpError = serp.error || null;
  } catch (err) {
    serpError = String(err);
  }

  // Local Alpha Fresh matches first — SerpAPI ranks the rest by relevance
  // already (Google Shopping's own scoring, now with the false positives
  // matchesQuery() would have dropped already gone), then by price within
  // that. Not merged-and-price-sorted as one list: a $50 unrelated-store
  // impulse buy outranking the exact product someone searched for, just
  // because it's cheaper, would be a worse result even though the number
  // is smaller.
  const results = [...localResults, ...serpResults.sort((a, b) => a.price - b.price)];

  CACHE.set(cacheKey, { at: Date.now(), results });
  // The client (BrowseScreen.js) shows an error banner INSTEAD OF results
  // whenever `error` is truthy, regardless of whether results also came
  // back — so a SerpAPI failure must never surface as `error` here while
  // Alpha Fresh's local search still found something real to show.
  return json(200, { query: q, results, error: results.length ? undefined : serpError || undefined });
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
