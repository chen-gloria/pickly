// Stands in for the original "leaderboard" idea (top-rated / most-searched
// per category, across the whole catalogue) — cut in the earlier product
// analysis because a leaderboard is the *result* of having a lot of users
// and data, not something that draws them in on day one. Building a fake
// one with invented numbers would be worse than not having it.
//
// What's shown here instead is real: today's actual community vote counts
// from the deal feed, ranked honestly, with the sample size stated up front
// rather than dressed up as a mature ranking. No search-volume section
// either — we only have this device's own recent searches (see
// utils/recentSearches.js), and presenting one person's search history as
// "most searched" would be the same kind of dishonest the original leaderboard
// idea was cut for.
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { fetchDeals } from "../api/deals";
import { compactNumber } from "../utils/dealVoice";
import { colors, radius, spacing, type } from "../theme";

function Row({ rank, deal, onPress }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.rank}>{rank}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={2}>
          {deal.title}
        </Text>
        <Text style={styles.store} numberOfLines={1}>
          {deal.store || deal.category}
        </Text>
      </View>
      <View style={styles.voteBlock}>
        <Ionicons name="caret-up" size={13} color={colors.primary} />
        <Text style={styles.voteText}>{compactNumber(deal.votes)}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function LeaderboardScreen() {
  const [deals, setDeals] = useState(null);

  useEffect(() => {
    fetchDeals().then((res) => setDeals(res.deals));
  }, []);

  const { overall, byCategory } = useMemo(() => {
    if (!deals) return { overall: [], byCategory: [] };
    const ranked = [...deals].sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0));
    const cats = [...new Set(ranked.map((d) => d.category).filter(Boolean))];
    return {
      overall: ranked.slice(0, 5),
      byCategory: cats.map((cat) => ({
        category: cat,
        deals: ranked.filter((d) => d.category === cat).slice(0, 3),
      })),
    };
  }, [deals]);

  function open(deal) {
    Linking.openURL(deal.url).catch(() => {});
  }

  if (!deals) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <ActivityIndicator style={{ marginTop: spacing.xl * 2 }} color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}>
        <View style={styles.caveat}>
          <Ionicons name="information-circle-outline" size={15} color={colors.textMuted} />
          <Text style={styles.caveatText}>
            Ranked by community votes on today's {deals.length}-deal feed. That's a small,
            single-day sample — not a mature ranking yet, just what's real right now.
          </Text>
        </View>

        <Text style={styles.section}>All categories</Text>
        {overall.map((deal, i) => (
          <Row key={deal.id} rank={i + 1} deal={deal} onPress={() => open(deal)} />
        ))}

        {byCategory.map(({ category, deals: catDeals }) => (
          <View key={category}>
            <Text style={styles.section}>{category}</Text>
            {catDeals.map((deal, i) => (
              <Row key={deal.id} rank={i + 1} deal={deal} onPress={() => open(deal)} />
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  caveat: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  caveatText: { flex: 1, color: colors.textMuted, ...type.caption, lineHeight: 18 },
  section: {
    ...type.section,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 2,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rank: { width: 22, textAlign: "center", color: colors.textFaint, fontSize: 15, fontWeight: "800" },
  title: { color: colors.text, ...type.body, lineHeight: 19 },
  store: { color: colors.primary, ...type.micro, marginTop: 4 },
  voteBlock: { flexDirection: "row", alignItems: "center", gap: 2 },
  voteText: { color: colors.text, fontSize: 13, fontWeight: "800" },
});
