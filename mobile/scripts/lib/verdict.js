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
  return new Date(dateStr).toLocaleDateString("en-AU", { month: "long" });
}

/**
 * @param {{observations: {date: string, price: number}[]}} product
 * @param {number} currentPrice
 * @returns {{verdict: string, headline: string, detail: string, confident: boolean}}
 */
function judge(product, currentPrice) {
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
        obs.length <= 1
          ? "First time we've seen this price"
          : `Only ${obs.length} sightings so far — not enough to call it`,
      confident: false,
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
          ? `Lowest we've seen since ${monthName(obs[0].date)}`
          : `Matches its lowest since ${monthName(lowest.date)}`,
      confident: true,
    };
  }

  // Meaningfully worse than a price we know it reaches.
  if (currentPrice > mid) {
    const saving = (currentPrice - low).toFixed(2);
    return {
      verdict: VERDICT.SKIP,
      headline: "Not its best",
      detail: `It's been $${low.toFixed(2)} before — $${saving} cheaper`,
      confident: true,
    };
  }

  return {
    verdict: VERDICT.WAIT,
    headline: "Close, not lowest",
    detail: `Best recorded is $${low.toFixed(2)} (${monthName(lowest.date)})`,
    confident: true,
  };
}

module.exports = { judge, VERDICT, MIN_OBSERVATIONS, MIN_DAYS_SPAN };
