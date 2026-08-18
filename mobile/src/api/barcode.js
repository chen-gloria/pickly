// Barcode → product identity, via Open Food Facts (world.openfoodfacts.org)
// — free, no API key, CORS-open (confirmed: `Access-Control-Allow-Origin: *`),
// called directly from the client. No new server-side surface needed.
//
// It's a *food* database: real and reliable for packaged groceries, patchy
// for AU-specific private-label items, and it will never resolve a barcode
// on electronics or home goods. That's a real limitation, not a bug — the
// caller shows an honest "not recognized" state rather than a fabricated
// one (see BrowseScreen.js's scan flow).
//
// This only resolves *what the product is* (name/brand/photo) — the actual
// price comes from feeding that name into the existing real search
// (api/client.js's searchProducts, backed by netlify/functions/search-products.js).
export async function lookupBarcode(code) {
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 1 || !data.product) return null;

    const p = data.product;
    const name = p.product_name || p.product_name_en || null;
    if (!name) return null;

    return {
      name,
      brand: p.brands || null,
      image: p.image_front_url || p.image_url || null,
    };
  } catch (_) {
    return null;
  }
}
