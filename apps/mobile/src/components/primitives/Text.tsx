import React from "react";
import {
  Text as RNText,
  TextProps as RNTextProps,
  StyleSheet,
} from "react-native";
import { theme } from "../../theme";

interface TextProps extends RNTextProps {
  variant?: "h1" | "h2" | "body" | "caption" | "button";
  color?: string;
  align?: "left" | "center" | "right";
  weight?: "regular" | "medium" | "bold";
}

export function Text({
  variant = "body",
  color = theme.colors.text,
  align = "left",
  weight,
  style,
  ...props
}: TextProps) {
  return (
    <RNText
      style={[
        styles.base,
        styles[variant],
        { color, textAlign: align },
        weight && { fontWeight: theme.typography.weights[weight] },
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    fontFamily: "System",
  },
  h1: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: "bold",
  },
  h2: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: "bold",
  },
  body: {
    fontSize: theme.typography.sizes.md,
  },
  caption: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.secondaryText,
  },
  button: {
    fontSize: theme.typography.sizes.md,
    fontWeight: "600",
  },
});
