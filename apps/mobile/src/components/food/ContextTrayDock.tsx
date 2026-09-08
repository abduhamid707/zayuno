import React from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../primitives/Text";
import { TrayItem, formatMoney } from "../../lib/interaction";

type ContextTrayDockProps = {
  items: TrayItem[];
  onRemoveItem: (id: string) => void;
};

export function ContextTrayDock({ items, onRemoveItem }: ContextTrayDockProps) {
  if (!items || items.length === 0) return null;

  return (
    <View style={styles.root}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroller}
      >
        {items.map((item) => {
          if (item.type === "offering") {
            return (
              <View key={item.id} style={styles.offeringCard}>
                {item.imageUrl ? (
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={styles.offeringImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.offeringImagePlaceholder}>
                    <Ionicons name="fast-food" size={20} color="#8375FF" />
                  </View>
                )}

                <View style={styles.offeringInfo}>
                  <Text numberOfLines={1} style={styles.offeringTitle}>
                    {item.title}
                  </Text>
                  <Text numberOfLines={1} style={styles.offeringPrice}>
                    {formatMoney(item.price * (item.quantity || 1))}
                  </Text>
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Olib tashlash"
                  hitSlop={8}
                  onPress={() => onRemoveItem(item.id)}
                  style={styles.removeCircle}
                >
                  <Ionicons name="close" size={12} color="#FFFFFF" />
                </Pressable>
              </View>
            );
          }

          if (item.type === "note") {
            return (
              <View key={item.id} style={styles.noteCard}>
                <View style={styles.noteInfo}>
                  <Text numberOfLines={3} style={styles.noteText}>
                    {item.text}
                  </Text>
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Izohni olib tashlash"
                  hitSlop={8}
                  onPress={() => onRemoveItem(item.id)}
                  style={styles.removeCircle}
                >
                  <Ionicons name="close" size={12} color="#FFFFFF" />
                </Pressable>
              </View>
            );
          }

          if (item.type === "attachment") {
            return (
              <View key={item.id} style={styles.attachmentCard}>
                <Image
                  source={{ uri: item.uri }}
                  style={styles.attachmentImage}
                  resizeMode="cover"
                />

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Rasmni olib tashlash"
                  hitSlop={8}
                  onPress={() => onRemoveItem(item.id)}
                  style={styles.removeCircle}
                >
                  <Ionicons name="close" size={12} color="#FFFFFF" />
                </Pressable>
              </View>
            );
          }

          return null;
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingBottom: 8,
  },
  scroller: {
    gap: 8,
    paddingHorizontal: 2,
  },
  offeringCard: {
    width: 148,
    height: 68,
    borderRadius: 15,
    backgroundColor: "rgba(16,21,38,0.95)",
    borderWidth: 1,
    borderColor: "rgba(126,134,165,0.28)",
    flexDirection: "row",
    alignItems: "center",
    padding: 6,
    gap: 8,
    position: "relative",
  },
  offeringImage: {
    width: 52,
    height: 52,
    borderRadius: 11,
  },
  offeringImagePlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 11,
    backgroundColor: "rgba(120,104,246,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  offeringInfo: {
    flex: 1,
    justifyContent: "center",
    gap: 2,
    paddingRight: 14,
  },
  offeringTitle: {
    color: "#F3F5FA",
    fontSize: 11,
    fontWeight: "700",
  },
  offeringPrice: {
    color: "#8375FF",
    fontSize: 10,
    fontWeight: "700",
  },
  noteCard: {
    width: 160,
    height: 68,
    borderRadius: 15,
    backgroundColor: "rgba(22,27,48,0.95)",
    borderWidth: 1,
    borderColor: "rgba(126,134,165,0.28)",
    padding: 9,
    position: "relative",
  },
  noteInfo: {
    flex: 1,
    paddingRight: 16,
    justifyContent: "center",
  },
  noteText: {
    color: "#D2D6E7",
    fontSize: 10,
    lineHeight: 14,
  },
  attachmentCard: {
    width: 68,
    height: 68,
    borderRadius: 15,
    backgroundColor: "#161B30",
    borderWidth: 1,
    borderColor: "rgba(126,134,165,0.28)",
    overflow: "hidden",
    position: "relative",
  },
  attachmentImage: {
    width: "100%",
    height: "100%",
  },
  removeCircle: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(0,0,0,0.72)",
    alignItems: "center",
    justifyContent: "center",
  },
});
