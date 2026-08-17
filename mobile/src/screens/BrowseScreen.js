// The home tab — one screen, not two.
//
// This replaces what used to be separate Deals and Compare tabs. They were
// two independent products sharing a tab bar: a live judged deal feed with
// no connection to the reference catalog for the same kind of thing. The
// fix isn't cosmetic — one category rail now drives both halves of one
// continuous scroll:
//   1. Live deals, verdict-judged from real OzBargain data + real recorded
//      price history (see utils/priceHistory.js) — editorial, curated.
//   2. The full searchable catalog for that same category — reference,
//      exhaustive.
// Picking "Electronics" narrows both at once. That's the whole point.
//
// Verdicts are NEVER computed for catalog items — only for real deals
// matched against real history. The two halves are bridged by category,
// not by pretending the mock catalog has price history it doesn't.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../api/client";
import { fetchDeals, timeAgo, DEAL_SOURCE } from "../api/deals";
import { dealCategoryFor } from "../api/mockData";
import DealHeroCard from "../components/DealHeroCard";
import DealRow from "../components/DealRow";
import ProductCard from "../components/ProductCard";
import BestValueCard from "../components/BestValueCard";
import { groupByVerdict, trackingDays as getTrackingDays } from "../utils/priceHistory";
import {
  addRecentSearch,
  clearRecentSearches,
  getRecentSearches,
  removeRecentSearch,
} from "../utils/recentSearches";
import {
  getWatchlist,
  toggleWatch,
  productToWatchItem,
  productWatchId,
} from "../utils/watchlist";
import { colors, radius, spacing, type } from "../theme";

// Best-fit icon per category, including the two categories that only exist
// because a real OzBargain feed for them does (see scripts/lib/ozbargain.js).
// Falls back to a generic tag icon for anything not listed here.
const CATEGORY_ICONS = {
  Dairy: "cow",
  Bakery: "bread-slice",
  Meat: "food-drumstick",
  Produce: "food-apple",
  Pantry: "basket-outline",
  Beverages: "bottle-soda-classic",
  Frozen: "snowflake",
  Snacks: "popcorn",
  "Health & Beauty": "pill",
  Electronics: "headphones",
  "Home & Garden": "watering-can",
};

export default function BrowseScreen({ navigation }) {
  const [query, setQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [recent, setRecent] = useState([]);
  const [showRecent, setShowRecent] = useState(false);
  const inputRef = useRef(null);

  const [deals, setDeals] = useState([]);
  const [capturedAt, setCapturedAt] = useState(null);
  const [source, setSource] = useState(null);
  const [dealsLoading, setDealsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState({ wait: true, tracking: true, skip: false });

  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [bestValue, setBestValue] = useState([]);

  // One watchlist, one set of ids — a saved deal (DealRow's bookmark) and a
  // saved catalog product (ProductCard's heart) both live in the same
  // AsyncStorage list, so either surface reflects the other immediately.
  const [watchedIds, setWatchedIds] = useState(new Set());

  const loadDeals = useCallback(async () => {
    const res = await fetchDeals();
    setDeals(res.deals);
    setCapturedAt(res.capturedAt);
    setSource(res.source);
    setDealsLoading(false);
  }, []);

  const loadProducts = useCallback(async (q, cats) => {
    setProductsLoading(true);
    try {
      setProducts(await api.searchProducts(q, cats));
    } catch (_) {
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDeals();
    api.categories().then(setCategories).catch(() => {});
    api.bestValue().then(setBestValue).catch(() => {});
    getRecentSearches().then(setRecent);
    getWatchlist().then((list) => setWatchedIds(new Set(list.map((w) => w.id))));
  }, [loadDeals]);

  // Debounced catalog search as you type — same 250ms feel as before.
  useEffect(() => {
    const t = setTimeout(() => loadProducts(query, selectedCategories), 250);
    return () => clearTimeout(t);
  }, [query, selectedCategories, loadProducts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDeals();
    setRefreshing(false);
  }, [loadDeals]);

  function openDeal(deal) {
    Linking.openURL(deal.url).catch(() => {});
  }

  async function onToggleWatchDeal(deal) {
    const next = await toggleWatch(deal);
    setWatchedIds(new Set(next.map((w) => w.id)));
  }

  async function onToggleWatchProduct(product) {
    const next = await toggleWatch(productToWatchItem(product));
    setWatchedIds(new Set(next.map((w) => w.id)));
  }

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
  async function recordSearch(term) {
    const trimmed = term.trim();
    if (!trimmed) return;
    setRecent(await addRecentSearch(trimmed));
  }
  function onSubmitSearch() {
    recordSearch(query);
    setShowRecent(false);
  }
  function onBlurSearch() {
    recordSearch(query);
  }
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

  function toggleSection(section) {
    setExpanded((prev) => ({ ...prev, [section]: !prev[section] }));
  }

  const searching = query.trim().length > 0;

  // The bridge: which real deal categories the selected catalog chips imply.
  // Empty selection = no filter. Several grocery subcategories can map to
  // the same "Groceries" deal category — dedupe with a Set.
  const impliedDealCategories = useMemo(
    () => new Set(selectedCategories.map(dealCategoryFor)),
    [selectedCategories]
  );
  const categoryFilteredDeals = useMemo(() => {
    if (impliedDealCategories.size === 0) return deals;
    return deals.filter((d) => impliedDealCategories.has(d.category));
  }, [deals, impliedDealCategories]);

  const matchingDeals = useMemo(() => {
    if (!searching) return [];
    const q = query.trim().toLowerCase();
    return categoryFilteredDeals
      .filter((d) => d.title.toLowerCase().includes(q))
      .sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0))
      .slice(0, 5);
  }, [searching, query, categoryFilteredDeals]);

  const filteredBestValue = useMemo(() => {
    if (selectedCategories.length === 0) return bestValue;
    return bestValue.filter((p) => selectedCategories.includes(p.category));
  }, [bestValue, selectedCategories]);

  const buckets = useMemo(() => groupByVerdict(categoryFilteredDeals), [categoryFilteredDeals]);
  const trackingDays = useMemo(() => getTrackingDays(), []);
  const hero = buckets.buy[0] || categoryFilteredDeals[0] || null;
  const heroIsVerified = buckets.buy.length > 0;
  const headline =
    buckets.buy.length > 0
      ? `${buckets.buy.length} worth buying`
      : `${categoryFilteredDeals.length} deals today`;

  // One flattened list of heterogeneous rows — deals first (the judged,
  // differentiated part), then the reference catalog. Everything above the
  // FlatList's own `data` (search bar, category rail, hero) lives in
  // ListHeaderComponent instead, since it doesn't scroll away per-row.
  const rows = useMemo(() => {
    const out = [];

    if (searching) {
      if (matchingDeals.length) {
        out.push({ type: "sectionLabel", key: "s-deals", label: "Live deals matching your search" });
        for (const d of matchingDeals) out.push({ type: "deal", key: `d-${d.id}`, deal: d });
      }
    } else {
      const push = (key, label, hint, items, collapsible) => {
        if (!items.length) return;
        out.push({
          type: "verdictHeader",
          key: `h-${key}`,
          section: key,
          label,
          hint,
          count: items.length,
          collapsible,
        });
        if (!collapsible || expanded[key]) {
          for (const d of items) out.push({ type: "deal", key: `d-${d.id}`, deal: d });
        }
      };
      push("buy", "We'd buy these", "we can show you why", buckets.buy, false);
      push("wait", "Close, but not the lowest", "you could do better", buckets.wait, true);
      push("tracking", "Everything else today", "ranked by community votes", buckets.tracking, true);
      push("skip", "We'd skip these", "cheaper before", buckets.skip, true);
    }

    out.push({
      type: "catalogHeader",
      key: "catalog-header",
      label: searching ? "In the catalog" : "Full catalog",
    });

    if (productsLoading) {
      out.push({ type: "catalogLoading", key: "catalog-loading" });
    } else if (products.length === 0) {
      out.push({ type: "catalogEmpty", key: "catalog-empty" });
    } else {
      for (const p of products) out.push({ type: "product", key: `p-${p.id}`, product: p });
    }

    return out;
  }, [searching, matchingDeals, buckets, expanded, products, productsLoading]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.key}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        renderItem={({ item }) => {
          if (item.type === "sectionLabel") {
            return (
              <View style={styles.sectionLabelRow}>
                <Text style={styles.sectionLabelText}>{item.label}</Text>
              </View>
            );
          }
          if (item.type === "verdictHeader") {
            return (
              <TouchableOpacity
                style={styles.sectionHead}
                activeOpacity={item.collapsible ? 0.6 : 1}
                onPress={() => item.collapsible && toggleSection(item.section)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>
                    {item.label} <Text style={styles.sectionCount}>{item.count}</Text>
                  </Text>
                  <Text style={styles.sectionHint}>{item.hint}</Text>
                </View>
                {item.collapsible && (
                  <Ionicons
                    name={expanded[item.section] ? "chevron-up" : "chevron-down"}
                    size={18}
                    color={colors.textMuted}
                  />
                )}
              </TouchableOpacity>
            );
          }
          if (item.type === "deal") {
            return (
              <DealRow
                deal={item.deal}
                onPress={() => openDeal(item.deal)}
                watched={watchedIds.has(item.deal.id)}
                onToggleWatch={() => onToggleWatchDeal(item.deal)}
              />
            );
          }
          if (item.type === "catalogHeader") {
            return (
              <View>
                <Text style={styles.catalogTitle}>{item.label}</Text>
                {filteredBestValue.length > 0 && (
                  <View style={styles.bestValueSection}>
                    <Text style={styles.bestValueTitle}>Best Value Today</Text>
                    <FlatList
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      data={filteredBestValue}
                      keyExtractor={(p) => `bv-${p.id}`}
                      contentContainerStyle={{ paddingHorizontal: spacing.md }}
                      renderItem={({ item: p }) => (
                        <BestValueCard
                          product={p}
                          onPress={() =>
                            navigation.navigate("ProductDetail", { id: p.id, name: p.name })
                          }
                        />
                      )}
                    />
                  </View>
                )}
              </View>
            );
          }
          if (item.type === "catalogLoading") {
            return <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />;
          }
          if (item.type === "catalogEmpty") {
            return (
              <Text style={styles.empty}>
                {searching ? `No results for "${query.trim()}".` : "No products found."}
              </Text>
            );
          }
          // product
          return (
            <ProductCard
              product={item.product}
              cheapest={null}
              favorited={watchedIds.has(productWatchId(item.product.id))}
              onFavoritePress={onToggleWatchProduct}
              onPress={() =>
                navigation.navigate("ProductDetail", { id: item.product.id, name: item.product.name })
              }
            />
          );
        }}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <View style={styles.logoBox}>
                <Ionicons name="cart" size={22} color={colors.primary} />
              </View>
              <View style={styles.headerIcons}>
                <TouchableOpacity hitSlop={8} onPress={() => navigation.navigate("Favorites")}>
                  <Ionicons name="heart-outline" size={22} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity hitSlop={8} onPress={() => navigation.navigate("Profile")}>
                  <Ionicons name="person-outline" size={22} color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.searchWrap}>
              <View style={[styles.searchBar, showRecent && styles.searchBarConnected]}>
                <Ionicons name="search" size={18} color={colors.textMuted} />
                <TextInput
                  ref={inputRef}
                  style={styles.searchInput}
                  placeholder="Search deals & products, e.g. milk"
                  placeholderTextColor={colors.textMuted}
                  value={query}
                  onChangeText={onChangeQuery}
                  onFocus={onFocusSearch}
                  onBlur={onBlurSearch}
                  onSubmitEditing={onSubmitSearch}
                  returnKeyType="search"
                  autoCapitalize="none"
                />
              </View>

              {showRecent && (
                <>
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
                          <TouchableOpacity style={styles.recentRowMain} onPress={() => selectRecent(term)}>
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

            <View style={{ height: 44 }}>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={categories}
                keyExtractor={(c) => c}
                contentContainerStyle={{ paddingHorizontal: spacing.md }}
                renderItem={({ item: cat }) => {
                  const selected = selectedCategories.includes(cat);
                  const iconName = CATEGORY_ICONS[cat] || "tag-outline";
                  return (
                    <TouchableOpacity
                      style={[styles.chip, selected && styles.chipActive]}
                      onPress={() => toggleCategory(cat)}
                    >
                      <MaterialCommunityIcons
                        name={iconName}
                        size={15}
                        color={selected ? colors.onPrimary : colors.primary}
                      />
                      <Text style={[styles.chipText, selected && styles.chipTextActive]}>{cat}</Text>
                    </TouchableOpacity>
                  );
                }}
              />
            </View>

            {!searching && (
              <>
                <View style={styles.dealsHeader}>
                  <Text style={styles.kicker}>TODAY</Text>
                  <Text style={styles.headline}>{headline}</Text>
                  <View style={styles.statusRow}>
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: source === DEAL_SOURCE.LIVE ? colors.primary : colors.textFaint },
                      ]}
                    />
                    <Text style={styles.statusText}>
                      {categoryFilteredDeals.length} checked
                      {capturedAt ? ` · ${timeAgo(capturedAt)}` : ""}
                    </Text>
                  </View>
                </View>

                {dealsLoading ? (
                  <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />
                ) : (
                  <>
                    {hero && <DealHeroCard deal={hero} onPress={() => openDeal(hero)} />}
                    {!heroIsVerified && categoryFilteredDeals.length > 0 && (
                      <View style={styles.buildingNote}>
                        <Ionicons name="hourglass-outline" size={15} color={colors.accent} />
                        <Text style={styles.buildingText}>
                          <Text style={styles.buildingStrong}>We're building price history.</Text>{" "}
                          Once we've watched an item long enough, you'll see whether it's genuinely
                          cheap — not just discounted. Day {trackingDays}.
                        </Text>
                      </View>
                    )}
                  </>
                )}
              </>
            )}
          </View>
        }
        ListFooterComponent={
          <View style={styles.footer}>
            <Text style={styles.footerText}>Live deals sourced from OzBargain's community</Text>
            <Text style={styles.footerSub}>Pull down to refresh</Text>
          </View>
        }
      />
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
  searchWrap: { zIndex: 10 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    margin: spacing.md,
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
    height: 52,
    gap: spacing.sm,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
    zIndex: 6,
  },
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
    ...(Platform.OS === "web" ? { outlineStyle: "none" } : null),
  },
  recentOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: -1000,
    zIndex: 5,
    ...(Platform.OS === "web" ? { cursor: "default" } : null),
  },
  recentCard: {
    position: "absolute",
    top: 68,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.card,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
    padding: spacing.md,
    zIndex: 10,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  recentHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  recentTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
  recentClear: { fontSize: 13, fontWeight: "700", color: colors.primary },
  recentEmpty: { fontSize: 13, color: colors.textMuted, paddingVertical: spacing.sm },
  recentRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing.sm },
  recentRowMain: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flex: 1 },
  recentText: { fontSize: 14, color: colors.text },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: spacing.sm + 2,
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
  chipText: { color: colors.text, fontSize: 13, fontWeight: "400" },
  chipTextActive: { color: colors.onPrimary, fontWeight: "400" },
  dealsHeader: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  kicker: { ...type.micro, color: colors.textFaint },
  headline: { ...type.display, color: colors.text, marginTop: 2 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { color: colors.textMuted, ...type.caption },
  buildingNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buildingText: { flex: 1, color: colors.textMuted, ...type.caption, lineHeight: 18 },
  buildingStrong: { color: colors.text, fontWeight: "800" },
  sectionLabelRow: { paddingHorizontal: spacing.md, marginTop: spacing.lg, marginBottom: spacing.sm },
  sectionLabelText: { ...type.section, color: colors.text },
  sectionHead: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md, marginTop: spacing.lg, marginBottom: spacing.sm },
  sectionTitle: { ...type.section, color: colors.text },
  sectionCount: { color: colors.textFaint },
  sectionHint: { color: colors.textFaint, fontSize: 11, fontWeight: "600", marginTop: 2 },
  catalogTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
    marginHorizontal: spacing.md,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  bestValueSection: { marginTop: spacing.xs },
  bestValueTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginHorizontal: spacing.md, marginBottom: spacing.sm },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: spacing.xl, marginBottom: spacing.xl },
  footer: { padding: spacing.xl, alignItems: "center" },
  footerText: { color: colors.textMuted, ...type.caption },
  footerSub: { color: colors.textFaint, fontSize: 11, marginTop: 4 },
});
