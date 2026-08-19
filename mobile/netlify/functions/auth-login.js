// POST /.netlify/functions/auth-login  { email, password }
// -> { token, user: { id, email, name } }
const { getPool } = require("./lib/db");
const { verifyPassword, signToken } = require("./lib/auth");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (_) {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";

  const pool = getPool();
  const result = await pool.query(
    "SELECT id, email, name, password_hash FROM users WHERE email = $1",
    [email]
  );
  const row = result.rows[0];

  // Same error for "no such user" and "wrong password" — telling an
  // attacker which one it was is a free account-enumeration oracle.
  const invalid = { statusCode: 401, body: JSON.stringify({ error: "Incorrect email or password" }) };
  if (!row) return invalid;

  const ok = await verifyPassword(password, row.password_hash);
  if (!ok) return invalid;

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token: signToken(row.id),
      user: { id: row.id, email: row.email, name: row.name },
    }),
  };
};
