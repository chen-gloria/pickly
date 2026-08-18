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
  Image,
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
import { radius, spacing, type } from "../theme";
import { useTheme } from "../context/ThemeContext";

function Row({ rank, deal, onPress }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.rank}>{rank}</Text>
      <View style={styles.thumbFrame}>
        {deal.image ? (
          <Image source={{ uri: deal.image }} style={styles.thumb} resizeMode="contain" />
        ) : (
          <Ionicons name="pricetag-outline" size={18} color="#C4C9C6" />
        )}
      </View>
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

export default function LeaderboardScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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

  const header = (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.navigate("Browse")} hitSlop={8}>
        <Ionicons name="chevron-back" size={22} color={colors.text} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Leaderboard</Text>
      <TouchableOpacity onPress={() => navigation.navigate("Profile")} hitSlop={8}>
        <Ionicons name="person-outline" size={22} color={colors.text} />
      </TouchableOpacity>
    </View>
  );

  if (!deals) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        {header}
        <ActivityIndicator style={{ marginTop: spacing.xl * 2 }} color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {header}
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }}>
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

function makeStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
    },
    headerTitle: { ...type.section, color: colors.text },
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
      marginTop: spacing.xl,
      marginBottom: spacing.md,
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
      marginBottom: spacing.md,
    },
    rank: { width: 22, textAlign: "center", color: colors.textFaint, fontSize: 15, fontWeight: "800" },
    thumbFrame: {
      width: 44,
      height: 44,
      borderRadius: radius.sm,
      backgroundColor: "#FFFFFF",
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      padding: 4,
    },
    thumb: { width: "100%", height: "100%" },
    title: { color: colors.text, ...type.body, lineHeight: 19 },
    store: { color: colors.primary, ...type.micro, marginTop: 4 },
    voteBlock: { flexDirection: "row", alignItems: "center", gap: 2 },
    voteText: { color: colors.text, fontSize: 13, fontWeight: "800" },
  });
}
