// Barcode → product identity. A single database was never going to cover
// "scan literally anything" — a barcode's own digits don't say what kind of
// product it is, so this tries three real, free, no-key databases in order,
// each covering a different slice, and returns the first real hit:
//
//   1. Open Food Facts — packaged groceries. Checked first since this is
//      still primarily a grocery app; best AU coverage of the three.
//   2. Open Library — books, via ISBN (a 978/979-prefixed EAN-13 IS an
//      ISBN-13, so no separate barcode format to handle). Backed by the
//      Internet Archive; occasionally down as a whole service, which is
//      exactly why this is a fallback chain and not a single call.
//   3. UPCitemdb's free trial lookup — general merchandise catch-all
//      (electronics, homewares, toys, whatever doesn't fit the two above).
//      No key required, but genuinely rate-limited (~100 lookups/day
//      shared across every Pickly user) — it's the last resort in the
//      chain on purpose, not the first, so grocery/book scans (the
//      common case) never burn through that quota.
//
// Every branch fails soft (null) rather than throwing — one database being
// down or rate-limited should degrade to "keep trying the next one", not
// break the whole scan.
//
// Same honesty rule regardless of which database answered: this only
// resolves *what the product is* (name/brand/photo), never a price — the
// actual price still comes from feeding that name into the existing real
// search (api/client.js's searchProducts).
async function lookupOpenFoodFacts(code) {
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
      source: "Open Food Facts",
    };
  } catch (_) {
    return null;
  }
}

function isbnFromBarcode(code) {
  // A 13-digit EAN starting 978/979 is a Bookland/ISBN-13 barcode — the
  // exact same digits print under the barcode on the book itself.
  return /^97[89]\d{10}$/.test(code) ? code : null;
}

async function lookupOpenLibrary(code) {
  const isbn = isbnFromBarcode(code);
  if (!isbn) return null;
  try {
    const res = await fetch(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const book = data[`ISBN:${isbn}`];
    if (!book?.title) return null;

    return {
      name: book.title,
      brand: book.publishers?.[0]?.name || book.authors?.[0]?.name || null,
      image: book.cover?.medium || book.cover?.small || null,
      source: "Open Library",
    };
  } catch (_) {
    return null;
  }
}

async function lookupUpcItemDb(code) {
  try {
    const res = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(code)}`);
    if (!res.ok) return null; // includes the trial tier's own rate-limit response
    const data = await res.json();
    const item = data.items?.[0];
    if (!item?.title) return null;

    return {
      name: item.title,
      brand: item.brand || null,
      image: item.images?.[0] || null,
      source: "UPCitemdb",
    };
  } catch (_) {
    return null;
  }
}

export async function lookupBarcode(code) {
  return (
    (await lookupOpenFoodFacts(code)) ||
    (await lookupOpenLibrary(code)) ||
    (await lookupUpcItemDb(code))
  );
}
