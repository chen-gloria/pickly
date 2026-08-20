import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { radius, spacing, type } from "../theme";
import {
  STORES,
  getStoreFilters,
  toggleStoreInGroup,
  setRecommendationStores as persistRecommendationStores,
  setSearchStores as persistSearchStores,
  setLeaderboardStores as persistLeaderboardStores,
} from "../utils/storeFilter";

const APPEARANCE_OPTIONS = [
  { key: "system", icon: "phone-portrait-outline", label: "Matching your device" },
  { key: "light", icon: "sunny-outline", label: "Light" },
  { key: "dark", icon: "moon-outline", label: "Dark" },
];

// One sub-section (inside the single merged "Store filters" card below),
// multi-select chips for one filter group (recommendation feed or search).
// "All" is its own chip, not just an empty-selection fallback: it's active
// whenever nothing else is picked, and tapping it clears any specific
// selection straight back to unfiltered — a real, visible default rather
// than an absence of chips the user has to infer.
function StoreFilterSection({ title, iconName, selected, onToggle, onSelectAll, colors, styles }) {
  const allActive = selected.length === 0;
  return (
    <View style={styles.filterSection}>
      <View style={styles.row0}>
        <View style={[styles.rowIcon, { backgroundColor: colors.cardHi }]}>
          <Ionicons name={iconName} size={17} color={colors.textMuted} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>{title}</Text>
          <Text style={styles.rowSub}>
            {allActive ? "All stores" : `${selected.length} of ${STORES.length} selected`}
          </Text>
        </View>
      </View>
      <View style={styles.chipRow}>
        <TouchableOpacity
          style={[styles.chip, allActive && styles.chipActive]}
          onPress={onSelectAll}
          hitSlop={4}
        >
          <Text style={[styles.chipText, allActive && styles.chipTextActive]}>All</Text>
        </TouchableOpacity>
        {STORES.map((store) => {
          const active = selected.includes(store);
          return (
            <TouchableOpacity
              key={store}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onToggle(store)}
              hitSlop={4}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{store}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function ProfileScreen({ navigation }) {
  const { token, user, logout } = useAuth();
  const { colors, mode, setMode } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const currentLabel = APPEARANCE_OPTIONS.find((o) => o.key === mode)?.label ?? "Dark";

  const [recommendationStores, setRecommendationStores] = useState([]);
  const [searchStores, setSearchStores] = useState([]);
  const [leaderboardStores, setLeaderboardStores] = useState([]);

  useEffect(() => {
    (async () => {
      const filters = await getStoreFilters();
      setRecommendationStores(filters.recommendationStores);
      setSearchStores(filters.searchStores);
      setLeaderboardStores(filters.leaderboardStores);
    })();
  }, [token]);

  async function toggleRecommendation(store) {
    setRecommendationStores(await toggleStoreInGroup("recommendation", store, recommendationStores));
  }

  async function toggleSearch(store) {
    setSearchStores(await toggleStoreInGroup("search", store, searchStores));
  }

  async function toggleLeaderboard(store) {
    setLeaderboardStores(await toggleStoreInGroup("leaderboard", store, leaderboardStores));
  }

  async function selectAllRecommendation() {
    const result = await persistRecommendationStores([]);
    setRecommendationStores(result.recommendationStores);
  }

  async function selectAllSearch() {
    const result = await persistSearchStores([]);
    setSearchStores(result.searchStores);
  }

  async function selectAllLeaderboard() {
    const result = await persistLeaderboardStores([]);
    setLeaderboardStores(result.leaderboardStores);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {token ? (
        <>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() || "?"}</Text>
          </View>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </>
      ) : (
        <>
          <View style={[styles.avatar, styles.avatarGuest]}>
            <Ionicons name="person-outline" size={34} color={colors.textFaint} />
          </View>
          <Text style={styles.name}>Not logged in</Text>
          <Text style={styles.email}>
            Search, deals and watching all work without an account — log in only if you want one.
          </Text>
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => navigation.navigate("Login")}
          >
            <Text style={styles.loginBtnText}>Log in</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate("Signup")} hitSlop={8}>
            <Text style={styles.signupLink}>
              New here? <Text style={{ fontWeight: "700" }}>Create an account</Text>
            </Text>
          </TouchableOpacity>
        </>
      )}

      <View style={styles.row}>
        <View style={[styles.rowIcon, { backgroundColor: colors.cardHi }]}>
          <Ionicons name="contrast-outline" size={17} color={colors.textMuted} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>Appearance</Text>
          <Text style={styles.rowSub}>{currentLabel}</Text>
        </View>
        <View style={styles.segments}>
          {APPEARANCE_OPTIONS.map((o) => (
            <TouchableOpacity
              key={o.key}
              style={[styles.segmentBtn, mode === o.key && styles.segmentBtnActive]}
              onPress={() => setMode(o.key)}
              hitSlop={4}
            >
              <Ionicons
                name={o.icon}
                size={15}
                color={mode === o.key ? colors.onPrimary : colors.textMuted}
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* One card, three sub-sections — independent selections (someone
          might want the Browse tab's recommended feed narrowed down while
          still searching or checking the leaderboard across every store)
          but one visual block, since they're the same feature. All three
          dual-backed (server when logged in, AsyncStorage when not — see
          utils/storeFilter.js), same pattern as Watchlist. */}
      <View style={styles.filterCard}>
        <Text style={styles.filterCardTitle}>Store filters</Text>
        <StoreFilterSection
          title="Recommendation filter"
          iconName="sparkles-outline"
          selected={recommendationStores}
          onToggle={toggleRecommendation}
          onSelectAll={selectAllRecommendation}
          colors={colors}
          styles={styles}
        />
        <View style={styles.filterDivider} />
        <StoreFilterSection
          title="Search filter"
          iconName="search-outline"
          selected={searchStores}
          onToggle={toggleSearch}
          onSelectAll={selectAllSearch}
          colors={colors}
          styles={styles}
        />
        <View style={styles.filterDivider} />
        <StoreFilterSection
          title="Leaderboard filter"
          iconName="trophy-outline"
          selected={leaderboardStores}
          onToggle={toggleLeaderboard}
          onSelectAll={selectAllLeaderboard}
          colors={colors}
          styles={styles}
        />
      </View>

      {/* Watching has no item cap. An earlier plan was to gate this behind a
          paywall at 5 items — dropped because the free competitors in this
          space (BuyWisely, Whisprice) don't limit tracking either, so a cap
          here would just push people to them. */}
      <View style={styles.row}>
        <View style={[styles.rowIcon, { backgroundColor: "rgba(74,222,128,0.15)" }]}>
          <Ionicons name="pricetag-outline" size={17} color={colors.saving} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>Free plan</Text>
          <Text style={styles.rowSub}>Unlimited watching — no item cap.</Text>
        </View>
      </View>


      <View style={styles.aboutCard}>
        <Text style={styles.aboutTitle}>About the deals feed</Text>
        <Text style={styles.aboutBody}>
          Deal posts on the Browse tab come from OzBargain's community. Pickly doesn't
          host or rewrite them — every tap sends you to the original post or store, and
          the vote/comment counts you see there are theirs, not ours.
        </Text>
      </View>

      {token && (
        <TouchableOpacity style={styles.logout} onPress={logout}>
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { alignItems: "center", paddingTop: spacing.xl, paddingHorizontal: spacing.md },
    avatar: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.md,
    },
    avatarText: { color: colors.onPrimary, fontSize: 36, fontWeight: "800" },
    name: { fontSize: 22, fontWeight: "700", color: colors.text },
    email: { color: colors.textMuted, marginTop: spacing.xs, textAlign: "center", lineHeight: 19, maxWidth: 320 },
    avatarGuest: { backgroundColor: colors.cardHi, borderWidth: 1, borderColor: colors.border },
    loginBtn: {
      backgroundColor: colors.primary,
      borderRadius: radius.md,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.sm + 2,
      marginTop: spacing.lg,
    },
    loginBtnText: { color: colors.onPrimary, fontWeight: "700", fontSize: 15 },
    signupLink: { color: colors.text, marginTop: spacing.md, fontSize: 13 },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm + 2,
      width: "100%",
      backgroundColor: colors.card,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      marginTop: spacing.lg,
    },
    rowIcon: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
    },
    rowTitle: { color: colors.text, ...type.body },
    rowSub: { color: colors.textMuted, ...type.caption, marginTop: 2 },
    segments: { flexDirection: "row", gap: 4, backgroundColor: colors.background, borderRadius: radius.pill, padding: 3 },
    segmentBtn: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
    segmentBtnActive: { backgroundColor: colors.primary },
    filterCard: {
      width: "100%",
      backgroundColor: colors.card,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      marginTop: spacing.lg,
    },
    filterCardTitle: { color: colors.text, ...type.body, fontWeight: "700", marginBottom: spacing.sm },
    filterSection: {},
    filterDivider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
    row0: { flexDirection: "row", alignItems: "center", gap: spacing.sm + 2 },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: spacing.md },
    chip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm - 2,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { color: colors.textMuted, ...type.caption, fontWeight: "600" },
    chipTextActive: { color: colors.onPrimary },
    aboutCard: {
      width: "100%",
      backgroundColor: colors.card,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      marginTop: spacing.lg,
    },
    aboutTitle: { color: colors.text, ...type.body, marginBottom: 6 },
    aboutBody: { color: colors.textMuted, ...type.caption, lineHeight: 18 },
    logout: {
      marginTop: spacing.xl,
      marginBottom: spacing.xl,
      borderWidth: 1,
      borderColor: colors.danger,
      borderRadius: radius.md,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
    },
    logoutText: { color: colors.danger, fontWeight: "700", fontSize: 16 },
  });
}
