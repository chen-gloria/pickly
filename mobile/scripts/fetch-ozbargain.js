// Writes a snapshot of the current deals feed into the app bundle.
//
// The app prefers the live Netlify function (netlify/functions/deals.js), but
// that can be cold, rate-limited, or unreachable — this committed snapshot
// guarantees the feed is never empty on first paint. Refresh it with:
//   node scripts/fetch-ozbargain.js
const fs = require("fs");
const path = require("path");
const { fetchAllDeals } = require("./lib/ozbargain");
const { fetchAlphaFreshDeals } = require("../netlify/functions/lib/alphafresh");
const { fetchSaleFinderDeals, OFFLINE_MAX_PAGES } = require("../netlify/functions/lib/salefinder");

const OUT = path.join(__dirname, "..", "src", "api", "dealsSnapshot.json");

(async () => {
  const [ozbargainDeals, alphaFreshDeals, colesDeals, woolworthsDeals] = await Promise.all([
    fetchAllDeals(),
    fetchAlphaFreshDeals(),
    fetchSaleFinderDeals("Coles", fetch, OFFLINE_MAX_PAGES),
    fetchSaleFinderDeals("Woolworths", fetch, OFFLINE_MAX_PAGES),
  ]);
  if (!ozbargainDeals.length && !alphaFreshDeals.length && !colesDeals.length && !woolworthsDeals.length) {
    console.error("No deals parsed — leaving the existing snapshot untouched.");
    process.exit(1);
  }
  // Same independent-cap logic as netlify/functions/deals.js, so the
  // bundled first-paint snapshot has the same "narrow the filter to one
  // source and it isn't an empty screen" property the live endpoint does —
  // a merged sort by OzBargain's heat score would otherwise bury every
  // zero-engagement Alpha Fresh/Coles/Woolworths deal under any OzBargain
  // post with even a single vote.
  const deals = [
    ...ozbargainDeals.slice(0, 60),
    ...[...alphaFreshDeals]
      .sort((a, b) => parseInt(b.kind, 10) - parseInt(a.kind, 10))
      .slice(0, 30),
    ...colesDeals.slice(0, 40),
    ...woolworthsDeals.slice(0, 40),
  ];
  const payload = { capturedAt: new Date().toISOString(), deals };
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2) + "\n");
  console.log(`Wrote ${payload.deals.length} deals to ${path.relative(process.cwd(), OUT)}`);
  console.log(`  OzBargain ${ozbargainDeals.length} · Alpha Fresh ${alphaFreshDeals.length} · Coles ${colesDeals.length} · Woolworths ${woolworthsDeals.length}`);
  console.log("Top 5 by heat:");
  for (const d of payload.deals.slice(0, 5)) {
    console.log(`  ${String(d.heat).padStart(7)}  ▲${String(d.votes).padStart(4)}  ${d.kind.padEnd(9)} ${d.store || "?"} — ${d.title.slice(0, 60)}`);
  }
})();
