import React, { memo, useEffect, useRef, useState } from "react";
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

export const FoodProductCard = memo(function FoodProductCard({
  offering,
  onAddToCart,
  quantity = 0,
  width = 158,
  reducedMotion,
  disabled,
}: FoodProductCardProps) {
  const [failedImage, setFailedImage] = useState<string | undefined>();
  const showImage = Boolean(offering.imageUrl && offering.imageUrl !== failedImage);
  const priceLabel = offering.priceKnown === false ? 'Narx hali berilmagan' : formatMoney(offering.price, offering.currency);
  const imageRef = useRef<View>(null);
  const originRef = useRef<CartFlightOrigin | undefined>(undefined);
  const scale = useRef(new Animated.Value(1)).current;
  const unavailable = disabled || offering.isAvailable === false || offering.priceKnown === false || quantity >= MAX_CART_QUANTITY;
  useEffect(() => () => scale.stopAnimation(), [scale]);
  const settle = () => {
    if (reducedMotion) return;
    Animated.spring(scale, {
      toValue: 1,
      speed: 24,
      bounciness: 8,
      useNativeDriver: Platform.OS !== "web",
      isInteraction: false,
    }).start();
  };
  const add = () => {
    if (unavailable) return;
    onAddToCart(offering, originRef.current);
  };
  return (
    <Animated.View style={{ width, transform: [{ scale }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${offering.title}, ${priceLabel}${quantity ? `, savatda ${quantity} ta` : ""}`}
        accessibilityHint="Savatga bitta qo‘shish uchun bosing"
        accessibilityState={{ disabled: unavailable, selected: quantity > 0 }}
        disabled={unavailable}
        onPressIn={() => {
          // Measure while the finger is down, not after the cart update.
          originRef.current = undefined;
          if (!reducedMotion)
            imageRef.current?.measureInWindow((x, y, w, h) => {
              if (w > 0 && h > 0)
                originRef.current = { x, y, width: w, height: h };
            });
          if (!reducedMotion)
            Animated.timing(scale, {
              toValue: 0.965,
              duration: 90,
              useNativeDriver: Platform.OS !== "web",
              isInteraction: false,
            }).start();
        }}
        onPressOut={settle}
        onPress={add}
        style={({ pressed }) => [
          styles.card,
          quantity > 0 && styles.selected,
          pressed && styles.pressed,
          unavailable && styles.disabled,
        ]}
      >
        {showImage ? <View
          ref={imageRef}
          collapsable={false}
          style={[styles.image, { height: Math.round(width * 0.62) }]}
        >
          <ProductImage uri={offering.imageUrl} onUnavailable={() => setFailedImage(offering.imageUrl)} />
        </View> : <View style={styles.textHeader}><Ionicons name="bag-handle-outline" size={19} color="#AE9EFF" /><Text style={styles.textBadge}>Menyu</Text></View>}
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
          {!showImage && offering.description ? <Text numberOfLines={2} style={styles.description}>{offering.description}</Text> : null}
          <Text style={styles.price}>
            {offering.isAvailable === false ? "Hozir mavjud emas" : priceLabel}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  textHeader: { padding: 12, flexDirection: "row", alignItems: "center", gap: 7 },
  textBadge: { color: "#8C93AF", fontSize: 11 },
  description: { color: "#9BA3B9", fontSize: 12, lineHeight: 17 },
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
