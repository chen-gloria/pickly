// Mock data shaped to match the real backend's ProductWithPrices schema
// (backend/app/schemas.py) so screens like ProductDetailScreen — which reads
// product.prices[].store.{name,color}, cheapest_price, potential_saving, etc.
// — work identically whether MOCK_MODE is on or off.
//
// Products are generated (not hand-authored one by one) so we get a large,
// realistic-feeling catalogue (100+ items across 8 categories) without 100
// lines of copy-pasted boilerplate. Every product renders as a flat vector
// icon (see ProductIcon.js) rather than a photo — deliberately, so there's
// never a stock-photo background behind it, just the product glyph on a
// transparent background.

const STORES = {
  woolworths: { id: 1, name: "Woolworths", slug: "woolworths", color: "#1E7A34" },
  coles: { id: 2, name: "Coles", slug: "coles", color: "#E2231A" },
  aldi: { id: 3, name: "ALDI", slug: "aldi", color: "#0060A9" },
};

// Small seeded PRNG (mulberry32) so the generated catalogue is stable across
// reloads within a session instead of reshuffling prices/ratings every time.
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260809);
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const CATEGORY_META = {
  Dairy: { icon: "cow", color: "#3E7FC7" },
  Bakery: { icon: "bread-slice", color: "#B5813A" },
  Meat: { icon: "food-drumstick", color: "#C1443C" },
  Produce: { icon: "food-apple", color: "#3E9C4B" },
  Pantry: { icon: "basket-outline", color: "#C79A3E" },
  Beverages: { icon: "bottle-soda-classic", color: "#3E7FC7" },
  Frozen: { icon: "snowflake", color: "#3FB6C9" },
  Snacks: { icon: "popcorn", color: "#D98A3D" },
};

// Keyword → icon overrides, checked before falling back to the category
// default, so e.g. "Cheddar Cheese" gets a cheese wedge rather than the cow
// used for the rest of Dairy.
const ICON_RULES = [
  [/almond milk|oat milk|soy milk/, "bottle-soda-classic", "#3E7FC7"],
  [/milk/, "cow", "#3E7FC7"],
  [/yogurt|custard|sour cream/, "cup", "#3E7FC7"],
  [/cheese/, "cheese", "#E0A83E"],
  [/butter/, "food-variant", "#E8C468"],
  [/egg/, "egg-outline", "#D9A441"],

  [/croissant/, "food-croissant", "#B5813A"],
  [/muffin/, "muffin", "#B5813A"],
  [/baguette/, "baguette", "#B5813A"],
  [/bread|bagel|roll|bun|pita|ciabatta/, "bread-slice", "#B5813A"],

  [/chicken/, "food-drumstick", "#C1443C"],
  [/steak|mince|lamb/, "food-steak", "#C1443C"],
  [/sausage/, "sausage", "#C1443C"],
  [/turkey/, "food-turkey", "#C1443C"],
  [/bacon|ham|salami/, "food-variant", "#C1443C"],

  [/spinach|lettuce|broccoli|cucumber/, "sprout", "#3E9C4B"],
  [/carrot/, "carrot", "#E07A2F"],
  [/tomato/, "food-apple", "#C1443C"],
  [/potato/, "food-variant", "#B5813A"],
  [/onion|garlic/, "sprout-outline", "#B5813A"],
  [/banana/, "food-apple", "#E0C23E"],
  [/apple|lemon/, "food-apple", "#3E9C4B"],
  [/avocado|mango/, "fruit-pineapple", "#3E9C4B"],
  [/capsicum/, "chili-mild", "#C1443C"],
  [/mushroom/, "food-variant", "#B5813A"],

  [/spaghetti|pasta/, "noodles", "#D9A441"],
  [/rice/, "rice", "#D9A441"],
  [/oats/, "bowl-mix", "#D9A441"],
  [/peanut|nuts|trail mix/, "peanut", "#B5813A"],
  [/honey/, "food-variant", "#E0A83E"],
  [/oil/, "bottle-tonic", "#8CA43E"],
  [/canned|baked beans|tuna/, "food-variant", "#8C9CA4"],
  [/cornflakes|cereal/, "bowl-mix-outline", "#D9A441"],
  [/flour|sugar/, "food-variant", "#E8E0C8"],
  [/sauce/, "bottle-tonic", "#C1443C"],

  [/cola|soda|sparkling/, "bottle-soda", "#3E7FC7"],
  [/juice|cordial/, "bottle-soda-classic", "#E07A2F"],
  [/tea/, "tea", "#3E9C4B"],
  [/coffee/, "coffee", "#6F4A2E"],
  [/energy drink/, "bottle-tonic", "#C1443C"],
  [/beer/, "beer", "#D9A441"],
  [/wine/, "glass-wine", "#7A2F3E"],

  [/ice cream/, "ice-cream", "#E8A9C4"],
  [/pizza/, "pizza", "#C1443C"],
  [/fish finger/, "fish", "#3E7FC7"],
  [/corn/, "corn", "#E0C23E"],
  [/dumpling|pie/, "food-variant", "#D9A441"],

  [/chips|fries/, "french-fries", "#D9A441"],
  [/chocolate|biscuit/, "cookie", "#6F4A2E"],
  [/muesli bar/, "food-variant", "#B5813A"],
  [/popcorn/, "popcorn", "#E0C23E"],
  [/cracker/, "cookie-outline", "#D9A441"],
  [/pretzel/, "pretzel", "#B5813A"],
];

function pickIcon(name, category) {
  const n = name.toLowerCase();
  for (const [re, icon, color] of ICON_RULES) {
    if (re.test(n)) return { icon, color };
  }
  return CATEGORY_META[category] || { icon: "food-variant", color: "#7A857F" };
}

// [name, brand, size, basePrice] — basePrice is roughly what the item costs
// at a mid-priced store; per-store prices below are generated with variance
// around it so cheapest/highest/savings all come out looking plausible.
const ITEM_DEFS = {
  Dairy: [
    ["Full Cream Milk 2L", "Various", "2L", 3.5],
    ["Skim Milk 2L", "Various", "2L", 3.3],
    ["Almond Milk 1L", "Vitasoy", "1L", 3.8],
    ["Oat Milk 1L", "Oatly", "1L", 4.5],
    ["Greek Yogurt 500g", "Chobani", "500g", 5.2],
    ["Natural Yogurt 1kg", "Farmers Union", "1kg", 6.0],
    ["Cheddar Cheese 250g", "Bega", "250g", 5.5],
    ["Mozzarella 500g", "Perfect Italiano", "500g", 7.0],
    ["Butter 250g", "Western Star", "250g", 4.8],
    ["Cream Cheese 250g", "Philadelphia", "250g", 4.2],
    ["Sour Cream 300g", "Various", "300g", 2.9],
    ["Free Range Eggs 12pk", "Farm Fresh", "12 pack", 7.0],
    ["Custard 600g", "Pauls", "600g", 4.0],
    ["Cottage Cheese 250g", "Various", "250g", 3.6],
  ],
  Bakery: [
    ["Sourdough Bread", "Bakers Delight", "700g", 5.0],
    ["White Bread Loaf", "Tip Top", "700g", 3.2],
    ["Wholemeal Bread", "Helga's", "700g", 3.8],
    ["Bagels 6pk", "New York Bakery", "6 pack", 4.5],
    ["Croissants 4pk", "Bakers Delight", "4 pack", 6.0],
    ["Dinner Rolls 6pk", "Various", "6 pack", 3.5],
    ["Baguette", "Bakers Delight", "1 unit", 3.0],
    ["Blueberry Muffins 6pk", "Various", "6 pack", 5.5],
    ["Fruit Buns 6pk", "Tip Top", "6 pack", 4.0],
    ["Pita Bread 6pk", "Lebanese Bakery", "6 pack", 3.9],
    ["Ciabatta", "Bakers Delight", "1 unit", 4.2],
    ["Rye Bread", "Helga's", "500g", 4.6],
    ["Ciabatta Rolls 4pk", "Bakers Delight", "4 pack", 5.0],
  ],
  Meat: [
    ["Chicken Breast 500g", "RSPCA Approved", "500g", 8.0],
    ["Chicken Thigh 500g", "RSPCA Approved", "500g", 7.0],
    ["Beef Mince 500g", "Australian Beef", "500g", 8.5],
    ["Lamb Chops 500g", "Australian Lamb", "500g", 12.0],
    ["Pork Sausages 500g", "Various", "500g", 6.5],
    ["Bacon 250g", "Don", "250g", 6.0],
    ["Beef Steak 300g", "Australian Beef", "300g", 10.0],
    ["Turkey Slices 200g", "Primo", "200g", 5.5],
    ["Salami 150g", "Primo", "150g", 5.0],
    ["Chicken Wings 500g", "RSPCA Approved", "500g", 6.5],
    ["Ham 200g", "Don", "200g", 5.2],
    ["Beef Sausages 500g", "Various", "500g", 7.0],
  ],
  Produce: [
    ["Baby Spinach 120g", "Perfection Fresh", "120g", 3.0],
    ["Broccoli", "Various", "1 head", 3.5],
    ["Carrots 1kg", "Various", "1kg", 2.2],
    ["Tomatoes 500g", "Various", "500g", 4.0],
    ["Potatoes 2kg", "Various", "2kg", 4.5],
    ["Brown Onions 1kg", "Various", "1kg", 2.8],
    ["Bananas 1kg", "Various", "1kg", 3.2],
    ["Pink Lady Apples 1kg", "Various", "1kg", 4.8],
    ["Avocado 2pk", "Various", "2 pack", 5.0],
    ["Capsicum", "Various", "1 unit", 1.8],
    ["Cucumber", "Various", "1 unit", 1.5],
    ["Iceberg Lettuce", "Various", "1 unit", 2.5],
    ["Mushrooms 200g", "Various", "200g", 3.3],
    ["Sweet Potato 1kg", "Various", "1kg", 3.8],
    ["Garlic 3pk", "Various", "3 pack", 2.0],
    ["Lemons 1kg", "Various", "1kg", 3.5],
  ],
  Pantry: [
    ["Spaghetti Pasta 500g", "San Remo", "500g", 2.0],
    ["Jasmine Rice 1kg", "SunRice", "1kg", 3.5],
    ["Rolled Oats 500g", "Uncle Tobys", "500g", 3.2],
    ["Peanut Butter 375g", "Kraft", "375g", 4.5],
    ["Honey 500g", "Capilano", "500g", 6.0],
    ["Olive Oil 500ml", "Cobram Estate", "500ml", 8.5],
    ["Canned Tomatoes 400g", "Ardmona", "400g", 1.8],
    ["Baked Beans 420g", "Heinz", "420g", 2.2],
    ["Tuna Can 185g", "John West", "185g", 2.5],
    ["Cornflakes 500g", "Kellogg's", "500g", 5.0],
    ["Plain Flour 1kg", "White Wings", "1kg", 2.2],
    ["White Sugar 1kg", "CSR", "1kg", 2.0],
    ["Soy Sauce 250ml", "Kikkoman", "250ml", 3.8],
    ["Pasta Sauce 500g", "Leggo's", "500g", 3.2],
  ],
  Beverages: [
    ["Orange Juice 2L", "Berri", "2L", 5.5],
    ["Apple Juice 2L", "Berri", "2L", 5.2],
    ["Coca Cola 1.25L", "Coca-Cola", "1.25L", 3.0],
    ["Sparkling Water 1.25L", "Various", "1.25L", 1.8],
    ["Iced Tea 1.5L", "Lipton", "1.5L", 3.5],
    ["Coffee Beans 500g", "Vittoria", "500g", 12.0],
    ["Green Tea 25pk", "Twinings", "25 pack", 4.5],
    ["Energy Drink 4pk", "Red Bull", "4 pack", 9.0],
    ["Cordial 1L", "Cottee's", "1L", 3.2],
    ["Beer 6pk", "Various", "6 pack", 18.0],
    ["Red Wine 750ml", "Jacob's Creek", "750ml", 12.0],
    ["Soda Water 1.25L", "Various", "1.25L", 1.6],
  ],
  Frozen: [
    ["Frozen Peas 500g", "Birds Eye", "500g", 2.8],
    ["Frozen Mixed Berries 500g", "Creative Gourmet", "500g", 6.0],
    ["Vanilla Ice Cream 1L", "Streets", "1L", 5.5],
    ["Margherita Pizza", "Dr. Oetker", "1 unit", 6.0],
    ["Fish Fingers 400g", "Birds Eye", "400g", 5.5],
    ["Frozen Chips 1kg", "McCain", "1kg", 4.5],
    ["Frozen Corn 500g", "Birds Eye", "500g", 2.6],
    ["Chicken Dumplings 500g", "Various", "500g", 7.0],
    ["Frozen Mango 500g", "Creative Gourmet", "500g", 5.5],
    ["Beef Meat Pies 4pk", "Four'N Twenty", "4 pack", 7.5],
  ],
  Snacks: [
    ["Potato Chips 175g", "Smith's", "175g", 4.0],
    ["Chocolate Block 180g", "Cadbury", "180g", 4.5],
    ["Muesli Bar 6pk", "Uncle Tobys", "6 pack", 4.2],
    ["Popcorn 100g", "Various", "100g", 2.5],
    ["Crackers 250g", "Jatz", "250g", 3.5],
    ["Mixed Nuts 200g", "Various", "200g", 6.0],
    ["Pretzels 200g", "Various", "200g", 3.8],
    ["Rice Crackers 100g", "Sakata", "100g", 2.8],
    ["Trail Mix 300g", "Various", "300g", 7.0],
    ["Chocolate Biscuits 250g", "Arnott's", "250g", 3.5],
  ],
};

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
    save_amount: potentialSaving,
  };
}

function makePrices(basePrice) {
  const allStores = [STORES.woolworths, STORES.coles, STORES.aldi];
  const count = rand() < 0.75 ? 3 : 2;
  const chosen = count === 3 ? allStores : shuffle(allStores).slice(0, 2);
  return chosen.map((store) => {
    const variance = (rand() - 0.5) * 0.3; // ±15%
    const price = Math.max(0.5, basePrice * (1 + variance));
    return {
      store,
      price: Math.round(price * 100) / 100,
      on_special: rand() < 0.15,
    };
  });
}

function generateProducts() {
  let id = 1;
  const products = [];
  for (const [category, items] of Object.entries(ITEM_DEFS)) {
    for (const [name, brand, size, basePrice] of items) {
      const { icon, color } = pickIcon(name, category);
      products.push(
        withPriceSummary({
          id: id++,
          name,
          brand,
          category,
          size,
          icon,
          iconColor: color,
          rating: Number((3.8 + rand() * 1.1).toFixed(1)),
          review_count: Math.floor(15 + rand() * 400),
          prices: makePrices(basePrice),
        })
      );
    }
  }
  return products;
}

export const MOCK_PRODUCTS = generateProducts();

export const MOCK_CATEGORIES = Object.keys(CATEGORY_META);

// Top savings across the whole catalogue, for the "Best Value Today" strip.
export const MOCK_BEST_VALUE = [...MOCK_PRODUCTS]
  .sort((a, b) => b.potential_saving - a.potential_saving)
  .slice(0, 12);

export const MOCK_USER = { id: 1, name: "Gloria", email: "demo@pickly.app" };
