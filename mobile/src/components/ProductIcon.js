// Renders a product as a flat vector glyph instead of a photo. This keeps
// the "image" area genuinely transparent (no background color, no stock-photo
// backdrop) and works offline — no image hosting/network dependency for 100+
// mock products.
import React from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function ProductIcon({ product, size = 40 }) {
  const icon = product.icon || "food-variant";
  const color = product.iconColor || "#7A857F";
  return <MaterialCommunityIcons name={icon} size={size} color={color} />;
}
