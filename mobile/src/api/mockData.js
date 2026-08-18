// What's left after the fake catalogue: the mock signed-in user for
// MOCK_MODE (see config.js and api/client.js). The generated 130-item dummy
// catalogue is gone — replaced by netlify/functions/search-products.js,
// which calls a real shopping-search API instead of inventing prices. Its
// retailer allow-list lives directly in that function file rather than
// here, since a Netlify Function and this client bundle are built by two
// separate pipelines that don't share code across the boundary.
export const MOCK_USER = { id: 1, name: "Gloria", email: "demo@pickly.app" };
