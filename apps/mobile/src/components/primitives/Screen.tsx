import React from "react";
import {
  View,
  StyleSheet,
  ViewProps,
  ScrollView,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../../theme";

interface ScreenProps extends ViewProps {
  scrollable?: boolean;
  padded?: boolean;
}

export function Screen({
  children,
  scrollable = false,
  padded = true,
  style,
  ...props
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const paddingStyle = padded
    ? { paddingHorizontal: theme.spacing.md }
    : undefined;

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor={theme.colors.background}
      />
      {scrollable ? (
        <ScrollView
          contentContainerStyle={[paddingStyle, style]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, paddingStyle, style]} {...props}>
          {children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
  },
});
