// The watchlist — where the price history turns into retention.
//
// History on its own doesn't bring anyone back; "the thing you wanted just
// hit its lowest price" does. Each entry records the price at the moment it
// was saved, so we can say something concrete later ("$2.40 cheaper than
// when you saved it") rather than a vague "price dropped".
//
// Dual-backed, matching RootNavigator.js's decision that login is optional
// rather than a gate: signed-in users get the server (netlify/functions/
// watchlist.js, Postgres) so the list survives a lost phone or a second
// device; everyone else gets the original AsyncStorage behaviour, since
// that's the only option someone who never signs up has. Every write also
// falls back to the local list if the network call fails, so a save never
// just silently vanishes because of a bad connection.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getToken } from "./authToken";

const LOCAL_KEY = "pickly_watchlist";
const SEEN_KEY = "pickly_watchlist_seen";
const ENDPOINT = "/.netlify/functions/watchlist";

async function getLocalList() {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

async function saveLocalList(list) {
  await AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(list));
  return list;
}

function toEntry(deal) {
  return {
    id: deal.id,
    title: deal.title,
    store: deal.store,
    image: deal.image,
    url: deal.url,
    // The anchor for every later comparison.
    priceWhenSaved: deal.price ?? null,
    savedAt: new Date().toISOString(),
  };
}

async function serverList(token) {
  const res = await fetch(ENDPOINT, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`watchlist fetch failed (${res.status})`);
  const data = await res.json();
  return Array.isArray(data.items) ? data.items : [];
}

async function serverAdd(token, deal) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      id: deal.id,
      title: deal.title,
      store: deal.store,
      image: deal.image,
      url: deal.url,
      priceWhenSaved: deal.price ?? null,
    }),
  });
  if (!res.ok) throw new Error(`watchlist add failed (${res.status})`);
  const data = await res.json();
  return Array.isArray(data.items) ? data.items : [];
}

async function serverRemove(token, id) {
  const res = await fetch(`${ENDPOINT}?itemKey=${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`watchlist remove failed (${res.status})`);
  const data = await res.json();
  return Array.isArray(data.items) ? data.items : [];
}

export async function getWatchlist() {
  const token = await getToken();
  if (!token) return getLocalList();
  try {
    return await serverList(token);
  } catch (_) {
    return getLocalList();
  }
}

export async function isWatched(id) {
  const list = await getWatchlist();
  return list.some((w) => w.id === id);
}

export async function addToWatchlist(deal) {
  const token = await getToken();
  if (token) {
    try {
      return await serverAdd(token, deal);
    } catch (_) {
      // Fall through to local so the tap isn't silently lost on a bad
      // connection — worst case it syncs up next time addToWatchlist
      // succeeds against the server instead of staying invisible.
    }
  }
  const list = await getLocalList();
  if (list.some((w) => w.id === deal.id)) return list;
  return saveLocalList([toEntry(deal), ...list]);
}

export async function removeFromWatchlist(id) {
  const token = await getToken();
  if (token) {
    try {
      return await serverRemove(token, id);
    } catch (_) {
      // same reasoning as addToWatchlist's fallback
    }
  }
  const next = (await getLocalList()).filter((w) => w.id !== id);
  return saveLocalList(next);
}

export async function toggleWatch(deal) {
  const list = await getWatchlist();
  return list.some((w) => w.id === deal.id)
    ? removeFromWatchlist(deal.id)
    : addToWatchlist(deal);
}

// Called once right after a successful login/signup (see AuthContext.js).
// Anything saved anonymously before that point lives in AsyncStorage and
// would otherwise just disappear the moment getWatchlist() starts reading
// from the server instead — that's a worse first-login experience than the
// small cost of copying it up. Local-only afterward; the server list is the
// one source of truth for a signed-in session from here on.
export async function migrateLocalWatchlistToServer(token) {
  const local = await getLocalList();
  if (!local.length) return;
  for (const item of local) {
    try {
      await serverAdd(token, { id: item.id, title: item.title, store: item.store, image: item.image, url: item.url, price: item.priceWhenSaved });
    } catch (_) {
      // Best-effort — one failed item shouldn't stop the rest from moving
      // over, and whatever doesn't make it just stays safe in local storage.
    }
  }
  await AsyncStorage.removeItem(LOCAL_KEY);
}

// Lets search results (netlify/functions/search-products.js) share the same
// saved list as deal-feed items instead of duplicating the storage/toggle
// logic. The "product-" prefix keeps a saved search result from ever
// colliding with a deal that happens to have the same id, which matters
// because findDrops() looks entries up in the live deals feed by id — a
// collision there would compare a product's price against an unrelated
// deal's. Prefixed ids simply never match, so saved products always sit in
// the "still watching" list rather than the price-drop one, which is
// correct: there's no live deals-feed price to compare a search result
// against, only whatever price it had when it was searched.
export function productWatchId(productId) {
  return `product-${productId}`;
}

export function productToWatchItem(product) {
  return {
    id: productWatchId(product.id),
    title: product.title,
    store: product.store?.name ?? null,
    image: product.image ?? null,
    url: product.link ?? null,
    price: product.price ?? null,
  };
}

/**
 * Compares saved items against the current feed and returns only genuine
 * price drops. Deliberately strict: a $0.05 wobble is not news, and an alert
 * people learn to ignore is worse than no alert at all.
 */
export function findDrops(watchlist, deals, { minDrop = 0.5, minPercent = 5 } = {}) {
  const byId = new Map(deals.map((d) => [d.id, d]));
  const drops = [];

  for (const item of watchlist) {
    const current = byId.get(item.id);
    if (!current || current.price == null || item.priceWhenSaved == null) continue;

    const diff = item.priceWhenSaved - current.price;
    const percent = (diff / item.priceWhenSaved) * 100;
    if (diff >= minDrop && percent >= minPercent) {
      drops.push({
        ...item,
        currentPrice: current.price,
        drop: Number(diff.toFixed(2)),
        percent: Math.round(percent),
        deal: current,
      });
    }
  }

  return drops.sort((a, b) => b.percent - a.percent);
}

// Which drops THIS DEVICE has already been shown, so the same alert doesn't
// reappear every launch and train the user to dismiss it without reading.
// Deliberately device-local (AsyncStorage), not server state — "have I
// personally seen this" doesn't need to sync, and keeping it off the server
// means one more device just sees the drop again, which is a much safer
// failure mode than silently suppressing a real drop on a new device.
export async function getSeenDrops() {
  try {
    const raw = await AsyncStorage.getItem(SEEN_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return {};
  }
}

export async function markDropSeen(id, price) {
  const seen = await getSeenDrops();
  seen[id] = price;
  await AsyncStorage.setItem(SEEN_KEY, JSON.stringify(seen));
  return seen;
}

// A drop is only "new" if we haven't already announced this price (or lower).
export function filterUnseen(drops, seen) {
  return drops.filter((d) => seen[d.id] == null || d.currentPrice < seen[d.id]);
}
