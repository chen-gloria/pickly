// The feed — the "open it when you're bored" surface.
//
// Shape is deliberately editorial rather than a uniform grid:
//   hero (one lead story) → horizontal rail (variable reward, flick to
//   reveal) → ranked vertical list (a countdown you scroll to finish).
// Everything shown is real OzBargain community data — votes, comments,
// timestamps. We use genuine social proof instead of a manufactured
// countdown clock, which is both more honest and more persuasive.
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import DealHeroCard from "../components/DealHeroCard";
import DealCard from "../components/DealCard";
import DealRow from "../components/DealRow";
import { fetchDeals, timeAgo, DEAL_SOURCE } from "../api/deals";
import { colors, radius, spacing, type } from "../theme";

const RAIL_COUNT = 6;

export default function DealsScreen({ navigation }) {
  const [deals, setDeals] = useState([]);
  const [capturedAt, setCapturedAt] = useState(null);
  const [source, setSource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const res = await fetchDeals();
    setDeals(res.deals);
    setCapturedAt(res.capturedAt);
    setSource(res.source);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  // Every deal keeps its canonical OzBargain link — that's both the right
  // attribution and where the actual discussion/verification lives.
  function openDeal(deal) {
    Linking.openURL(deal.url).catch(() => {});
  }

  const hero = deals[0];
  const rail = deals.slice(1, 1 + RAIL_COUNT);
  const feed = deals.slice(1 + RAIL_COUNT);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <ActivityIndicator style={{ marginTop: spacing.xl * 2 }} color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <FlatList
        data={feed}
        keyExtractor={(item) => `deal-${item.id}`}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        renderItem={({ item, index }) => (
          <DealRow deal={item} rank={index + 1 + RAIL_COUNT + 1} onPress={() => openDeal(item)} />
        )}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <View>
                <Text style={styles.wordmark}>Pickly</Text>
                <View style={styles.statusRow}>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: source === DEAL_SOURCE.LIVE ? colors.primary : colors.textFaint },
                    ]}
                  />
                  <Text style={styles.statusText}>
                    {deals.length} deals
                    {capturedAt ? ` · updated ${timeAgo(capturedAt)}` : ""}
                  </Text>
                </View>
              </View>
              <View style={styles.headerIcons}>
                <TouchableOpacity hitSlop={8} onPress={() => navigation.navigate("Search")}>
                  <Ionicons name="search" size={22} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity hitSlop={8} onPress={() => navigation.navigate("Favorites")}>
                  <Ionicons name="heart-outline" size={22} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity hitSlop={8} onPress={() => navigation.navigate("Profile")}>
                  <Ionicons name="person-outline" size={22} color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>

            {hero && (
              <>
                <DealHeroCard deal={hero} onPress={() => openDeal(hero)} />
                <View style={styles.attribution}>
                  <Text style={styles.attributionText}>
                    Community deals from OzBargain
                  </Text>
                </View>
              </>
            )}

            {rail.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHead}>
                  <Text style={styles.sectionTitle}>Heating Up</Text>
                  <Text style={styles.sectionHint}>swipe →</Text>
                </View>
                <FlatList
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  data={rail}
                  keyExtractor={(item) => `rail-${item.id}`}
                  contentContainerStyle={{ paddingHorizontal: spacing.md }}
                  renderItem={({ item }) => (
                    <DealCard deal={item} onPress={() => openDeal(item)} />
                  )}
                />
              </View>
            )}

            {feed.length > 0 && (
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>The Rundown</Text>
                <Text style={styles.sectionHint}>ranked by heat</Text>
              </View>
            )}
          </View>
        }
        ListFooterComponent={
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              That's everything worth flagging right now.
            </Text>
            <Text style={styles.footerSub}>Pull down to refresh</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  wordmark: { ...type.display, color: colors.text },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { color: colors.textMuted, ...type.caption },
  headerIcons: { flexDirection: "row", alignItems: "center", gap: spacing.lg, marginTop: 6 },
  attribution: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  attributionText: { color: colors.textFaint, fontSize: 11 },
  section: { marginTop: spacing.lg },
  sectionHead: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.sm + 2,
  },
  sectionTitle: { ...type.section, color: colors.text },
  sectionHint: { color: colors.textFaint, fontSize: 11, fontWeight: "600" },
  footer: { padding: spacing.xl, alignItems: "center" },
  footerText: { color: colors.textMuted, ...type.caption },
  footerSub: { color: colors.textFaint, fontSize: 11, marginTop: 4 },
});
