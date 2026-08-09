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
  const potentialSaving = Number((highest.price - cheapest.price).toFixed(2));
  return {
    ...product,
    prices,
    cheapest_store: cheapest.store,
    cheapest_price: cheapest.price,
    highest_price: highest.price,
    potential_saving: potentialSaving,
    // Same number as potential_saving — kept as its own field because that's
    // what the Compare card (and the Figma design) reads. Real backend
    // doesn't compute this yet; ProductCard falls back gracefully if absent.
    save_amount: potentialSaving,
  };
}

export const MOCK_PRODUCTS = [
  withPriceSummary({
    id: 1,
    name: "Full Cream Milk 2L",
    brand: "Various",
    category: "Dairy",
    size: "2L",
    image_url: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=160&h=160&fit=crop&q=70",
    rating: 4.6,
    review_count: 128,
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
    image_url: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=160&h=160&fit=crop&q=70",
    rating: 4.4,
    review_count: 76,
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
    image_url: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=160&h=160&fit=crop&q=70",
    rating: 4.7,
    review_count: 203,
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
    image_url: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=160&h=160&fit=crop&q=70",
    rating: 4.3,
    review_count: 54,
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
    image_url: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=160&h=160&fit=crop&q=70",
    rating: 4.5,
    review_count: 39,
    prices: [
      { store: STORES.woolworths, price: 3.00, on_special: false },
      { store: STORES.coles, price: 2.80, on_special: false },
      { store: STORES.aldi, price: 2.49, on_special: false },
    ],
  }),
];

export const MOCK_CATEGORIES = ["Dairy", "Bakery", "Meat", "Produce"];

export const MOCK_USER = { id: 1, name: "Gloria", email: "demo@pickly.app" };
