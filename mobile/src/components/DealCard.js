// Medium card for the horizontal "Heating Up" rail — the variable-reward
// slot. Swiping sideways to see what's next is the cheap, honest version of
// a slot-machine pull: every flick reveals a different find.
import React from "react";
import { Image, Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { colors, radius, spacing, type } from "../theme";
import { compactNumber } from "../utils/dealVoice";
import { timeAgo } from "../api/deals";

export default function DealCard({ deal, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.thumbWrap}>
        {deal.image ? (
          <Image source={{ uri: deal.image }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbFallback]} />
        )}
        <View style={styles.votePill}>
          <Text style={styles.voteArrow}>▲</Text>
          <Text style={styles.voteText}>{compactNumber(deal.votes)}</Text>
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.store} numberOfLines={1}>
          {deal.store || deal.category}
        </Text>
        <Text style={styles.title} numberOfLines={2}>
          {deal.title}
        </Text>
        <View style={styles.footer}>
          {deal.price != null ? (
            <Text style={styles.price}>${deal.price.toFixed(2)}</Text>
          ) : (
            <Text style={styles.kind}>{deal.kind}</Text>
          )}
          <Text style={styles.age}>{timeAgo(deal.postedAt)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 190,
    marginRight: spacing.sm + 2,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  thumbWrap: { height: 112, backgroundColor: colors.cardHi },
  thumb: { width: "100%", height: "100%" },
  thumbFallback: { backgroundColor: colors.cardHi },
  votePill: {
    position: "absolute",
    top: spacing.sm,
    left: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(14,18,16,0.82)",
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  voteArrow: { color: colors.accent, fontSize: 9 },
  voteText: { color: colors.accent, fontSize: 11.5, fontWeight: "800" },
  body: { padding: spacing.sm + 4 },
  store: { ...type.micro, color: colors.primary, marginBottom: 3 },
  title: { color: colors.text, ...type.body, lineHeight: 19, minHeight: 38 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  price: { color: colors.saving, fontSize: 17, fontWeight: "800" },
  kind: { ...type.micro, color: colors.accent },
  age: { color: colors.textFaint, fontSize: 11 },
});
