// A small "Saved to Watching" / "Removed from Watching" confirmation —
// added because toggling a bookmark previously gave zero feedback beyond
// the icon itself changing, which is easy to miss on a fast tap and
// doesn't read as "this worked" the way an explicit, friendly message
// does. Global (mounted once in App.js) so any screen can call
// useToast().show(...) without each one owning its own toast UI.
import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { Animated, Text, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { radius, spacing, type } from "../theme";
import { useTheme } from "./ThemeContext";

const ToastContext = createContext(null);
const DURATION_MS = 1800;

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef(null);

  const show = useCallback(
    (message, { icon = "checkmark-circle" } = {}) => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setToast({ message, icon });
      opacity.setValue(0);
      Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();
      hideTimer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() =>
          setToast(null)
        );
      }, DURATION_MS);
    },
    [opacity]
  );

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast && <ToastView toast={toast} opacity={opacity} />}
    </ToastContext.Provider>
  );
}

function ToastView({ toast, opacity }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <Animated.View style={[styles.wrap, { opacity }]} pointerEvents="none">
      <View style={styles.pill}>
        <Ionicons name={toast.icon} size={16} color={colors.saving} />
        <Text style={styles.text}>{toast.message}</Text>
      </View>
    </Animated.View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    wrap: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 96, // clears the bottom tab bar regardless of screen
      alignItems: "center",
      zIndex: 200,
    },
    pill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
      shadowColor: "#000",
      shadowOpacity: 0.2,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    text: { color: colors.text, ...type.caption, fontWeight: "700" },
  });
}

export function useToast() {
  const ctx = useContext(ToastContext);
  // A screen rendered outside the provider (shouldn't happen, App.js
  // mounts it at the root) gets a harmless no-op instead of a crash.
  return ctx || { show: () => {} };
}
