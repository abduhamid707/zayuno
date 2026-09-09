import React, { useEffect } from "react";
import {
  ActivityIndicator,
  AppState,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import { PostHogProvider } from "posthog-react-native";
import { posthogClient, analytics } from "../src/lib/analytics";
import { useAuthStore } from "../src/store/authStore";
import { theme } from "../src/theme";

function NavigationGuard() {
  const segments = useSegments();
  const router = useRouter();
  const { isAuthenticated, isLoading, initAuth, refreshSession } =
    useAuthStore();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active" && useAuthStore.getState().isAuthenticated) {
        void refreshSession();
      }
    });
    return () => subscription.remove();
  }, [refreshSession]);

  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === "(auth)";
    if (!isAuthenticated && !inAuthGroup) router.replace("/(auth)/welcome");
    if (isAuthenticated && inAuthGroup) router.replace("/(app)");
  }, [isAuthenticated, isLoading, router, segments]);

  useEffect(() => {
    const routeName = segments.join("/") || "home";
    analytics.trackScreen(routeName);
  }, [segments]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="small" color="#8173FF" />
      </View>
    );
  }

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
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
  },
});
