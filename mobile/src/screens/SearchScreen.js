import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
} from "react-native";
import { api } from "../api/client";
import ProductCard from "../components/ProductCard";
import { colors, radius, spacing } from "../theme";

export default function SearchScreen({ navigation }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.categories().then(setCategories).catch(() => {});
  }, []);

  const load = useCallback(async (q, cat) => {
    setLoading(true);
    try {
      const data = await api.searchProducts(q, cat);
      // Fetch cheapest price for each product for the list display.
      setProducts(data);
    } catch (_) {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search as you type.
  useEffect(() => {
    const t = setTimeout(() => load(query, category), 250);
    return () => clearTimeout(t);
  }, [query, category, load]);

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Text style={{ fontSize: 16 }}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search products, e.g. milk"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
        />
      </View>

      <View style={{ height: 44 }}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={["", ...categories]}
          keyExtractor={(item) => item || "all"}
          contentContainerStyle={{ paddingHorizontal: spacing.md }}
          renderItem={({ item }) => {
            const selected = item === category;
            return (
              <TouchableOpacity
                style={[styles.chip, selected && styles.chipActive]}
                onPress={() => setCategory(item)}
              >
                <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                  {item || "All"}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingVertical: spacing.sm }}
          ListEmptyComponent={
            <Text style={styles.empty}>No products found. Try another search.</Text>
          }
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              cheapest={null}
              onPress={() =>
                navigation.navigate("ProductDetail", { id: item.id, name: item.name })
              }
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    margin: spacing.md,
    paddingHorizontal: spacing.md,
  },
  searchInput: { flex: 1, padding: spacing.md, fontSize: 16 },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
    height: 34,
    justifyContent: "center",
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: 13 },
  chipTextActive: { color: "#fff", fontWeight: "700" },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: spacing.xl },
});
