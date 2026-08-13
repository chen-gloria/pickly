// Joins a live deal to what we know about that product's past prices.
//
// Deliberately reuses the exact same matching + judging modules the nightly
// recorder uses (scripts/lib/*). If the app re-implemented "is this the same
// product" or "is this a good price", the two would drift and the app would
// start showing verdicts the recorded history doesn't support.
import history from "../../data/price-history.json";
import { productIdentity, findMatch } from "../../scripts/lib/productKey";
import { judge, VERDICT } from "../../scripts/lib/verdict";

export { VERDICT };

// Precomputed once — the identity of everything we have history for.
const trackedIdentities = Object.values(history.products || {}).map((p) => ({
  key: p.key,
  store: p.store,
  tokens: p.tokens || [],
  sizes: p.sizes || [],
}));

// How long the record has been running. Used to tell people honestly how
// far off real verdicts are, instead of leaving the screen looking broken.
export function trackingDays() {
  if (!history.startedAt) return 0;
  const days = (Date.now() - new Date(history.startedAt).getTime()) / 86400000;
  return Math.max(1, Math.floor(days) + 1);
}

export function historyFor(deal) {
  if (!deal?.rawTitle || !deal?.store) return null;
  const identity = productIdentity(deal.rawTitle, deal.store);
  if (!identity) return null;
  const match = findMatch(identity, trackedIdentities);
  return match ? history.products[match.key] : null;
}

// Returns the verdict plus the series used to justify it, so the card can
// show the evidence right next to the claim.
export function verdictFor(deal) {
  const product = historyFor(deal);
  const verdict = judge(product, deal.price, deal);
  const series = (product?.observations || [])
    .filter((o) => typeof o.price === "number")
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map((o) => o.price);

  return { ...verdict, series, observationCount: series.length };
}

// Groups a feed into the sections the screen is built from. The verdict IS
// the information architecture here — it decides what the user sees first,
// rather than being a badge bolted onto a popularity ranking.
export function groupByVerdict(deals) {
  const buckets = { buy: [], wait: [], tracking: [], skip: [] };

  for (const deal of deals) {
    const v = verdictFor(deal);
    const entry = { ...deal, judgement: v };
    if (v.verdict === VERDICT.BUY) buckets.buy.push(entry);
    else if (v.verdict === VERDICT.WAIT) buckets.wait.push(entry);
    else if (v.verdict === VERDICT.SKIP) buckets.skip.push(entry);
    else buckets.tracking.push(entry);
  }

  return buckets;
}
