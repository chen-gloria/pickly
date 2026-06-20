import React, { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
} from "react-native";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { colors, radius, spacing } from "../theme";

export default function ListScreen() {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await api.getList(token));
    } catch (_) {
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Reload whenever the tab gains focus.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function toggle(id) {
    await api.toggleItem(token, id);
    load();
  }
  async function remove(id) {
    await api.deleteItem(token, id);
    load();
  }

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />;

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: spacing.md }}
        ListEmptyComponent={
          <Text style={styles.empty}>
            Your shopping list is empty.{"\n"}Add items from the Compare tab.
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <TouchableOpacity onPress={() => toggle(item.id)} style={styles.check}>
              <Text style={{ fontSize: 18 }}>{item.checked ? "✅" : "⬜"}</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text
                style={[styles.name, item.checked && styles.nameChecked]}
                numberOfLines={1}
              >
                {item.product.name}
              </Text>
              <Text style={styles.sub}>
                {item.product.size} · qty {item.quantity}
              </Text>
            </View>
            <TouchableOpacity onPress={() => remove(item.id)}>
              <Text style={styles.remove}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  check: { marginRight: spacing.md },
  name: { fontSize: 16, fontWeight: "600", color: colors.text },
  nameChecked: { textDecorationLine: "line-through", color: colors.textMuted },
  sub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  remove: { fontSize: 18, color: colors.danger, paddingHorizontal: spacing.sm },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: spacing.xl, lineHeight: 22 },
});
