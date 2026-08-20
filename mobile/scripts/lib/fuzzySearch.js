// Shared fuzzy text matching for search — used both server-side
// (netlify/functions/search-products.js, requiring this directly) and
// client-side (src/screens/BrowseScreen.js, importing it — this project's
// existing convention for scripts/lib/*, see productKey.js's own dual use).
//
// The concrete problem this fixes: strict substring matching
// (`title.includes(query)`) misses "Strawberry" against a product titled
// "Strawberries", and misses "cherry juice" against "Cherry Fruit Juice
// 1L" (different word order/extra words). Neither is a "semantic search"
// problem needing embeddings or an ML API — both are solved by (1) naive
// English stemming so plural/singular forms match, and (2) per-word
// (not whole-phrase) matching so word order and extra words don't matter.
// That covers the two real failures reported; a genuine synonym engine
// ("soda" matching "soft drink") would need an actual model and is a
// separate, bigger decision.

// Deliberately tiny and rule-based, not a real stemmer library — this only
// needs to collapse the common English plural forms that show up in
// grocery titles, not handle every irregular case correctly.
function stem(word) {
  if (word.length <= 3) return word; // "egg" -> "egg", not "eg"
  if (word.endsWith("ies")) return word.slice(0, -3) + "y"; // berries -> berry
  if (word.endsWith("ses") || word.endsWith("xes") || word.endsWith("ches") || word.endsWith("shes")) {
    return word.slice(0, -2); // boxes -> box, dishes -> dish
  }
  if (word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1); // strawberries handled above; apples -> apple
  return word;
}

// Lowercase, strip punctuation, split on whitespace, stem each token, drop
// empties. "Cherry Juice!" and "cherry-juice" both tokenize to the same
// ["cherry", "juice"].
function tokenize(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map(stem);
}

// True if every significant word in the query has a matching (stemmed)
// word somewhere in the title — order and extra words in the title don't
// matter, since a real product title is never phrased exactly like a
// search query. A single-letter/number leftover token doesn't count
// against a match (unit fragments like "1" from "1L").
function matchesQuery(query, title) {
  const queryTokens = tokenize(query).filter((t) => t.length > 1);
  if (!queryTokens.length) return false;
  const titleTokens = new Set(tokenize(title));
  return queryTokens.every((t) => titleTokens.has(t));
}

// For ranking rather than a strict yes/no — fraction of query tokens found
// in the title. Ties broken elsewhere (price, etc.) by the caller.
function matchScore(query, title) {
  const queryTokens = tokenize(query).filter((t) => t.length > 1);
  if (!queryTokens.length) return 0;
  const titleTokens = new Set(tokenize(title));
  const hits = queryTokens.filter((t) => titleTokens.has(t)).length;
  return hits / queryTokens.length;
}

module.exports = { stem, tokenize, matchesQuery, matchScore };
