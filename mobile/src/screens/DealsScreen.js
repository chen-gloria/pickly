// The feed, organised by verdict.
//
// The important design decision here: the verdict is not a badge bolted onto
// a popularity ranking, it decides what you see and in what order. The screen
// opens by answering one question — "is there anything worth buying today?" —
// instead of handing over a list to evaluate yourself. Sections that need no
// action (tracking, skipped) collapse, and the count of what we filtered out
// is shown deliberately: proof that the app did work on the user's behalf is
// worth more than the filtered items themselves.
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import DealRow from "../components/DealRow";
import { fetchDeals, timeAgo, DEAL_SOURCE } from "../api/deals";
import { getWatchlist, toggleWatch } from "../utils/watchlist";
import { groupByVerdict, trackingDays as getTrackingDays } from "../utils/priceHistory";
import { colors, radius, spacing, type } from "../theme";

export default function DealsScreen({ navigation }) {
  const [deals, setDeals] = useState([]);
  const [capturedAt, setCapturedAt] = useState(null);
  const [source, setSource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Tracking starts open on purpose. Until history accrues almost everything
  // is unjudged, and a screen that collapses all of it looks broken on day
  // one — people should still be able to browse while the record builds.
  const [expanded, setExpanded] = useState({ wait: true, tracking: true, skip: false });
  const [watched, setWatched] = useState(new Set());

  const load = useCallback(async () => {
    setWatched(new Set((await getWatchlist()).map((w) => w.id)));
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

  function openDeal(deal) {
    Linking.openURL(deal.url).catch(() => {});
  }

  async function onToggleWatch(deal) {
    const next = await toggleWatch(deal);
    setWatched(new Set(next.map((w) => w.id)));
  }

  function toggle(section) {
    setExpanded((prev) => ({ ...prev, [section]: !prev[section] }));
  }

  const buckets = useMemo(() => groupByVerdict(deals), [deals]);
  const trackingDays = useMemo(() => getTrackingDays(), []);

  // Flatten into one list so the whole screen scrolls as a unit, with
  // section headers injected as rows.
  const rows = useMemo(() => {
    const out = [];
    const push = (key, label, hint, items, collapsible) => {
      if (!items.length) return;
      out.push({ type: "header", key: `h-${key}`, section: key, label, hint, count: items.length, collapsible });
      if (!collapsible || expanded[key]) {
        for (const d of items) out.push({ type: "deal", key: `d-${d.id}`, deal: d });
      }
    };

    push("buy", "We'd buy these", "we can show you why", buckets.buy, false);
    push("wait", "Close, but not the lowest", "you could do better", buckets.wait, true);
    push("tracking", "Everything else today", "ranked by community votes", buckets.tracking, true);
    push("skip", "We'd skip these", "cheaper before", buckets.skip, true);
    return out;
  }, [buckets, expanded]);

  const headline =
    buckets.buy.length > 0
      ? `${buckets.buy.length} worth buying`
      : `${deals.length} deals today`;

  // Prefer to lead with something we can actually vouch for. When nothing
  // qualifies yet, fall back to the community's top pick rather than an
  // empty screen — the hero's kicker is phrased off votes ("TOP FIND RIGHT
  // NOW"), so it stays an honest description and never implies we've
  // verified the price.
  const hero = buckets.buy[0] || deals[0] || null;
  const heroIsVerified = buckets.buy.length > 0;

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
        data={rows}
        keyExtractor={(item) => item.key}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        renderItem={({ item }) => {
          if (item.type === "header") {
            return (
              <TouchableOpacity
                style={styles.sectionHead}
                activeOpacity={item.collapsible ? 0.6 : 1}
                onPress={() => item.collapsible && toggle(item.section)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>
                    {item.label} <Text style={styles.sectionCount}>{item.count}</Text>
                  </Text>
                  <Text style={styles.sectionHint}>{item.hint}</Text>
                </View>
                {item.collapsible && (
                  <Ionicons
                    name={expanded[item.section] ? "chevron-up" : "chevron-down"}
                    size={18}
                    color={colors.textMuted}
                  />
                )}
              </TouchableOpacity>
            );
          }
          return (
            <DealRow
              deal={item.deal}
              onPress={() => openDeal(item.deal)}
              watched={watched.has(item.deal.id)}
              onToggleWatch={() => onToggleWatch(item.deal)}
            />
          );
        }}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={styles.kicker}>TODAY</Text>
                <Text style={styles.headline}>{headline}</Text>
                <View style={styles.statusRow}>
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor:
                          source === DEAL_SOURCE.LIVE ? colors.primary : colors.textFaint,
                      },
                    ]}
                  />
                  <Text style={styles.statusText}>
                    {deals.length} checked
                    {capturedAt ? ` · ${timeAgo(capturedAt)}` : ""}
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

            {hero && <DealHeroCard deal={hero} onPress={() => openDeal(hero)} />}

            {/* Says plainly why there are no verdicts yet and when they
                start. A limitation you explain is a reason to come back; one
                you hide just looks like a broken app. */}
            {!heroIsVerified && (
              <View style={styles.buildingNote}>
                <Ionicons name="hourglass-outline" size={15} color={colors.accent} />
                <Text style={styles.buildingText}>
                  <Text style={styles.buildingStrong}>We're building price history.</Text>{" "}
                  Once we've watched an item long enough, you'll see whether it's
                  genuinely cheap — not just discounted. Day {trackingDays}.
                </Text>
              </View>
            )}
          </View>
        }
        ListFooterComponent={
          <View style={styles.footer}>
            <Text style={styles.footerText}>Community deals from OzBargain</Text>
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
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  kicker: { ...type.micro, color: colors.textFaint },
  headline: { ...type.display, color: colors.text, marginTop: 2 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { color: colors.textMuted, ...type.caption },
  headerIcons: { flexDirection: "row", alignItems: "center", gap: spacing.lg, marginTop: 6 },
  buildingNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buildingText: { flex: 1, color: colors.textMuted, ...type.caption, lineHeight: 18 },
  buildingStrong: { color: colors.text, fontWeight: "800" },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: { ...type.section, color: colors.text },
  sectionCount: { color: colors.textFaint },
  sectionHint: { color: colors.textFaint, fontSize: 11, fontWeight: "600", marginTop: 2 },
  footer: { padding: spacing.xl, alignItems: "center" },
  footerText: { color: colors.textMuted, ...type.caption },
  footerSub: { color: colors.textFaint, fontSize: 11, marginTop: 4 },
});
