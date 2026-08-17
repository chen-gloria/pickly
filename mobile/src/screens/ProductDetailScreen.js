// The core screen: side-by-side store prices, cheapest highlighted, savings,
// plus a save-to-Watching toggle backed by the same watchlist used by the
// deal feed (see src/utils/watchlist.js) — so saving a product here shows up
// in the same "Favorites" tab as a saved deal, with one persisted list
// instead of two.
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../api/client";
import { colors, radius, spacing } from "../theme";
import { CURRENCY_SYMBOL } from "../config";
import { getWatchlist, toggleWatch, productToWatchItem, productWatchId } from "../utils/watchlist";

export default function ProductDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [watching, setWatching] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    api
      .productDetail(id)
      .then((p) => {
        if (cancelled) return;
        if (!p) {
          setLoadError(true);
          return;
        }
        setProduct(p);
      })
      .catch(() => !cancelled && setLoadError(true))
      .finally(() => !cancelled && setLoading(false));
    getWatchlist().then((list) => {
      if (!cancelled) setWatching(list.some((w) => w.id === productWatchId(id)));
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function toggleWatching() {
    const next = await toggleWatch(productToWatchItem(product));
    setWatching(next.some((w) => w.id === productWatchId(id)));
  }

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />;
  }

  if (loadError || !product) {
    return (
      <View style={styles.notFound}>
        <Ionicons name="alert-circle-outline" size={32} color={colors.textFaint} />
        <Text style={styles.notFoundTitle}>Couldn't load this product</Text>
        <Text style={styles.notFoundBody}>
          It may have been removed, or there was a problem fetching it.
        </Text>
        {navigation?.canGoBack() && (
          <TouchableOpacity style={styles.notFoundBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.notFoundBtnText}>Go back</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md }}>
      <Text style={styles.name}>{product.name}</Text>
      <Text style={styles.sub}>
        {product.brand ? `${product.brand} · ` : ""}
        {product.size} · {product.category}
      </Text>

      {product.potential_saving > 0 && (
        <View style={styles.savingBanner}>
          <Text style={styles.savingText}>
            Save up to {CURRENCY_SYMBOL}
            {product.potential_saving.toFixed(2)} by shopping at{" "}
            {product.cheapest_store?.name}
          </Text>
        </View>
      )}

      <Text style={styles.section}>Price comparison</Text>
      {product.prices.map((sp, i) => {
        const isCheapest = i === 0;
        return (
          <View
            key={sp.store.id}
            style={[styles.priceRow, isCheapest && styles.priceRowBest]}
          >
            <View style={[styles.dot, { backgroundColor: sp.store.color }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.storeName}>{sp.store.name}</Text>
              {sp.on_special && <Text style={styles.special}>On special</Text>}
            </View>
            {isCheapest && <Text style={styles.bestTag}>CHEAPEST</Text>}
            <Text style={[styles.priceVal, isCheapest && styles.priceValBest]}>
              {CURRENCY_SYMBOL}
              {sp.price.toFixed(2)}
            </Text>
          </View>
        );
      })}

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.primaryBtn, watching && styles.primaryBtnActive]}
          onPress={toggleWatching}
        >
          <Ionicons
            name={watching ? "heart" : "heart-outline"}
            size={18}
            color={watching ? colors.primary : colors.onPrimary}
          />
          <Text style={[styles.primaryBtnText, watching && styles.primaryBtnTextActive]}>
            {watching ? "Saved to Watching" : "Save to Watching"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  name: { fontSize: 24, fontWeight: "800", color: colors.text },
  sub: { color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.md },
  savingBanner: {
    backgroundColor: colors.cardHi,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  savingText: { color: colors.saving, fontWeight: "700" },
  section: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  priceRowBest: { borderColor: colors.primary, borderWidth: 2 },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: spacing.md },
  storeName: { fontSize: 16, fontWeight: "600", color: colors.text },
  special: { fontSize: 12, color: colors.accent, fontWeight: "700", marginTop: 2 },
  bestTag: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.saving,
    backgroundColor: colors.cardHi,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: spacing.sm,
  },
  priceVal: { fontSize: 18, fontWeight: "700", color: colors.text },
  priceValBest: { color: colors.saving },
  actions: { marginTop: spacing.lg },
  primaryBtn: {
    flexDirection: "row",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnActive: {
    backgroundColor: colors.cardHi,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  primaryBtnText: { color: colors.onPrimary, fontSize: 16, fontWeight: "700" },
  primaryBtnTextActive: { color: colors.primary },
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  notFoundTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "700",
    marginTop: spacing.md,
  },
  notFoundBody: {
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  notFoundBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
  },
  notFoundBtnText: { color: colors.text, fontWeight: "700" },
});
