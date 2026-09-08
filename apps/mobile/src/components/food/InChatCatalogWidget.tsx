import React, { useMemo, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
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
  providerSlug,
  providerName,
  providerLogoUrl,
  locationName = "Toshkent",
  categories,
  sections,
  onAddToCart,
  disabled,
}: InChatCatalogWidgetProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(
    categories?.[0]?.slug,
  );

  // Filter sections and offerings if search query entered
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) {
      if (!selectedCategory) return sections;
      return sections.filter((s) => s.categorySlug === selectedCategory);
    }
    const q = searchQuery.toLowerCase().trim();
    return sections
      .map((section) => ({
        ...section,
        offerings: section.offerings.filter(
          (item) =>
            item.title.toLowerCase().includes(q) ||
            item.description?.toLowerCase().includes(q),
        ),
      }))
      .filter((section) => section.offerings.length > 0);
  }, [sections, searchQuery, selectedCategory]);

  return (
    <View style={styles.root}>
      {/* 1. Provider Selected Header Badge */}
      <View style={styles.header}>
        <View style={styles.providerBadge}>
          {providerLogoUrl ? (
            <Image
              source={{ uri: providerLogoUrl }}
              style={styles.headerLogo}
              resizeMode="cover"
            />
          ) : (
            <Ionicons name="restaurant" size={14} color="#7868F6" />
          )}
          <Text style={styles.badgeText}>{providerName} tanlandi</Text>
          <View style={styles.checkCircle}>
            <Ionicons name="checkmark" size={10} color="#FFFFFF" />
          </View>
        </View>

        <Text style={styles.title}>{providerName} menyusidan tanlang 👇</Text>
      </View>

      {/* 2. Search & Location Bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={16} color="#6C7693" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={`${providerName} menyusida qidirish...`}
            placeholderTextColor="#6C7693"
            style={styles.searchInput}
            editable={!disabled}
          />
          {searchQuery ? (
            <Pressable
              onPress={() => setSearchQuery("")}
              hitSlop={8}
              style={styles.clearSearch}
            >
              <Ionicons name="close-circle" size={16} color="#7C86A2" />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.locationPill}>
          <Ionicons name="location" size={14} color="#7868F6" />
          <Text numberOfLines={1} style={styles.locationText}>
            {locationName}
          </Text>
          <Ionicons name="chevron-down" size={12} color="#7868F6" />
        </View>
      </View>

      {/* 3. Category Horizontal Ribbon */}
      <CategoryRibbon
        categories={categories}
        selectedSlug={selectedCategory}
        onSelectCategory={(slug) => {
          setSelectedCategory(selectedCategory === slug ? undefined : slug);
        }}
      />

      {/* 4. Categorized Horizontal Carousels */}
      <View style={styles.sections}>
        {filteredSections.map((section) => (
          <View key={section.categorySlug} style={styles.sectionBlock}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>{section.categoryTitle}</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>
                    {section.offerings.length} ta mahsulot
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={() => setSelectedCategory(section.categorySlug)}
                style={styles.viewAllRow}
              >
                <Text style={styles.viewAllText}>Barchasini ko‘rish</Text>
                <Ionicons name="chevron-forward" size={12} color="#7868F6" />
              </Pressable>
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

              {section.offerings.length > 4 ? (
                <View style={styles.moreCard}>
                  <View style={styles.moreCircle}>
                    <Ionicons name="chevron-forward" size={18} color="#9487FF" />
                  </View>
                </View>
              ) : null}
            </ScrollView>
          </View>
        ))}

        {filteredSections.length === 0 ? (
          <View style={styles.emptyResults}>
            <Ionicons name="search-outline" size={24} color="#6C7693" />
            <Text style={styles.emptyText}>Taom topilmadi</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    marginTop: 8,
    gap: 12,
    width: "100%",
  },
  header: {
    gap: 6,
  },
  providerBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(35,32,74,0.85)",
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(120,104,246,0.3)",
    gap: 6,
  },
  headerLogo: {
    width: 18,
    height: 18,
    borderRadius: 5,
  },
  badgeText: {
    color: "#D8DCF0",
    fontSize: 12,
    fontWeight: "600",
  },
  checkCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: "#F3F5FA",
    fontSize: 15,
    fontWeight: "700",
    marginTop: 2,
  },
  searchRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  searchContainer: {
    flex: 1,
    height: 40,
    backgroundColor: "rgba(18,23,41,0.92)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(126,134,165,0.22)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 11,
    gap: 7,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: "#F1F3F9",
    fontSize: 12,
  },
  clearSearch: {
    padding: 2,
  },
  locationPill: {
    height: 40,
    backgroundColor: "rgba(18,23,41,0.92)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(126,134,165,0.22)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 11,
    gap: 5,
  },
  locationText: {
    color: "#E2E5F0",
    fontSize: 12,
    fontWeight: "600",
  },
  sections: {
    gap: 16,
    marginTop: 4,
  },
  sectionBlock: {
    gap: 9,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 2,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
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
  viewAllRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  viewAllText: {
    color: "#7868F6",
    fontSize: 11,
    fontWeight: "600",
  },
  carouselContent: {
    gap: 10,
    paddingVertical: 2,
    paddingRight: 10,
  },
  moreCard: {
    width: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  moreCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(35,32,74,0.8)",
    borderWidth: 1,
    borderColor: "rgba(120,104,246,0.35)",
    alignItems: "center",
    justifyContent: "center",
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
