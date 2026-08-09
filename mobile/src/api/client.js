// Tiny wrapper around fetch() so every screen calls the backend the same way.
import { API_URL, MOCK_MODE } from "../config";
import { MOCK_PRODUCTS, MOCK_CATEGORIES, MOCK_USER } from "./mockData";

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

  // Products
  searchProducts: (q = "", category = "") => MOCK_MODE
    ? Promise.resolve(MOCK_PRODUCTS.filter(p =>
        (!q || p.name.toLowerCase().includes(q.toLowerCase())) &&
        (!category || p.category === category)
      ))
    : request(`/products?q=${encodeURIComponent(q)}&category=${encodeURIComponent(category)}`),

  categories: () => MOCK_MODE
    ? Promise.resolve(MOCK_CATEGORIES)
    : request("/products/categories"),

  productDetail: (id) => MOCK_MODE
    ? Promise.resolve(MOCK_PRODUCTS.find(p => p.id === Number(id)))
    : request(`/products/${id}`),

  stores: () => MOCK_MODE
    ? Promise.resolve([
        { id: 1, name: "Woolworths", slug: "woolworths", color: "#1E7A34" },
        { id: 2, name: "Coles", slug: "coles", color: "#E2231A" },
        { id: 3, name: "ALDI", slug: "aldi", color: "#0060A9" },
      ])
    : request("/stores"),

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
