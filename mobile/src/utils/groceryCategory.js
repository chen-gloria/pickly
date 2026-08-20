// Grocery subcategories — used on BrowseScreen.js's home view only once the
// Recommendation filter (see storeFilter.js) is narrowed down to grocery-
// selling brands (Coles/Woolworths/ALDI/Alpha Fresh). At that point a single
// lumped "Groceries" carousel stops being useful — the whole point of
// narrowing to "just the supermarkets" is to actually browse by aisle.
//
// Where this data comes from, per store:
//   - Coles/Woolworths: their own real category, taken from the deal's
//     SaleFinder detail-page URL (see netlify/functions/lib/salefinder.js's
//     categoryFromPath) — an actual retailer taxonomy, not a guess.
//   - Alpha Fresh: Shopify's own real `product_type` field (see
//     netlify/functions/lib/alphafresh.js) — trusted as-is, same reasoning.
//   - ALDI, and anything without a usable category from its source: keyword
//     matching against the deal's own title, the same text a shopper
//     already reads. ALDI specifically has no legitimate category source at
//     all — its unofficial endpoint was checked and rejected for active
//     bot-detection (see alphafresh.js's header comment) — so this is
//     honestly an inferred guess, not an authoritative taxonomy, for ALDI
//     deals in particular.
const KEYWORD_CATEGORIES = [
  ["Meat & Seafood", /chicken|\bbeef\b|\blamb\b|\bpork\b|mince|sausage|bacon|salmon|prawn|seafood|\bfish\b/i],
  ["Dairy & Eggs", /\bmilk\b|cheese|yog?hurt|\bbutter\b|\bcream\b|\begg/i],
  ["Fruit & Veg", /avocado|\bapple|\bbanana|\bpotato|\btomato|\bonion|\bcarrot|vegetable|\bfruit\b|\bsalad\b|shallot|\bberry\b|berries/i],
  ["Bakery", /\bbread\b|bakery|\bbun\b|\broll\b|croissant|\bbagel\b/i],
  ["Frozen", /\bfrozen\b/i],
  ["Beverages", /\bcoffee\b|\btea\b|\bjuice\b|soft ?drink|\bwater\b|\bsoda\b|energy drink|cordial/i],
  ["Snacks & Confectionery", /chocolate|\bchips\b|\bsnack|biscuit|\bcandy\b|\blolly|lollies|crackers|muesli bar/i],
  ["Pantry", /\bpasta\b|\brice\b|\bsauce\b|\boil\b|\bflour\b|\bsugar\b|\bcereal\b|\bcanned\b|\btin\b|\bspice/i],
  ["Household & Personal Care", /detergent|cleaning|toilet paper|shampoo|sanitiser|paper towel|toothpaste|deodorant/i],
];

// Stores whose `deal.category` is already a real, source-provided category
// (not the generic "Groceries" fallback every OzBargain grocery post gets)
// — trust it outright instead of re-guessing from the title.
const TRUSTED_CATEGORY_STORES = new Set(["Alpha Fresh", "Coles", "Woolworths"]);

export function groceryCategoryFor(deal) {
  if (TRUSTED_CATEGORY_STORES.has(deal.store) && deal.category && deal.category !== "Groceries") {
    return deal.category;
  }
  const title = deal.title || "";
  for (const [name, pattern] of KEYWORD_CATEGORIES) {
    if (pattern.test(title)) return name;
  }
  return "Other Groceries";
}
