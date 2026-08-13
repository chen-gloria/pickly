// Turns price history into the thing users actually want: a call.
//
// This is the product. OzBargain tells you a discount exists; this says
// whether it's worth acting on. Crucially it can say DON'T — an app that
// tells you to skip something is an app you trust the next time it says buy.
//
// Honesty rule: never sound confident on thin data. With one week of history
// you cannot know if $1.50 is a good price, so we return TRACKING and say so
// rather than inventing a "lowest ever!" badge. Fake authority is the fastest
// way to lose the only thing this app is selling — judgement.

const MIN_OBSERVATIONS = 3; // fewer than this and we genuinely don't know
const MIN_DAYS_SPAN = 21; // and we want it spread over time, not 3 posts in a day
const NEAR_LOW_TOLERANCE = 0.03; // within 3% of the best we've seen counts as "at the low"

const VERDICT = {
  BUY: "BUY",
  WAIT: "WAIT",
  SKIP: "SKIP",
  TRACKING: "TRACKING",
};

function daysBetween(a, b) {
  return Math.abs(new Date(a) - new Date(b)) / 86400000;
}

function median(nums) {
  const s = [...nums].sort((x, y) => x - y);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function monthName(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-AU", { month: "short" });
}

// The retailer's own headline claim, reported as theirs — never as our
// verdict. "Claimed" is doing deliberate work in this string.
function claimedDiscount(deal) {
  if (!deal) return null;
  const title = deal.rawTitle || deal.title || "";
  if (/½\s*price|half\s*price/i.test(title)) return "Claimed ½ price";
  const pct = title.match(/(\d{1,2})\s*%\s*off/i);
  if (pct) return `Claimed ${pct[1]}% off`;
  return null;
}

// Some deals are provably good without any price history at all, and burying
// those in "still tracking" would be a failure of the product. 10% off a
// Coles gift card is 10% off everything you were going to buy at Coles
// anyway — that's arithmetic, not a guess. Free is free.
//
// The line drawn here matters. We only promote deals whose value is
// objectively true regardless of what the item normally costs. A retailer's
// own "½ Price (Was $3)" is NOT in that group: it rests on their claimed
// reference price, which is exactly the thing this app exists to check. Those
// stay unjudged and are merely labelled as claimed.
function structuralVerdict(deal) {
  if (!deal) return null;
  const title = deal.rawTitle || deal.title || "";
  const pct = title.match(/(\d{1,2}(?:\.\d)?)\s*%\s*off/i);

  // Discounted stored value: saving applies to spending you'd do regardless.
  if (/gift\s*card|e-?gift|digital\s*card/i.test(title) && pct) {
    const store = (title.match(/\b(coles|woolworths|woolies|aldi|bunnings|bws|dan\s*murphy'?s)\b/i) || [])[1];
    return {
      verdict: VERDICT.BUY,
      headline: "Straight discount",
      detail: store
        ? `${pct[1]}% off everything at ${store.replace(/woolies/i, "Woolworths")}`
        : `${pct[1]}% off store credit`,
      confident: true,
      basis: "structural",
    };
  }

  // Genuinely free items — not "free delivery", which the parser's kind
  // detection already excludes.
  if (deal.kind === "FREE") {
    return {
      verdict: VERDICT.BUY,
      headline: "Free",
      detail: "Free — nothing to compare",
      confident: true,
      basis: "structural",
    };
  }

  return null;
}

/**
 * @param {{observations: {date: string, price: number}[]}} product
 * @param {number} currentPrice
 * @param {object} [deal] the live deal, for history-free structural checks
 * @returns {{verdict: string, headline: string, detail: string, confident: boolean, basis: string}}
 */
function judge(product, currentPrice, deal) {
  // Structural first: these are certain, so history can't improve on them.
  const structural = structuralVerdict(deal);
  if (structural) return structural;

  const obs = (product?.observations || [])
    .filter((o) => typeof o.price === "number")
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const span = obs.length >= 2 ? daysBetween(obs[0].date, obs[obs.length - 1].date) : 0;

  // Not enough to have an opinion — say exactly that.
  if (obs.length < MIN_OBSERVATIONS || span < MIN_DAYS_SPAN) {
    return {
      verdict: VERDICT.TRACKING,
      headline: "Tracking",
      detail:
        claimedDiscount(deal) ||
        (obs.length <= 1 ? "First sighting" : `Only ${obs.length} sightings so far`),
      confident: false,
      basis: "none",
    };
  }

  const prices = obs.map((o) => o.price);
  const low = Math.min(...prices);
  const mid = median(prices);
  const lowest = obs.find((o) => o.price === low);

  // At or below the best price we've ever recorded.
  if (currentPrice <= low * (1 + NEAR_LOW_TOLERANCE)) {
    return {
      verdict: VERDICT.BUY,
      headline: "Good price",
      detail:
        currentPrice < low
          ? `New low since ${monthName(obs[0].date)}`
          : `At its low since ${monthName(lowest.date)}`,
      confident: true,
      basis: "history",
    };
  }

  // Meaningfully worse than a price we know it reaches.
  if (currentPrice > mid) {
    const saving = (currentPrice - low).toFixed(2);
    return {
      verdict: VERDICT.SKIP,
      headline: "Not its best",
      detail: `Was $${low.toFixed(2)} — $${saving} cheaper`,
      confident: true,
      basis: "history",
    };
  }

  return {
    verdict: VERDICT.WAIT,
    headline: "Close, not lowest",
    detail: `Best seen $${low.toFixed(2)} in ${monthName(lowest.date)}`,
    confident: true,
    basis: "history",
  };
}

module.exports = { judge, structuralVerdict, claimedDiscount, VERDICT, MIN_OBSERVATIONS, MIN_DAYS_SPAN };
