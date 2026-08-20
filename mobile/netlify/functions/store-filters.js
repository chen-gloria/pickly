// /.netlify/functions/store-filters — GET/PUT for the signed-in user's three
// store filter lists (recommendation feed + search + leaderboard), backed by
// the store_filters table (see db/schema.ts). Auth required: per-user data.
//
//   GET /store-filters   body: none                                                              -> { recommendationStores, searchStores, leaderboardStores }
//   PUT /store-filters   body: { recommendationStores?, searchStores?, leaderboardStores? }       -> { recommendationStores, searchStores, leaderboardStores }
//
// One row per user, upserted in place — there's no history to keep here,
// just "what are they set to right now" (unlike watchlist_items, which is a
// list of rows). Any field can be omitted from the PUT body to leave it
// unchanged, since the client updates one group at a time.
const { getPool } = require("./lib/db");
const { userIdFromRequest } = require("./lib/auth");
const { STORES } = require("../../src/utils/storeFilter");

function unauthorized() {
  return { statusCode: 401, body: JSON.stringify({ error: "Not signed in" }) };
}

function sanitizeList(list) {
  if (!Array.isArray(list)) return null;
  const cleaned = list.filter((s) => STORES.includes(s));
  return [...new Set(cleaned)];
}

async function getFilters(pool, userId) {
  const result = await pool.query(
    `SELECT recommendation_stores, search_stores, leaderboard_stores FROM store_filters WHERE user_id = $1`,
    [userId]
  );
  if (!result.rows.length) return { recommendationStores: [], searchStores: [], leaderboardStores: [] };
  const row = result.rows[0];
  return {
    recommendationStores: row.recommendation_stores || [],
    searchStores: row.search_stores || [],
    leaderboardStores: row.leaderboard_stores || [],
  };
}

exports.handler = async (event) => {
  const userId = userIdFromRequest(event);
  if (!userId) return unauthorized();

  const pool = getPool();

  if (event.httpMethod === "GET") {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(await getFilters(pool, userId)),
    };
  }

  if (event.httpMethod === "PUT") {
    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch (_) {
      return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
    }

    const recommendationStores = sanitizeList(body.recommendationStores);
    const searchStores = sanitizeList(body.searchStores);
    const leaderboardStores = sanitizeList(body.leaderboardStores);
    if (recommendationStores === null && searchStores === null && leaderboardStores === null) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "recommendationStores, searchStores or leaderboardStores (arrays) required",
        }),
      };
    }

    // Upsert, only touching the fields actually provided — COALESCE against
    // the existing row (defaulting to '{}' for a brand-new row) so a PUT
    // that only sends one group doesn't clobber the others back to empty.
    await pool.query(
      `INSERT INTO store_filters (user_id, recommendation_stores, search_stores, leaderboard_stores, updated_at)
       VALUES ($1, COALESCE($2::text[], '{}'::text[]), COALESCE($3::text[], '{}'::text[]), COALESCE($4::text[], '{}'::text[]), now())
       ON CONFLICT (user_id) DO UPDATE SET
         recommendation_stores = COALESCE($2::text[], store_filters.recommendation_stores),
         search_stores = COALESCE($3::text[], store_filters.search_stores),
         leaderboard_stores = COALESCE($4::text[], store_filters.leaderboard_stores),
         updated_at = now()`,
      [userId, recommendationStores, searchStores, leaderboardStores]
    );

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(await getFilters(pool, userId)),
    };
  }

  return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
};
