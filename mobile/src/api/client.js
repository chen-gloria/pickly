// Tiny wrapper around fetch() so every screen calls the backend the same way.
import { API_URL, MOCK_MODE } from "../config";
import { MOCK_USER } from "./mockData";

const SEARCH_ENDPOINT = "/.netlify/functions/search-products";

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
  // Auth
  signup: (email, name, password) => MOCK_MODE
    ? Promise.resolve({ access_token: "mock-token" })
    : request("/auth/signup", { method: "POST", body: { email, name, password } }),

  login: (email, password) => MOCK_MODE
    ? Promise.resolve({ access_token: "mock-token" })
    : request("/auth/login", { method: "POST", body: { email, password } }),

  me: (token) => MOCK_MODE
    ? Promise.resolve(MOCK_USER)
    : request("/auth/me", { token }),

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
