import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Text } from "../primitives/Text";
import { CategoryRibbonItem } from "../../lib/interaction";

type CategoryRibbonProps = {
  categories: CategoryRibbonItem[];
  selectedSlug?: string;
  onSelectCategory: (slug: string) => void;
};

export function CategoryRibbon({
  categories,
  selectedSlug = "all",
  onSelectCategory,
}: CategoryRibbonProps) {
  if (!categories || categories.length === 0) return null;

  const isAllSelected = !selectedSlug || selectedSlug === "all";

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroller}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Barchasi"
        onPress={() => onSelectCategory("all")}
        style={[styles.pill, isAllSelected && styles.pillSelected]}
      >
        <Text style={[styles.label, isAllSelected && styles.labelSelected]}>
          Barchasi
        </Text>
      </Pressable>

      {categories.map((cat) => {
        const isSelected = selectedSlug === cat.slug;

        return (
          <Pressable
            key={cat.id || cat.slug}
            accessibilityRole="button"
            accessibilityLabel={`${cat.title} kategoriyasini tanlash`}
            onPress={() => onSelectCategory(isSelected ? "all" : cat.slug)}
            style={[styles.pill, isSelected && styles.pillSelected]}
          >
            <Text style={[styles.label, isSelected && styles.labelSelected]}>
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
    gap: 8,
    alignItems: "center",
  },
  pill: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(18,23,41,0.92)",
    borderWidth: 1,
    borderColor: "rgba(126,134,165,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  pillSelected: {
    backgroundColor: "#7868F6",
    borderColor: "#7868F6",
  },
  label: {
    color: "#9EA6BD",
    fontSize: 13,
    fontWeight: "600",
  },
  labelSelected: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});

