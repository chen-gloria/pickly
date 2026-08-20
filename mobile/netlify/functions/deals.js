// Live deals endpoint — combines OzBargain (the community feed) and Alpha
// Fresh (an independent grocer's own public specials, see lib/alphafresh.js)
// into one list. Both get proxied server-side for the same reason: the
// browser can't fetch ozbargain.com.au directly (no CORS headers on their
// feeds), and this keeps the "which sources exist" logic in one place
// instead of duplicated client-side.
//
// Coles + Woolworths (their weekly specials catalogues, via
// SaleFinder.com.au — see lib/salefinder.js) are deliberately NOT fetched
// live here, even though lib/salefinder.js exists for exactly this data.
// Measured in production: SaleFinder itself is slow (~25s per page fetch,
// apparently rate-limiting repeat callers) — enough to blow this function's
// 30s hard timeout on its own (confirmed: a live deploy that tried it
// returned `Sandbox.Timedout` to every user). scripts/fetch-ozbargain.js's
// scheduled GitHub Action fetches them once a day instead (not time-boxed
// the same way, and — not incidentally — hits SaleFinder once a day total
// across every Pickly user instead of once per pageview, which matters
// given that scrape is already happening against their explicit ToS) and
// writes the result into src/api/dealsSnapshot.json. Read back in here
// (bundled with this function at build time — no network call, so it costs
// nothing toward the timeout) so Coles/Woolworths deals still show up on
// every live request instead of only in the client's own offline fallback.
const { fetchAllDeals } = require("../../scripts/lib/ozbargain");
const { fetchAlphaFreshDeals } = require("./lib/alphafresh");
const { productIdentity, findMatch } = require("../../scripts/lib/productKey");
const dealsSnapshot = require("../../src/api/dealsSnapshot.json");

// The same real Coles/Woolworths special often shows up from both sources —
// someone posts it to OzBargain the same week SaleFinder's catalogue lists
// it — which without this would just double the card, with two different
// vote counts, looking like a bug rather than two views of the same deal.
// Reuses the exact fuzzy-matching this app already trusts for price history
// (scripts/lib/productKey.js) rather than a second, looser one-off check.
function dropDuplicatesOfOzbargain(candidateDeals, ozbargainDeals) {
  const ozbargainIdentities = ozbargainDeals
    .map((d) => productIdentity(d.rawTitle || d.title, d.store))
    .filter(Boolean);
  return candidateDeals.filter((d) => {
    const identity = productIdentity(d.rawTitle || d.title, d.store);
    // No identity extractable (e.g. no size token) — nothing to dedupe
    // against, keep it rather than risk dropping a real, distinct deal.
    if (!identity) return true;
    return !findMatch(identity, ozbargainIdentities);
  });
}

exports.handler = async () => {
  try {
    const [ozbargainDeals, alphaFreshDeals] = await Promise.all([
      fetchAllDeals(),
      fetchAlphaFreshDeals(),
    ]);

    const snapshotColesWoolworths = dropDuplicatesOfOzbargain(
      (dealsSnapshot.deals || []).filter((d) => d.store === "Coles" || d.store === "Woolworths"),
      ozbargainDeals
    );

    if (!ozbargainDeals.length && !alphaFreshDeals.length && !snapshotColesWoolworths.length) {
      // Let the client fall back to its bundled snapshot rather than
      // rendering an empty feed.
      return { statusCode: 502, body: JSON.stringify({ error: "no deals parsed" }) };
    }

    // None of the non-OzBargain sources carry any community signal (no
    // votes/comments) — sorting the combined list purely by OzBargain's
    // heat score would bury every one of them under any OzBargain post with
    // even a single vote. So each source is capped independently before
    // combining (OzBargain by its own heat ranking, everything else by
    // discount depth) — this is what actually guarantees a "show me only
    // Coles" filter has something to show rather than an empty screen.
    const deals = [
      ...ozbargainDeals.slice(0, 50),
      ...[...alphaFreshDeals]
        .sort((a, b) => parseInt(b.kind, 10) - parseInt(a.kind, 10))
        .slice(0, 30),
      ...snapshotColesWoolworths,
    ];

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300, stale-while-revalidate=1800",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ capturedAt: new Date().toISOString(), deals }),
    };
  } catch (err) {
    return { statusCode: 502, body: JSON.stringify({ error: String(err) }) };
  }
};
