import React from "react";
import {
  TouchableOpacity,
  StyleSheet,
  TouchableOpacityProps,
  Text,
} from "react-native";
import { theme } from "../../theme";

interface IconButtonProps extends TouchableOpacityProps {
  icon: string;
  size?: number;
}

export function IconButton({
  icon,
  size = 24,
  style,
  ...props
}: IconButtonProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={[styles.button, style]}
      {...props}
    >
      <Text style={{ fontSize: size, color: theme.colors.text }}>{icon}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: theme.spacing.sm,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
});
