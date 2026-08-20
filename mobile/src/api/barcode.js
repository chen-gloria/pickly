// Barcode → product identity. A single database was never going to cover
// "scan literally anything" — a barcode's own digits don't say what kind of
// product it is, so this tries four real, free, no-key databases in order,
// each covering a different slice, and returns the first real hit:
//
//   1. Open Food Facts — packaged groceries. Checked first since this is
//      still primarily a grocery app; best AU coverage of the four.
//   2. Open Library — books, via ISBN (a 978/979-prefixed EAN-13 IS an
//      ISBN-13, so no separate barcode format to handle). Backed by the
//      Internet Archive, and observed genuinely slow/unreachable during
//      testing — see TIMEOUT_MS below for why every source here is
//      time-boxed rather than left to hang.
//   3. Google Books — a second, independent ISBN source. Real gaps in one
//      book database and not the other are normal (a specific edition, a
//      niche/devotional publisher...); trying two is what turns "one
//      database missed it" into an actual result. Unauthenticated calls
//      share a global, unkeyed daily quota across every caller of this
//      endpoint worldwide (observed 429 "quota exceeded" during testing,
//      unrelated to Pickly's own traffic) — real, and outside this app's
//      control without registering a paid/keyed project, which would also
//      mean proxying through a server function to keep the key secret
//      (this file runs client-side). Kept anyway since it still works
//      plenty of the time and costs nothing when it doesn't.
//   4. UPCitemdb's free trial lookup — general merchandise catch-all
//      (electronics, homewares, toys, whatever doesn't fit the above).
//      Rejects ISBN-13-shaped codes outright ("INVALID_UPC" — confirmed by
//      testing), so it's genuinely only useful past this point for
//      non-book barcodes; also rate-limited (~100 lookups/day shared
//      across every Pickly user), which is the other reason it's last.
//
// Every branch fails soft (null) rather than throwing — one database being
// down, rate-limited, or just slow should degrade to "keep trying the next
// one" within a bounded total wait, not stall the whole scan indefinitely.
//
// Same honesty rule regardless of which database answered: this only
// resolves *what the product is* (name/brand/photo), never a price — the
// actual price still comes from feeding that name into the existing real
// search (api/client.js's searchProducts).
const TIMEOUT_MS = 5000;

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function lookupOpenFoodFacts(code) {
  try {
    const res = await fetchWithTimeout(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json`
    );
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

async function lookupOpenLibrary(isbn) {
  try {
    const res = await fetchWithTimeout(
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

async function lookupGoogleBooks(isbn) {
  try {
    const res = await fetchWithTimeout(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`
    );
    if (!res.ok) return null; // includes the shared quota's 429
    const data = await res.json();
    const book = data.items?.[0]?.volumeInfo;
    if (!book?.title) return null;

    return {
      name: book.subtitle ? `${book.title}: ${book.subtitle}` : book.title,
      brand: book.publisher || book.authors?.[0] || null,
      image: book.imageLinks?.thumbnail || book.imageLinks?.smallThumbnail || null,
      source: "Google Books",
    };
  } catch (_) {
    return null;
  }
}

async function lookupUpcItemDb(code) {
  try {
    const res = await fetchWithTimeout(`https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(code)}`);
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
  const grocery = await lookupOpenFoodFacts(code);
  if (grocery) return grocery;

  const isbn = isbnFromBarcode(code);
  if (isbn) {
    // Two independent book databases, in parallel rather than sequential —
    // no reason to wait out one's full timeout before trying the other,
    // and a book missing from one is a real, normal gap, not evidence the
    // other will miss it too.
    const [openLibrary, googleBooks] = await Promise.all([
      lookupOpenLibrary(isbn),
      lookupGoogleBooks(isbn),
    ]);
    if (openLibrary || googleBooks) return openLibrary || googleBooks;
  }

  return await lookupUpcItemDb(code);
}
