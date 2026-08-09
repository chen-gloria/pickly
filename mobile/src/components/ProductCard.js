// A tappable card showing a product: photo, price + savings, rating, and
// cheapest-store badge (used in search/lists). Matches the Figma Compare
// screen design. Every enriched field (image/rating/store/savings) is
// optional — screens hitting the real backend's lightweight /products list
// endpoint (no prices/rating yet) still render a sensible, simpler card.
import React, { useState } from "react";
import { Image, Text, TouchableOpacity, View, StyleSheet } from "react-native";
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
      <View style={styles.topRow}>
        {product.image_url ? (
          <Image source={{ uri: product.image_url }} style={styles.thumbImage} />
        ) : (
          <View style={styles.thumb}>
            <Text style={styles.thumbText}>
              {product.name?.[0]?.toUpperCase() || "?"}
            </Text>
          </View>
        )}

        <View style={{ flex: 1, marginLeft: spacing.md }}>
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
        ) : (
          <TouchableOpacity onPress={toggleFavorite} hitSlop={8}>
            <Text style={[styles.heart, favorited && styles.heartActive]}>
              {favorited ? "♥" : "♡"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

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
          {hasRating ? (
            <View style={styles.ratingRow}>
              <Text style={styles.star}>★</Text>
              <Text style={styles.ratingText}>
                {product.rating.toFixed(1)} ({product.review_count ?? 0})
              </Text>
            </View>
          ) : (
            <View />
          )}
          {store && (
            <View style={[styles.storePill, { backgroundColor: `${store.color}1F` }]}>
              <Text style={[styles.storePillText, { color: store.color }]}>{store.name}</Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  topRow: { flexDirection: "row", alignItems: "center" },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbImage: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
  },
  thumbText: { fontSize: 18, fontWeight: "700", color: colors.primaryDark },
  name: { fontSize: 16, fontWeight: "600", color: colors.text },
  sub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  heart: { fontSize: 20, color: colors.textMuted },
  heartActive: { color: colors.primary },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  price: { fontSize: 19, fontWeight: "800", color: colors.text },
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
    justifyContent: "space-between",
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
