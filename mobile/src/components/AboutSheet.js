// "How Pickly works" — a single, discoverable place for the honesty
// caveats that were otherwise scattered across the app (the building-price-
// history note, the Leaderboard sample-size caveat, Profile's "About the
// deals feed" card, ProductCard's white-frame comment). None of this is new
// copy — it's the same real claims already made elsewhere, just gathered
// where a first-time visitor (or an interviewer skimming the app) can
// actually find them instead of stumbling into them one screen at a time.
import React from "react";
import { Pressable, ScrollView, Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { radius, spacing, type } from "../theme";
import { useTheme } from "../context/ThemeContext";

const ITEMS = [
  {
    icon: "flame-outline",
    title: "Deals feed",
    body: "Live from OzBargain's community. Pickly doesn't host or rewrite posts — every tap sends you to the original post or store, and the vote/comment counts are theirs, not ours.",
  },
  {
    icon: "search-outline",
    title: "Search",
    body: "Real, live prices — not a mock catalogue — pulled from a known allow-list of Australian retailers: Woolworths, Coles, ALDI, Amazon AU, Chemist Warehouse, Priceline, JB Hi-Fi, Officeworks, Bunnings and Kmart.",
  },
  {
    icon: "checkmark-circle-outline",
    title: "BUY / WAIT / SKIP",
    body: "Judged from real day-over-day price history we've been recording since Aug 13 — a genuine cheap/not-cheap call, not just whatever discount the retailer is advertising today.",
  },
  {
    icon: "barcode-outline",
    title: "Barcode scan",
    body: "Resolves real barcodes via Open Food Facts, then runs the same real search. Covers packaged groceries best — it won't recognise everything, and says so when it can't.",
  },
  {
    icon: "trophy-outline",
    title: "Leaderboard",
    body: "Today's real community vote counts on the live feed — a small, single-day sample, labelled as exactly that, not dressed up as a mature ranking.",
  },
];

export default function AboutSheet({ onClose }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>How Pickly works</Text>
            <Text style={styles.subtitle}>No mock data, no invented numbers — here's what's real.</Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={10} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {ITEMS.map((item) => (
            <View key={item.title} style={styles.row}>
              <View style={styles.rowIcon}>
                <Ionicons name={item.icon} size={17} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text style={styles.rowBody}>{item.body}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 100,
      justifyContent: "center",
      alignItems: "center",
      padding: spacing.lg,
    },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
    // Centered, not a bottom sheet — this is a static info list with no
    // swipe-to-dismiss gesture to it, and a centered card stays anchored
    // near the icon that opened it and reads better on a wide desktop
    // browser (the app's actual primary target) than a full-width strip
    // pinned to the bottom of a tall viewport.
    sheet: {
      width: "100%",
      maxWidth: 440,
      maxHeight: "82%",
      backgroundColor: colors.card,
      borderRadius: radius.xl,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.lg,
      shadowColor: "#000",
      shadowOpacity: 0.25,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 12 },
      elevation: 8,
    },
    header: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      marginBottom: spacing.md,
    },
    title: { ...type.title, color: colors.text },
    subtitle: { color: colors.textMuted, ...type.caption, marginTop: 4, maxWidth: 280 },
    closeBtn: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: colors.cardHi,
      alignItems: "center",
      justifyContent: "center",
    },
    list: { marginTop: 2 },
    row: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.sm + 2,
      paddingVertical: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    rowIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: `${colors.primary}1A`,
      alignItems: "center",
      justifyContent: "center",
    },
    rowTitle: { color: colors.text, ...type.body },
    rowBody: { color: colors.textMuted, ...type.caption, lineHeight: 18, marginTop: 3 },
  });
}
