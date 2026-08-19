// /.netlify/functions/watchlist — CRUD for the signed-in user's watchlist,
// backed by the watchlist_items table (see db/schema.ts) instead of
// AsyncStorage. Auth required on every method: this is per-user data.
//
//   GET    /watchlist                body: none          -> { items }
//   POST   /watchlist                body: item fields   -> { items }
//   DELETE /watchlist?itemKey=<key>                       -> { items }
const { getPool } = require("./lib/db");
const { userIdFromRequest } = require("./lib/auth");

function unauthorized() {
  return { statusCode: 401, body: JSON.stringify({ error: "Not signed in" }) };
}

async function listItems(pool, userId) {
  const result = await pool.query(
    `SELECT id, item_key AS id_key, title, store, image, url, price_when_saved, created_at
     FROM watchlist_items WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  // Field names match utils/watchlist.js's existing shape (id/title/store/
  // image/url/priceWhenSaved/savedAt) so the client-side findDrops() etc.
  // keep working unchanged regardless of which storage backs them.
  return result.rows.map((r) => ({
    id: r.id_key,
    title: r.title,
    store: r.store,
    image: r.image,
    url: r.url,
    priceWhenSaved: r.price_when_saved,
    savedAt: r.created_at,
  }));
}

exports.handler = async (event) => {
  const userId = userIdFromRequest(event);
  if (!userId) return unauthorized();

  const pool = getPool();

  if (event.httpMethod === "GET") {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: await listItems(pool, userId) }),
    };
  }

  if (event.httpMethod === "POST") {
    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch (_) {
      return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
    }
    const { id: itemKey, title, store, image, url, priceWhenSaved } = body;
    if (!itemKey || !title) {
      return { statusCode: 400, body: JSON.stringify({ error: "id and title are required" }) };
    }

    await pool.query(
      `INSERT INTO watchlist_items (user_id, item_key, title, store, image, url, price_when_saved)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id, item_key) DO NOTHING`,
      [userId, itemKey, title, store ?? null, image ?? null, url ?? null, priceWhenSaved ?? null]
    );

    return {
      statusCode: 201,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: await listItems(pool, userId) }),
    };
  }

  if (event.httpMethod === "DELETE") {
    const itemKey = event.queryStringParameters?.itemKey;
    if (!itemKey) {
      return { statusCode: 400, body: JSON.stringify({ error: "itemKey query param is required" }) };
    }
    await pool.query("DELETE FROM watchlist_items WHERE user_id = $1 AND item_key = $2", [
      userId,
      itemKey,
    ]);
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: await listItems(pool, userId) }),
    };
  }

  return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
};
