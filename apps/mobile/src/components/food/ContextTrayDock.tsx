import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../primitives/Text";
import { TrayItem, formatMoney } from "../../lib/interaction";
import { MAX_CART_QUANTITY, offeringKey, summarizeTray } from "../../lib/cart";
import { ProductImage } from "./ProductImage";
import { useReducedMotion } from "./useReducedMotion";
import type { CartFlightOrigin } from "./FoodProductCard";

export type ContextTrayHandle = {
  measureTarget: (
    key: string,
    callback: (rect: CartFlightOrigin) => void,
  ) => void;
  land: () => void;
};
type Props = {
  items: TrayItem[];
  onRemoveItem: (id: string) => void;
  onQuantityChange: (id: string, quantity: number) => void;
  onClear: () => void;
};

export const ContextTrayDock = forwardRef<ContextTrayHandle, Props>(
  function ContextTrayDock(
    { items, onRemoveItem, onQuantityChange, onClear },
    ref,
  ) {
    const [expanded, setExpanded] = useState(false);
    const summaryRef = useRef<View>(null);
    const thumbRefs = useRef(new Map<string, View>());
    const scrollRef = useRef<ScrollView>(null);
    const pulse = useRef(new Animated.Value(1)).current;
    const reducedMotion = useReducedMotion();
    const insets = useSafeAreaInsets();
    const { height, width, fontScale } = useWindowDimensions();
    const { quantity, totalLabel } = summarizeTray(items);
    const compactSummary = width < 360 || fontScale > 1.2;
    const itemCount = items.length;
    const previousCount = useRef(itemCount);

    useEffect(() => {
      if (itemCount === 0) setExpanded(false);
      if (itemCount > previousCount.current)
        scrollRef.current?.scrollToEnd({ animated: !reducedMotion });
      previousCount.current = itemCount;
    }, [itemCount, reducedMotion]);
    useEffect(() => () => pulse.stopAnimation(), [pulse]);

    useImperativeHandle(
      ref,
      () => ({
        measureTarget(key, callback) {
          // Keep the target inside the visible strip even if that item is offscreen.
          const thumb = thumbRefs.current.get(key);
          summaryRef.current?.measureInWindow((x, y, w, h) => {
            const fallback = { x, y, width: 44, height: h };
            if (!thumb) {
              callback(fallback);
              return;
            }
            thumb.measureInWindow((tx, ty, tw, th) => {
              callback(
                tw > 0 && tx >= 12 && tx + tw <= x
                  ? { x: tx, y: ty, width: tw, height: th }
                  : fallback,
              );
            });
          });
        },
        land() {
          if (reducedMotion) return;
          pulse.stopAnimation();
          pulse.setValue(0.95);
          Animated.spring(pulse, {
            toValue: 1,
            speed: 22,
            bounciness: 14,
            useNativeDriver: Platform.OS !== "web",
          }).start();
        },
      }),
      [pulse, reducedMotion],
    );

    if (!items.length) return null;
    const countLabel = quantity
      ? `${quantity} ta mahsulot`
      : `${items.length} ta tanlov`;

    return (
      <>
        <Animated.View style={[styles.root, { transform: [{ scale: pulse }] }]}>
          <ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            style={styles.strip}
            contentContainerStyle={styles.thumbnails}
            onContentSizeChange={() => {
              if (itemCount > 1)
                scrollRef.current?.scrollToEnd({ animated: !reducedMotion });
            }}
          >
            {items.map((item) => {
              const label =
                item.type === "offering"
                  ? item.title
                  : item.type === "note"
                    ? item.text
                    : item.title || "Rasm";
              return (
                <Pressable
                  key={item.id}
                  onPress={() => setExpanded(true)}
                  accessibilityRole="button"
                  accessibilityLabel={`${label}${item.type === "offering" ? `, ${item.quantity} ta` : ""}. Savatni tahrirlash`}
                  style={({ pressed }) => [
                    styles.thumbButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <View
                    ref={(node) => {
                      if (item.type !== "offering") return;
                      if (node) thumbRefs.current.set(offeringKey(item), node);
                      else thumbRefs.current.delete(offeringKey(item));
                    }}
                    collapsable={false}
                    style={styles.thumb}
                  >
                    {item.type === "note" ? (
                      <Ionicons
                        name="document-text-outline"
                        size={22}
                        color="#B2A3FF"
                      />
                    ) : (
                      <ProductImage
                        uri={
                          item.type === "offering" ? item.imageUrl : item.uri
                        }
                      />
                    )}
                  </View>
                  {item.type === "offering" ? (
                    <View pointerEvents="none" style={styles.badge}>
                      <Text style={styles.badgeText}>{item.quantity}</Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
          <View
            ref={summaryRef}
            collapsable={false}
            style={[styles.summaryWrap, compactSummary && styles.summaryNarrow]}
          >
            <Pressable
              onPress={() => setExpanded(true)}
              accessibilityRole="button"
              accessibilityLabel={`Savatni ko‘rish: ${countLabel}, ${totalLabel}`}
              style={({ pressed }) => [
                styles.summary,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.total} numberOfLines={compactSummary ? 2 : 1}>
                {totalLabel || "Tanlovlar"}
              </Text>
              <View style={styles.summaryLine}>
                <Text style={styles.count}>
                  {quantity ? `${quantity} ta · Savat` : countLabel}
                </Text>
                <Ionicons name="chevron-up" size={13} color="#A79BCF" />
              </View>
            </Pressable>
          </View>
        </Animated.View>

        <Modal
          visible={expanded}
          transparent
          animationType={reducedMotion ? "none" : "slide"}
          onRequestClose={() => setExpanded(false)}
        >
          <View style={styles.modalRoot}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setExpanded(false)}
              accessibilityRole="button"
              accessibilityLabel="Savatni yopish"
            />
            <View
              style={[
                styles.sheet,
                {
                  maxHeight: height * 0.75,
                  paddingBottom: Math.max(insets.bottom, 16),
                },
              ]}
            >
              <View style={styles.handle} />
              <View style={styles.sheetHeading}>
                <View style={styles.headingCopy}>
                  <Text style={styles.sheetTitle}>Sizning tanlovingiz</Text>
                  <Text style={styles.sheetSubtitle}>
                    Miqdorlarni shu yerda o‘zgartiring
                  </Text>
                </View>
                <Pressable
                  style={styles.iconButton}
                  onPress={() => setExpanded(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Savatni yopish"
                >
                  <Ionicons name="close" size={23} color="#CED1E2" />
                </Pressable>
              </View>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.detailList}
              >
                {items.map((item) => (
                  <View key={item.id} style={styles.detailRow}>
                    <View style={styles.detailImage}>
                      {item.type === "note" ? (
                        <Ionicons
                          name="document-text-outline"
                          size={24}
                          color="#B2A3FF"
                        />
                      ) : (
                        <ProductImage
                          uri={
                            item.type === "offering" ? item.imageUrl : item.uri
                          }
                        />
                      )}
                    </View>
                    <View style={styles.detailBody}>
                      <Text style={styles.detailTitle}>
                        {item.type === "offering"
                          ? item.title
                          : item.type === "note"
                            ? item.text
                            : item.title || "Rasm"}
                      </Text>
                      {item.type === "offering" ? (
                        <>
                          <Text style={styles.detailPrice}>
                            {formatMoney(
                              item.price * item.quantity,
                              item.currency,
                            )}
                          </Text>
                          <View style={styles.quantityRow}>
                            <Pressable
                              style={styles.stepper}
                              onPress={() =>
                                onQuantityChange(item.id, item.quantity - 1)
                              }
                              accessibilityRole="button"
                              accessibilityLabel={`${item.title}: bittaga kamaytirish`}
                            >
                              <Ionicons
                                name={
                                  item.quantity === 1
                                    ? "trash-outline"
                                    : "remove"
                                }
                                size={18}
                                color="#C5B9FF"
                              />
                            </Pressable>
                            <Text
                              accessibilityLiveRegion="polite"
                              style={styles.quantityText}
                            >
                              {item.quantity}
                            </Text>
                            <Pressable
                              style={[
                                styles.stepper,
                                item.quantity >= MAX_CART_QUANTITY &&
                                  styles.disabled,
                              ]}
                              disabled={item.quantity >= MAX_CART_QUANTITY}
                              onPress={() =>
                                onQuantityChange(item.id, item.quantity + 1)
                              }
                              accessibilityRole="button"
                              accessibilityLabel={`${item.title}: bittaga oshirish`}
                            >
                              <Ionicons name="add" size={19} color="#C5B9FF" />
                            </Pressable>
                          </View>
                        </>
                      ) : (
                        <Pressable
                          style={styles.removeNote}
                          onPress={() => onRemoveItem(item.id)}
                          accessibilityRole="button"
                        >
                          <Text style={styles.secondaryAction}>
                            Olib tashlash
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                ))}
              </ScrollView>
              <View style={styles.sheetTotal}>
                <Text style={styles.sheetSubtitle}>{countLabel}</Text>
                <Text style={styles.sheetTotalText}>{totalLabel}</Text>
              </View>
              <Text style={styles.estimate}>
                Yetkazib berish va yakuniy narx keyingi qadamda hisoblanadi.
              </Text>
              <View style={styles.sheetActions}>
                <Pressable
                  onPress={() => {
                    onClear();
                    setExpanded(false);
                  }}
                  style={styles.clearButton}
                  accessibilityRole="button"
                >
                  <Text style={styles.secondaryAction}>Tozalash</Text>
                </Pressable>
                <Pressable
                  onPress={() => setExpanded(false)}
                  style={styles.doneButton}
                  accessibilityRole="button"
                >
                  <Text style={styles.doneText}>Tayyor</Text>
                  <Ionicons name="checkmark" size={19} color="#FFF" />
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </>
    );
  },
);

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingTop: 9,
    paddingBottom: 8,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(158,148,212,0.18)",
  },
  strip: { flex: 1, minWidth: 58 },
  thumbnails: { gap: 7, paddingTop: 5, paddingRight: 6, paddingBottom: 3 },
  thumbButton: { width: 49, height: 49 },
  thumb: {
    width: 46,
    height: 46,
    borderWidth: 1,
    borderColor: "#3C3B57",
    borderRadius: 13,
    backgroundColor: "#0E1323",
    padding: 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  badge: {
    position: "absolute",
    right: -1,
    top: -5,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 4,
    borderRadius: 10,
    backgroundColor: "#7E6AED",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#15192C",
  },
  badgeText: { color: "#FFF", fontSize: 11, fontWeight: "700" },
  summaryWrap: {
    borderLeftWidth: 1,
    borderLeftColor: "#35354E",
    paddingLeft: 11,
    maxWidth: "52%",
  },
  summaryNarrow: { maxWidth: "57%" },
  summary: { minHeight: 48, justifyContent: "center", gap: 4, paddingRight: 2 },
  total: {
    color: "#F6F4FF",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  summaryLine: { flexDirection: "row", alignItems: "center", gap: 5 },
  count: { color: "#A0A4BD", fontSize: 11, lineHeight: 16 },
  pressed: { opacity: 0.72 },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(2,4,12,0.72)",
  },
  sheet: {
    width: "100%",
    maxWidth: 600,
    alignSelf: "center",
    backgroundColor: "#101425",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: "#323348",
    paddingHorizontal: 20,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#4C4D65",
    alignSelf: "center",
    marginTop: 9,
    marginBottom: 13,
  },
  sheetHeading: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  headingCopy: { flex: 1, gap: 4 },
  sheetTitle: { fontSize: 19, fontWeight: "700", color: "#F5F3FC" },
  sheetSubtitle: { fontSize: 12, color: "#9BA2BA", lineHeight: 17 },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  detailList: { paddingBottom: 8 },
  detailRow: {
    flexDirection: "row",
    gap: 13,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#303248",
  },
  detailImage: {
    width: 65,
    height: 65,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#191F34",
    alignItems: "center",
    justifyContent: "center",
  },
  detailBody: { flex: 1, gap: 5 },
  detailTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    color: "#F0F0FA",
  },
  detailPrice: { fontSize: 14, fontWeight: "700", color: "#B9ABFF" },
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 3,
  },
  stepper: {
    width: 44,
    height: 40,
    backgroundColor: "#24223F",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  quantityText: {
    minWidth: 34,
    textAlign: "center",
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
  },
  disabled: { opacity: 0.35 },
  removeNote: { minHeight: 44, justifyContent: "center" },
  secondaryAction: { color: "#A7A9C0", fontSize: 13 },
  sheetTotal: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 16,
  },
  sheetTotalText: {
    flex: 1,
    textAlign: "right",
    color: "#FFF",
    fontSize: 19,
    fontWeight: "700",
  },
  estimate: {
    color: "#858DA7",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 7,
    marginBottom: 16,
  },
  sheetActions: { flexDirection: "row", gap: 15 },
  clearButton: {
    minWidth: 85,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  doneButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: "#7561E8",
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  doneText: { color: "#FFF", fontSize: 14, fontWeight: "700" },
});
