// Tiny wrapper around fetch() so every screen calls the backend the same way.
import { API_URL, MOCK_MODE } from "../config";

const SEARCH_ENDPOINT = "/.netlify/functions/search-products";
const AUTH_SIGNUP_ENDPOINT = "/.netlify/functions/auth-signup";
const AUTH_LOGIN_ENDPOINT = "/.netlify/functions/auth-login";
const AUTH_ME_ENDPOINT = "/.netlify/functions/auth-me";

// Real accounts, not gated behind MOCK_MODE — same reasoning as search and
// the deals feed always hitting their live functions: a "mock login" that
// accepts any email/password isn't a smaller version of real auth, it's a
// different, incompatible thing, and it's what stood between "watchlist
// syncs across your devices" actually being true (see
// netlify/functions/auth-*.js and utils/watchlist.js).
async function authRequest(endpoint, body) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// Real product search — not gated behind MOCK_MODE, same reasoning as the
// deals feed (api/deals.js) always hitting the live/snapshot source: there's
// no meaningful "mock" version of this to fall back to, it's either the real
// search-products.js function (see netlify/functions/) or nothing.
//
// Returns { results, error } rather than throwing OR silently returning an
// empty array — "the search failed" and "the search genuinely found
// nothing" look identical to the user otherwise, and they're not the same
// thing: one means try again, the other means try a different term.
async function searchLive(q) {
  try {
    const res = await fetch(`${SEARCH_ENDPOINT}?q=${encodeURIComponent(q)}`);
    if (!res.ok) return { results: [], error: `search failed (${res.status})` };
    const data = await res.json();
    return { results: Array.isArray(data.results) ? data.results : [], error: data.error || null };
  } catch (_) {
    return { results: [], error: "could not reach search — check your connection" };
  }
}

async function request(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data.detail) detail = data.detail;
    } catch (_) {}
    throw new Error(detail);
  }
  // Some endpoints (DELETE) may return an empty body.
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export const api = {
  // Auth. Response shapes are adapted to what AuthContext.js already
  // expects ({access_token} from signup/login, the bare user object from
  // me) so that contract didn't need to change along with the backend.
  signup: async (email, name, password) => {
    const { token } = await authRequest(AUTH_SIGNUP_ENDPOINT, { email, name, password });
    return { access_token: token };
  },

  login: async (email, password) => {
    const { token } = await authRequest(AUTH_LOGIN_ENDPOINT, { email, password });
    return { access_token: token };
  },

  me: async (token) => {
    const res = await fetch(AUTH_ME_ENDPOINT, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data.user;
  },

  // Real search across a known retailer allow-list (see
  // netlify/functions/search-products.js) — always live, never mock data.
  searchProducts: (q = "") => searchLive(q),

  // Shopping list
  getList: (token) => MOCK_MODE ? Promise.resolve([]) : request("/list", { token }),
  addToList: (token, product_id, quantity = 1) => MOCK_MODE ? Promise.resolve({}) : request("/list", { method: "POST", token, body: { product_id, quantity } }),
  toggleItem: (token, id) => MOCK_MODE ? Promise.resolve({}) : request(`/list/${id}/toggle`, { method: "PATCH", token }),
  deleteItem: (token, id) => MOCK_MODE ? Promise.resolve({}) : request(`/list/${id}`, { method: "DELETE", token }),

  // Favorites
  getFavorites: (token) => MOCK_MODE ? Promise.resolve([]) : request("/favorites", { token }),
  addFavorite: (token, product_id) => MOCK_MODE ? Promise.resolve({}) : request("/favorites", { method: "POST", token, body: { product_id } }),
  removeFavorite: (token, product_id) => MOCK_MODE ? Promise.resolve({}) : request(`/favorites/${product_id}`, { method: "DELETE", token }),

  // Price alerts
  getAlerts: (token) => MOCK_MODE ? Promise.resolve([]) : request("/alerts", { token }),
  createAlert: (token, product_id, target_price) => MOCK_MODE ? Promise.resolve({}) : request("/alerts", { method: "POST", token, body: { product_id, target_price } }),
  deleteAlert: (token, id) => MOCK_MODE ? Promise.resolve({}) : request(`/alerts/${id}`, { method: "DELETE", token }),
};
