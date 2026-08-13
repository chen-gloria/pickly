// Writes a snapshot of the current OzBargain deals into the app bundle.
//
// The app prefers the live Netlify function (netlify/functions/deals.js), but
// that can be cold, rate-limited, or unreachable — this committed snapshot
// guarantees the feed is never empty on first paint. Refresh it with:
//   node scripts/fetch-ozbargain.js
const fs = require("fs");
const path = require("path");
const { fetchAllDeals } = require("./lib/ozbargain");

const OUT = path.join(__dirname, "..", "src", "api", "dealsSnapshot.json");

(async () => {
  const deals = await fetchAllDeals();
  if (!deals.length) {
    console.error("No deals parsed — leaving the existing snapshot untouched.");
    process.exit(1);
  }
  const payload = { capturedAt: new Date().toISOString(), deals: deals.slice(0, 40) };
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2) + "\n");
  console.log(`Wrote ${payload.deals.length} deals to ${path.relative(process.cwd(), OUT)}`);
  console.log("Top 5 by heat:");
  for (const d of payload.deals.slice(0, 5)) {
    console.log(`  ${String(d.heat).padStart(7)}  ▲${String(d.votes).padStart(4)}  ${d.kind.padEnd(9)} ${d.store || "?"} — ${d.title.slice(0, 60)}`);
  }
})();
