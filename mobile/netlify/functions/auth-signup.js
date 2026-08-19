// POST /.netlify/functions/auth-signup  { email, password, name? }
// -> { token, user: { id, email, name } }
const { getPool } = require("./lib/db");
const { hashPassword, signToken } = require("./lib/auth");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const name = (body.name || "").trim() || null;

  if (!EMAIL_RE.test(email)) {
    return { statusCode: 400, body: JSON.stringify({ error: "Enter a valid email" }) };
  }
  // Not a strength meter — just enough to stop "a" and typos.
  if (password.length < 8) {
    return { statusCode: 400, body: JSON.stringify({ error: "Password must be at least 8 characters" }) };
  }

  const pool = getPool();
  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
  if (existing.rows.length) {
    return { statusCode: 409, body: JSON.stringify({ error: "An account with this email already exists" }) };
  }

  const passwordHash = await hashPassword(password);
  const result = await pool.query(
    "INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name",
    [email, passwordHash, name]
  );
  const user = result.rows[0];

  return {
    statusCode: 201,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: signToken(user.id), user }),
  };
};
