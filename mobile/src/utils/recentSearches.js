// Persists the last few search terms locally (AsyncStorage) so the search
// bar can show a "Recent" dropdown, like the Figma design.
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "pickly_recent_searches";
const MAX_ITEMS = 5;

export async function getRecentSearches() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

// Adds `query` to the front, de-duping case-insensitively and capping at
// MAX_ITEMS. Returns the new list.
export async function addRecentSearch(query) {
  const trimmed = query.trim();
  if (!trimmed) return getRecentSearches();

  const current = await getRecentSearches();
  const deduped = current.filter((q) => q.toLowerCase() !== trimmed.toLowerCase());
  const next = [trimmed, ...deduped].slice(0, MAX_ITEMS);

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export async function removeRecentSearch(query) {
  const current = await getRecentSearches();
  const next = current.filter((q) => q !== query);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export async function clearRecentSearches() {
  await AsyncStorage.removeItem(STORAGE_KEY);
  return [];
}
