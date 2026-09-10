import React, { memo, useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "./primitives/Text";
import type { ChatAction } from "../lib/interaction";

export const ChatActionRow = memo(function ChatActionRow({
  actions,
  onSelect,
  disabled = false,
}: {
  actions: ChatAction[];
  onSelect: (action: ChatAction) => void;
  disabled?: boolean;
}) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const expiry = Math.min(
      ...actions
        .map((action) => Date.parse(action.expiresAt))
        .filter((at) => at > Date.now()),
    );
    if (!Number.isFinite(expiry)) return;
    const timer = setTimeout(
      () => setNow(Date.now()),
      Math.min(expiry - Date.now() + 20, 2_147_483_647),
    );
    return () => clearTimeout(timer);
  }, [actions, now]);
  const visible = actions
    .filter((action) => Date.parse(action.expiresAt) > now)
    .slice(0, 3);
  if (!visible.length) return null;
  return (
    <View style={styles.row}>
      {visible.map((action) => (
        <Pressable
          key={action.id}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          accessibilityHint={action.prompt}
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={() => {
            if (Date.parse(action.expiresAt) > Date.now()) onSelect(action);
          }}
          style={({ pressed }) => [
            styles.touchTarget,
            disabled && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          <View
            style={[
              styles.pill,
              action.appearance === "primary" && styles.primary,
            ]}
          >
            {action.kind === "cancel" ? (
              <Ionicons name="close-circle-outline" size={15} color="#BCC2D8" />
            ) : null}
            <Text
              style={[
                styles.label,
                action.appearance === "primary" && styles.primaryLabel,
              ]}
            >
              {action.label}
            </Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 6,
    paddingBottom: 4,
  },
  touchTarget: { minHeight: 44, justifyContent: "center", maxWidth: "100%" },
  pill: {
    minHeight: 31,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#29335D",
    backgroundColor: "#0A1020",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  primary: { backgroundColor: "#343B96", borderColor: "#424BAD" },
  label: {
    color: "#C2C8DF",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
    flexShrink: 1,
    textAlign: "center",
  },
  primaryLabel: { color: "#F3F1FF" },
  pressed: { opacity: 0.72, transform: [{ scale: 0.97 }] },
  disabled: { opacity: 0.45 },
});
