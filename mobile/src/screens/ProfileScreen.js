import React from "react";
import { Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { useAuth } from "../context/AuthContext";
import { colors, radius, spacing } from "../theme";

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {user?.name?.[0]?.toUpperCase() || "?"}
        </Text>
      </View>
      <Text style={styles.name}>{user?.name}</Text>
      <Text style={styles.email}>{user?.email}</Text>

      <TouchableOpacity style={styles.logout} onPress={logout}>
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, alignItems: "center", paddingTop: spacing.xl },
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
  logout: {
    marginTop: spacing.xl,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  logoutText: { color: colors.danger, fontWeight: "700", fontSize: 16 },
});
