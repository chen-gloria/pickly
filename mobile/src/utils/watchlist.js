// The watchlist — where the price history turns into retention.
//
// History on its own doesn't bring anyone back; "the thing you wanted just
// hit its lowest price" does. Each entry records the price at the moment it
// was saved, so we can say something concrete later ("$2.40 cheaper than
// when you saved it") rather than a vague "price dropped".
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "pickly_watchlist";
const SEEN_KEY = "pickly_watchlist_seen";

export async function getWatchlist() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

export async function isWatched(id) {
  const list = await getWatchlist();
  return list.some((w) => w.id === id);
}

export async function addToWatchlist(deal) {
  const list = await getWatchlist();
  if (list.some((w) => w.id === deal.id)) return list;

  const entry = {
    id: deal.id,
    title: deal.title,
    rawTitle: deal.rawTitle,
    store: deal.store,
    image: deal.image,
    url: deal.url,
    // The anchor for every later comparison.
    priceWhenSaved: deal.price ?? null,
    savedAt: new Date().toISOString(),
  };
  const next = [entry, ...list];
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export async function removeFromWatchlist(id) {
  const next = (await getWatchlist()).filter((w) => w.id !== id);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export async function toggleWatch(deal) {
  const list = await getWatchlist();
  return list.some((w) => w.id === deal.id)
    ? removeFromWatchlist(deal.id)
    : addToWatchlist(deal);
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

// Which drops the user has already been shown, so the same alert doesn't
// reappear every launch and train them to dismiss it without reading.
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
