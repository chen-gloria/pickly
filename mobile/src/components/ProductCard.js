// A real search result, as a card — the grid used across the "Search
// results" section of BrowseScreen.js.
//
// The image frame is deliberately fixed white regardless of app theme,
// always `resizeMode: "contain"` with padding: source photos come from
// wherever the retailer (or Open Food Facts, for scanned items) happens to
// host them — wildly inconsistent sizes, aspect ratios, and backgrounds.
// Rather than trying to actually process/remove backgrounds (a paid,
// unreliable AI step this project isn't taking on), every photo gets
// letterboxed into the same clean white square — the same trick real
// shopping-comparison UIs (Google Shopping included) use to make
// heterogeneous retailer photos read as one consistent catalogue.
import React, { useMemo } from "react";
import { Image, Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { radius, spacing, type } from "../theme";
import { useTheme } from "../context/ThemeContext";
import { CURRENCY_SYMBOL } from "../config";
import StoreBadge from "./StoreBadge";
import { STORE_COLORS } from "../utils/storeFilter";

export default function ProductCard({ item, onPress, watched, onToggleWatch, style }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const hasDiscount = item.oldPrice != null && item.oldPrice > item.price;

  // Nested TouchableOpacity + react-native-web: a tap on the bookmark
  // otherwise bubbles up to the card's own onPress (opening the listing) as
  // well as toggling the bookmark — stopPropagation keeps it to just one.
  function handleBookmarkPress(e) {
    e?.stopPropagation?.();
    onToggleWatch();
  }

  return (
    <TouchableOpacity style={[styles.card, style]} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.imageFrame}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.image} resizeMode="contain" />
        ) : (
          <Ionicons name="image-outline" size={22} color="#C4C9C6" />
        )}
        {onToggleWatch && (
          <TouchableOpacity onPress={handleBookmarkPress} hitSlop={10} style={styles.bookmark}>
            <Ionicons
              name={watched ? "bookmark" : "bookmark-outline"}
              size={14}
              color={watched ? colors.accent : "#8A948D"}
            />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.storeRow}>
          <StoreBadge name={item.store.name} color={STORE_COLORS[item.store.name]} size={13} />
          <View style={[styles.storePill, { backgroundColor: `${item.store.color}22` }]}>
            <Text style={[styles.storePillText, { color: item.store.color }]} numberOfLines={1}>
              {item.store.name}
            </Text>
          </View>
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>

        <View style={styles.priceRow}>
          <Text style={styles.price}>
            {CURRENCY_SYMBOL}
            {item.price.toFixed(2)}
          </Text>
          {hasDiscount && (
            <Text style={styles.oldPrice}>
              {CURRENCY_SYMBOL}
              {item.oldPrice.toFixed(2)}
            </Text>
          )}
        </View>

        {item.rating != null && (
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={10} color={colors.star} />
            <Text style={styles.ratingText}>
              {Number(item.rating).toFixed(1)}
              {item.reviews ? ` (${item.reviews})` : ""}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    // No flex/width here on purpose — the caller sizes it via `style`
    // (flex:1 to fill a grid row evenly, or a fixed width elsewhere).
    card: {
      backgroundColor: colors.card,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    imageFrame: {
      // Always white, on purpose — see file header.
      backgroundColor: "#FFFFFF",
      aspectRatio: 1.15,
      alignItems: "center",
      justifyContent: "center",
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      padding: spacing.md,
    },
    image: { width: "100%", height: "100%" },
    bookmark: {
      position: "absolute",
      top: 6,
      right: 6,
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255,255,255,0.92)",
      shadowColor: "#000",
      shadowOpacity: 0.15,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 1 },
      elevation: 2,
    },
    body: { padding: spacing.md, gap: 6 },
    storeRow: { flexDirection: "row", alignItems: "center", gap: 5 },
    storePill: {
      alignSelf: "flex-start",
      borderRadius: radius.lg,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
    },
    storePillText: { ...type.micro, fontSize: 9.5 },
    title: { color: colors.text, fontSize: 12, fontWeight: "600", lineHeight: 15 },
    priceRow: { flexDirection: "row", alignItems: "baseline", gap: 6 },
    price: { color: colors.saving, fontSize: 14, fontWeight: "800" },
    oldPrice: { color: colors.textFaint, fontSize: 11, textDecorationLine: "line-through" },
    ratingRow: { flexDirection: "row", alignItems: "center", gap: 3 },
    ratingText: { color: colors.textMuted, fontSize: 10, fontWeight: "600" },
  });
}
