// Turning a deal title into a stable product identity.
//
// This is the load-bearing piece of the whole price-history idea. The same
// product is posted with a different title every time:
//
//   "½ Price Whittaker's Slab Milk Chocolate Bar 50g $1.50 (Was $3) @ Coles"
//   "Whittaker's Chocolate Blocks 50g Half Price $1.50 @ Coles"
//
// If those don't collapse to one key, the history is a pile of singletons and
// we can never say "cheapest since March". So we strip everything that varies
// between postings (price, promo wording, delivery terms) and keep what
// identifies the product (brand words + size).
//
// Deliberately conservative: it is much worse to merge two different products
// (we'd report a wrong "lowest price") than to fail to merge two postings of
// the same one (we just have less history).

// Promo/logistics noise that appears in titles but says nothing about *what*
// the product is.
const NOISE = [
  /½\s*price/gi,
  /\bhalf\s*price\b/gi,
  /\b\d{1,3}\s*%\s*off\b/gi,
  /\bwas\s*\$?\d[\d,]*(?:\.\d{1,2})?/gi,
  /\brrp\b/gi,
  /\bfrom\b/gi,
  /\bsave\s*\$?\d[\d,]*(?:\.\d{1,2})?/gi,
  /\$\s?\d[\d,]*(?:\.\d{1,2})?/g,
  /\bfree\s*(delivery|shipping|c\s*&\s*c|click\s*&\s*collect)\b/gi,
  /\bdelivery\b/gi,
  /\bc\s*&\s*c\b/gi,
  /\bclick\s*&\s*collect\b/gi,
  /\bin[-\s]?store\b/gi,
  /\bs\s*&\s*s\b/gi,
  /\bsubscribe\s*&\s*save\b/gi,
  /\boos\b/gi,
  /\bout\s*of\s*stock\b/gi,
  /\bback\s*order\b/gi,
  /\bmin(\.|imum)?\s*spend\b/gi,
  /\bactivation\s*required\b/gi,
  /\bnew\s*customers?\s*only\b/gi,
  /\bexpired\b/gi,
  /\bbonus\b/gi,
  /\bcashback\b/gi,
  /\bprime\b/gi,
  /\bplus\s*members?\b/gi,
  /\bper\s*day\b/gi,
  /\bmax\s*order\b/gi,
  /\b\d+\s*for\s*\d+\b/gi,
  /\bpickup\b/gi,
];

// Words that carry no identifying signal.
const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "with", "for", "of", "at", "on", "to", "in",
  "by", "up", "off", "now", "only", "more", "also", "get", "buy", "deal",
  "deals", "sale", "special", "specials", "price", "prices", "cheap", "new",
  "plus", "pack", "packs", "each", "per", "was", "extra", "selected", "all",
  "other", "others", "varieties", "various", "range", "select",
]);

// "50g", "1.25L", "12pk", "500ml", "2kg", "6 pack" -> normalised size token.
const SIZE_RE = /\b(\d+(?:\.\d+)?)\s*(g|kg|ml|l|lt|litre|liters?|pk|pack|packs|ct|count|sheets?|caps?|tabs?)\b/gi;

function normaliseSize(value, unit) {
  const u = unit.toLowerCase();
  const n = Number(value);
  if (u === "kg") return `${n * 1000}g`;
  if (["l", "lt", "litre", "litres", "liter", "liters"].includes(u)) return `${n * 1000}ml`;
  if (["pk", "pack", "packs", "ct", "count"].includes(u)) return `${n}pk`;
  return `${n}${u}`;
}

function extractSizes(title) {
  const sizes = new Set();
  for (const m of title.matchAll(SIZE_RE)) sizes.add(normaliseSize(m[1], m[2]));
  // Sorted so "500ml 2pk" and "2pk 500ml" produce the same key.
  return [...sizes].sort();
}

function stripNoise(title) {
  let s = ` ${title} `;
  // Drop bracketed asides — on this feed they're almost always promo terms
  // ("(Was $3)", "($0 C&C)", "(New Customers Only)").
  s = s.replace(/\([^)]*\)/g, " ").replace(/\[[^\]]*\]/g, " ");
  for (const re of NOISE) s = s.replace(re, " ");
  return s;
}

// Returns a stable string key that history is grouped by, or null when the
// title carries too little signal to identify a product.
function productKey(rawTitle, store) {
  const withoutStore = rawTitle.replace(/\s*@\s*[^@]+$/, "");
  const sizes = extractSizes(withoutStore);

  const tokens = stripNoise(withoutStore)
    .toLowerCase()
    // Keep letters/digits; apostrophes collapse so "whittaker's" == "whittakers".
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((t) => t && t.length > 1 && !STOPWORDS.has(t))
    // Drop bare numbers — sizes are captured separately and loose digits are
    // usually promo residue.
    .filter((t) => !/^\d+$/.test(t));

  // Sorted + de-duped so word order doesn't change identity.
  const unique = [...new Set(tokens)].sort();

  // Too little signal to identify anything — refuse rather than guess.
  if (unique.length < 2) return null;

  const storeKey = (store || "unknown")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 24);

  return [storeKey, unique.join("-"), sizes.join("+")].filter(Boolean).join("|");
}

// Full identity for one posting: the exact key plus the raw material needed
// for fuzzy matching when the exact key misses.
function productIdentity(rawTitle, store) {
  const key = productKey(rawTitle, store);
  if (!key) return null;
  const [storeKey, tokenPart, sizePart] = key.split("|");
  return {
    key,
    store: storeKey,
    tokens: tokenPart ? tokenPart.split("-") : [],
    sizes: sizePart ? sizePart.split("+") : [],
  };
}

function jaccard(a, b) {
  const A = new Set(a);
  const B = new Set(b);
  if (!A.size || !B.size) return 0;
  let shared = 0;
  for (const t of A) if (B.has(t)) shared++;
  return shared / (A.size + B.size - shared);
}

// Exact keys miss real matches all the time — one posting says "Cadbury Dairy
// Milk Chocolate Block", the next says "Cadbury Dairy Milk Block". So we fall
// back to token overlap, but only within the same store and same size, and at
// a threshold tuned so near-misses that are genuinely different products stay
// apart ("milk chocolate" vs "dark chocolate" overlap ~0.67 and must NOT
// merge). 0.72 sits in the gap between those two cases.
const SIMILARITY_THRESHOLD = 0.72;

function sameProduct(a, b) {
  if (!a || !b) return false;
  if (a.key === b.key) return true;
  if (a.store !== b.store) return false;
  // Different declared sizes are different products, full stop.
  if (a.sizes.join("+") !== b.sizes.join("+")) return false;
  return jaccard(a.tokens, b.tokens) >= SIMILARITY_THRESHOLD;
}

// Finds the existing identity in `candidates` that refers to the same product,
// or null. Picks the strongest match rather than the first.
function findMatch(identity, candidates) {
  let best = null;
  let bestScore = 0;
  for (const c of candidates) {
    if (!sameProduct(identity, c)) continue;
    const score = c.key === identity.key ? 1 : jaccard(identity.tokens, c.tokens);
    if (score > bestScore) {
      best = c;
      bestScore = score;
    }
  }
  return best;
}

module.exports = {
  productKey,
  productIdentity,
  sameProduct,
  findMatch,
  jaccard,
  extractSizes,
  stripNoise,
  SIMILARITY_THRESHOLD,
  SIZE_RE,
};
