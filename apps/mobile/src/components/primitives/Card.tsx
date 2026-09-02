import React from "react";
import { View, StyleSheet, ViewProps } from "react-native";
import { theme } from "../../theme";

interface CardProps extends ViewProps {
  variant?: "elevated" | "outline" | "filled";
}

export function Card({
  variant = "filled",
  style,
  children,
  ...props
}: CardProps) {
  return (
    <View style={[styles.base, styles[variant], style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
  },
  filled: {
    backgroundColor: theme.colors.surface,
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  elevated: {
    backgroundColor: theme.colors.surface,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
});
