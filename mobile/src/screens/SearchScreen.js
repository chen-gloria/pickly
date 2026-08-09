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
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../api/client";
import ProductCard from "../components/ProductCard";
import { colors, radius, spacing } from "../theme";
import {
  addRecentSearch,
  clearRecentSearches,
  getRecentSearches,
  removeRecentSearch,
} from "../utils/recentSearches";

// Best-fit icon per category. Falls back to a generic tag icon for any
// category the mock/real data introduces later that isn't listed here.
const CATEGORY_ICONS = {
  Dairy: "cow",
  Bakery: "bread-slice",
  Meat: "food-drumstick",
  Produce: "carrot",
};

export default function SearchScreen({ navigation }) {
  const [query, setQuery] = useState("");
  // Multiple categories can be selected at once — an empty array means "no
  // filter, show everything" (there's no separate "All" chip for that).
  const [selectedCategories, setSelectedCategories] = useState([]);
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

  const load = useCallback(async (q, cats) => {
    setLoading(true);
    try {
      const data = await api.searchProducts(q, cats);
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
    const t = setTimeout(() => load(query, selectedCategories), 250);
    return () => clearTimeout(t);
  }, [query, selectedCategories, load]);

  // Tapping a category adds it to the filter; tapping an already-selected
  // one removes it again. Any number of categories can be active together.
  function toggleCategory(cat) {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

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
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.logoBox}>
          <Ionicons name="cart" size={22} color={colors.primaryDark} />
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity hitSlop={8} onPress={() => navigation.navigate("Profile")}>
            <Ionicons name="person-outline" size={22} color={colors.primaryDark} />
          </TouchableOpacity>
          <TouchableOpacity hitSlop={8}>
            <Ionicons name="options-outline" size={22} color={colors.primaryDark} />
          </TouchableOpacity>
          <TouchableOpacity hitSlop={8}>
            <Ionicons name="heart-outline" size={22} color={colors.primaryDark} />
          </TouchableOpacity>
        </View>
      </View>

      {/* The dropdown positions itself relative to THIS wrapper (not the
          screen), so it always lines up with the bar no matter what sits
          above it (header height, safe-area insets, etc). */}
      <View style={styles.searchWrap}>
        <View style={[styles.searchBar, showRecent && styles.searchBarConnected]}>
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
      </View>

      <Text style={styles.categoriesTitle}>Categories</Text>
      <View style={{ height: 44 }}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={(item) => item}
          contentContainerStyle={{ paddingHorizontal: spacing.md }}
          renderItem={({ item }) => {
            const selected = selectedCategories.includes(item);
            const iconName = CATEGORY_ICONS[item] || "tag-outline";
            return (
              <TouchableOpacity
                style={[styles.chip, selected && styles.chipActive]}
                onPress={() => toggleCategory(item)}
              >
                <MaterialCommunityIcons
                  name={iconName}
                  size={15}
                  color={selected ? "#fff" : colors.primaryDark}
                />
                <Text style={[styles.chipText, selected && styles.chipTextActive]}>{item}</Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  logoBox: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.iconBg,
    alignItems: "center",
    justifyContent: "center",
  },
  headerIcons: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  // Explicit zIndex here (not just on recentCard) so this whole wrapper is
  // unambiguously compared against later siblings (Categories, product
  // list) as one stacking unit — relying on recentCard's own zIndex alone
  // doesn't reliably win against them on RN Web.
  searchWrap: { zIndex: 10 },
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
    // Must paint above recentOverlay (zIndex 5) once the dropdown is open,
    // otherwise the overlay's own "pointer" cursor covers the bar and the
    // input never gets real hover/click access to itself.
    zIndex: 6,
  },
  // While the Recent panel is open, the bar's bottom corners go square and
  // its shadow drops out — together with the panel's square top corners
  // (recentCard below) this reads as one continuous shape, not two stacked
  // cards.
  searchBarConnected: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    shadowOpacity: 0,
    elevation: 0,
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
    // A blurred shadow spreads `shadowRadius` px past the box's edge in
    // every direction, including upward — with a small offset that leak
    // shows as a seam right where this card meets the search bar above it.
    // Keeping offset >= radius confines the shadow to the sides/bottom only.
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 12 },
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
  categoriesTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
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
  chipText: { color: colors.primaryDark, fontSize: 13, fontWeight: "600" },
  chipTextActive: { color: "#fff", fontWeight: "700" },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: spacing.xl },
});
