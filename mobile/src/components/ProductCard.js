// A tappable row showing a product and its cheapest price (used in search/lists).
import React from "react";
import { Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { colors, radius, spacing } from "../theme";
import { CURRENCY_SYMBOL } from "../config";

export default function ProductCard({ product, cheapest, onPress, right }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.thumb}>
        <Text style={styles.thumbText}>
          {product.name?.[0]?.toUpperCase() || "?"}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>
          {product.name}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {product.brand ? `${product.brand} · ` : ""}
          {product.size}
        </Text>
      </View>
      {right !== undefined ? (
        right
      ) : cheapest != null ? (
        <View style={styles.priceBox}>
          <Text style={styles.from}>from</Text>
          <Text style={styles.price}>
            {CURRENCY_SYMBOL}
            {cheapest.toFixed(2)}
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  thumbText: { fontSize: 18, fontWeight: "700", color: colors.primaryDark },
  name: { fontSize: 16, fontWeight: "600", color: colors.text },
  sub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  priceBox: { alignItems: "flex-end" },
  from: { fontSize: 11, color: colors.textMuted },
  price: { fontSize: 17, fontWeight: "700", color: colors.primaryDark },
});
