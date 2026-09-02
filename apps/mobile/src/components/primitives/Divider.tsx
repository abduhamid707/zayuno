import React from "react";
import { View, StyleSheet, ViewProps } from "react-native";
import { theme } from "../../theme";

export function Divider({ style, ...props }: ViewProps) {
  return <View style={[styles.divider, style]} {...props} />;
}

const styles = StyleSheet.create({
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.sm,
    width: "100%",
  },
});
