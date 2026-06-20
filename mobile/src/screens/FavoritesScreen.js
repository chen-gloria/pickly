import React, { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { ActivityIndicator, FlatList, Text, View, StyleSheet } from "react-native";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import ProductCard from "../components/ProductCard";
import { colors, spacing } from "../theme";

export default function FavoritesScreen({ navigation }) {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await api.getFavorites(token));
    } catch (_) {
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />;

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingVertical: spacing.sm }}
        ListEmptyComponent={
          <Text style={styles.empty}>
            No saved products yet.{"\n"}Tap ⭐ Save on any product.
          </Text>
        }
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            cheapest={null}
            onPress={() => navigation.navigate("ProductDetail", { id: item.id, name: item.name })}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: spacing.xl, lineHeight: 22 },
});
