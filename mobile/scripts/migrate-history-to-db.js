// One-off: imports mobile/data/price-history.json into the real database
// (tracked_products + price_observations). Run once, then the daily recorder
// (record-prices.js, once updated) writes straight to the DB and this file
// stops being the source of truth — but it stays in the repo/history as the
// record of how the original data got in.
//
// Deliberately idempotent (ON CONFLICT DO NOTHING on the unique
// (product_key, date) pair) so it's safe to re-run if it's interrupted
// partway through.
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const HISTORY_PATH = path.join(__dirname, "..", "data", "price-history.json");

// Plain `pg`, not @netlify/database's getDatabase() — that package triggers
// Netlify's own DB auto-provisioning on every deploy just by being
// installed, which 403s on this account (see the commit that removed it).
// Same NETLIFY_DB_URL either way.
function sqlTag(pool) {
  return async (strings, ...values) => {
    // Turns a `sql`...${x}...`` tagged template into a standard $1/$2/...
    // parameterized query.
    let query = strings[0];
    for (let i = 0; i < values.length; i++) query += `$${i + 1}` + strings[i + 1];
    return (await pool.query(query, values)).rows;
  };
}

(async () => {
  const history = JSON.parse(fs.readFileSync(HISTORY_PATH, "utf8"));
  const pool = new Pool({ connectionString: process.env.NETLIFY_DB_URL });
  const sql = sqlTag(pool);

  let products = 0;
  let observations = 0;
  let skipped = 0;

  for (const [key, product] of Object.entries(history.products)) {
    await sql`
      INSERT INTO tracked_products (product_key, title, store, store_label)
      VALUES (${key}, ${product.title}, ${product.store ?? null}, ${product.storeLabel ?? null})
      ON CONFLICT (product_key) DO UPDATE SET title = EXCLUDED.title
    `;
    products++;

    for (const obs of product.observations) {
      const result = await sql`
        INSERT INTO price_observations (product_key, date, price, votes, kind, url)
        VALUES (${key}, ${obs.date}, ${obs.price}, ${obs.votes ?? 0}, ${obs.kind ?? null}, ${obs.url ?? null})
        ON CONFLICT (product_key, date) DO NOTHING
        RETURNING id
      `;
      if (result.length) observations++;
      else skipped++;
    }
  }

  console.log(`Imported ${products} tracked products, ${observations} observations (${skipped} already present).`);

  const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM price_observations`;
  console.log(`price_observations now has ${count} total rows.`);
  await pool.end();
})().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
