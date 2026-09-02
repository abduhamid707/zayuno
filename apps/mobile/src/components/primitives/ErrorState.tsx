import React from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "./Text";
import { Button } from "./Button";
import { theme } from "../../theme";

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Xatolik yuz berdi",
  message,
  onRetry,
}: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <Text
        variant="h2"
        color={theme.colors.error}
        align="center"
        style={styles.title}
      >
        ⚠️ {title}
      </Text>
      <Text
        variant="body"
        color={theme.colors.secondaryText}
        align="center"
        style={styles.message}
      >
        {message}
      </Text>
      {onRetry && (
        <Button
          label="Qayta urinish"
          variant="secondary"
          onPress={onRetry}
          style={styles.button}
        />
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
  title: {
    marginBottom: theme.spacing.sm,
  },
  message: {
    marginBottom: theme.spacing.lg,
  },
  button: {
    minWidth: 140,
  },
});
