import React from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "./Text";
import { Button } from "./Button";
import { theme } from "../../theme";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon = "🔍",
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text variant="h2" align="center" style={styles.title}>
        {title}
      </Text>
      <Text
        variant="body"
        color={theme.colors.secondaryText}
        align="center"
        style={styles.description}
      >
        {description}
      </Text>
      {actionLabel && onAction && (
        <Button label={actionLabel} onPress={onAction} style={styles.button} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.xl,
    justifyContent: "center",
    alignItems: "center",
  },
  icon: {
    fontSize: 48,
    marginBottom: theme.spacing.md,
  },
  title: {
    marginBottom: theme.spacing.xs,
  },
  description: {
    marginBottom: theme.spacing.lg,
  },
  button: {
    minWidth: 160,
  },
});
