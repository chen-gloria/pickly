// Appends today's observed deal prices to the price history.
//
// THIS IS THE MOAT. Everything else in the app is replicable in a weekend;
// a year of price history is not, because you cannot buy back time. Run it
// daily (see .github/workflows/price-history.yml) from the very first day,
// even before the product is finished — every skipped day is a permanent
// hole in the record.
//
// The history is append-only. We never overwrite an observation, because the
// whole value is being able to say "cheapest since March".
const fs = require("fs");
const path = require("path");
const { fetchAllDeals } = require("./lib/ozbargain");
const { productIdentity, findMatch } = require("./lib/productKey");

const HISTORY_PATH = path.join(__dirname, "..", "data", "price-history.json");

function load() {
  try {
    return JSON.parse(fs.readFileSync(HISTORY_PATH, "utf8"));
  } catch (_) {
    return { startedAt: new Date().toISOString(), updatedAt: null, products: {} };
  }
}

function save(history) {
  fs.mkdirSync(path.dirname(HISTORY_PATH), { recursive: true });
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2) + "\n");
}

(async () => {
  const deals = await fetchAllDeals();
  const priced = deals.filter((d) => d.price != null && d.store);
  if (!priced.length) {
    console.error("No priced deals in the feed — not touching history.");
    process.exit(1);
  }

  const history = load();
  const today = new Date().toISOString().slice(0, 10);
  const existing = Object.values(history.products);

  let added = 0;
  let merged = 0;
  let skipped = 0;

  for (const deal of priced) {
    const identity = productIdentity(deal.rawTitle, deal.store);
    if (!identity) {
      skipped++;
      continue;
    }

    // Match against what we already track — exact key first, then fuzzy, so
    // a reworded posting of the same product extends its history instead of
    // starting a new one.
    const match = findMatch(identity, existing);
    let entry;
    if (match) {
      entry = history.products[match.key];
      if (match.key !== identity.key) merged++;
    } else {
      entry = {
        key: identity.key,
        store: identity.store,
        storeLabel: deal.store,
        tokens: identity.tokens,
        sizes: identity.sizes,
        title: deal.title,
        observations: [],
      };
      history.products[identity.key] = entry;
      existing.push(identity);
    }

    // One observation per product per day — the feed repeats the same deal
    // across runs and we don't want a flat line of duplicates.
    if (entry.observations.some((o) => o.date === today)) continue;

    entry.observations.push({
      date: today,
      price: deal.price,
      votes: deal.votes,
      kind: deal.kind,
      url: deal.url,
    });
    added++;
  }

  history.updatedAt = new Date().toISOString();
  save(history);

  const totalObs = Object.values(history.products).reduce(
    (n, p) => n + p.observations.length,
    0
  );
  console.log(
    `+${added} observations (${merged} matched an existing product by similarity, ${skipped} unidentifiable)`
  );
  console.log(
    `history: ${Object.keys(history.products).length} products, ${totalObs} observations, since ${history.startedAt.slice(0, 10)}`
  );
})();
