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
import { colors, radius, spacing, type } from "../theme";

export default function WatchlistScreen() {
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
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
            <View style={styles.header}>
              <Text style={styles.kicker}>WATCHING</Text>
              <Text style={styles.headline}>
                {items.length === 0
                  ? "Nothing saved yet"
                  : drops.length > 0
                  ? `${drops.length} dropped`
                  : `${items.length} item${items.length === 1 ? "" : "s"}`}
              </Text>
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
  header: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.md },
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
