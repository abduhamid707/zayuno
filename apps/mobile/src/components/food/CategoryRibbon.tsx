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
import { CategoryRibbonItem } from "../../lib/interaction";

type CategoryRibbonProps = {
  categories: CategoryRibbonItem[];
  selectedSlug?: string;
  onSelectCategory: (slug: string) => void;
};

export function CategoryRibbon({
  categories,
  selectedSlug,
  onSelectCategory,
}: CategoryRibbonProps) {
  if (!categories || categories.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroller}
    >
      {categories.map((cat) => {
        const isSelected = selectedSlug === cat.slug;

        return (
          <Pressable
            key={cat.id || cat.slug}
            accessibilityRole="button"
            accessibilityLabel={`${cat.title} kategoriyasini tanlash`}
            onPress={() => onSelectCategory(cat.slug)}
            style={styles.itemWrapper}
          >
            <View
              style={[
                styles.iconBox,
                isSelected && styles.iconBoxSelected,
              ]}
            >
              {cat.imageUrl ? (
                <Image
                  source={{ uri: cat.imageUrl }}
                  style={styles.image}
                  resizeMode="cover"
                />
              ) : cat.slug.includes("combo") || cat.slug.includes("kombo") ? (
                <Ionicons name="star" size={24} color="#8375FF" />
              ) : cat.slug.includes("burger") ? (
                <Ionicons name="fast-food-outline" size={24} color="#8375FF" />
              ) : cat.slug.includes("pizza") || cat.slug.includes("pitsa") ? (
                <Ionicons name="pizza-outline" size={24} color="#8375FF" />
              ) : (
                <Ionicons name="restaurant-outline" size={22} color="#8375FF" />
              )}
            </View>

            <Text
              numberOfLines={1}
              style={[
                styles.label,
                isSelected && styles.labelSelected,
              ]}
            >
              {cat.title}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroller: {
    paddingVertical: 6,
    paddingHorizontal: 2,
    gap: 12,
  },
  itemWrapper: {
    alignItems: "center",
    width: 68,
    gap: 5,
  },
  iconBox: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: "rgba(18,23,41,0.92)",
    borderWidth: 1,
    borderColor: "rgba(126,134,165,0.22)",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBoxSelected: {
    borderColor: "#7868F6",
    backgroundColor: "rgba(43,36,92,0.72)",
    borderWidth: 2,
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 17,
  },
  label: {
    color: "#8E97B1",
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  labelSelected: {
    color: "#F4F6FD",
    fontWeight: "700",
  },
});
