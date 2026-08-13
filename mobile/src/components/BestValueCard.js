// Compact horizontal-scroll card for the "Best Value Today" strip — icon on
// the left, category/name/price/save-badge stacked and left-aligned on the
// right, matching the Figma reference.
import React from "react";
import { Text, TouchableOpacity, View, StyleSheet } from "react-native";
import ProductIcon from "./ProductIcon";
import { colors, radius, spacing } from "../theme";
import { CURRENCY_SYMBOL } from "../config";

export default function BestValueCard({ product, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.iconSlot}>
        <ProductIcon product={product} size={30} />
      </View>
      <View style={styles.content}>
        <Text style={styles.category} numberOfLines={1}>
          {product.category}
        </Text>
        <Text style={styles.name} numberOfLines={1}>
          {product.name}
        </Text>
        <Text style={styles.price}>
          {CURRENCY_SYMBOL}
          {product.cheapest_price.toFixed(2)}
        </Text>
        {product.save_amount > 0 && (
          <View style={styles.saveBadge}>
            <Text style={styles.saveBadgeText}>
              Save {CURRENCY_SYMBOL}
              {product.save_amount.toFixed(2)}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 210,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  iconSlot: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  content: { flex: 1, marginLeft: spacing.sm, alignItems: "flex-start" },
  category: { fontSize: 11, fontWeight: "700", color: colors.primary, textTransform: "uppercase" },
  name: { fontSize: 14, fontWeight: "700", color: colors.text, marginTop: 2 },
  price: { fontSize: 16, fontWeight: "800", color: colors.text, marginTop: 4 },
  saveBadge: {
    backgroundColor: colors.saveBadgeBg,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginTop: 6,
  },
  saveBadgeText: { fontSize: 11, fontWeight: "700", color: colors.saveBadgeText },
});
