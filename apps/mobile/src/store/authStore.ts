import { create } from "zustand";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { getApiBaseUrl } from "../lib/config";

const ACCESS_TOKEN_KEY = "zayuno_consumer_access_token";
const REFRESH_TOKEN_KEY = "zayuno_consumer_refresh_token";
const USER_KEY = "zayuno_consumer_user";

const storage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === "web") {
      try {
        return typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
      } catch {
        return null;
      }
    }
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === "web") {
      try {
        if (typeof window !== "undefined") window.localStorage.setItem(key, value);
      } catch {}
      return;
    }
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {}
  },
  deleteItem: async (key: string): Promise<void> => {
    if (Platform.OS === "web") {
      try {
        if (typeof window !== "undefined") window.localStorage.removeItem(key);
      } catch {}
      return;
    }
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {}
  },
};

export interface ConsumerUser {
  id: string;
  email?: string;
  name?: string;
  avatarUrl?: string;
}

interface SessionPayload {
  accessToken: string;
  refreshToken?: string;
  user?: ConsumerUser;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  token: string | null;
  user: ConsumerUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  initAuth: () => Promise<void>;
  setSession: (session: SessionPayload) => Promise<void>;
  refreshSession: () => Promise<boolean>;
  logout: () => Promise<void>;
}

let refreshInFlight: Promise<boolean> | null = null;

async function clearStoredSession() {
  await Promise.all([
    storage.deleteItem(ACCESS_TOKEN_KEY),
    storage.deleteItem(REFRESH_TOKEN_KEY),
    storage.deleteItem(USER_KEY),
  ]);
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  token: null,
  user: null,
  isLoading: true,
  isAuthenticated: false,

  initAuth: async () => {
    try {
      const [accessToken, refreshToken, userJson] = await Promise.all([
        storage.getItem(ACCESS_TOKEN_KEY),
        storage.getItem(REFRESH_TOKEN_KEY),
        storage.getItem(USER_KEY),
      ]);
      const user = userJson ? JSON.parse(userJson) : null;
      set({
        accessToken,
        refreshToken,
        token: accessToken,
        user,
        isAuthenticated: Boolean(accessToken),
        isLoading: false,
      });
    } catch {
      await clearStoredSession();
      set({
        accessToken: null,
        refreshToken: null,
        token: null,
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  setSession: async ({ accessToken, refreshToken, user }) => {
    await storage.setItem(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken)
      await storage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    if (user) await storage.setItem(USER_KEY, JSON.stringify(user));
    set({
      accessToken,
      refreshToken: refreshToken || null,
      token: accessToken,
      user: user || null,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  refreshSession: async () => {
    if (refreshInFlight) return refreshInFlight;
    refreshInFlight = (async () => {
      const refreshToken = get().refreshToken;
      const baseUrl = getApiBaseUrl();
      if (!refreshToken || !baseUrl) return false;
      try {
        const response = await fetch(
          `${baseUrl}/api/v1/consumer/auth/refresh`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
          },
        );
        if (!response.ok) throw new Error("refresh failed");
        const session = await response.json();
        await get().setSession({
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          user: session.user || get().user || undefined,
        });
        return true;
      } catch {
        await clearStoredSession();
        set({
          accessToken: null,
          refreshToken: null,
          token: null,
          user: null,
          isAuthenticated: false,
        });
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
    return refreshInFlight;
  },

  logout: async () => {
    const refreshToken = get().refreshToken;
    const baseUrl = getApiBaseUrl();
    if (refreshToken && baseUrl) {
      fetch(`${baseUrl}/api/v1/consumer/auth/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      }).catch(() => undefined);
    }
    await clearStoredSession();
    set({
      accessToken: null,
      refreshToken: null,
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },
}));
