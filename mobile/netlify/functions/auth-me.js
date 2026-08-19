// GET /.netlify/functions/auth-me  (Authorization: Bearer <token>)
// -> { user: { id, email, name } } or 401
const { getPool } = require("./lib/db");
const { userIdFromRequest } = require("./lib/auth");

exports.handler = async (event) => {
  const userId = userIdFromRequest(event);
  if (!userId) {
    return { statusCode: 401, body: JSON.stringify({ error: "Not signed in" }) };
  }

  const pool = getPool();
  const result = await pool.query("SELECT id, email, name FROM users WHERE id = $1", [userId]);
  if (!result.rows.length) {
    return { statusCode: 401, body: JSON.stringify({ error: "Account no longer exists" }) };
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user: result.rows[0] }),
  };
};
