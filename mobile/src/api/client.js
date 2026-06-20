// Tiny wrapper around fetch() so every screen calls the backend the same way.
import { API_URL } from "../config";

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
  signup: (email, name, password) =>
    request("/auth/signup", { method: "POST", body: { email, name, password } }),
  login: (email, password) =>
    request("/auth/login", { method: "POST", body: { email, password } }),
  me: (token) => request("/auth/me", { token }),

  // Products
  searchProducts: (q = "", category = "") =>
    request(`/products?q=${encodeURIComponent(q)}&category=${encodeURIComponent(category)}`),
  categories: () => request("/products/categories"),
  productDetail: (id) => request(`/products/${id}`),
  stores: () => request("/stores"),

  // Shopping list
  getList: (token) => request("/list", { token }),
  addToList: (token, product_id, quantity = 1) =>
    request("/list", { method: "POST", token, body: { product_id, quantity } }),
  toggleItem: (token, id) =>
    request(`/list/${id}/toggle`, { method: "PATCH", token }),
  deleteItem: (token, id) =>
    request(`/list/${id}`, { method: "DELETE", token }),

  // Favorites
  getFavorites: (token) => request("/favorites", { token }),
  addFavorite: (token, product_id) =>
    request("/favorites", { method: "POST", token, body: { product_id } }),
  removeFavorite: (token, product_id) =>
    request(`/favorites/${product_id}`, { method: "DELETE", token }),

  // Price alerts
  getAlerts: (token) => request("/alerts", { token }),
  createAlert: (token, product_id, target_price) =>
    request("/alerts", { method: "POST", token, body: { product_id, target_price } }),
  deleteAlert: (token, id) =>
    request(`/alerts/${id}`, { method: "DELETE", token }),
};
