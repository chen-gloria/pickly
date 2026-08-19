// Shared DB connection for auth/watchlist functions.
//
// Uses plain `pg` directly (not @netlify/database's getDatabase(), which
// requires an active Netlify DB provisioning that isn't available on this
// account — see the commit that added this). Same NETLIFY_DB_URL env var
// either way, so nothing else about the setup changes if that ever gets
// resolved.
const { Pool } = require("pg");

let pool;
function getPool() {
  if (!pool) {
    const connectionString = process.env.NETLIFY_DB_URL;
    if (!connectionString) throw new Error("NETLIFY_DB_URL is not set");
    pool = new Pool({ connectionString });
  }
  return pool;
}

module.exports = { getPool };
