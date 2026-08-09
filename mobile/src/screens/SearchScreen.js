import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../api/client";
import ProductCard from "../components/ProductCard";
import { colors, radius, spacing } from "../theme";
import {
  addRecentSearch,
  clearRecentSearches,
  getRecentSearches,
  removeRecentSearch,
} from "../utils/recentSearches";

export default function SearchScreen({ navigation }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recent, setRecent] = useState([]);
  const [showRecent, setShowRecent] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    api.categories().then(setCategories).catch(() => {});
    getRecentSearches().then(setRecent);
  }, []);

  const load = useCallback(async (q, cat) => {
    setLoading(true);
    try {
      const data = await api.searchProducts(q, cat);
      // Fetch cheapest price for each product for the list display.
      setProducts(data);
    } catch (_) {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search as you type.
  useEffect(() => {
    const t = setTimeout(() => load(query, category), 250);
    return () => clearTimeout(t);
  }, [query, category, load]);

  function onChangeQuery(text) {
    setQuery(text);
    setShowRecent(text.trim().length === 0);
  }

  function onFocusSearch() {
    if (query.trim().length === 0) setShowRecent(true);
  }

  // Records `term` into recent-search history without changing what's typed
  // — used on submit and on blur (the two moments that mean "the user is
  // done with this search"), not on every keystroke.
  async function recordSearch(term) {
    const trimmed = term.trim();
    if (!trimmed) return;
    setRecent(await addRecentSearch(trimmed));
  }

  function onSubmitSearch() {
    recordSearch(query);
    setShowRecent(false);
  }

  // Typing and then tapping away (e.g. to look at results) should count as
  // a real search too, not just pressing Enter.
  function onBlurSearch() {
    recordSearch(query);
  }

  // Tapping a recent term re-runs it and re-bumps it to the front.
  function selectRecent(term) {
    setQuery(term);
    setShowRecent(false);
    recordSearch(term);
  }

  async function onRemoveRecent(term) {
    setRecent(await removeRecentSearch(term));
  }

  async function onClearRecent() {
    setRecent(await clearRecentSearches());
    setShowRecent(false);
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          ref={inputRef}
          style={styles.searchInput}
          placeholder="Search products, e.g. milk"
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={onChangeQuery}
          onFocus={onFocusSearch}
          onBlur={onBlurSearch}
          onSubmitEditing={onSubmitSearch}
          returnKeyType="search"
          autoCapitalize="none"
        />
        <TouchableOpacity style={styles.scanButton} hitSlop={8}>
          <Ionicons name="barcode-outline" size={18} color={colors.primaryDark} />
        </TouchableOpacity>
      </View>

      {showRecent && (
        <>
          {/* Tapping outside the dropdown closes it without swallowing taps
              on the rows/Clear button inside (those sit above this layer). */}
          <Pressable style={styles.recentOverlay} onPress={() => setShowRecent(false)} />
          <View style={styles.recentCard}>
            <View style={styles.recentHeader}>
              <Text style={styles.recentTitle}>Recent</Text>
              {recent.length > 0 && (
                <TouchableOpacity onPress={onClearRecent} hitSlop={8}>
                  <Text style={styles.recentClear}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>

            {recent.length === 0 ? (
              <Text style={styles.recentEmpty}>No recent searches yet.</Text>
            ) : (
              recent.map((term) => (
                <View key={term} style={styles.recentRow}>
                  <TouchableOpacity
                    style={styles.recentRowMain}
                    onPress={() => selectRecent(term)}
                  >
                    <Ionicons name="time-outline" size={16} color={colors.textMuted} />
                    <Text style={styles.recentText}>{term}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => onRemoveRecent(term)} hitSlop={8}>
                    <Ionicons name="close" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        </>
      )}

      <View style={{ height: 44 }}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={["", ...categories]}
          keyExtractor={(item) => item || "all"}
          contentContainerStyle={{ paddingHorizontal: spacing.md }}
          renderItem={({ item }) => {
            const selected = item === category;
            return (
              <TouchableOpacity
                style={[styles.chip, selected && styles.chipActive]}
                onPress={() => setCategory(item)}
              >
                <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                  {item || "All"}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingVertical: spacing.sm }}
          ListEmptyComponent={
            <Text style={styles.empty}>No products found. Try another search.</Text>
          }
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              cheapest={null}
              onPress={() =>
                navigation.navigate("ProductDetail", { id: item.id, name: item.name })
              }
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    margin: spacing.md,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    height: 52,
    gap: spacing.sm,
    // Soft shadow instead of a hard border, matching the Figma search bar.
    shadowColor: "#0F2A18",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    // RN Web renders this as a real <input> that gets the browser's default
    // focus ring; we draw our own via the pill container instead.
    ...(Platform.OS === "web" ? { outlineStyle: "none" } : null),
  },
  scanButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  recentOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: -1000,
    zIndex: 5,
  },
  recentCard: {
    position: "absolute",
    top: 68,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.card,
    // Square top corners so this reads as an extension of the search bar
    // right above it, not a separate floating card.
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
    padding: spacing.md,
    zIndex: 10,
    shadowColor: "#0F2A18",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  recentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  recentTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
  recentClear: { fontSize: 13, fontWeight: "700", color: colors.primaryDark },
  recentEmpty: { fontSize: 13, color: colors.textMuted, paddingVertical: spacing.sm },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
  },
  recentRowMain: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flex: 1 },
  recentText: { fontSize: 14, color: colors.text },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
    height: 34,
    justifyContent: "center",
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: 13 },
  chipTextActive: { color: "#fff", fontWeight: "700" },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: spacing.xl },
});
