import React, { useEffect } from "react";
import {
  ActivityIndicator,
  AppState,
  Pressable,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import { PostHogProvider } from "posthog-react-native";
import { posthogClient, analytics } from "../src/lib/analytics";
import { useAuthStore } from "../src/store/authStore";
import { theme } from "../src/theme";
import { Text } from "../src/components/primitives/Text";

function NavigationGuard() {
  const segments = useSegments();
  const router = useRouter();
  const { isAuthenticated, isLoading, restoreError, initAuth, refreshSession } =
    useAuthStore();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active" && useAuthStore.getState().restoreError) {
        void initAuth();
        return;
      }
      if (nextState === "active" && useAuthStore.getState().isAuthenticated) {
        void refreshSession();
      }
    });
    return () => subscription.remove();
  }, [refreshSession, initAuth]);

  useEffect(() => {
    if (isLoading || restoreError) return;
    const inAuthGroup = segments[0] === "(auth)";
    if (!isAuthenticated && !inAuthGroup) router.replace("/(auth)/welcome");
    if (isAuthenticated && inAuthGroup) router.replace("/(app)");
  }, [isAuthenticated, isLoading, restoreError, router, segments]);

  useEffect(() => {
    if (isLoading || restoreError) return;
    const routeName = segments.join("/") || "home";
    analytics.trackScreen(routeName, {
      authenticated: isAuthenticated,
      auth_revision: 2,
    });
  }, [segments, isLoading, restoreError, isAuthenticated]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="small" color="#8173FF" />
      </View>
    );
  }

  if (restoreError)
    return (
      <View style={styles.loading}>
        <Text style={styles.recoveryText}>
          Hisobingizni hozir tiklay olmadik. Qayta urinib ko‘ring.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => void initAuth()}
          style={styles.retry}
        >
          <Text style={styles.retryText}>Qayta urinish</Text>
        </Pressable>
      </View>
    );
  return <Slot />;
}

export default function RootLayout() {
  return (
    <PostHogProvider client={posthogClient} autocapture={true}>
      <View style={styles.container}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={theme.colors.background}
        />
        <NavigationGuard />
      </View>
    </PostHogProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  recoveryText: {
    color: "#CCD1E3",
    textAlign: "center",
    paddingHorizontal: 32,
    marginBottom: 18,
  },
  retry: {
    minHeight: 44,
    justifyContent: "center",
    borderRadius: 22,
    paddingHorizontal: 24,
    backgroundColor: "#343B96",
  },
  retryText: { color: "#FFFFFF", fontWeight: "600" },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
  },
});
