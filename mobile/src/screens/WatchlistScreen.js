// Saved items, and any that have dropped since you saved them.
//
// Drops go at the top and are stated in the terms the user actually cares
// about — cheaper than when *they* saved it, not cheaper than some abstract
// average.
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { fetchDeals, timeLeft } from "../api/deals";
import {
  getWatchlist,
  removeFromWatchlist,
  findDrops,
} from "../utils/watchlist";
import { shareText } from "../utils/shareText";
import { colors, radius, spacing, type } from "../theme";

export default function WatchlistScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [drops, setDrops] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const list = await getWatchlist();
    setItems(list);
    if (list.length) {
      const { deals } = await fetchDeals();
      setDrops(findDrops(list, deals));
    } else {
      setDrops([]);
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function remove(id) {
    const next = await removeFromWatchlist(id);
    setItems(next);
    setDrops((prev) => prev.filter((d) => d.id !== id));
  }

  // Stands in for the "friends" social loop from the original plan — no
  // account graph to build or moderate, and it's useful the day you save
  // your first item rather than only once other people join.
  function shareList() {
    const lines = items.map((it) => {
      const price = it.priceWhenSaved != null ? ` — $${it.priceWhenSaved.toFixed(2)}` : "";
      const store = it.store ? ` (${it.store})` : "";
      return `• ${it.title}${price}${store}`;
    });
    const message = `My Pickly watchlist (${items.length} item${items.length === 1 ? "" : "s"}):\n${lines.join(
      "\n"
    )}\n\nvia Pickly`;
    shareText(message, { subject: "My Pickly watchlist" });
  }

  // Watching is a tab root, not a pushed screen, so there's no native back
  // button here by default — but the bottom tab bar alone wasn't a clear
  // enough way out for people expecting a header control. This jumps
  // straight to Browse the same way tapping the tab does.
  const backRow = (
    <TouchableOpacity style={styles.backRow} hitSlop={8} onPress={() => navigation.navigate("Browse")}>
      <Ionicons name="chevron-back" size={22} color={colors.text} />
      <Text style={styles.backText}>Browse</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        {backRow}
        <ActivityIndicator style={{ marginTop: spacing.xl * 2 }} color={colors.primary} />
      </SafeAreaView>
    );
  }

  const droppedIds = new Set(drops.map((d) => d.id));
  const steady = items.filter((i) => !droppedIds.has(i.id));

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <FlatList
        data={steady}
        keyExtractor={(item) => `w-${item.id}`}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        ListHeaderComponent={
          <View>
            {backRow}
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={styles.kicker}>WATCHING</Text>
                <Text style={styles.headline}>
                  {items.length === 0
                    ? "Nothing saved yet"
                    : drops.length > 0
                    ? `${drops.length} dropped`
                    : `${items.length} item${items.length === 1 ? "" : "s"}`}
                </Text>
              </View>
              {items.length > 0 && (
                <TouchableOpacity style={styles.shareBtn} onPress={shareList} hitSlop={8}>
                  <Ionicons name="share-outline" size={20} color={colors.text} />
                </TouchableOpacity>
              )}
            </View>

            {items.length === 0 && (
              <View style={styles.empty}>
                <Ionicons name="notifications-outline" size={26} color={colors.textFaint} />
                <Text style={styles.emptyTitle}>Save something you're waiting on</Text>
                <Text style={styles.emptyBody}>
                  Tap the bookmark on any deal. We'll keep watching its price and
                  tell you when it actually drops.
                </Text>
              </View>
            )}

            {drops.map((d) => (
              <TouchableOpacity
                key={`drop-${d.id}`}
                style={styles.dropCard}
                activeOpacity={0.85}
                onPress={() => Linking.openURL(d.deal.url).catch(() => {})}
              >
                <View style={styles.dropTop}>
                  <Ionicons name="trending-down" size={15} color={colors.saving} />
                  <Text style={styles.dropLabel}>
                    ${d.drop.toFixed(2)} cheaper than when you saved it
                  </Text>
                </View>
                <Text style={styles.dropTitle} numberOfLines={2}>
                  {d.title}
                </Text>
                <View style={styles.dropPrices}>
                  <Text style={styles.dropNow}>${d.currentPrice.toFixed(2)}</Text>
                  <Text style={styles.dropWas}>${d.priceWhenSaved.toFixed(2)}</Text>
                  <View style={styles.dropPct}>
                    <Text style={styles.dropPctText}>−{d.percent}%</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}

            {steady.length > 0 && (
              <Text style={styles.sectionTitle}>
                {drops.length > 0 ? "Still watching" : "Watching"}
              </Text>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const left = timeLeft(item.expiresAt);
          return (
            <View style={styles.row}>
              {item.image ? (
                <Image source={{ uri: item.image }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, { backgroundColor: colors.cardHi }]} />
              )}
              <TouchableOpacity
                style={{ flex: 1 }}
                onPress={() => Linking.openURL(item.url).catch(() => {})}
              >
                <Text style={styles.store} numberOfLines={1}>
                  {item.store}
                </Text>
                <Text style={styles.title} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.saved}>
                  {item.priceWhenSaved != null
                    ? `Saved at $${item.priceWhenSaved.toFixed(2)}`
                    : "No price recorded"}
                  {left ? ` · ${left.label}` : ""}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => remove(item.id)} hitSlop={8}>
                <Ionicons name="close" size={17} color={colors.textFaint} />
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    alignSelf: "flex-start",
  },
  backText: { color: colors.text, fontSize: 15, fontWeight: "600", marginLeft: 2 },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  shareBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cardHi,
    marginTop: 2,
  },
  kicker: { ...type.micro, color: colors.textFaint },
  headline: { ...type.display, color: colors.text, marginTop: 2 },
  empty: {
    margin: spacing.md,
    padding: spacing.lg,
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: { ...type.body, color: colors.text, marginTop: spacing.sm },
  emptyBody: {
    ...type.caption,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  dropCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.35)",
  },
  dropTop: { flexDirection: "row", alignItems: "center", gap: 6 },
  dropLabel: { ...type.caption, color: colors.saving, fontWeight: "800" },
  dropTitle: { ...type.body, color: colors.text, marginTop: 6, lineHeight: 20 },
  dropPrices: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.sm },
  dropNow: { fontSize: 22, fontWeight: "800", color: colors.saving },
  dropWas: {
    fontSize: 14,
    color: colors.textFaint,
    textDecorationLine: "line-through",
  },
  dropPct: {
    backgroundColor: "rgba(74,222,128,0.15)",
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  dropPctText: { ...type.micro, color: colors.saving },
  sectionTitle: {
    ...type.section,
    color: colors.text,
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  thumb: { width: 52, height: 52, borderRadius: radius.md },
  store: { ...type.micro, color: colors.primary },
  title: { ...type.body, color: colors.text, marginTop: 3, lineHeight: 19 },
  saved: { ...type.caption, color: colors.textMuted, marginTop: 5 },
});
