// Coles + Woolworths weekly specials, via SaleFinder.com.au — a third-party
// catalogue aggregator that republishes retailers' own weekly specials
// catalogues, not coles.com.au / woolworths.com.au directly.
//
// This exists because the retailers' own sites aren't an option: direct
// testing (curl, real headers) showed coles.com.au sits behind Incapsula
// (JS-challenge cookies on every response, even the page its own robots.txt
// explicitly allows crawling) and woolworths.com.au sits behind Akamai
// (blocks even a plain GET of /robots.txt at the edge, "Access Denied").
// Defeating either of those — solving the JS challenge, spoofing a browser
// fingerprint to get past Akamai — is not something this codebase will ever
// do, full stop, regardless of who asks or why; that's a bright line, not a
// preference. ALDI was checked and rejected earlier for the exact same
// reason (netlify/functions/lib/alphafresh.js's header comment), and stays
// rejected — reportedly even established competitor apps can't get ALDI
// data either.
//
// SaleFinder itself is a different situation technically: it has no active
// bot-management (checked directly — a plain session cookie, no
// Incapsula/Akamai challenge), and an existing open-source project
// (github.com/szdc/catalogue) already scrapes it successfully. It is NOT a
// clean legal green light the way OzBargain's RSS feeds or Alpha Fresh's
// /products.json are (both explicitly, publicly offered for this exact use)
// — SaleFinder's own Terms of Use explicitly prohibit "any automatic or
// manual process to harvest information from the Site" and using site
// content "to develop... any information, storage and retrieval system,
// database". Scraping it here is done anyway, at the user's explicit,
// informed, repeated instruction after being shown that exact clause — this
// is a real, acknowledged ToS violation, not an oversight, and the
// distinction from the ALDI/Coles/Woolworths-direct rejection above is
// specifically that no bot-detection is being defeated to do it.
const BASE = "https://salefinder.com.au";
// Used by scripts/fetch-ozbargain.js's offline snapshot refresh, which
// isn't running inside a time-boxed serverless invocation — ~180 items per
// retailer for a representative, useful snapshot. The live path
// (fetchSaleFinderDeals's own default below) stays much smaller on purpose.
const OFFLINE_MAX_PAGES = 15;

const CATALOGUE_PATHS = {
  Coles: "/Coles-catalogue",
  Woolworths: "/Woolworths-catalogue",
};

// Deliberately NOT a link to salefinder.com.au's own product page — a real
// person tapping a deal card expects to land on the actual retailer, not on
// the third-party site this data was scraped from (which they've never
// heard of and have no reason to trust). This is also the only place a
// user's own browser ever touches salefinder.com.au or coles.com.au/
// woolworths.com.au directly — everything upstream of this is server-side
// scraping/proxying; a human clicking their own link to search a real
// retailer's site is just... browsing it, not automation, so none of the
// bot-detection concerns documented at the top of this file apply here.
const RETAILER_SEARCH_URL = {
  Coles: (name) => `https://www.coles.com.au/search?q=${encodeURIComponent(name)}`,
  Woolworths: (name) =>
    `https://www.woolworths.com.au/shop/search/products?searchTerm=${encodeURIComponent(name)}`,
};

async function fetchPage(path, page, fetchImpl) {
  const url = page === 1 ? `${BASE}${path}` : `${BASE}${path}?qs=${page},,,,`;
  const res = await fetchImpl(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; PicklyBot/1.0)" },
  });
  if (!res.ok) return null;
  const html = await res.text();
  // The page opens every product grid with a *commented-out*
  // `<!--<div class="item-landscape">-->` template placeholder — a literal
  // text match for that string right before the real ones, which throws
  // off ITEM_BLOCK_RE's block-boundary matching (it can't tell "commented
  // out" from real markup) and silently drops every second item. Stripped
  // here once, rather than taught to the regex, since HTML comments have no
  // business being treated as content by anything downstream anyway.
  return html.replace(/<!--[\s\S]*?-->/g, "");
}

// "food-and-beverage/groceries/meat" -> "Meat" — SaleFinder's own real
// category path for the item (lifted from its detail-page URL), humanized.
// Preferred over utils/groceryCategory.js's keyword-guessing wherever it's
// available, for the same reason Alpha Fresh's real product_type is: an
// actual category beats an inferred one.
function categoryFromPath(urlPath) {
  // e.g. /67222/food-and-beverage/groceries/meat/<product-slug>/672221001/
  // -> [67222, food-and-beverage, groceries, meat, <product-slug>, 672221001]
  // First segment is the catalogue id, last two are the product's own
  // name-slug and item id — neither is a category. Everything between is
  // the real category breadcrumb, most-specific last.
  const segments = urlPath.split("/").filter(Boolean);
  const categorySegments = segments.slice(1, -2).filter((s) => s !== "groceries");
  const slug = categorySegments[categorySegments.length - 1];
  if (!slug) return null;
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// Regex-parsed rather than DOM-parsed (no cheerio/jsdom dependency in this
// project — scripts/lib/ozbargain.js's RSS parsing takes the same approach)
// against SaleFinder's consistent server-rendered `item-landscape` product
// cards.
const ITEM_BLOCK_RE = /<div class="item-landscape">([\s\S]*?)(?=<div class="item-landscape">|<div class="pagenumbers">|$)/g;
const DETAIL_LINK_RE = /class="item-image" data-itemid="(\d+)" data-itemname="([^"]*)"[^>]*>\s*<img src="([^"]+)"/;
const HREF_RE = /<a href="(\/\d+\/[^"]+)" class="item-image"/;
const PRICE_RE = /<span class="price">\s*([^<]*?)\s*<\/span>/;
const SAVE_RE = /Save\s*([^<]+?)<br/;
// e.g. `<div class="catalogue-date">Offer valid Wed 19 Aug 2026 - Tue 25
// Aug 2026</div>` — the retailer's own stated validity window for this
// week's catalogue, appears once near the top of the page (ahead of every
// item on it). Real dates, not invented ones — same honesty rule as
// api/deals.js's timeLeft(), which only ever shows a countdown when a deal
// actually states its own end date.
const VALIDITY_RE = /Offer valid \w+ (\d{1,2} \w+ \d{4}) - \w+ (\d{1,2} \w+ \d{4})/;

function parseValidity(html) {
  const match = VALIDITY_RE.exec(html);
  if (!match) return { startsAt: null, expiresAt: null };
  const start = new Date(match[1]);
  const end = new Date(match[2]);
  return {
    startsAt: Number.isFinite(start.getTime()) ? start.toISOString() : null,
    // End of that calendar day, not midnight at its start — a catalogue
    // valid "through Tue 25 Aug" is still valid for all of Tuesday.
    expiresAt: Number.isFinite(end.getTime())
      ? new Date(end.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString()
      : null,
  };
}

// SaleFinder's `data-itemname` attribute is double HTML-escaped (an "&" in
// a product name comes through as literally `&amp;amp;` — the escaping was
// applied twice somewhere in their own pipeline) — a single decode pass
// leaves a real `&amp;` or `&#039;` behind, still visible. Decoding twice
// fixes that; a name with no escaping to begin with is unaffected by the
// second pass since there's nothing left for it to match.
function decodeEntitiesOnce(s) {
  return s
    .replace(/&amp;ndash;/g, "–")
    .replace(/&rsquo;/g, "’")
    .replace(/&#0*39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
}

function decodeEntities(s) {
  return decodeEntitiesOnce(decodeEntitiesOnce(s));
}

function parseItems(html, store) {
  const { startsAt, expiresAt } = parseValidity(html);
  const items = [];
  let match;
  ITEM_BLOCK_RE.lastIndex = 0;
  while ((match = ITEM_BLOCK_RE.exec(html))) {
    const block = match[1];

    const linkMatch = DETAIL_LINK_RE.exec(block);
    const hrefMatch = HREF_RE.exec(block);
    if (!linkMatch || !hrefMatch) continue;

    const [, itemId, rawName, image] = linkMatch;
    const name = decodeEntities(rawName).trim();
    if (!name) continue;

    const priceMatch = PRICE_RE.exec(block);
    const priceText = priceMatch ? priceMatch[1].trim() : "";
    const priceNum = priceText.match(/\$([\d.]+)/);
    if (!priceNum) continue; // no readable price — not useful as a deal
    const price = Number(priceNum[1]);
    const unit = priceText.replace(/\$[\d.]+/, "").trim(); // e.g. "kg" for per-kg pricing

    const saveMatch = SAVE_RE.exec(block);
    const saveText = saveMatch ? decodeEntities(saveMatch[1]).trim() : null;

    const detailPath = hrefMatch[1];

    items.push({
      id: `sf-${store.toLowerCase()}-${itemId}`,
      title: name,
      rawTitle: saveText ? `${name} $${price}${unit ? "/" + unit : ""} — ${saveText}` : `${name} $${price}${unit ? "/" + unit : ""}`,
      url: RETAILER_SEARCH_URL[store] ? RETAILER_SEARCH_URL[store](name) : `${BASE}${detailPath}`,
      image,
      store,
      price,
      kind: saveText ? `Save ${saveText}` : "SPECIAL",
      votes: 0,
      votesPos: 0,
      comments: 0,
      clicks: 0,
      postedAt: new Date().toISOString(),
      expiresAt,
      startsAt,
      status: null,
      category: categoryFromPath(detailPath) || "Groceries",
    });
  }
  return items;
}

// This is only ever called from scripts/fetch-ozbargain.js's scheduled
// GitHub Action now — never from a live Netlify Function request (see
// deals.js's header comment for why: SaleFinder itself measured ~25s per
// page fetch, apparently rate-limiting repeat callers, which blew that
// function's 30s hard timeout in production). Since nothing here is racing
// a serverless timeout any more, pages are fetched one at a time rather
// than in a parallel burst — a burst of simultaneous requests is exactly
// the kind of traffic pattern likely to trip that same rate-limiting
// harder, and a scheduled job has no reason to rush.
async function fetchSaleFinderDeals(store, fetchImpl = fetch, maxPages = 4) {
  const path = CATALOGUE_PATHS[store];
  if (!path) return [];
  const items = [];
  const seen = new Set();
  try {
    for (let page = 1; page <= maxPages; page++) {
      const html = await fetchPage(path, page, fetchImpl);
      if (!html) break;
      const pageItems = parseItems(html, store);
      if (!pageItems.length) break;
      for (const item of pageItems) {
        if (seen.has(item.id)) continue; // pagination overlap / dupes
        seen.add(item.id);
        items.push(item);
      }
    }
  } catch (_) {
    // Best-effort, same as every other source — a failed fetch here just
    // means fewer deals this run, not a broken deploy.
  }
  return items;
}

module.exports = { fetchSaleFinderDeals, parseItems, categoryFromPath, parseValidity, OFFLINE_MAX_PAGES };
