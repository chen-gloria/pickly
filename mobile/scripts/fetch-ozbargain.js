// Writes a snapshot of the current deals feed, plus Alpha Fresh's full
// searchable catalogue, into the app bundle.
//
// The app prefers the live Netlify function (netlify/functions/deals.js), but
// that can be cold, rate-limited, or unreachable — this committed snapshot
// guarantees the feed is never empty on first paint. Refresh it with:
//   node scripts/fetch-ozbargain.js
const fs = require("fs");
const path = require("path");
const { fetchAllDeals } = require("./lib/ozbargain");
const { fetchAllProducts, toDeals, toSearchableProducts } = require("../netlify/functions/lib/alphafresh");
const { fetchSaleFinderDeals, OFFLINE_MAX_PAGES } = require("../netlify/functions/lib/salefinder");

const DEALS_OUT = path.join(__dirname, "..", "src", "api", "dealsSnapshot.json");
const CATALOGUE_OUT = path.join(__dirname, "..", "src", "api", "alphaFreshCatalog.json");

(async () => {
  const [ozbargainDeals, alphaFreshProducts, colesDeals, woolworthsDeals] = await Promise.all([
    fetchAllDeals(),
    fetchAllProducts(),
    fetchSaleFinderDeals("Coles", fetch, OFFLINE_MAX_PAGES),
    fetchSaleFinderDeals("Woolworths", fetch, OFFLINE_MAX_PAGES),
  ]);
  // One raw fetch, two derived shapes — toDeals() for the on-sale-only
  // deals feed, toSearchableProducts() for netlify/functions/
  // search-products.js's full-catalogue local search (see that file and
  // alphafresh.js's toSearchableProducts comment for why the deals feed
  // alone isn't enough for search: a regular-priced or differently-worded
  // Alpha Fresh product was previously invisible everywhere).
  const alphaFreshDeals = toDeals(alphaFreshProducts).filter((d) => d.status !== "out of stock");

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
  fs.writeFileSync(DEALS_OUT, JSON.stringify(payload, null, 2) + "\n");
  console.log(`Wrote ${payload.deals.length} deals to ${path.relative(process.cwd(), DEALS_OUT)}`);
  console.log(`  OzBargain ${ozbargainDeals.length} · Alpha Fresh ${alphaFreshDeals.length} · Coles ${colesDeals.length} · Woolworths ${woolworthsDeals.length}`);
  console.log("Top 5 by heat:");
  for (const d of payload.deals.slice(0, 5)) {
    console.log(`  ${String(d.heat).padStart(7)}  ▲${String(d.votes).padStart(4)}  ${d.kind.padEnd(9)} ${d.store || "?"} — ${d.title.slice(0, 60)}`);
  }

  const searchableProducts = toSearchableProducts(alphaFreshProducts);
  fs.writeFileSync(
    CATALOGUE_OUT,
    JSON.stringify({ capturedAt: new Date().toISOString(), products: searchableProducts }, null, 2) + "\n"
  );
  console.log(
    `Wrote ${searchableProducts.length} searchable Alpha Fresh products to ${path.relative(process.cwd(), CATALOGUE_OUT)}`
  );
})();
