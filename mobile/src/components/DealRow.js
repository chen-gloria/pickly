// The scrolling feed row.
//
// The big ghosted rank numeral is doing real work: it turns a list into a
// countdown, which is what makes people keep scrolling to see what's below.
// It's also the main thing stopping this from reading as another uniform
// card grid.
import React from "react";
import { Image, Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Sparkline from "./Sparkline";
import VerdictBadge from "./VerdictBadge";
import { colors, radius, spacing, type } from "../theme";
import { dealVoice, compactNumber } from "../utils/dealVoice";
import { timeAgo, timeLeft } from "../api/deals";

export default function DealRow({ deal, onPress, watched, onToggleWatch }) {
  const judgement = deal.judgement;
  const left = timeLeft(deal.expiresAt);

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.85}>
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
          {onToggleWatch && (
            <TouchableOpacity onPress={onToggleWatch} hitSlop={10} style={styles.bookmark}>
              <Ionicons
                name={watched ? "bookmark" : "bookmark-outline"}
                size={16}
                color={watched ? colors.accent : colors.textFaint}
              />
            </TouchableOpacity>
          )}
          <Text style={styles.age}>{timeAgo(deal.postedAt)}</Text>
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {deal.title}
        </Text>

        {/* Only badge a row when we actually have a call to make. Stamping
            "TRACKING" on nearly every row would put our data-collection
            status where the user's benefit should be, and repeated forty
            times it just reads as "this app isn't ready yet". Unjudged rows
            instead show what IS true and useful today — the community's
            read, or the retailer's own claim, attributed. */}
        {judgement?.confident ? (
          <View style={styles.judgeRow}>
            <VerdictBadge verdict={judgement.verdict} small />
            <Text style={styles.reason} numberOfLines={1}>
              {judgement.detail}
            </Text>
            <Sparkline series={judgement.series} width={52} height={18} />
          </View>
        ) : (
          <Text style={styles.voice} numberOfLines={1}>
            {judgement?.detail?.startsWith("Claimed")
              ? judgement.detail
              : dealVoice(deal)}
          </Text>
        )}

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
          {/* Only shown when the poster recorded a real end date. No
              deadline invented where the retailer didn't state one. */}
          {left && (
            <Text style={[styles.expiry, left.urgent && styles.expiryUrgent]}>
              {left.label}
            </Text>
          )}
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
  bookmark: { paddingHorizontal: spacing.sm },
  age: { color: colors.textFaint, fontSize: 11 },
  expiry: { color: colors.textMuted, fontSize: 11, fontWeight: "700", marginLeft: "auto" },
  expiryUrgent: { color: colors.ember },
  title: { color: colors.text, ...type.body, lineHeight: 19, marginTop: 3 },
  voice: { color: colors.accent, fontSize: 12, fontWeight: "600", marginTop: 5, fontStyle: "italic" },
  judgeRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: 7 },
  reason: { flex: 1, color: colors.textMuted, fontSize: 11.5, fontWeight: "600" },
  footer: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.sm },
  price: { color: colors.saving, fontSize: 16, fontWeight: "800" },
  stat: { flexDirection: "row", alignItems: "center", gap: 3 },
  statArrow: { color: colors.textMuted, fontSize: 9 },
  statIcon: { fontSize: 10 },
  statText: { color: colors.textMuted, fontSize: 12, fontWeight: "600" },
});
