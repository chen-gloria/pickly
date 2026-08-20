// The four retailers the filter offers, and how to tell which one a deal
// actually belongs to.
//
// Two very different data shapes need normalising to the same four values:
//   - OzBargain deals: `store` is free text lifted from a forum title
//     ("Woolworths", "Amazon AU", "Flybuys (Activation Required)"...) — see
//     scripts/lib/ozbargain.js's extractStore(). Needs pattern matching.
//   - Search results (netlify/functions/search-products.js): already have a
//     clean `retailer.name` from a fixed allow-list — no matching needed,
//     just compare the string.
//   - Alpha Fresh deals (netlify/functions/alphafresh-deals.js): synthetic,
//     always tagged "Alpha Fresh" directly at creation.
//
// Persistence below is dual-backed exactly like utils/watchlist.js: signed-in
// users get netlify/functions/store-filters.js (Postgres, store_filters
// table) so the choice follows the account across devices; signed-out users
// get AsyncStorage only. Two independent lists (recommendation feed / search)
// per the user's design — an empty list means "no filter, show everything",
// not "show nothing", so there's no separate all-selected state to track.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getToken } from "./authToken";

// "OzBargain" is a 5th, deliberately different kind of entry — it's not a
// retailer, it's the community feed itself, standing in for every deal that
// doesn't carry one of the other four brand names (Amazon, Bunnings, Chemist
// Warehouse, gift-card resellers, generic community finds — see
// normalizeDealStore below). Without it, most of the deals feed had no
// filter chip that would ever show it at all.
export const STORES = ["Coles", "Woolworths", "ALDI", "Alpha Fresh", "OzBargain"];

// Each store's own brand color, for the small monogram badge shown next to
// its name on deal/product cards (DealCard.js, DealRow.js, ProductCard.js —
// see StoreBadge.js). Deliberately NOT real logo images: Coles/Woolworths/
// ALDI's marks are registered trademarks and there's no license here to
// reproduce them, so a colored initial in the store's own real brand color
// is the actual logo's job (instant brand recognition) without the legal
// exposure — and it holds up at the ~16px size these cards render at, where
// a real multi-color logo would just be mush anyway. Kept alongside
// search-products.js's RETAILERS list (same colors) rather than importing
// from there, since that file also lists 6 non-filterable retailers this
// map has no opinion on. OzBargain's own site uses this orange as its brand
// color too — same "real color, no artwork" reasoning as the others.
export const STORE_COLORS = {
  Coles: "#E2231A",
  Woolworths: "#1E7A34",
  ALDI: "#0060A9",
  "Alpha Fresh": "#2E7D32",
  OzBargain: "#F2851C",
};

// Checked in order against free-text store names. Coles/Woolworths/ALDI
// deals on OzBargain are occasionally posted through a rewards/cashback
// intermediary ("Commbank Yello (Activation Required)", "Cashrewards") —
// those stay unmatched (null) rather than guessing, since the deal isn't
// actually redeemable at the supermarket checkout the way a direct post is.
const PATTERNS = [
  ["Woolworths", /woolworths|woolies/i],
  ["Coles", /\bcoles\b/i],
  ["ALDI", /\baldi\b/i],
  ["Alpha Fresh", /alpha\s*fresh/i],
];

// Matches only the four actual retailer brands, or null. Used for search
// results (netlify/functions/search-products.js's RETAILERS allow-list) —
// those are real-time Google Shopping results, never OzBargain posts, so an
// unmatched one (Amazon AU, Kmart, ...) has no "OzBargain" to fall back to;
// it's just not one of the four this filter singles out.
export function normalizeStore(rawStoreName) {
  if (!rawStoreName) return null;
  for (const [store, pattern] of PATTERNS) {
    if (pattern.test(rawStoreName)) return store;
  }
  return null;
}

// Deals only ever come from two pipelines (see netlify/functions/deals.js):
// the OzBargain community feed, whose free-text store names sometimes name
// one of the four brands and sometimes don't (Amazon, Bunnings, a generic
// "half price at IGA" post...), and Alpha Fresh's own catalogue, always
// tagged "Alpha Fresh" directly at creation. So unlike normalizeStore above,
// an unmatched deal isn't actually unrecognized — every deal that isn't
// Alpha Fresh and isn't one of the three supermarkets is, definitionally,
// still a real OzBargain community post.
export function normalizeDealStore(rawStoreName) {
  return normalizeStore(rawStoreName) || "OzBargain";
}

const LOCAL_KEY = "pickly_store_filters";
const ENDPOINT = "/.netlify/functions/store-filters";
const DEFAULT_FILTERS = { recommendationStores: [], searchStores: [], leaderboardStores: [] };

async function getLocalFilters() {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_KEY);
    return raw ? { ...DEFAULT_FILTERS, ...JSON.parse(raw) } : { ...DEFAULT_FILTERS };
  } catch (_) {
    return { ...DEFAULT_FILTERS };
  }
}

async function saveLocalFilters(filters) {
  await AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(filters));
  return filters;
}

async function serverGetFilters(token) {
  const res = await fetch(ENDPOINT, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`store-filters fetch failed (${res.status})`);
  const data = await res.json();
  return { ...DEFAULT_FILTERS, ...data };
}

async function serverSetFilters(token, patch) {
  const res = await fetch(ENDPOINT, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`store-filters update failed (${res.status})`);
  const data = await res.json();
  return { ...DEFAULT_FILTERS, ...data };
}

// Reads all three lists. Call once and destructure — cheaper than three
// round trips when the Profile screen needs every section at once.
export async function getStoreFilters() {
  const token = await getToken();
  if (!token) return getLocalFilters();
  try {
    return await serverGetFilters(token);
  } catch (_) {
    return getLocalFilters();
  }
}

const GROUP_FIELDS = {
  recommendation: "recommendationStores",
  search: "searchStores",
  leaderboard: "leaderboardStores",
};

// group is "recommendation", "search", or "leaderboard". Writes only that
// list — the others stay whatever they already were (see store-filters.js's
// COALESCE upsert / the local merge below).
async function setGroup(group, stores) {
  const field = GROUP_FIELDS[group];
  const token = await getToken();
  if (token) {
    try {
      return await serverSetFilters(token, { [field]: stores });
    } catch (_) {
      // fall through to local, same reasoning as watchlist.js's writes
    }
  }
  const current = await getLocalFilters();
  return saveLocalFilters({ ...current, [field]: stores });
}

export function setRecommendationStores(stores) {
  return setGroup("recommendation", stores);
}

export function setSearchStores(stores) {
  return setGroup("search", stores);
}

export function setLeaderboardStores(stores) {
  return setGroup("leaderboard", stores);
}

// Toggles one store within a group and returns the updated full list of
// selected stores for that group (not the whole filters object) — matches
// how the Profile screen chips want to update their own selection state.
export async function toggleStoreInGroup(group, store, currentSelection) {
  const next = currentSelection.includes(store)
    ? currentSelection.filter((s) => s !== store)
    : [...currentSelection, store];
  await setGroup(group, next);
  return next;
}

// Called once right after a successful login/signup (see AuthContext.js),
// same moment as migrateLocalWatchlistToServer. Only migrates if the server
// has no filters set yet (both empty) — otherwise an existing account's
// deliberate choice would get overwritten by whatever an anonymous session
// on this device happened to have selected.
export async function migrateLocalStoreFiltersToServer(token) {
  const local = await getLocalFilters();
  if (
    !local.recommendationStores.length &&
    !local.searchStores.length &&
    !local.leaderboardStores.length
  )
    return;
  try {
    const serverFilters = await serverGetFilters(token);
    if (
      serverFilters.recommendationStores.length ||
      serverFilters.searchStores.length ||
      serverFilters.leaderboardStores.length
    ) {
      // Account already has real preferences — don't clobber them.
      await AsyncStorage.removeItem(LOCAL_KEY);
      return;
    }
    await serverSetFilters(token, local);
  } catch (_) {
    // Best-effort, same as watchlist migration — local copy just stays put
    // and will be retried next time this runs.
    return;
  }
  await AsyncStorage.removeItem(LOCAL_KEY);
}

// Applies a selected-stores list to a list of deals/products. Empty
// selection means unfiltered/"All" (show everything) — see the header
// comment and ProfileScreen.js's "All" chip. `getNormalizedStore` already
// returns one of STORES (or null) — callers pick normalizeStore vs.
// normalizeDealStore themselves, since which one is correct depends on
// whether the items are deals (OzBargain fallback makes sense) or search
// results (it doesn't — see normalizeDealStore's comment).
export function applyStoreFilter(items, selectedStores, getNormalizedStore) {
  if (!selectedStores || !selectedStores.length) return items;
  return items.filter((item) => {
    const normalized = getNormalizedStore(item);
    return normalized && selectedStores.includes(normalized);
  });
}
