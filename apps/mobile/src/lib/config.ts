import Constants from "expo-constants";

export function getApiBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/$/, "");
  if (configured) return configured;

  if (__DEV__) {
    const host = Constants.expoConfig?.hostUri?.split(":")[0];
    if (host) return `http://${host}:4000`;
  }

  return "https://api.zayuno.uz";
}

export const publicLinks = {
  terms: process.env.EXPO_PUBLIC_TERMS_URL?.trim() || "https://zayuno.uz/terms",
  privacy:
    process.env.EXPO_PUBLIC_PRIVACY_URL?.trim() || "https://zayuno.uz/privacy",
};
