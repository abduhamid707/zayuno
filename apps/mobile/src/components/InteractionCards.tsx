import React from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "./primitives/Text";
import {
  ChatInteraction,
  InteractionChoice,
  choiceLabel,
  formatMoney,
} from "../lib/interaction";

type InteractionCardsProps = {
  interaction: ChatInteraction;
  onSelect?: (choice: InteractionChoice) => void;
  disabled?: boolean;
};

function ChoiceVisual({
  choice,
  compact = false,
}: {
  choice: InteractionChoice;
  compact?: boolean;
}) {
  const visualStyle = compact ? styles.compactChoiceImage : styles.choiceImage;
  const iconStyle = compact ? styles.compactChoiceIcon : styles.choiceIcon;
  if (choice.imageUrl) {
    return <Image source={{ uri: choice.imageUrl }} style={visualStyle} />;
  }

  return (
    <View style={iconStyle}>
      {choice.emoji ? (
        <Text style={styles.choiceEmoji}>{choice.emoji}</Text>
      ) : (
        <Ionicons
          name={choice.kind === "provider" ? "business-outline" : "sparkles-outline"}
          size={22}
          color="#A99CFF"
        />
      )}
    </View>
  );
}

function ChoiceCard({
  choice,
  onSelect,
  disabled,
}: {
  choice: InteractionChoice;
  onSelect?: (choice: InteractionChoice) => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${choiceLabel(choice)} tanlash`}
      disabled={disabled || !onSelect}
      onPress={() => onSelect?.(choice)}
      style={({ pressed }) => [
        styles.choiceCard,
        pressed && styles.choicePressed,
        disabled && styles.choiceDisabled,
      ]}
    >
      <ChoiceVisual choice={choice} />
      <View style={styles.choiceCopy}>
        <Text numberOfLines={2} style={styles.choiceTitle}>
          {choice.title}
        </Text>
        {choice.subtitle ? (
          <Text numberOfLines={2} style={styles.choiceSubtitle}>
            {choice.subtitle}
          </Text>
        ) : null}
        {typeof choice.price === "number" ? (
          <Text style={styles.choicePrice}>
            {formatMoney(choice.price, choice.currency)}
          </Text>
        ) : null}
      </View>
      <Ionicons name="add-circle-outline" size={19} color="#8F82FF" />
    </Pressable>
  );
}

export function InteractionCards({
  interaction,
  onSelect,
  disabled,
}: InteractionCardsProps) {
  const groups = (interaction.groups || []).filter((group) => group.choices.length > 0);
  if (!groups.length) return null;

  return (
    <View style={styles.root}>
      {interaction.title ? (
        <Text style={styles.title}>{interaction.title}</Text>
      ) : null}
      {interaction.subtitle ? (
        <Text style={styles.subtitle}>{interaction.subtitle}</Text>
      ) : null}
      {groups.map((group) => (
        <View key={group.id} style={styles.group}>
          {group.title ? <Text style={styles.groupTitle}>{group.title}</Text> : null}
          {group.subtitle ? (
            <Text style={styles.groupSubtitle}>{group.subtitle}</Text>
          ) : null}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scroller}
            decelerationRate="fast"
          >
            {group.choices.map((choice) => (
              <ChoiceCard
                key={choice.id}
                choice={choice}
                onSelect={onSelect}
                disabled={disabled}
              />
            ))}
          </ScrollView>
        </View>
      ))}
    </View>
  );
}

export function SelectionTray({
  choices,
  onRemove,
}: {
  choices: InteractionChoice[];
  onRemove?: (choice: InteractionChoice) => void;
}) {
  if (!choices.length) return null;

  return (
    <View style={styles.tray}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.trayScroller}
      >
        {choices.map((choice) => (
          <View key={`${choice.groupId}:${choice.id}`} style={styles.selectedChip}>
            <ChoiceVisual choice={choice} compact />
            <View style={styles.selectedCopy}>
              <Text numberOfLines={1} style={styles.selectedTitle}>
                {choice.title}
              </Text>
              {typeof choice.price === "number" ? (
                <Text numberOfLines={1} style={styles.selectedPrice}>
                  {formatMoney(choice.price, choice.currency)}
                </Text>
              ) : null}
            </View>
            {onRemove ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${choice.title} tanlovini olib tashlash`}
                hitSlop={8}
                onPress={() => onRemove(choice)}
                style={styles.removeButton}
              >
                <Ionicons name="close" size={14} color="#E7E9F1" />
              </Pressable>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { marginTop: 10, gap: 8 },
  title: { color: "#F7F8FC", fontSize: 15, lineHeight: 21, fontWeight: "700" },
  subtitle: { color: "#8B93A7", fontSize: 12, lineHeight: 17 },
  group: { gap: 6 },
  groupTitle: { color: "#DDE2F2", fontSize: 12, lineHeight: 17, fontWeight: "600" },
  groupSubtitle: { color: "#737D97", fontSize: 11, lineHeight: 15 },
  scroller: { gap: 8, paddingRight: 18, paddingVertical: 2 },
  choiceCard: {
    width: 154,
    minHeight: 154,
    padding: 9,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(126,134,165,0.22)",
    backgroundColor: "rgba(15,21,40,0.9)",
    gap: 7,
  },
  choicePressed: {
    borderColor: "rgba(139,124,255,0.82)",
    backgroundColor: "rgba(29,30,66,0.96)",
    transform: [{ scale: 0.98 }],
  },
  choiceDisabled: { opacity: 0.52 },
  choiceImage: { width: 70, height: 70, borderRadius: 12, backgroundColor: "#20263A" },
  choiceIcon: {
    width: 70,
    height: 70,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(124,103,255,0.13)",
  },
  choiceEmoji: { fontSize: 27 },
  choiceCopy: { flex: 1, gap: 2 },
  choiceTitle: { color: "#F3F5FB", fontSize: 12, lineHeight: 16, fontWeight: "700" },
  choiceSubtitle: { color: "#8B93A7", fontSize: 10, lineHeight: 14 },
  choicePrice: { color: "#B3A8FF", fontSize: 11, lineHeight: 15, fontWeight: "700" },
  tray: { paddingTop: 6, paddingBottom: 2 },
  trayScroller: { gap: 8, paddingRight: 8 },
  selectedChip: {
    width: 154,
    height: 70,
    padding: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(139,124,255,0.62)",
    backgroundColor: "rgba(45,36,94,0.74)",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  compactChoiceImage: {
    width: 58,
    height: 58,
    borderRadius: 10,
    backgroundColor: "#20263A",
  },
  compactChoiceIcon: {
    width: 58,
    height: 58,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(124,103,255,0.13)",
  },
  selectedCopy: { flex: 1, gap: 2 },
  selectedTitle: { color: "#F7F8FC", fontSize: 11, lineHeight: 14, fontWeight: "700" },
  selectedPrice: { color: "#B9B1FF", fontSize: 10, lineHeight: 13 },
  removeButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(6,9,22,0.72)",
    alignSelf: "flex-start",
  },
});
