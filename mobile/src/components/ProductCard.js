// A tappable card showing a product: icon, price + savings, rating, and
// cheapest-store badge (used in search/lists). Matches the Figma Compare
// screen design — icon on the left, everything else left-aligned in a
// column next to it (not spread across the full card width). Every
// enriched field (rating/store/savings) is optional — screens hitting the
// real backend's lightweight /products list endpoint (no prices/rating yet)
// still render a sensible, simpler card.
import React, { useState } from "react";
import { Text, TouchableOpacity, View, StyleSheet } from "react-native";
import ProductIcon from "./ProductIcon";
import { colors, radius, spacing } from "../theme";
import { CURRENCY_SYMBOL } from "../config";

export default function ProductCard({ product, cheapest, onPress, right, onFavoritePress }) {
  const [favorited, setFavorited] = useState(false);

  const price = cheapest != null ? cheapest : product.cheapest_price;
  const saveAmount = product.save_amount ?? product.potential_saving ?? 0;
  const store = product.cheapest_store;
  const hasRating = product.rating != null;

  function toggleFavorite() {
    if (onFavoritePress) {
      onFavoritePress(product);
    } else {
      setFavorited((f) => !f);
    }
  }

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      {right !== undefined ? (
        <View style={styles.cornerSlot}>{right}</View>
      ) : (
        <TouchableOpacity style={styles.cornerSlot} onPress={toggleFavorite} hitSlop={8}>
          <Text style={[styles.heart, favorited && styles.heartActive]}>
            {favorited ? "♥" : "♡"}
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.row}>
        {/* No background box behind the icon — kept fully transparent so
            it's just the product glyph, nothing else. */}
        <View style={styles.iconSlot}>
          <ProductIcon product={product} size={40} />
        </View>

        <View style={styles.content}>
          <Text style={styles.name} numberOfLines={1}>
            {product.name}
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {product.brand ? `${product.brand} · ` : ""}
            {product.size}
          </Text>

          {price != null && (
            <View style={styles.priceRow}>
              <Text style={styles.price}>
                {CURRENCY_SYMBOL}
                {price.toFixed(2)}
              </Text>
              {saveAmount > 0 && (
                <View style={styles.saveBadge}>
                  <Text style={styles.saveBadgeText}>
                    Save {CURRENCY_SYMBOL}
                    {saveAmount.toFixed(2)}
                  </Text>
                </View>
              )}
            </View>
          )}

          {(hasRating || store) && (
            <View style={styles.metaRow}>
              {hasRating && (
                <View style={styles.ratingRow}>
                  <Text style={styles.star}>★</Text>
                  <Text style={styles.ratingText}>
                    {product.rating.toFixed(1)} ({product.review_count ?? 0})
                  </Text>
                </View>
              )}
              {store && (
                <View style={[styles.storePill, { backgroundColor: `${store.color}1F` }]}>
                  <Text style={[styles.storePillText, { color: store.color }]}>
                    {store.name}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: { flexDirection: "row", alignItems: "flex-start" },
  iconSlot: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { flex: 1, alignItems: "flex-start", marginLeft: spacing.md, paddingRight: spacing.lg },
  cornerSlot: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    zIndex: 1,
  },
  heart: { fontSize: 20, color: colors.textMuted },
  heartActive: { color: colors.primary },
  name: { fontSize: 16, fontWeight: "700", color: colors.text, textAlign: "left" },
  sub: { fontSize: 13, color: colors.textMuted, marginTop: 2, textAlign: "left" },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  price: { fontSize: 20, fontWeight: "800", color: colors.text },
  saveBadge: {
    backgroundColor: colors.saveBadgeBg,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  saveBadgeText: { fontSize: 12, fontWeight: "700", color: colors.primaryDark },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  ratingRow: { flexDirection: "row", alignItems: "center" },
  star: { color: colors.star, fontSize: 14, marginRight: 4 },
  ratingText: { fontSize: 13, color: colors.textMuted, fontWeight: "600" },
  storePill: {
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  storePillText: { fontSize: 12, fontWeight: "700" },
});
