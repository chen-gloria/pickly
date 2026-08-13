// The scrolling feed row.
//
// The big ghosted rank numeral is doing real work: it turns a list into a
// countdown, which is what makes people keep scrolling to see what's below.
// It's also the main thing stopping this from reading as another uniform
// card grid.
import React from "react";
import { Image, Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { colors, radius, spacing, type } from "../theme";
import { dealVoice, compactNumber } from "../utils/dealVoice";
import { timeAgo } from "../api/deals";

export default function DealRow({ deal, rank, onPress }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.85}>
      <Text style={styles.rank}>{String(rank).padStart(2, "0")}</Text>

      <View style={styles.thumbWrap}>
        {deal.image ? (
          <Image source={{ uri: deal.image }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbFallback]} />
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.store} numberOfLines={1}>
            {deal.store || deal.category}
          </Text>
          <Text style={styles.age}>{timeAgo(deal.postedAt)}</Text>
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {deal.title}
        </Text>

        <Text style={styles.voice} numberOfLines={1}>
          {dealVoice(deal)}
        </Text>

        <View style={styles.footer}>
          {deal.price != null && <Text style={styles.price}>${deal.price.toFixed(2)}</Text>}
          <View style={styles.stat}>
            <Text style={styles.statArrow}>▲</Text>
            <Text style={styles.statText}>{compactNumber(deal.votes)}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statIcon}>💬</Text>
            <Text style={styles.statText}>{compactNumber(deal.comments)}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rank: {
    width: 26,
    fontSize: 17,
    fontWeight: "800",
    color: colors.textFaint,
    marginTop: 2,
    letterSpacing: -0.5,
  },
  thumbWrap: {
    width: 66,
    height: 66,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.cardHi,
  },
  thumb: { width: "100%", height: "100%" },
  thumbFallback: { backgroundColor: colors.cardHi },
  content: { flex: 1 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  store: { ...type.micro, color: colors.primary, flex: 1 },
  age: { color: colors.textFaint, fontSize: 11 },
  title: { color: colors.text, ...type.body, lineHeight: 19, marginTop: 3 },
  voice: { color: colors.accent, fontSize: 12, fontWeight: "600", marginTop: 5, fontStyle: "italic" },
  footer: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.sm },
  price: { color: colors.saving, fontSize: 16, fontWeight: "800" },
  stat: { flexDirection: "row", alignItems: "center", gap: 3 },
  statArrow: { color: colors.textMuted, fontSize: 9 },
  statIcon: { fontSize: 10 },
  statText: { color: colors.textMuted, fontSize: 12, fontWeight: "600" },
});
