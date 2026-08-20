// A real deal, as a uniform card — same shape and sizing as ProductCard.js
// (search results) on purpose. One consistent card language for "anything
// you could buy," whether it came from the live deals feed or a search:
// same white image frame, same bookmark position, same price row. No
// oversized hero card — every item gets equal weight.
//
// `style` lets the caller size it: BrowseScreen.js passes a fixed width for
// the horizontal-scroll carousels on the home view, and leaves it
// flex:1-default for the full wrapped grid in a single-category "view all".
import React, { useMemo } from "react";
import { Image, Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import VerdictBadge from "./VerdictBadge";
import StoreBadge from "./StoreBadge";
import { normalizeDealStore, STORE_COLORS } from "../utils/storeFilter";
import { radius, spacing, type } from "../theme";
import { useTheme } from "../context/ThemeContext";

export default function DealCard({ deal, onPress, watched, onToggleWatch, style }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const judgement = deal.judgement;
  const storeName = deal.store || deal.category;
  const badgeColor = STORE_COLORS[normalizeDealStore(deal.store)];

  // Nested TouchableOpacity + react-native-web: a tap on the bookmark
  // otherwise bubbles up to the card's own onPress (opening the deal link)
  // as well as toggling the bookmark — stopPropagation keeps it to just one.
  function handleBookmarkPress(e) {
    e?.stopPropagation?.();
    onToggleWatch();
  }

  return (
    <TouchableOpacity style={[styles.card, style]} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.imageFrame}>
        {deal.image ? (
          <Image source={{ uri: deal.image }} style={styles.image} resizeMode="contain" />
        ) : (
          <Ionicons name="pricetag-outline" size={20} color="#C4C9C6" />
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
          <StoreBadge name={storeName} color={badgeColor} size={11} />
          <Text style={styles.store} numberOfLines={1}>
            {storeName}
          </Text>
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {deal.title}
        </Text>

        {judgement?.confident ? (
          <VerdictBadge verdict={judgement.verdict} small />
        ) : (
          // The honest tracking-status line (see scripts/lib/verdict.js) —
          // "Claimed X% off", "First sighting", "Only N sightings so far".
          // Not the old vague "Community favourite"/"Solid find"-style
          // caption: those got promoted into their own explained sections
          // on BrowseScreen.js's home view instead of guessing at meaning
          // on every card.
          judgement?.detail && (
            <Text style={styles.voice} numberOfLines={1}>
              {judgement.detail}
            </Text>
          )
        )}

        <View style={styles.footer}>
          {deal.price != null && <Text style={styles.price}>${deal.price.toFixed(2)}</Text>}
          <View style={styles.voteBlock}>
            <Ionicons name="caret-up" size={10} color={colors.textMuted} />
            <Text style={styles.voteText}>{deal.votes ?? 0}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    // No flex/width here on purpose — the caller sizes it via `style`
    // (flex:1 to fill a grid row evenly, or a fixed width for a
    // horizontal-scroll carousel card).
    card: {
      backgroundColor: colors.card,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    imageFrame: {
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
    storeRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    store: { ...type.micro, color: colors.primary, fontSize: 9.5 },
    title: { color: colors.text, fontSize: 12, fontWeight: "600", lineHeight: 15 },
    voice: { color: colors.accent, fontSize: 10.5, fontWeight: "600", fontStyle: "italic" },
    footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 1 },
    price: { color: colors.saving, fontSize: 13, fontWeight: "800" },
    voteBlock: { flexDirection: "row", alignItems: "center", gap: 2, marginLeft: "auto" },
    voteText: { color: colors.textMuted, fontSize: 10, fontWeight: "600" },
  });
}
