// The home tab — one screen, not two.
//
// Browse mode (no search query) is the live, verdict-judged deal feed from
// real OzBargain data + real recorded price history (see
// utils/priceHistory.js). The home view ("All") is category-first: "We'd
// buy these" plus one horizontal-scroll row per real deal category, each
// its own visually distinct block with a "View all" into a full list for
// that category/verdict — replacing both the old oversized hero card and
// the old flat "Everything else today" wall (the single biggest complaint:
// no categories meant nobody wanted to scan it).
//
// Search mode is real product search — netlify/functions/search-products.js
// calls a real shopping-search API (SerpAPI) and filters results down to a
// known Australian retailer allow-list. Results render as a card grid
// (ProductCard.js), not a row list — every photo sits in the same fixed
// white frame regardless of source, so the grid reads as one clean
// catalogue instead of whatever each retailer's own photo looks like.
//
// Search also accepts a scanned barcode: BarcodeScanner.js reads the code,
// api/barcode.js resolves it to a real product name via Open Food Facts,
// and that name just becomes the search query — no separate "scanned item"
// screen, the exact same real-search flow takes over from there.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
  StyleSheet,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../api/client";
import { fetchDeals, timeAgo, DEAL_SOURCE } from "../api/deals";
import { lookupBarcode } from "../api/barcode";
import DealCard from "../components/DealCard";
import DealRow from "../components/DealRow";
import ProductCard from "../components/ProductCard";
import BarcodeScanner from "../components/BarcodeScanner";
import WebBarcodeScanner from "../components/WebBarcodeScanner";
import AboutSheet from "../components/AboutSheet";
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
import InfoTip from "../components/InfoTip";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { radius, spacing, type } from "../theme";
import { getStoreFilters, applyStoreFilter, normalizeStore, normalizeDealStore } from "../utils/storeFilter";
import { hoursSince } from "../utils/dealVoice";
import { groceryCategoryFor } from "../utils/groceryCategory";
import { matchesQuery } from "../../scripts/lib/fuzzySearch";

// The deals feed only ever carries these four real category values (one per
// scripts/lib/ozbargain.js FEEDS entry).
const DEAL_CATEGORY_ICONS = {
  Groceries: "basket-outline",
  "Health & Beauty": "pill",
  Electronics: "headphones",
  "Home & Garden": "watering-can",
};

// Icons for groceryCategory.js's subcategories, shown once the
// Recommendation filter is narrowed to grocery-selling brands — see
// isGroceryOnlyFilter below.
// Two naming schemes land here: utils/groceryCategory.js's own keyword
// buckets (used for ALDI, and for OzBargain-sourced Coles/Woolworths posts
// that have no SaleFinder-derived category), and SaleFinder's own real
// category-path segments for Coles/Woolworths deals (humanized by
// netlify/functions/lib/salefinder.js's categoryFromPath — e.g. "Meat",
// "Biscuits And Snacks", "Fruit And Vegetables"). Both are covered here
// rather than trying to force one naming scheme onto the other, since
// forcing SaleFinder's real "Meat" to render as my guessed "Meat & Seafood"
// would just be relabelling an actual retailer category with a worse one.
// Anything not listed falls back to "tag-outline" — a missing icon is
// cosmetic, never worth blocking on.
const GROCERY_SUBCATEGORY_ICONS = {
  // utils/groceryCategory.js keyword buckets
  "Meat & Seafood": "food-drumstick-outline",
  "Dairy & Eggs": "cheese",
  "Fruit & Veg": "food-apple-outline",
  Bakery: "bread-slice-outline",
  Frozen: "snowflake",
  Beverages: "cup-outline",
  "Snacks & Confectionery": "cookie-outline",
  Pantry: "basket-outline",
  "Household & Personal Care": "spray-bottle",
  "Other Groceries": "tag-outline",
  // SaleFinder's own real category names (Coles/Woolworths) — collected
  // from actual catalogue pages, plus the common supermarket-aisle names
  // most likely to appear alongside them.
  Meat: "food-drumstick-outline",
  Seafood: "fish",
  "Meat, Seafood And Deli": "food-drumstick-outline",
  Deli: "food-turkey",
  "Fruit And Vegetables": "food-apple-outline",
  "Fruit And Veg": "food-apple-outline",
  "Dairy, Eggs And Fridge": "cheese",
  "Dairy Eggs And Fridge": "cheese",
  "Bakery And Bread": "bread-slice-outline",
  "Frozen Food": "snowflake",
  Drinks: "cup-outline",
  "Drinks And Cordials": "cup-outline",
  "Cooking Seasoning And Gravy": "shaker-outline",
  Confectionery: "candy-outline",
  "Biscuits And Snacks": "cookie-outline",
  "Breakfast Foods": "bowl-mix-outline",
  "Health And Wellbeing": "pill",
  "Personal Care": "bottle-tonic-outline",
  "Cleaning And Household": "spray-bottle",
  "Home And Outdoor": "sofa-outline",
  "Baby And Toddler": "baby-face-outline",
  "Pet Care": "paw-outline",
  Liquor: "bottle-wine-outline",
  "International Foods": "earth",
};

// The store options that actually sell groceries — see storeFilter.js's
// STORES. "OzBargain" deliberately isn't in this list: it stands for the
// whole community feed (every category, not just supermarkets), so a
// selection that includes it is no longer "grocery-only".
const GROCERY_BRANDS = ["Coles", "Woolworths", "ALDI", "Alpha Fresh"];

// The three real signals promoted to their own explained home-view
// sections, replacing the vague per-card captions (see DealCard.js/
// DealRow.js) that used to say "Community favourite"/"Solid find" with no
// explanation anywhere. Order matters — matches how notable the signal is,
// most notable first, same spirit as utils/dealVoice.js's priority chain
// (though these three are independent checks, not mutually exclusive with
// each other — a fresh runaway hit can genuinely be both).
const SIGNAL_SECTIONS = [
  {
    key: "community",
    label: "Community favourite",
    icon: "account-group-outline",
    info: {
      title: "Community favourite",
      body: "150 or more people have upvoted this on OzBargain — the community's clearest real signal that it's worth it.",
    },
    match: (d) => (d.votes ?? 0) >= 150,
  },
  {
    key: "takingOff",
    label: "Taking off right now",
    icon: "trending-up",
    info: {
      title: "Taking off right now",
      body: "Posted in the last few hours and already picking up votes fast — early momentum, not a proven top result yet.",
    },
    match: (d) => hoursSince(d.postedAt) <= 4 && (d.votes ?? 0) >= 25,
  },
  {
    key: "solid",
    label: "Solid find",
    icon: "thumb-up-outline",
    info: {
      title: "Solid find",
      body: "Not (yet) a runaway hit, but a meaningful number of upvotes — 50 to 149 — from the OzBargain community.",
    },
    match: (d) => (d.votes ?? 0) >= 50 && (d.votes ?? 0) < 150,
  },
];

// Minimum characters before firing a real (paid, rate-limited) search call —
// avoids a network round trip for every single keystroke on a 1-letter query.
const MIN_QUERY_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 500;
// How many cards show in a home-view carousel before "View all" is the only
// way to see the rest.
const CAROUSEL_PREVIEW_COUNT = 10;

// "TODAY" was a placeholder that never actually said anything — the real
// date costs nothing to compute and reads as a finished product instead of
// a dev label, especially in a screenshot or if you come back after being
// away for a few days.
function todayLabel() {
  return new Date()
    .toLocaleDateString("en-AU", { weekday: "short", month: "short", day: "numeric" })
    .toUpperCase();
}

// The live deals feed has no fixed schedule (see the header comment above),
// so it gets an honest "Xm ago" freshness stamp, not a countdown. Price
// history is different — it genuinely runs on a fixed daily cron
// (.github/workflows/price-history.yml: "10 19 * * *" = 19:10 UTC), so a
// countdown to IT is a real, honest number, not an invented one.
const PRICE_UPDATE_UTC_HOUR = 19;
const PRICE_UPDATE_UTC_MINUTE = 10;

function nextPriceUpdateAt(from) {
  const next = new Date(
    Date.UTC(
      from.getUTCFullYear(),
      from.getUTCMonth(),
      from.getUTCDate(),
      PRICE_UPDATE_UTC_HOUR,
      PRICE_UPDATE_UTC_MINUTE,
      0
    )
  );
  if (next.getTime() <= from.getTime()) next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

function formatCountdown(ms) {
  const totalMin = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

// A small "live" pulse — the stock-ticker-style cue that this number is
// actively counting down, not a static label. Loops for as long as it's
// mounted; cheap (one Animated.Value, native driver).
function PulseDot({ color }) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.25, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <Animated.View
      style={{
        width: 7,
        height: 7,
        borderRadius: 3.5,
        backgroundColor: color,
        opacity: pulse,
      }}
    />
  );
}

function gridColumns(width) {
  if (width >= 900) return 4;
  if (width >= 620) return 3;
  return 2;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export default function BrowseScreen({ navigation }) {
  const { colors } = useTheme();
  const toast = useToast();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { width } = useWindowDimensions();
  const columns = gridColumns(width);

  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState([]);
  const [showRecent, setShowRecent] = useState(false);
  const inputRef = useRef(null);

  // { type: "all" } | { type: "buy" } | { type: "category", name }
  const [viewMode, setViewMode] = useState({ type: "all" });

  const [deals, setDeals] = useState([]);
  const [capturedAt, setCapturedAt] = useState(null);
  const [source, setSource] = useState(null);
  const [dealsLoading, setDealsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState({ skip: false });

  // Drives the "next price check" countdown below. A minute-scale ticker —
  // this is an hours-long countdown, not a stock-ticker second-hand, so
  // there's nothing to gain from updating more often than that.
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);
  const nextUpdateLabel = useMemo(
    () => formatCountdown(nextPriceUpdateAt(new Date(nowTick)).getTime() - nowTick),
    [nowTick]
  );

  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);

  const [scanning, setScanning] = useState(false);
  const [scanLookupLoading, setScanLookupLoading] = useState(false);
  const [scanNotice, setScanNotice] = useState(null);
  const [showAbout, setShowAbout] = useState(false);

  // One watchlist, one set of ids — a saved deal (DealCard/DealRow's
  // bookmark) and a saved search result (ProductCard's bookmark) both live
  // in the same AsyncStorage list, so either surface reflects the other
  // immediately.
  const [watchedIds, setWatchedIds] = useState(new Set());

  // The two store filters set on the Profile page (see utils/storeFilter.js)
  // — recommendationStores narrows the Browse feed below, searchStores
  // narrows search results. Reloaded on every focus (not just mount) so
  // changing a chip on Profile and tabbing back here takes effect
  // immediately, without needing a manual refresh.
  const [recommendationStores, setRecommendationStores] = useState([]);
  const [searchStores, setSearchStores] = useState([]);
  useFocusEffect(
    useCallback(() => {
      getStoreFilters().then((f) => {
        setRecommendationStores(f.recommendationStores);
        setSearchStores(f.searchStores);
      });
    }, [])
  );

  const loadDeals = useCallback(async () => {
    const res = await fetchDeals();
    setDeals(res.deals);
    setCapturedAt(res.capturedAt);
    setSource(res.source);
    setDealsLoading(false);
  }, []);

  useEffect(() => {
    loadDeals();
    getRecentSearches().then(setRecent);
    getWatchlist().then((list) => setWatchedIds(new Set(list.map((w) => w.id))));
  }, [loadDeals]);

  // Debounced real search as you type — only once there's enough of a query
  // to be worth a real API call.
  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_QUERY_LENGTH) {
      setProducts([]);
      setProductsLoading(false);
      setSearchError(null);
      return;
    }
    setProductsLoading(true);
    const t = setTimeout(async () => {
      try {
        const { results, error } = await api.searchProducts(q);
        setProducts(results);
        setSearchError(error);
      } catch (_) {
        setProducts([]);
        setSearchError("could not reach search — check your connection");
      } finally {
        setProductsLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDeals();
    setRefreshing(false);
  }, [loadDeals]);

  function openDeal(deal) {
    Linking.openURL(deal.url).catch(() => {});
  }

  function openResult(item) {
    if (item.link) Linking.openURL(item.link).catch(() => {});
  }

  function onToggleWatchDeal(deal) {
    const wasWatched = watchedIds.has(deal.id);
    // toggleWatch() is optimistic — updates local state and returns
    // immediately, server sync happens in the background (see
    // utils/watchlist.js's header comment on why this used to be slow).
    const next = toggleWatch(deal, wasWatched);
    setWatchedIds(new Set(next.map((w) => w.id)));
    toast.show(wasWatched ? "Removed from Watching" : "Saved to Watching", {
      icon: wasWatched ? "bookmark-outline" : "bookmark",
    });
  }

  function onToggleWatchProduct(product) {
    const id = productWatchId(product.id);
    const wasWatched = watchedIds.has(id);
    const next = toggleWatch(productToWatchItem(product), wasWatched);
    setWatchedIds(new Set(next.map((w) => w.id)));
    toast.show(wasWatched ? "Removed from Watching" : "Saved to Watching", {
      icon: wasWatched ? "bookmark-outline" : "bookmark",
    });
  }

  function onChangeQuery(text) {
    setQuery(text);
    setShowRecent(text.trim().length === 0);
    setScanNotice(null);
  }
  function onClearQuery() {
    setQuery("");
    setShowRecent(false);
    setScanNotice(null);
    inputRef.current?.focus();
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

  async function onBarcodeScanned(code) {
    // Camera stays open (see the {scanning && ...} render below, which
    // layers a "Looking it up…" overlay on top rather than unmounting the
    // scanner here) for the whole lookup — closing instantly used to leave
    // a dead gap with zero feedback while lookupBarcode() ran (now up to a
    // few seconds, timing out multiple real databases in sequence/parallel
    // — see api/barcode.js), which read as the scan randomly failing or
    // the app "not knowing where to go".
    setScanLookupLoading(true);
    const info = await lookupBarcode(code);
    setScanLookupLoading(false);
    setScanning(false);
    if (info) {
      setScanNotice(null);
      setQuery(info.name);
      recordSearch(info.name);
    } else {
      setScanNotice(
        "Barcode not recognized — Open Food Facts, Open Library, Google Books and UPCitemdb all missed it. Try searching by name instead."
      );
    }
  }

  function toggleSection(key) {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const searching = query.trim().length >= MIN_QUERY_LENGTH;

  // Under the search section, so this follows the "Search filter" group,
  // not "Recommendation filter" — a store excluded from search shouldn't
  // show up here even though it's still in the (differently-filtered)
  // recommendation feed above.
  const matchingDeals = useMemo(() => {
    if (!searching) return [];
    const q = query.trim();
    // matchesQuery, not a plain substring check — per-word (stemmed)
    // matching so "Strawberry" finds a deal titled "Strawberries", the
    // same fix applied to netlify/functions/search-products.js (see
    // scripts/lib/fuzzySearch.js's header comment for why this isn't a
    // bigger "semantic search" problem than it looks).
    return applyStoreFilter(deals, searchStores, (d) => normalizeDealStore(d.store))
      .filter((d) => matchesQuery(q, d.title))
      .sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0))
      .slice(0, 5);
  }, [searching, query, deals, searchStores]);

  // api.searchProducts() results carry a clean store.name (see
  // netlify/functions/search-products.js) rather than free text, but
  // normalizeStore() handles a clean name fine too — it just matches on the
  // first pattern hit.
  const filteredProducts = useMemo(
    () => applyStoreFilter(products, searchStores, (p) => normalizeStore(p.store?.name)),
    [products, searchStores]
  );

  // The Profile page's "Recommendation filter" (see utils/storeFilter.js)
  // narrows the feed right here, before verdicts get grouped — everything
  // downstream (carousels, "We'd buy these", category rows, the search
  // section's "Live deals matching your search") only ever sees the
  // filtered set, same as if the un-selected stores' deals didn't exist.
  const recommendedDeals = useMemo(
    () => applyStoreFilter(deals, recommendationStores, (d) => normalizeDealStore(d.store)),
    [deals, recommendationStores]
  );

  // Always computed against the full (filtered) feed — the home view's
  // carousels and each category/buy "View all" both read from this, so
  // switching viewMode never re-fetches or re-judges anything.
  const buckets = useMemo(() => groupByVerdict(recommendedDeals), [recommendedDeals]);
  const trackingDays = useMemo(() => getTrackingDays(), []);

  // True once the Recommendation filter is narrowed down to only
  // grocery-selling brands (never empty/"All", never including OzBargain,
  // which stands for the whole community feed — see GROCERY_BRANDS above).
  // At that point browsing by aisle (Meat/Dairy/Bakery/...) is more useful
  // than one lumped "Groceries" carousel — see utils/groceryCategory.js.
  const isGroceryOnlyFilter =
    recommendationStores.length > 0 && recommendationStores.every((s) => GROCERY_BRANDS.includes(s));

  // Everything that isn't a confident SKIP, grouped by each deal's real
  // category (or grocery subcategory, once isGroceryOnlyFilter), biggest
  // group first — the source for both the home view's per-category
  // carousel and that category's "View all" full list.
  const worthBuyingByCategory = useMemo(() => {
    const map = new Map();
    for (const d of [...buckets.buy, ...buckets.wait, ...buckets.tracking]) {
      const cat = isGroceryOnlyFilter ? groceryCategoryFor(d) : d.category || "Other";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat).push(d);
    }
    for (const items of map.values()) items.sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0));
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [buckets, isGroceryOnlyFilter]);

  const categoryDeals = useMemo(() => {
    if (viewMode.type !== "category") return [];
    const found = worthBuyingByCategory.find(([cat]) => cat === viewMode.name);
    return found ? found[1] : [];
  }, [viewMode, worthBuyingByCategory]);

  // The three explained signal carousels (see SIGNAL_SECTIONS above) that
  // open the home view, regardless of which store filter is active — only
  // built from whichever deals actually match, so an empty signal never
  // renders an empty section.
  const signalSections = useMemo(
    () =>
      SIGNAL_SECTIONS.map((def) => ({ ...def, items: recommendedDeals.filter(def.match) })).filter(
        (s) => s.items.length > 0
      ),
    [recommendedDeals]
  );

  const signalViewItems = useMemo(() => {
    if (viewMode.type !== "signal") return [];
    const sec = signalSections.find((s) => s.key === viewMode.key);
    return sec ? sec.items : [];
  }, [viewMode, signalSections]);

  // One flattened list of heterogeneous rows.
  const rows = useMemo(() => {
    const out = [];

    const pushGrid = (keyPrefix, items) => {
      for (const group of chunk(items, columns)) {
        out.push({ type: "dealGrid", key: `${keyPrefix}-${group[0].id}`, items: group });
      }
    };

    if (searching) {
      if (matchingDeals.length) {
        out.push({ type: "sectionLabel", key: "s-deals", label: "Live deals matching your search" });
        for (const d of matchingDeals) out.push({ type: "deal", key: `d-${d.id}`, deal: d });
      }
      out.push({ type: "sectionLabel", key: "s-results", label: "Search results" });
      if (productsLoading) {
        out.push({ type: "resultsLoading", key: "results-loading" });
      } else if (searchError) {
        out.push({ type: "resultsError", key: "results-error", error: searchError });
      } else if (filteredProducts.length === 0) {
        out.push({ type: "resultsEmpty", key: "results-empty" });
      } else {
        for (const group of chunk(filteredProducts, columns)) {
          out.push({ type: "resultGrid", key: `g-${group[0].id}`, items: group });
        }
      }
    } else if (viewMode.type === "buy") {
      pushGrid("buy", buckets.buy);
    } else if (viewMode.type === "category") {
      pushGrid("cat", categoryDeals);
    } else if (viewMode.type === "signal") {
      pushGrid("signal", signalViewItems);
    } else {
      // Home ("All"): one carousel per section, each its own visually
      // distinct block — not everything spread flat on the page.
      //
      // The three explained signal carousels open the view, ahead of
      // anything category-specific — same idea regardless of which store
      // filter is active, and each carries its own info icon (see
      // InfoTip.js) instead of leaving the label unexplained the way the
      // old per-card captions did.
      for (const sec of signalSections) {
        out.push({
          type: "carouselHeader",
          key: `h-signal-${sec.key}`,
          label: sec.label,
          icon: sec.icon,
          info: sec.info,
          onViewAll: () => setViewMode({ type: "signal", key: sec.key }),
        });
        out.push({
          type: "carouselStrip",
          key: `s-signal-${sec.key}`,
          items: sec.items.slice(0, CAROUSEL_PREVIEW_COUNT),
        });
      }

      if (buckets.buy.length) {
        out.push({
          type: "carouselHeader",
          key: "h-buy",
          label: "We'd buy these today",
          onViewAll: () => setViewMode({ type: "buy" }),
        });
        out.push({ type: "carouselStrip", key: "s-buy", items: buckets.buy.slice(0, CAROUSEL_PREVIEW_COUNT) });
      }

      for (const [cat, items] of worthBuyingByCategory) {
        out.push({
          type: "carouselHeader",
          key: `h-cat-${cat}`,
          label: cat,
          icon: isGroceryOnlyFilter
            ? GROCERY_SUBCATEGORY_ICONS[cat] || "tag-outline"
            : DEAL_CATEGORY_ICONS[cat] || "tag-outline",
          onViewAll: () => setViewMode({ type: "category", name: cat }),
        });
        out.push({ type: "carouselStrip", key: `s-cat-${cat}`, items: items.slice(0, CAROUSEL_PREVIEW_COUNT) });
      }

      if (buckets.skip.length) {
        out.push({
          type: "verdictHeader",
          key: "h-skip",
          section: "skip",
          label: "We'd skip these",
          hint: "cheaper before",
          count: buckets.skip.length,
          collapsible: true,
        });
        if (expanded.skip) {
          for (const d of buckets.skip) out.push({ type: "deal", key: `d-${d.id}`, deal: d });
        }
      }
    }

    return out;
  }, [
    searching,
    matchingDeals,
    viewMode,
    buckets,
    worthBuyingByCategory,
    categoryDeals,
    signalSections,
    signalViewItems,
    isGroceryOnlyFilter,
    expanded,
    filteredProducts,
    productsLoading,
    searchError,
    columns,
  ]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {scanning && (
        // expo-camera's web path only ever decodes QR codes (see
        // WebBarcodeScanner.js) — real retail barcode formats need ZXing on
        // web. Native builds keep using expo-camera's actual platform
        // scanner, which does support these formats.
        Platform.OS === "web" ? (
          <WebBarcodeScanner onScan={onBarcodeScanned} onClose={() => setScanning(false)} />
        ) : (
          <BarcodeScanner onScan={onBarcodeScanned} onClose={() => setScanning(false)} />
        )
      )}
      {/* Layered on top of the still-mounted scanner rather than replacing
          it — the camera view staying up (even though it's no longer
          actively decoding) reads as continuous feedback instead of the
          scan abruptly vanishing into a blank gap while lookupBarcode()
          runs (up to a few seconds now that it tries multiple real
          databases — see api/barcode.js). */}
      {scanning && scanLookupLoading && (
        <View style={styles.scanLookupOverlay} pointerEvents="none">
          <View style={styles.scanLookupCard}>
            <ActivityIndicator color="#FFFFFF" />
            <Text style={styles.scanLookupText}>Looking up that barcode…</Text>
          </View>
        </View>
      )}
      {showAbout && <AboutSheet onClose={() => setShowAbout(false)} />}
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
                {item.hint && <Text style={styles.sectionHintStandalone}>{item.hint}</Text>}
              </View>
            );
          }
          if (item.type === "carouselHeader") {
            return (
              <View style={styles.carouselHead}>
                <View style={styles.carouselHeadLeft}>
                  {item.icon && (
                    <MaterialCommunityIcons name={item.icon} size={16} color={colors.primary} />
                  )}
                  <Text style={styles.carouselHeadText}>{item.label}</Text>
                  {item.info && <InfoTip title={item.info.title} body={item.info.body} />}
                </View>
                <TouchableOpacity onPress={item.onViewAll} hitSlop={8} style={styles.viewAllBtn}>
                  <Text style={styles.viewAllText}>View all</Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.primary} />
                </TouchableOpacity>
              </View>
            );
          }
          if (item.type === "carouselStrip") {
            return (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.carouselContent}
              >
                {item.items.map((d) => (
                  <DealCard
                    key={d.id}
                    deal={d}
                    style={styles.carouselCard}
                    watched={watchedIds.has(d.id)}
                    onToggleWatch={() => onToggleWatchDeal(d)}
                    onPress={() => openDeal(d)}
                  />
                ))}
              </ScrollView>
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
          if (item.type === "resultsLoading") {
            return <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />;
          }
          if (item.type === "resultsError") {
            return (
              <View style={styles.errorBox}>
                <Ionicons name="cloud-offline-outline" size={20} color={colors.danger} />
                <Text style={styles.errorText}>Search didn't go through — {item.error}. Try again?</Text>
              </View>
            );
          }
          if (item.type === "resultsEmpty") {
            return (
              <Text style={styles.empty}>
                No results for "{query.trim()}" at Woolworths, Coles, ALDI, Amazon AU, Chemist
                Warehouse, Priceline, JB Hi-Fi, Officeworks, Bunnings or Kmart.
              </Text>
            );
          }
          if (item.type === "dealGrid") {
            return (
              <View style={styles.gridRow}>
                {item.items.map((d) => (
                  <DealCard
                    key={d.id}
                    deal={d}
                    style={{ flex: 1 }}
                    watched={watchedIds.has(d.id)}
                    onToggleWatch={() => onToggleWatchDeal(d)}
                    onPress={() => openDeal(d)}
                  />
                ))}
                {Array.from({ length: columns - item.items.length }).map((_, i) => (
                  <View key={`spacer-${i}`} style={{ flex: 1 }} />
                ))}
              </View>
            );
          }
          // resultGrid — a row of `columns` ProductCards, padded with
          // invisible spacers if the last group is short, so cards stay
          // aligned to the grid instead of stretching to fill the row.
          return (
            <View style={styles.gridRow}>
              {item.items.map((p) => (
                <ProductCard
                  key={p.id}
                  item={p}
                  style={{ flex: 1 }}
                  watched={watchedIds.has(productWatchId(p.id))}
                  onToggleWatch={() => onToggleWatchProduct(p)}
                  onPress={() => openResult(p)}
                />
              ))}
              {Array.from({ length: columns - item.items.length }).map((_, i) => (
                <View key={`spacer-${i}`} style={{ flex: 1 }} />
              ))}
            </View>
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
                <TouchableOpacity hitSlop={8} onPress={() => setShowAbout(true)}>
                  <Ionicons name="information-circle-outline" size={22} color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>

            {/* One container owns the whole shape (search row + recent
                list, when open) and clips its own content — not two
                separate boxes trying to keep their corners in sync. The
                border radius toggles once, in one place, on one element;
                there's nothing left for two elements to disagree about. */}
            <View style={styles.searchWrap}>
              {showRecent && (
                <Pressable style={styles.recentOverlay} onPress={() => setShowRecent(false)} />
              )}
              <View style={[styles.searchContainer, showRecent && styles.searchContainerOpen]}>
                <View style={styles.searchBarRow}>
                  <Ionicons name="search" size={18} color={colors.textMuted} />
                  <TextInput
                    ref={inputRef}
                    style={styles.searchInput}
                    placeholder="Search any product, e.g. milk"
                    placeholderTextColor={colors.textMuted}
                    value={query}
                    onChangeText={onChangeQuery}
                    onFocus={onFocusSearch}
                    onBlur={onBlurSearch}
                    onSubmitEditing={onSubmitSearch}
                    returnKeyType="search"
                    autoCapitalize="none"
                  />
                  {query.length > 0 && (
                    <TouchableOpacity style={styles.clearButton} hitSlop={8} onPress={onClearQuery}>
                      <Ionicons name="close-circle" size={18} color={colors.textFaint} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.scanButton}
                    hitSlop={8}
                    onPress={() => {
                      setShowRecent(false);
                      setScanning(true);
                    }}
                  >
                    <Ionicons name="barcode-outline" size={19} color={colors.primary} />
                  </TouchableOpacity>
                </View>

                {showRecent && (
                  <View style={styles.recentInner}>
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
                )}
              </View>
            </View>

            {scanNotice && (
              <View style={styles.scanNotice}>
                <Ionicons name="information-circle-outline" size={15} color={colors.accent} />
                <Text style={styles.scanNoticeText}>{scanNotice}</Text>
              </View>
            )}

            {/* Only shows once you've actually drilled into a category/section
                — on the home view there's nothing to orient you back FROM,
                so an ever-present "All" here was just a stray floating word.
                It appears the moment there's a real place it's taking you
                back from, as "All / <section>". */}
            {!searching && viewMode.type !== "all" && (
              <View style={styles.breadcrumbRow}>
                <TouchableOpacity onPress={() => setViewMode({ type: "all" })} hitSlop={6}>
                  <Text style={styles.breadcrumbText}>All</Text>
                </TouchableOpacity>
                <Text style={styles.breadcrumbSep}>›</Text>
                <Text style={[styles.breadcrumbText, styles.breadcrumbActive]}>
                  {viewMode.type === "buy"
                    ? "We'd buy these today"
                    : viewMode.type === "signal"
                    ? signalSections.find((s) => s.key === viewMode.key)?.label
                    : viewMode.name}
                </Text>
              </View>
            )}

            {!searching && viewMode.type === "all" && (
              <View style={styles.dealsHeader}>
                <Text style={styles.kicker}>{todayLabel()}</Text>
                <View style={styles.statusRow}>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: source === DEAL_SOURCE.LIVE ? colors.primary : colors.textFaint },
                    ]}
                  />
                  <Text style={styles.statusText}>
                    {deals.length} checked
                    {capturedAt ? ` · ${timeAgo(capturedAt)}` : ""}
                  </Text>
                </View>

                {/* A real, fixed daily cron (see nextPriceUpdateAt above) —
                    not the live deals feed, which has no schedule to
                    honestly count down to. */}
                <View style={styles.nextUpdateBadge}>
                  <PulseDot color={colors.primary} />
                  <Text style={styles.nextUpdateText}>
                    Next price check in <Text style={styles.nextUpdateStrong}>{nextUpdateLabel}</Text>
                  </Text>
                </View>
              </View>
            )}

            {!searching &&
              (dealsLoading ? (
                <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />
              ) : (
                viewMode.type === "all" &&
                buckets.buy.length === 0 &&
                deals.length > 0 && (
                  <View style={styles.buildingNote}>
                    <Ionicons name="hourglass-outline" size={15} color={colors.accent} />
                    <Text style={styles.buildingText}>
                      <Text style={styles.buildingStrong}>We're building price history.</Text>{" "}
                      Once we've watched an item long enough, you'll see whether it's genuinely
                      cheap — not just discounted. Day {trackingDays}. Price history updates once
                      a day.
                    </Text>
                  </View>
                )
              ))}
          </View>
        }
        ListFooterComponent={
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {searching
                ? "Real prices from Woolworths, Coles, ALDI, Amazon AU and more"
                : "Live deals sourced from OzBargain's community"}
            </Text>
            <Text style={styles.footerSub}>{searching ? " " : "Pull down to refresh"}</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
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
  // ONE box owns the whole shape — the search row and (when open) the
  // recent list are just stacked content inside it, not two separate
  // absolutely-positioned elements whose corners have to be kept in sync
  // by hand. `overflow: hidden` clips both the content and the scan
  // button to whatever this box's current corner radius is; there's
  // exactly one border-radius value in play at any moment.
  searchContainer: {
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    overflow: "hidden",
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    zIndex: 6,
  },
  // The one and only shape change when Recent is open — a normal corner
  // radius instead of a full pill, because the box is now much taller than
  // it is a simple 52px bar.
  searchContainerOpen: { borderRadius: radius.lg },
  searchBarRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    ...(Platform.OS === "web" ? { outlineStyle: "none" } : null),
  },
  clearButton: {
    alignItems: "center",
    justifyContent: "center",
    padding: 2,
  },
  scanButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.cardHi,
    alignItems: "center",
    justifyContent: "center",
  },
  // Full-screen backdrop so tapping anywhere outside the search box closes
  // Recent — sits behind searchContainer (lower zIndex) so it never
  // intercepts taps meant for the box itself.
  recentOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: -2000,
    zIndex: 5,
    ...(Platform.OS === "web" ? { cursor: "default" } : null),
  },
  recentInner: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  recentHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  recentTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
  recentClear: { fontSize: 13, fontWeight: "700", color: colors.primary },
  recentEmpty: { fontSize: 13, color: colors.textMuted, paddingVertical: spacing.sm },
  recentRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing.sm },
  recentRowMain: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flex: 1 },
  recentText: { fontSize: 14, color: colors.text },
  scanNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scanNoticeText: { flex: 1, color: colors.textMuted, ...type.caption, lineHeight: 18 },
  scanLookupOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 101, // above the scanner's own overlay (zIndex 100)
    alignItems: "center",
    justifyContent: "center",
  },
  scanLookupCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
  },
  scanLookupText: { color: "#FFFFFF", fontWeight: "600", fontSize: 14 },
  breadcrumbRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  breadcrumbText: { color: colors.textFaint, fontSize: 13, fontWeight: "600" },
  breadcrumbActive: { color: colors.text, fontWeight: "800" },
  breadcrumbSep: { color: colors.textFaint, fontSize: 13 },
  dealsHeader: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md },
  kicker: { ...type.micro, color: colors.textFaint },
  headline: { ...type.display, color: colors.text, marginTop: 2 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { color: colors.textMuted, ...type.caption },
  // Deliberately reads like a market-status chip — colored pill, live
  // pulse, bold digits — because unlike the feed above it, this number is
  // a real countdown to a real fixed event (see nextPriceUpdateAt).
  nextUpdateBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 7,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: `${colors.primary}1A`,
  },
  nextUpdateText: { color: colors.primary, fontSize: 12.5, fontWeight: "600" },
  nextUpdateStrong: { fontWeight: "800", fontVariant: ["tabular-nums"] },
  buildingNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buildingText: { flex: 1, color: colors.textMuted, ...type.caption, lineHeight: 18 },
  buildingStrong: { color: colors.text, fontWeight: "800" },
  sectionLabelRow: { paddingHorizontal: spacing.lg, marginTop: spacing.xl, marginBottom: spacing.md },
  sectionLabelText: { ...type.section, color: colors.text },
  sectionHintStandalone: { color: colors.textFaint, fontSize: 11, fontWeight: "600", marginTop: 2 },
  sectionHead: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.lg, marginTop: spacing.xl, marginBottom: spacing.md },
  sectionTitle: { ...type.section, color: colors.text },
  sectionCount: { color: colors.textFaint },
  sectionHint: { color: colors.textFaint, fontSize: 11, fontWeight: "600", marginTop: 2 },
  // Plain text heading, no card/background — each category block is told
  // apart by its own carousel of cards below it, not by a boxed header.
  carouselHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  carouselHeadLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  carouselHeadText: { ...type.section, color: colors.text },
  viewAllBtn: { flexDirection: "row", alignItems: "center", gap: 1 },
  viewAllText: { color: colors.primary, fontSize: 12.5, fontWeight: "700" },
  carouselContent: { paddingHorizontal: spacing.lg, gap: spacing.md },
  carouselCard: { width: 158 },
  empty: {
    textAlign: "center",
    color: colors.textMuted,
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
    marginHorizontal: spacing.lg,
    lineHeight: 20,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
    padding: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  errorText: { flex: 1, color: colors.text, ...type.caption, lineHeight: 18 },
  gridRow: {
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  footer: { padding: spacing.xl, alignItems: "center" },
  footerText: { color: colors.textMuted, ...type.caption, textAlign: "center" },
  footerSub: { color: colors.textFaint, fontSize: 11, marginTop: 4 },
  });
}
