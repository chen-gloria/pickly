// The call, stated plainly.
//
// TRACKING is deliberately styled as the quietest of the four. It's an
// admission that we don't know yet, and it should never be mistaken at a
// glance for a recommendation.
import React from "react";
import { Text, View, StyleSheet } from "react-native";
import { radius, type } from "../theme";
import { useTheme } from "../context/ThemeContext";
import { VERDICT } from "../utils/priceHistory";

export default function VerdictBadge({ verdict, small = false }) {
  const { colors } = useTheme();
  const STYLES = {
    [VERDICT.BUY]: { bg: "rgba(74,222,128,0.15)", fg: colors.saving, label: "BUY" },
    [VERDICT.WAIT]: { bg: "rgba(242,193,78,0.15)", fg: colors.accent, label: "WAIT" },
    [VERDICT.SKIP]: { bg: "rgba(255,107,74,0.14)", fg: colors.ember, label: "SKIP" },
    [VERDICT.TRACKING]: { bg: "rgba(139,151,143,0.12)", fg: colors.textMuted, label: "TRACKING" },
  };
  const s = STYLES[verdict] || STYLES[VERDICT.TRACKING];
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }, small && styles.small]}>
      <Text style={[styles.text, { color: s.fg }, small && styles.textSmall]}>{s.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  small: { paddingHorizontal: 7, paddingVertical: 2 },
  text: { ...type.micro },
  textSmall: { fontSize: 9.5, fontWeight: "800", letterSpacing: 0.6 },
});
