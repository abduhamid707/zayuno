import React from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../primitives/Text";
import { CatalogOfferingItem, formatMoney } from "../../lib/interaction";

type FoodProductCardProps = {
  offering: CatalogOfferingItem;
  onAddToCart: (offering: CatalogOfferingItem) => void;
  onOpenDetails?: (offering: CatalogOfferingItem) => void;
  disabled?: boolean;
};

export function FoodProductCard({
  offering,
  onAddToCart,
  onOpenDetails,
  disabled,
}: FoodProductCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${offering.title} taomini ko‘rish`}
      disabled={disabled}
      onPress={() => onOpenDetails?.(offering)}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
        disabled && styles.cardDisabled,
      ]}
    >
      <View style={styles.imageContainer}>
        {offering.imageUrl ? (
          <Image
            source={{ uri: offering.imageUrl }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.imageFallback}>
            <Ionicons name="fast-food-outline" size={32} color="#7E87A5" />
          </View>
        )}

        {/* Floating Quick Add Button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${offering.title}ni savatga qo‘shish`}
          hitSlop={8}
          disabled={disabled}
          onPress={(e) => {
            e.stopPropagation?.();
            onAddToCart(offering);
          }}
          style={({ pressed }) => [
            styles.addButton,
            pressed && styles.addButtonPressed,
          ]}
        >
          <Ionicons name="add" size={19} color="#FFFFFF" />
        </Pressable>
      </View>

      <View style={styles.content}>
        <Text numberOfLines={2} style={styles.title}>
          {offering.title}
        </Text>
        <Text numberOfLines={1} style={styles.price}>
          {formatMoney(offering.price, offering.currency)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 142,
    minHeight: 182,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(126,134,165,0.22)",
    backgroundColor: "rgba(16,21,38,0.92)",
    overflow: "hidden",
  },
  cardPressed: {
    borderColor: "rgba(120,104,246,0.6)",
    backgroundColor: "rgba(25,28,54,0.96)",
    transform: [{ scale: 0.98 }],
  },
  cardDisabled: {
    opacity: 0.6,
  },
  imageContainer: {
    width: "100%",
    height: 104,
    backgroundColor: "#0B0E1B",
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(120,104,246,0.08)",
  },
  addButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#6355F4",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 4,
  },
  addButtonPressed: {
    backgroundColor: "#4B3EE0",
    transform: [{ scale: 0.92 }],
  },
  content: {
    padding: 9,
    flex: 1,
    justifyContent: "space-between",
    gap: 4,
  },
  title: {
    color: "#F1F3F9",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
  },
  price: {
    color: "#8375FF",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },
});
