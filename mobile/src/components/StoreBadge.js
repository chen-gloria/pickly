// Small colored monogram next to a store's name — the "<LOGO><name>" look,
// without reproducing anyone's actual trademarked logo artwork (see the
// STORE_COLORS comment in utils/storeFilter.js for why). One letter in the
// store's own real brand color reads instantly at the ~14-16px this renders
// at on a card, which a shrunk real logo mostly doesn't.
//
// Renders nothing if `color` is missing — callers pass color only when the
// store is a known, filterable one (utils/storeFilter.js's STORES); an
// unrecognized store (Amazon, Bunnings, a gift-card reseller...) just shows
// its plain name text next to this, same as before this component existed.
import React from "react";
import { Text, View, StyleSheet } from "react-native";

export default function StoreBadge({ name, color, size = 14 }) {
  if (!color || !name) return null;
  return (
    <View
      style={[
        styles.badge,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
      ]}
    >
      <Text style={[styles.letter, { fontSize: size * 0.58 }]}>{name.trim()[0].toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: "center", justifyContent: "center" },
  letter: { color: "#FFFFFF", fontWeight: "800" },
});
