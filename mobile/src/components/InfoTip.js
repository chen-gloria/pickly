// A small (i) icon next to a section header that explains, in plain
// language, what real signal that section is actually grouping by.
//
// Added because the vague jargon ("Community favourite", "Solid find"...)
// used to sit directly on individual deal cards with zero explanation
// anywhere. The label is now the section itself (see BrowseScreen.js's
// signal sections), and this is where the explanation lives instead of
// being left for the user to guess at.
import React, { useState } from "react";
import { Modal, Pressable, Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { radius, spacing, type } from "../theme";
import { useTheme } from "../context/ThemeContext";

export default function InfoTip({ title, body }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [open, setOpen] = useState(false);

  return (
    <>
      <TouchableOpacity
        onPress={(e) => {
          e?.stopPropagation?.();
          setOpen(true);
        }}
        hitSlop={10}
        style={styles.icon}
      >
        <Ionicons name="information-circle-outline" size={15} color={colors.textFaint} />
      </TouchableOpacity>
      {/* Modal, not an inline absolutely-positioned View: this renders
          nested many levels deep inside a FlatList row (BrowseScreen.js's
          carousel headers), and `position: absolute` there resolves against
          the nearest positioned ancestor row rather than the screen —
          Modal portals above the whole tree instead, so it centers
          correctly regardless of how deep the icon that opened it is. */}
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
          <View style={styles.sheet}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.body}>{body}</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setOpen(false)}>
              <Text style={styles.closeText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    icon: { marginLeft: 2 },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 100,
      justifyContent: "center",
      alignItems: "center",
      padding: spacing.lg,
    },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
    sheet: {
      width: "100%",
      maxWidth: 360,
      backgroundColor: colors.card,
      borderRadius: radius.xl,
      padding: spacing.lg,
      shadowColor: "#000",
      shadowOpacity: 0.25,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 12 },
      elevation: 8,
    },
    title: { ...type.body, fontWeight: "800", color: colors.text, marginBottom: 6 },
    body: { color: colors.textMuted, ...type.caption, lineHeight: 19 },
    closeBtn: {
      alignSelf: "flex-end",
      marginTop: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm - 2,
    },
    closeText: { color: colors.primary, fontWeight: "700", fontSize: 13 },
  });
}
