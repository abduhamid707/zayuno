import React from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../primitives/Text";
import { ProviderCardItem } from "../../lib/interaction";

type ProviderPickerCardProps = {
  providers: ProviderCardItem[];
  title?: string;
  subtitle?: string;
  onSelectProvider: (provider: ProviderCardItem) => void;
  disabled?: boolean;
};

// Fallback visual logos when network image is slow or missing
function ProviderLogo({ provider }: { provider: ProviderCardItem }) {
  const slug = provider.slug.toLowerCase();

  if (provider.logoUrl) {
    return (
      <View style={styles.logoContainer}>
        <Image
          source={{ uri: provider.logoUrl }}
          style={styles.logoImage}
          resizeMode="cover"
        />
      </View>
    );
  }

  // Styled Brand Badge Fallback
  if (slug.includes("evos")) {
    return (
      <View style={[styles.logoContainer, { backgroundColor: "#000000" }]}>
        <Text style={{ color: "#FFE600", fontWeight: "900", fontSize: 13 }}>EVOS</Text>
      </View>
    );
  }
  if (slug.includes("maxway")) {
    return (
      <View style={[styles.logoContainer, { backgroundColor: "#FFE600" }]}>
        <Text style={{ color: "#000000", fontWeight: "900", fontSize: 13 }}>MW</Text>
      </View>
    );
  }
  if (slug.includes("bellissimo")) {
    return (
      <View style={[styles.logoContainer, { backgroundColor: "#D32F2F" }]}>
        <Ionicons name="pizza" size={22} color="#FFFFFF" />
      </View>
    );
  }
  if (slug.includes("chopar")) {
    return (
      <View style={[styles.logoContainer, { backgroundColor: "#2E7D32" }]}>
        <Ionicons name="pizza-outline" size={22} color="#FFFFFF" />
      </View>
    );
  }
  if (slug.includes("yaponamama")) {
    return (
      <View style={[styles.logoContainer, { backgroundColor: "#C62828" }]}>
        <Ionicons name="fish-outline" size={22} color="#FFFFFF" />
      </View>
    );
  }

  return (
    <View style={[styles.logoContainer, { backgroundColor: "#1E243A" }]}>
      <Ionicons name="restaurant" size={20} color="#A99CFF" />
    </View>
  );
}

export function ProviderPickerCard({
  providers,
  title = "Assalomu alaykum! Qaysi fast-fooddan buyurtma qilmoqchisiz?",
  subtitle = "Quyidagilardan birini bosing — xabar avtomatik yuboriladi.",
  onSelectProvider,
  disabled,
}: ProviderPickerCardProps) {
  if (!providers || providers.length === 0) return null;

  return (
    <View style={styles.root}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

      <View style={styles.list}>
        {providers.map((provider) => (
          <Pressable
            key={provider.id || provider.slug}
            accessibilityRole="button"
            accessibilityLabel={`${provider.name} restoranini tanlash`}
            disabled={disabled}
            onPress={() => onSelectProvider(provider)}
            style={({ pressed }) => [
              styles.card,
              pressed && styles.cardPressed,
              disabled && styles.cardDisabled,
            ]}
          >
            <ProviderLogo provider={provider} />

            <View style={styles.info}>
              <Text numberOfLines={1} style={styles.name}>
                {provider.name}
              </Text>
              {provider.cuisine ? (
                <Text numberOfLines={1} style={styles.cuisine}>
                  {provider.cuisine}
                </Text>
              ) : null}
            </View>

            <Ionicons name="chevron-forward" size={19} color="#7868F6" />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    marginTop: 8,
    gap: 8,
    width: "100%",
  },
  title: {
    color: "#F2F4FB",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },
  subtitle: {
    color: "#838CA5",
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 4,
  },
  list: {
    gap: 9,
    width: "100%",
  },
  card: {
    height: 64,
    width: "100%",
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(126,134,165,0.24)",
    backgroundColor: "rgba(18,23,41,0.92)",
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },
  cardPressed: {
    borderColor: "#7868F6",
    backgroundColor: "rgba(35,33,74,0.96)",
    transform: [{ scale: 0.99 }],
  },
  cardDisabled: {
    opacity: 0.6,
  },
  logoContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  logoImage: {
    width: "100%",
    height: "100%",
    borderRadius: 14,
  },
  info: {
    flex: 1,
    justifyContent: "center",
  },
  name: {
    color: "#F6F7FB",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  cuisine: {
    color: "#7E87A0",
    fontSize: 11,
    marginTop: 2,
  },
});
