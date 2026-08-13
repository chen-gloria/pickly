// The single hero slot at the top of the feed.
//
// Deliberately the ONLY card of this size and shape — an editorial "lead
// story". Uniform card grids are what make a screen feel machine-generated;
// a clear lead followed by smaller items is what makes it feel edited.
import React from "react";
import { Image, Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radius, spacing, type } from "../theme";
import { heroKicker, compactNumber } from "../utils/dealVoice";
import { timeAgo } from "../api/deals";

export default function DealHeroCard({ deal, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      {deal.image ? (
        <Image source={{ uri: deal.image }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={[styles.image, styles.imageFallback]} />
      )}

      {/* Scrim. Retailer images are wildly inconsistent — many are product
          shots on a white studio background, which on a dark card reads as a
          glaring white slab. So this tints the top as well as blacking out
          the bottom: the photo still reads, but any background is pulled
          toward the theme and the headline stays legible over anything. */}
      <LinearGradient
        colors={[
          "rgba(14,18,16,0.55)",
          "rgba(14,18,16,0.18)",
          "rgba(14,18,16,0.72)",
          "rgba(14,18,16,0.97)",
        ]}
        locations={[0, 0.3, 0.62, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.kickerRow}>
        <View style={styles.kicker}>
          <Text style={styles.kickerText}>{heroKicker(deal)}</Text>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.metaRow}>
          <View style={styles.votePill}>
            <Text style={styles.voteArrow}>▲</Text>
            <Text style={styles.voteText}>{compactNumber(deal.votes)}</Text>
          </View>
          {deal.store && <Text style={styles.store}>{deal.store}</Text>}
          <Text style={styles.dot}>·</Text>
          <Text style={styles.age}>{timeAgo(deal.postedAt)}</Text>
        </View>

        <Text style={styles.title} numberOfLines={3}>
          {deal.title}
        </Text>

        <View style={styles.footerRow}>
          {deal.price != null && (
            <Text style={styles.price}>${deal.price.toFixed(2)}</Text>
          )}
          <View style={styles.kindChip}>
            <Text style={styles.kindText}>{deal.kind}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 340,
    marginHorizontal: spacing.md,
    borderRadius: radius.xl,
    overflow: "hidden",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "space-between",
  },
  image: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  imageFallback: { backgroundColor: colors.cardHi },
  kickerRow: { flexDirection: "row", padding: spacing.md },
  kicker: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  kickerText: { ...type.micro, color: colors.saveBadgeText },
  body: { padding: spacing.lg },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: spacing.sm },
  votePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(242,193,78,0.16)",
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  voteArrow: { color: colors.accent, fontSize: 10 },
  voteText: { color: colors.accent, ...type.caption, fontWeight: "800" },
  store: { color: colors.text, ...type.caption },
  dot: { color: colors.textFaint },
  age: { color: colors.textMuted, ...type.caption },
  title: { color: colors.text, ...type.title, lineHeight: 27 },
  footerRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.md },
  price: { color: colors.saving, fontSize: 26, fontWeight: "800", letterSpacing: -0.5 },
  kindChip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardHi,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  kindText: { ...type.micro, color: colors.textMuted },
});
