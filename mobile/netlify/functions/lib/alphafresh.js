// Alpha Fresh (shop.alphafresh.com.au) — a real fourth data source, not a
// mock. Confirmed before building this: it's a Shopify storefront whose
// robots.txt opens with "Public product... is crawlable", Allow: / for all
// user-agents, and a standard public /products.json endpoint (200, no auth)
// — a fundamentally different situation from an unofficial internal API
// (checked and rejected separately: api.aldi.com.au 403s automated
// requests outright and isn't covered by any robots.txt or public API
// declaration).
//
// Every product carries its own compare_at_price (the shop's stated regular
// price) alongside the current price — that's the store's own claimed
// discount, exactly analogous to an OzBargain "½ Price (Was $X)" post. Same
// honesty rule applies: this is reported as a claim, not verified against
// price history the way OzBargain deals eventually are, so it never
// produces a BUY verdict on its own (see utils/priceHistory.js).
const BASE = "https://shop.alphafresh.com.au";
const MAX_PAGES = 8; // ~1750 products as of the check that sized this — a
// hard cap exists purely so a catalogue that grows unboundedly can't turn
// one function invocation into an unbounded fetch loop.

async function fetchAllProducts(fetchImpl = fetch) {
  const products = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await fetchImpl(`${BASE}/products.json?limit=250&page=${page}`, {
      headers: { "User-Agent": "Pickly/1.0 (+https://pickly-app.netlify.app)" },
    });
    if (!res.ok) break;
    const data = await res.json();
    const batch = data.products || [];
    if (!batch.length) break;
    products.push(...batch);
  }
  return products;
}

// One deal per on-sale variant, shaped like an OzBargain deal (scripts/lib/
// ozbargain.js's parseFeed output) so it can flow through the same
// components (DealRow/DealCard) and the same judging pipeline unchanged.
function toDeals(products) {
  const deals = [];
  for (const p of products) {
    for (const v of p.variants) {
      const price = Number(v.price);
      const compareAt = Number(v.compare_at_price || 0);
      if (!(compareAt > price)) continue; // not actually discounted

      const pct = Math.round(((compareAt - price) / compareAt) * 100);
      const title = p.title.replace(/^SPECIAL\s+/i, "").trim();
      deals.push({
        id: `af-${v.id}`,
        title,
        rawTitle: `${title} $${price.toFixed(2)} (Was $${compareAt.toFixed(2)}) @ Alpha Fresh`,
        url: `${BASE}/products/${p.handle}`,
        image: p.images?.[0]?.src || null,
        store: "Alpha Fresh",
        price,
        kind: `${pct}% OFF`,
        // Honest zeros, not invented engagement — Alpha Fresh has no
        // community voting the way an OzBargain post does. dealVoice.js
        // and the heat-ranking already degrade sensibly for zero-signal
        // deals rather than needing a fake number here.
        votes: 0,
        votesPos: 0,
        comments: 0,
        clicks: 0,
        postedAt: p.published_at || p.created_at,
        expiresAt: null, // the shop doesn't publish an end date for a special
        startsAt: null,
        status: v.available ? null : "out of stock",
        category: p.product_type || "Groceries",
      });
    }
  }
  return deals;
}

async function fetchAlphaFreshDeals(fetchImpl = fetch) {
  try {
    const products = await fetchAllProducts(fetchImpl);
    return toDeals(products).filter((d) => d.status !== "out of stock");
  } catch (_) {
    return [];
  }
}

// One entry per in-stock variant, shaped like a search result
// (netlify/functions/search-products.js's own SerpAPI mapping) rather than
// a deal — this is Alpha Fresh's WHOLE catalogue, not just what's
// currently discounted, because that's the actual gap that made Alpha
// Fresh products invisible to search: only on-sale items ever flowed into
// the deals feed, so a regular-priced product (or one on sale under
// different wording than the deals feed happened to use) never showed up
// anywhere a user could find it by searching. This is what
// search-products.js searches locally instead of relying on Google
// Shopping to have indexed a small independent grocer well.
function toSearchableProducts(products) {
  const items = [];
  for (const p of products) {
    for (const v of p.variants) {
      if (!v.available) continue;
      const price = Number(v.price);
      if (!Number.isFinite(price)) continue;
      const compareAt = Number(v.compare_at_price || 0);
      const title = p.title.replace(/^SPECIAL\s+/i, "").trim();
      items.push({
        id: `af-search-${v.id}`,
        title: v.title && v.title !== "Default Title" ? `${title} — ${v.title}` : title,
        image: p.images?.[0]?.src || null,
        link: `${BASE}/products/${p.handle}`,
        price,
        oldPrice: compareAt > price ? compareAt : null,
        rating: null,
        reviews: null,
      });
    }
  }
  return items;
}

module.exports = { fetchAlphaFreshDeals, fetchAllProducts, toDeals, toSearchableProducts };
