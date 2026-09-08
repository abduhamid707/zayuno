import React, { useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../primitives/Text";
import {
  CatalogOfferingItem,
  CategoryRibbonItem,
  CatalogSectionItem,
} from "../../lib/interaction";
import { CategoryRibbon } from "./CategoryRibbon";
import { FoodProductCard } from "./FoodProductCard";

type InChatCatalogWidgetProps = {
  providerSlug: string;
  providerName: string;
  providerLogoUrl?: string;
  locationName?: string;
  categories: CategoryRibbonItem[];
  sections: CatalogSectionItem[];
  onAddToCart: (offering: CatalogOfferingItem) => void;
  disabled?: boolean;
};

export function InChatCatalogWidget({
  categories,
  sections,
  onAddToCart,
  disabled,
}: InChatCatalogWidgetProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>("all");

  const filteredSections = useMemo(() => {
    if (!selectedCategory || selectedCategory === "all") return sections;
    return sections.filter((s) => s.categorySlug === selectedCategory);
  }, [sections, selectedCategory]);

  return (
    <View style={styles.root}>
      {/* 1. Category Horizontal Ribbon - Sleek Text Pills */}
      <CategoryRibbon
        categories={categories}
        selectedSlug={selectedCategory}
        onSelectCategory={(slug) => {
          setSelectedCategory(slug);
        }}
      />

      {/* 2. Categorized Horizontal Carousels */}
      <View style={styles.sections}>
        {filteredSections.map((section) => (
          <View key={section.categorySlug} style={styles.sectionBlock}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.categoryTitle}</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>
                  {section.offerings.length} ta
                </Text>
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carouselContent}
            >
              {section.offerings.map((offering) => (
                <FoodProductCard
                  key={offering.id || offering.offeringId}
                  offering={offering}
                  onAddToCart={onAddToCart}
                  disabled={disabled}
                />
              ))}
            </ScrollView>
          </View>
        ))}

        {filteredSections.length === 0 ? (
          <View style={styles.emptyResults}>
            <Ionicons name="fast-food-outline" size={24} color="#6C7693" />
            <Text style={styles.emptyText}>Ushbu bo‘limda taomlar mavjud emas</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    marginTop: 4,
    gap: 10,
    width: "100%",
  },
  sections: {
    gap: 14,
    marginTop: 2,
  },
  sectionBlock: {
    gap: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    color: "#F3F5FB",
    fontSize: 14,
    fontWeight: "700",
  },
  countBadge: {
    backgroundColor: "rgba(120,104,246,0.14)",
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 8,
  },
  countText: {
    color: "#A99CFF",
    fontSize: 10,
    fontWeight: "600",
  },
  carouselContent: {
    gap: 10,
    paddingVertical: 2,
    paddingRight: 10,
  },
  emptyResults: {
    paddingVertical: 24,
    alignItems: "center",
    gap: 6,
  },
  emptyText: {
    color: "#7E87A5",
    fontSize: 12,
  },
});

