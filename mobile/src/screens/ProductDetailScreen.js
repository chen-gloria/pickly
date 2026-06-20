// The core screen: side-by-side store prices, cheapest highlighted, savings,
// plus add-to-list, favorite, and price-alert actions.
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
} from "react-native";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { colors, radius, spacing } from "../theme";
import { CURRENCY_SYMBOL } from "../config";

export default function ProductDetailScreen({ route }) {
  const { id } = route.params;
  const { token } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .productDetail(id)
      .then(setProduct)
      .catch((e) => Alert.alert("Error", e.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function addToList() {
    try {
      await api.addToList(token, id, 1);
      Alert.alert("Added", `${product.name} added to your shopping list.`);
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  }

  async function favorite() {
    try {
      await api.addFavorite(token, id);
      Alert.alert("Saved", `${product.name} added to favorites.`);
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  }

  async function setAlert() {
    if (!product.cheapest_price) return;
    const target = Math.max(0, product.cheapest_price - 0.5).toFixed(2);
    try {
      await api.createAlert(token, id, Number(target));
      Alert.alert(
        "Price alert set",
        `We'll watch for ${product.name} dropping below ${CURRENCY_SYMBOL}${target}.`
      );
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  }

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />;
  }
  if (!product) return null;

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
        <TouchableOpacity style={styles.primaryBtn} onPress={addToList}>
          <Text style={styles.primaryBtnText}>🛒 Add to list</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm }}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={favorite}>
            <Text style={styles.secondaryBtnText}>⭐ Save</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={setAlert}>
            <Text style={styles.secondaryBtnText}>🔔 Price alert</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  name: { fontSize: 24, fontWeight: "800", color: colors.text },
  sub: { color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.md },
  savingBanner: {
    backgroundColor: "#E7F7EE",
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  savingText: { color: colors.primaryDark, fontWeight: "700" },
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
    color: colors.primaryDark,
    backgroundColor: "#E7F7EE",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: spacing.sm,
  },
  priceVal: { fontSize: 18, fontWeight: "700", color: colors.text },
  priceValBest: { color: colors.primaryDark },
  actions: { marginTop: spacing.lg },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  secondaryBtn: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
  },
  secondaryBtnText: { color: colors.text, fontWeight: "600" },
});
