// Password hashing + session tokens.
//
// Deliberately plain JWT + bcrypt, not a hosted auth SDK — the app is
// Expo (web today, native iOS/Android later), and every hosted option
// evaluated (Neon Auth included) ships a web-only SDK. A JWT is just an
// HTTP header, which works identically from a browser fetch() or a
// React Native fetch() — the same login/signup functions serve both without
// a rewrite when the app goes native.
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const SALT_ROUNDS = 10;
const TOKEN_TTL = "30d"; // long-lived — this is a mobile app, not a bank

function requireSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return secret;
}

async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function signToken(userId) {
  return jwt.sign({ sub: userId }, requireSecret(), { expiresIn: TOKEN_TTL });
}

// Returns the user id from a request's Authorization: Bearer <token> header,
// or null if missing/invalid — callers decide whether that's an error.
function userIdFromRequest(event) {
  const header = event.headers?.authorization || event.headers?.Authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, requireSecret());
    return payload.sub;
  } catch (_) {
    return null;
  }
}

module.exports = { hashPassword, verifyPassword, signToken, userIdFromRequest };
