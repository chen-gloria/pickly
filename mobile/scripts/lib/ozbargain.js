// Shared OzBargain RSS parsing. Plain CommonJS with no dependencies so the
// same logic runs in the build-time snapshot script AND inside the Netlify
// function (which we want dependency-free for fast cold starts).
//
// OzBargain publishes public RSS feeds and encourages their use; we read
// only those feeds, keep every deal's canonical link back to OzBargain, and
// never scrape the HTML site.

// Supermarket / household categories only — deliberately narrow while we
// validate the feed format. Broader categories can be added later.
const FEEDS = [
  { url: "https://www.ozbargain.com.au/cat/groceries/feed", category: "Groceries" },
  { url: "https://www.ozbargain.com.au/cat/health-beauty/feed", category: "Health & Beauty" },
];

const XML_ENTITIES = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&#039;": "'",
  "&#39;": "'",
  "&nbsp;": " ",
};

function decodeEntities(str = "") {
  return str
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&[a-z]+;|&#0?39;/gi, (m) => XML_ENTITIES[m] ?? m);
}

function tagText(block, tag) {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  if (!m) return "";
  return decodeEntities(m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")).trim();
}

function attr(block, tag, name) {
  const m = block.match(new RegExp(`<${tag}\\b[^>]*\\b${name}="([^"]*)"`, "i"));
  return m ? decodeEntities(m[1]) : "";
}

// Titles look like: "½ Price Whittaker's Slab 50g $1.50 (Was $3) @ Coles".
// The retailer is whatever follows the final "@".
function extractStore(title) {
  const m = title.match(/@\s*([^@]+)$/);
  if (!m) return null;
  return m[1].trim().replace(/\s+/g, " ");
}

function titleWithoutStore(title) {
  return title.replace(/\s*@\s*[^@]+$/, "").trim();
}

// Pull the actual deal price out of the title — conservatively. Plenty of
// titles contain dollar figures that are NOT the price you pay ("Spend $50",
// "$100-$500 gift cards", "Max Order $2,500"), and showing one of those as
// the price in a price-comparison app is worse than showing no price at all.
// When the title is ambiguous we return null and the UI simply omits it.
function extractPrice(title) {
  // A "$100-$500" style range is a denomination/bracket, never a single price.
  if (/\$\s?\d[\d,]*(?:\.\d{1,2})?\s*(?:-|–|to)\s*\$/i.test(title)) return null;

  const AMOUNT = /\$\s?(\d[\d,]*(?:\.\d{1,2})?)/g;
  // Qualifier BEFORE the amount: "Spend $50", "Min. $50", "Max Order $2,500".
  const THRESHOLD_BEFORE = /(?:spend|min\.?|minimum|over|orders?|max\.?|maximum|worth|save|off)\s*\W{0,3}$/i;
  // Qualifier AFTER the amount: "$50 off", "$20 cashback", "$10 credit".
  // These are discounts/rebates, not the price you pay.
  const THRESHOLD_AFTER = /^\s*(?:off\b|back\b|credit|cashback|voucher|bonus|gift\s*card)/i;

  for (const m of title.matchAll(AMOUNT)) {
    if (THRESHOLD_BEFORE.test(title.slice(0, m.index))) continue;
    if (THRESHOLD_AFTER.test(title.slice(m.index + m[0].length))) continue;
    const value = Number(m[1].replace(/,/g, ""));
    if (Number.isFinite(value)) return value;
  }
  return null;
}

// A short, human label for the kind of bargain — this is what gives the feed
// its editorial voice instead of a wall of identical "Save $X" chips.
function extractDealKind(title) {
  const t = title.toLowerCase();
  if (/\bfree\b/.test(t) && !/free (delivery|shipping|c&c)/.test(t)) return "FREE";
  if (/½\s*price|half\s*price|50%\s*off/.test(t)) return "½ PRICE";
  const pct = t.match(/(\d{2})%\s*off/);
  if (pct) return `${pct[1]}% OFF`;
  if (/cashback|flybuys|everyday rewards|points/.test(t)) return "REWARDS";
  if (/gift\s*card/.test(t)) return "GIFT CARD";
  if (/\bclearance\b/.test(t)) return "CLEARANCE";
  return "DEAL";
}

function parseFeed(xml, fallbackCategory) {
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  return items.map((block) => {
    const rawTitle = tagText(block, "title");
    const votesPos = Number(attr(block, "ozb:meta", "votes-pos")) || 0;
    const votesNeg = Number(attr(block, "ozb:meta", "votes-neg")) || 0;
    const link = tagText(block, "link");

    return {
      // OzBargain node id — stable across refreshes, good React key.
      id: (link.match(/node\/(\d+)/) || [])[1] || link,
      title: titleWithoutStore(rawTitle),
      rawTitle,
      url: link,
      image: attr(block, "ozb:meta", "image") || attr(block, "media:thumbnail", "url") || null,
      store: extractStore(rawTitle),
      price: extractPrice(rawTitle),
      kind: extractDealKind(rawTitle),
      votes: votesPos - votesNeg,
      votesPos,
      comments: Number(attr(block, "ozb:meta", "comment-count")) || 0,
      clicks: Number(attr(block, "ozb:meta", "click-count")) || 0,
      postedAt: tagText(block, "pubDate"),
      category: fallbackCategory,
    };
  });
}

// Ranking blends community votes with recency so the feed genuinely changes
// through the day — a deal posted an hour ago can out-rank yesterday's
// winner once it picks up votes. That churn is the whole point of a feed.
function heatScore(deal, now = Date.now()) {
  const ageHours = Math.max(0, (now - new Date(deal.postedAt).getTime()) / 36e5);
  const gravity = 1 / Math.pow(ageHours + 2, 0.55);
  return (deal.votes + deal.comments * 0.5 + deal.clicks / 100) * gravity;
}

function rankDeals(deals, now = Date.now()) {
  const seen = new Set();
  return deals
    .filter((d) => {
      if (!d.id || seen.has(d.id)) return false;
      seen.add(d.id);
      // Community-downvoted posts are noise, not deals.
      return d.votes > 0;
    })
    .map((d) => ({ ...d, heat: Number(heatScore(d, now).toFixed(2)) }))
    .sort((a, b) => b.heat - a.heat);
}

async function fetchAllDeals(fetchImpl = fetch) {
  const results = await Promise.all(
    FEEDS.map(async ({ url, category }) => {
      try {
        const res = await fetchImpl(url, {
          headers: { "User-Agent": "Pickly/1.0 (+https://pickly-app.netlify.app)" },
        });
        if (!res.ok) return [];
        return parseFeed(await res.text(), category);
      } catch (_) {
        return [];
      }
    })
  );
  return rankDeals(results.flat());
}

module.exports = {
  FEEDS,
  parseFeed,
  rankDeals,
  heatScore,
  fetchAllDeals,
  extractStore,
  extractPrice,
  extractDealKind,
};
