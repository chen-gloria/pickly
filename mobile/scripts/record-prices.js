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

// The database is now the real source of truth (see db/schema.ts and the
// migration that moved the original JSON-file history into it). The JSON
// file keeps being written alongside it purely as the build-time bundled
// snapshot (src/api/deals.js's offline fallback) — cheap to keep, and it
// means this script still works with zero DB access for local testing.
// NETLIFY_DB_URL is only set in CI (see .github/workflows/price-history.yml)
// and in Netlify's own environment, so a plain local run just skips this.
async function writeToDatabase(entries) {
  if (!process.env.NETLIFY_DB_URL) {
    console.log("NETLIFY_DB_URL not set — skipping database write (JSON-only run).");
    return;
  }
  const { Pool } = require("pg");
  const pool = new Pool({ connectionString: process.env.NETLIFY_DB_URL });
  let written = 0;
  try {
    for (const e of entries) {
      await pool.query(
        `INSERT INTO tracked_products (product_key, title, store, store_label)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (product_key) DO UPDATE SET title = EXCLUDED.title, updated_at = now()`,
        [e.key, e.title, e.store, e.storeLabel]
      );
      const res = await pool.query(
        `INSERT INTO price_observations (product_key, date, price, votes, kind, url)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (product_key, date) DO NOTHING
         RETURNING id`,
        [e.key, e.date, e.price, e.votes ?? 0, e.kind ?? null, e.url ?? null]
      );
      if (res.rows.length) written++;
    }
  } finally {
    await pool.end();
  }
  console.log(`Database: +${written} observations written.`);
}

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
  const dbEntries = [];

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
    // Reuses the exact identity.key already decided above (same matching
    // pass), so the database's idea of "same product" never diverges from
    // the JSON file's.
    dbEntries.push({
      key: entry.key,
      title: entry.title,
      store: entry.store,
      storeLabel: entry.storeLabel,
      date: today,
      price: deal.price,
      votes: deal.votes,
      kind: deal.kind,
      url: deal.url,
    });
  }

  history.updatedAt = new Date().toISOString();
  save(history);
  await writeToDatabase(dbEntries);

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
