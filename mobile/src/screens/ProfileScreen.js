import React from "react";
import { ScrollView, Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { colors, radius, spacing, type } from "../theme";

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {user?.name?.[0]?.toUpperCase() || "?"}
        </Text>
      </View>
      <Text style={styles.name}>{user?.name}</Text>
      <Text style={styles.email}>{user?.email}</Text>

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

      <TouchableOpacity style={styles.row} onPress={() => navigation.navigate("Leaderboard")}>
        <View style={[styles.rowIcon, { backgroundColor: "rgba(242,193,78,0.15)" }]}>
          <Ionicons name="trophy-outline" size={17} color={colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>Leaderboard</Text>
          <Text style={styles.rowSub}>Today's top-voted deals, by category.</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
      </TouchableOpacity>

      <View style={styles.aboutCard}>
        <Text style={styles.aboutTitle}>About the deals feed</Text>
        <Text style={styles.aboutBody}>
          Deal posts on the Browse tab come from OzBargain's community. Pickly doesn't
          host or rewrite them — every tap sends you to the original post or store, and
          the vote/comment counts you see there are theirs, not ours.
        </Text>
      </View>

      <TouchableOpacity style={styles.logout} onPress={logout}>
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  email: { color: colors.textMuted, marginTop: spacing.xs },
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
