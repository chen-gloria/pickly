// Mock data shaped to match the real backend's ProductWithPrices schema
// (backend/app/schemas.py) so screens like ProductDetailScreen — which reads
// product.prices[].store.{name,color}, cheapest_price, potential_saving, etc.
// — work identically whether MOCK_MODE is on or off.

const STORES = {
  woolworths: { id: 1, name: "Woolworths", slug: "woolworths", color: "#1E7A34" },
  coles: { id: 2, name: "Coles", slug: "coles", color: "#E2231A" },
  aldi: { id: 3, name: "ALDI", slug: "aldi", color: "#0060A9" },
};

// `prices` must be pre-sorted cheapest-first — ProductDetailScreen assumes
// index 0 is the best deal.
function withPriceSummary(product) {
  const prices = [...product.prices].sort((a, b) => a.price - b.price);
  const cheapest = prices[0];
  const highest = prices[prices.length - 1];
  return {
    ...product,
    prices,
    cheapest_store: cheapest.store,
    cheapest_price: cheapest.price,
    highest_price: highest.price,
    potential_saving: Number((highest.price - cheapest.price).toFixed(2)),
  };
}

export const MOCK_PRODUCTS = [
  withPriceSummary({
    id: 1,
    name: "Full Cream Milk 2L",
    brand: "Various",
    category: "Dairy",
    size: "2L",
    image_url: "",
    prices: [
      { store: STORES.woolworths, price: 3.50, on_special: false },
      { store: STORES.coles, price: 3.20, on_special: false },
      { store: STORES.aldi, price: 2.89, on_special: false },
    ],
  }),
  withPriceSummary({
    id: 2,
    name: "Sourdough Bread",
    brand: "Bakers Delight",
    category: "Bakery",
    size: "700g",
    image_url: "",
    prices: [
      { store: STORES.woolworths, price: 5.00, on_special: false },
      { store: STORES.coles, price: 4.50, on_special: true },
    ],
  }),
  withPriceSummary({
    id: 3,
    name: "Free Range Eggs 12pk",
    brand: "Farm Fresh",
    category: "Dairy",
    size: "12 pack",
    image_url: "",
    prices: [
      { store: STORES.woolworths, price: 7.00, on_special: false },
      { store: STORES.coles, price: 6.50, on_special: false },
      { store: STORES.aldi, price: 5.99, on_special: false },
    ],
  }),
  withPriceSummary({
    id: 4,
    name: "Chicken Breast 500g",
    brand: "RSPCA Approved",
    category: "Meat",
    size: "500g",
    image_url: "",
    prices: [
      { store: STORES.woolworths, price: 8.00, on_special: false },
      { store: STORES.coles, price: 7.50, on_special: true },
    ],
  }),
  withPriceSummary({
    id: 5,
    name: "Baby Spinach 120g",
    brand: "Perfection Fresh",
    category: "Produce",
    size: "120g",
    image_url: "",
    prices: [
      { store: STORES.woolworths, price: 3.00, on_special: false },
      { store: STORES.coles, price: 2.80, on_special: false },
      { store: STORES.aldi, price: 2.49, on_special: false },
    ],
  }),
];

export const MOCK_CATEGORIES = ["Dairy", "Bakery", "Meat", "Produce"];

export const MOCK_USER = { id: 1, name: "Gloria", email: "demo@pickly.app" };
