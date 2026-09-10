import React, { memo, useMemo, useState } from "react";
import { FlatList, StyleSheet, useWindowDimensions, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../primitives/Text";
import {
  CatalogOfferingItem,
  CategoryRibbonItem,
  CatalogSectionItem,
} from "../../lib/interaction";
import { CategoryRibbon } from "./CategoryRibbon";
import { FoodProductCard, CartFlightOrigin } from "./FoodProductCard";
import { offeringKey } from "../../lib/cart";
import { useReducedMotion } from "./useReducedMotion";

type InChatCatalogWidgetProps = {
  providerSlug: string;
  providerName: string;
  providerLogoUrl?: string;
  locationName?: string;
  categories: CategoryRibbonItem[];
  sections: CatalogSectionItem[];
  onAddToCart: (
    offering: CatalogOfferingItem,
    origin?: CartFlightOrigin,
  ) => void;
  quantities?: Record<string, number>;
  disabled?: boolean;
};

export const InChatCatalogWidget = memo(function InChatCatalogWidget({
  categories,
  sections,
  onAddToCart,
  quantities = {},
  disabled,
}: InChatCatalogWidgetProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(
    "all",
  );
  const { width, fontScale } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const cardWidth = Math.round(
    Math.max(150, Math.min(180, (width - 54) / 2)) * Math.min(fontScale, 1.3),
  );

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

      <Text style={styles.hint}>Mahsulotni bosing · savatga qo‘shiladi</Text>
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

            <FlatList
              horizontal
              data={section.offerings}
              extraData={quantities}
              keyExtractor={(offering) => offeringKey(offering)}
              initialNumToRender={4}
              maxToRenderPerBatch={4}
              windowSize={5}
              getItemLayout={(_, index) => ({
                length: cardWidth + 10,
                offset: (cardWidth + 10) * index,
                index,
              })}
              keyboardShouldPersistTaps="handled"
              decelerationRate="fast"
              snapToInterval={cardWidth + 10}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carouselContent}
              renderItem={({ item: offering }) => (
                <FoodProductCard
                  key={offering.id || offering.offeringId}
                  offering={offering}
                  onAddToCart={onAddToCart}
                  quantity={quantities[offeringKey(offering)] || 0}
                  width={cardWidth}
                  reducedMotion={reducedMotion}
                  disabled={disabled}
                />
              )}
            />
          </View>
        ))}

        {filteredSections.length === 0 ? (
          <View style={styles.emptyResults}>
            <Ionicons name="fast-food-outline" size={24} color="#6C7693" />
            <Text style={styles.emptyText}>
              Ushbu bo‘limda taomlar mavjud emas
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    marginTop: 4,
    gap: 10,
    width: "100%",
  },
  sections: {
    gap: 18,
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
    fontSize: 15,
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
    fontSize: 11,
    fontWeight: "600",
  },
  carouselContent: {
    gap: 10,
    paddingVertical: 2,
    paddingRight: 10,
  },
  hint: { color: "#9098B1", fontSize: 11, lineHeight: 16, paddingLeft: 2 },
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
