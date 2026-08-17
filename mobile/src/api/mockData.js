// Mock data shaped to match the real backend's ProductWithPrices schema
// (backend/app/schemas.py) so screens like ProductDetailScreen — which reads
// product.prices[].store.{name,color}, cheapest_price, potential_saving, etc.
// — work identically whether MOCK_MODE is on or off.
//
// Products are generated (not hand-authored one by one) so we get a large,
// realistic-feeling catalogue (130+ items across 11 categories) without 100
// lines of copy-pasted boilerplate. Every product renders as a flat vector
// icon (see ProductIcon.js) rather than a photo — deliberately, so there's
// never a stock-photo background behind it, just the product glyph on a
// transparent background.
//
// Four retailer sets, not one: Compare originally covered groceries only,
// narrower than the Deals feed, which pulls four real OzBargain category
// feeds (see scripts/lib/ozbargain.js — Groceries, Health & Beauty,
// Electronics, Home & Garden). Rather than inventing categories nothing in
// the feed actually has, each Compare category shops the same retailers its
// real deal posts do, so tapping a deal on Browse and searching the same
// kind of product land in the same retailer universe.
const GROCERY_STORES = {
  woolworths: { id: 1, name: "Woolworths", slug: "woolworths", color: "#1E7A34" },
  coles: { id: 2, name: "Coles", slug: "coles", color: "#E2231A" },
  aldi: { id: 3, name: "ALDI", slug: "aldi", color: "#0060A9" },
};

const HEALTH_STORES = {
  chemistWarehouse: { id: 4, name: "Chemist Warehouse", slug: "chemist-warehouse", color: "#E4002B" },
  priceline: { id: 5, name: "Priceline", slug: "priceline", color: "#E4007C" },
  amazonau: { id: 6, name: "Amazon AU", slug: "amazon-au", color: "#FF9900" },
};

const ELECTRONICS_STORES = {
  jbhifi: { id: 7, name: "JB Hi-Fi", slug: "jb-hi-fi", color: "#FFDE00" },
  officeworks: { id: 8, name: "Officeworks", slug: "officeworks", color: "#0072CE" },
  amazonauElec: { id: 9, name: "Amazon AU", slug: "amazon-au", color: "#FF9900" },
};

const HOME_STORES = {
  bunnings: { id: 10, name: "Bunnings", slug: "bunnings", color: "#088A3C" },
  kmart: { id: 11, name: "Kmart", slug: "kmart", color: "#CC0000" },
  amazonauHome: { id: 12, name: "Amazon AU", slug: "amazon-au", color: "#FF9900" },
};

const STORES = { ...GROCERY_STORES, ...HEALTH_STORES, ...ELECTRONICS_STORES, ...HOME_STORES };

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
  "Health & Beauty": { icon: "pill", color: "#8C5FBF" },
  Electronics: { icon: "headphones", color: "#4E7FE0" },
  "Home & Garden": { icon: "watering-can", color: "#5C9E4A" },
};

// Which retailer set each category shops — categories not listed default to
// the grocery set. This map is also how the Browse screen's category rail
// filters the live deals list: the eight grocery subcategories all roll up
// under the deals feed's single "Groceries" category (see dealCategoryFor
// below), while these three pass straight through unchanged.
const STORE_SET_BY_CATEGORY = {
  "Health & Beauty": HEALTH_STORES,
  Electronics: ELECTRONICS_STORES,
  "Home & Garden": HOME_STORES,
};

// The catalogue's category names don't map 1:1 onto the deals feed's four
// real category feeds (scripts/lib/ozbargain.js) — Dairy/Bakery/Meat/etc.
// are all shopping-list detail the feed doesn't carry; OzBargain just calls
// all of it "Groceries". This is the single place that mapping lives, so
// the Browse screen's category rail can filter both the catalogue and the
// live deals from the same tap without duplicating the list.
export function dealCategoryFor(catalogCategory) {
  return catalogCategory in STORE_SET_BY_CATEGORY ? catalogCategory : "Groceries";
}

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

  [/vitamin|magnesium|fish oil|multivitamin|zinc/, "pill", "#8C5FBF"],
  [/ibuprofen|paracetamol|panadol|nurofen|allergy|antihistamine/, "pill", "#C1443C"],
  [/sunscreen/, "weather-sunny", "#E0A83E"],
  [/moisturiser|moisturizer|serum/, "bottle-tonic-outline", "#8C5FBF"],
  [/shampoo|conditioner/, "bottle-tonic-outline", "#3E7FC7"],
  [/toothpaste|toothbrush/, "tooth-outline", "#3E7FC7"],
  [/protein powder|whey|creatine/, "dumbbell", "#C1443C"],
  [/first aid|bandage/, "medical-bag", "#C1443C"],
  [/deodorant/, "spray-bottle", "#3E7FC7"],

  [/earbuds|headphones/, "headphones", "#4E7FE0"],
  [/power bank|battery pack/, "battery-charging", "#4E7FE0"],
  [/smart\s?watch/, "watch", "#4E7FE0"],
  [/bluetooth speaker|speaker/, "speaker-bluetooth", "#4E7FE0"],
  [/hdmi|usb-c cable|charging cable/, "cable-data", "#4E7FE0"],
  [/webcam/, "webcam", "#4E7FE0"],
  [/usb hub|usb-c hub/, "usb", "#4E7FE0"],
  [/wireless charger|charging pad/, "power-plug", "#4E7FE0"],

  [/garden hose|watering can/, "watering-can", "#5C9E4A"],
  [/storage container|storage box/, "box", "#B5813A"],
  [/kitchen scale/, "scale-bathroom", "#5C9E4A"],
  [/led bulb|light bulb/, "lightbulb-outline", "#E0A83E"],
  [/tool set|screwdriver|wrench set/, "hammer-wrench", "#7A857F"],
  [/cutting board|knife set/, "silverware-fork-knife", "#B5813A"],
  [/vacuum/, "vacuum", "#5C9E4A"],
  [/broom|mop/, "broom", "#5C9E4A"],
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
  // Priced across Chemist Warehouse / Priceline / Amazon AU (HEALTH_STORES)
  // instead of the supermarkets — see the note above STORES.
  "Health & Beauty": [
    ["Vitamin C 1000mg 60 Tablets", "Nature's Own", "60 tablets", 12.0],
    ["Magnesium Glycinate 300 Tablets", "Nature's Own", "300 tablets", 24.0],
    ["Multivitamin 100 Tablets", "Swisse", "100 tablets", 22.0],
    ["Fish Oil 1000mg 200 Capsules", "Blackmores", "200 capsules", 28.0],
    ["Ibuprofen 200mg 96 Tablets", "Nurofen", "96 tablets", 9.0],
    ["Paracetamol 500mg 100 Tablets", "Panadol", "100 tablets", 8.5],
    ["Allergy Relief Tablets 30pk", "Zyrtec", "30 tablets", 16.0],
    ["Sunscreen SPF50+ 200ml", "Cancer Council", "200ml", 14.0],
    ["Moisturiser 200ml", "Cetaphil", "200ml", 18.0],
    ["Shampoo 400ml", "Head & Shoulders", "400ml", 9.5],
    ["Toothpaste 110g", "Colgate", "110g", 5.0],
    ["Electric Toothbrush Heads 4pk", "Oral-B", "4 pack", 22.0],
    ["Whey Protein Powder 1kg", "Cyborg Sport", "1kg", 55.0],
    ["Creatine Monohydrate 1kg", "Cyborg Sport", "1kg", 39.0],
    ["First Aid Kit", "St John Ambulance", "1 unit", 25.0],
    ["Deodorant 150ml", "Rexona", "150ml", 6.5],
  ],
  // Priced across JB Hi-Fi / Officeworks / Amazon AU (ELECTRONICS_STORES).
  Electronics: [
    ["Wireless Earbuds", "JBL", "1 pair", 79.0],
    ["Over-Ear Headphones", "Sony", "1 unit", 129.0],
    ["Bluetooth Speaker", "JBL", "1 unit", 89.0],
    ["20000mAh Power Bank", "Anker", "1 unit", 59.0],
    ["Smart Watch", "Amazfit", "1 unit", 149.0],
    ["USB-C Charging Cable 2m", "Belkin", "1 unit", 24.0],
    ["30W Wireless Charger", "Belkin", "1 unit", 39.0],
    ["HDMI Cable 2m", "Belkin", "1 unit", 15.0],
    ["1080p Webcam", "Logitech", "1 unit", 69.0],
    ["USB-C Hub 7-in-1", "UGREEN", "1 unit", 45.0],
    ["Wireless Mouse", "Logitech", "1 unit", 35.0],
    ["Mechanical Keyboard", "Logitech", "1 unit", 99.0],
    ["Phone Case", "OtterBox", "1 unit", 29.0],
    ["Screen Protector 2pk", "Various", "2 pack", 12.0],
  ],
  // Priced across Bunnings / Kmart / Amazon AU (HOME_STORES).
  "Home & Garden": [
    ["Garden Hose 18m", "Nylex", "18m", 39.0],
    ["Watering Can 9L", "Bosmere", "9L", 18.0],
    ["Storage Container Set 5pk", "Sistema", "5 pack", 25.0],
    ["Kitchen Scale", "Salter", "1 unit", 22.0],
    ["LED Bulb 4pk", "Philips", "4 pack", 16.0],
    ["Cutting Board Set 3pk", "Various", "3 pack", 19.0],
    ["Tool Set 39pc", "Stanley", "39 piece", 45.0],
    ["Extension Cord 10m", "HPM", "10m", 22.0],
    ["Storage Boxes 3pk", "Decor", "3 pack", 28.0],
    ["Robot Vacuum", "Kmart", "1 unit", 149.0],
    ["Broom & Dustpan Set", "Various", "1 set", 14.0],
    ["Outdoor Cushion 2pk", "Various", "2 pack", 25.0],
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

function makePrices(basePrice, storeList) {
  const count = rand() < 0.75 ? storeList.length : storeList.length - 1;
  const chosen = count >= storeList.length ? storeList : shuffle(storeList).slice(0, count);
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
    const storeList = Object.values(STORE_SET_BY_CATEGORY[category] || GROCERY_STORES);
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
          prices: makePrices(basePrice, storeList),
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
