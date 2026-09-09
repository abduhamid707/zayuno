import React, { useEffect, useRef } from "react";
import { Animated, Platform, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../primitives/Text";
import { CatalogOfferingItem, formatMoney } from "../../lib/interaction";
import { MAX_CART_QUANTITY } from "../../lib/cart";
import { ProductImage } from "./ProductImage";

export type CartFlightOrigin = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type FoodProductCardProps = {
  offering: CatalogOfferingItem;
  onAddToCart: (
    offering: CatalogOfferingItem,
    origin?: CartFlightOrigin,
  ) => void;
  quantity?: number;
  width?: number;
  reducedMotion?: boolean;
  disabled?: boolean;
};

export function FoodProductCard({
  offering,
  onAddToCart,
  quantity = 0,
  width = 158,
  reducedMotion,
  disabled,
}: FoodProductCardProps) {
  const imageRef = useRef<View>(null);
  const scale = useRef(new Animated.Value(1)).current;
  const unavailable = disabled || quantity >= MAX_CART_QUANTITY;
  useEffect(() => () => scale.stopAnimation(), [scale]);
  const settle = () => {
    if (reducedMotion) return;
    Animated.spring(scale, {
      toValue: 1,
      speed: 24,
      bounciness: 8,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  };
  const add = () => {
    if (unavailable) return;
    let committed = false;
    const commit = (origin?: CartFlightOrigin) => {
      if (committed) return;
      committed = true;
      onAddToCart(offering, origin);
    };
    imageRef.current?.measureInWindow((x, y, imageWidth, height) => {
      commit(
        imageWidth > 0 && height > 0
          ? { x, y, width: imageWidth, height }
          : undefined,
      );
    });
    // Measurement is cosmetic: an unmounted native view must never lose a tap.
    setTimeout(() => commit(), 80);
  };
  return (
    <Animated.View style={{ width, transform: [{ scale }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${offering.title}, ${formatMoney(offering.price, offering.currency)}${quantity ? `, savatda ${quantity} ta` : ""}`}
        accessibilityHint="Savatga bitta qo‘shish uchun bosing"
        accessibilityState={{ disabled: unavailable, selected: quantity > 0 }}
        disabled={unavailable}
        onPressIn={() => {
          if (!reducedMotion)
            Animated.timing(scale, {
              toValue: 0.965,
              duration: 90,
              useNativeDriver: Platform.OS !== "web",
            }).start();
        }}
        onPressOut={settle}
        onPress={add}
        style={({ pressed }) => [
          styles.card,
          quantity > 0 && styles.selected,
          pressed && styles.pressed,
          disabled && styles.disabled,
        ]}
      >
        <View
          ref={imageRef}
          collapsable={false}
          style={[styles.image, { height: Math.round(width * 0.62) }]}
        >
          <ProductImage uri={offering.imageUrl} />
        </View>
        {quantity > 0 ? (
          <View pointerEvents="none" style={styles.quantity}>
            <Ionicons name="checkmark" size={12} color="#FFFFFF" />
            <Text style={styles.quantityText}>{quantity}</Text>
          </View>
        ) : null}
        <View style={styles.content}>
          <Text numberOfLines={2} style={styles.title}>
            {offering.title}
          </Text>
          <Text style={styles.price}>
            {formatMoney(offering.price, offering.currency)}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#252A3E",
    backgroundColor: "#0E1323",
    overflow: "hidden",
  },
  selected: { borderColor: "#8877F9", backgroundColor: "#15182C" },
  pressed: { backgroundColor: "#1B1C36", borderColor: "#AE9EFF" },
  disabled: { opacity: 0.55 },
  image: { width: "100%", backgroundColor: "#101524", padding: 3 },
  quantity: {
    position: "absolute",
    top: 7,
    right: 7,
    minWidth: 34,
    height: 25,
    paddingHorizontal: 7,
    borderRadius: 13,
    backgroundColor: "#7060EC",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  quantityText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  content: {
    paddingHorizontal: 11,
    paddingTop: 9,
    paddingBottom: 11,
    gap: 7,
    flex: 1,
    justifyContent: "space-between",
  },
  title: {
    color: "#F2F3FA",
    fontSize: 13,
    lineHeight: 18,
    minHeight: 36,
    fontWeight: "500",
  },
  price: {
    color: "#B2A3FF",
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
});
