import { PostHog } from "posthog-react-native";

export const POSTHOG_API_KEY = "phc_zcCoK32AfWUoqbBLE63NHDrxycvKrtzKQFmsqECviw4G";
export const POSTHOG_HOST = "https://us.i.posthog.com";

export const posthogClient = new PostHog(POSTHOG_API_KEY, {
  host: POSTHOG_HOST,
  enableSessionReplay: true,
  sessionReplayConfig: {
    sampleRate: 1.0,
    captureLog: true,
    maskAllTextInputs: false,
    maskAllImages: false,
    throttleDelayMs: 1000,
  },
  captureAppLifecycleEvents: true,
  personProfiles: "always",
});

function cleanProperties(obj: Record<string, unknown>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

export const analytics = {
  client: posthogClient,

  trackScreen: (screenName: string, properties?: Record<string, unknown>) => {
    try {
      void posthogClient.screen(
        screenName,
        cleanProperties({
          app_name: "Zayuno Mobile",
          ...properties,
        })
      );
    } catch (e) {
      console.warn("[Analytics] Screen tracking error:", e);
    }
  },

  trackMessageSent: (data: {
    prompt: string;
    length: number;
    intent?: string;
    source?: string;
  }) => {
    try {
      posthogClient.capture(
        "chat_message_sent",
        cleanProperties({
          prompt_length: data.length,
          prompt_preview: data.prompt.slice(0, 100),
          intent: data.intent || "unknown",
          source: data.source || "user_input",
        })
      );
    } catch (e) {
      console.warn("[Analytics] Message track error:", e);
    }
  },

  trackProviderSelected: (data: {
    providerId?: string;
    name: string;
    cuisine?: string;
  }) => {
    try {
      posthogClient.capture(
        "provider_selected",
        cleanProperties({
          provider_id: data.providerId || "unknown",
          provider_name: data.name,
          cuisine: data.cuisine || "unknown",
        })
      );
    } catch (e) {
      console.warn("[Analytics] Provider track error:", e);
    }
  },

  trackFoodItemAdded: (data: {
    itemId: string;
    name: string;
    price: number;
    providerId?: string;
  }) => {
    try {
      posthogClient.capture(
        "cart_item_added",
        cleanProperties({
          item_id: data.itemId,
          item_name: data.name,
          item_price: data.price,
          provider_id: data.providerId || "unknown",
        })
      );
    } catch (e) {
      console.warn("[Analytics] Item added track error:", e);
    }
  },

  trackFoodItemRemoved: (data: { itemId: string }) => {
    try {
      posthogClient.capture("cart_item_removed", {
        item_id: data.itemId,
      });
    } catch (e) {
      console.warn("[Analytics] Item removed track error:", e);
    }
  },

  trackOrderInitiated: (data: {
    providerId?: string;
    itemsCount: number;
    totalAmount?: number;
  }) => {
    try {
      posthogClient.capture(
        "order_initiated",
        cleanProperties({
          provider_id: data.providerId || "unknown",
          items_count: data.itemsCount,
          total_amount: data.totalAmount || 0,
        })
      );
    } catch (e) {
      console.warn("[Analytics] Order initiated track error:", e);
    }
  },

  trackOrderCompleted: (data: {
    orderId: string;
    provider?: string;
    totalAmount: number;
    paymentMethod?: string;
  }) => {
    try {
      posthogClient.capture(
        "order_completed",
        cleanProperties({
          order_id: data.orderId,
          provider_name: data.provider || "unknown",
          total_amount: data.totalAmount,
          payment_method: data.paymentMethod || "standard",
        })
      );
    } catch (e) {
      console.warn("[Analytics] Order completed track error:", e);
    }
  },

  trackDrawerOpened: () => {
    try {
      posthogClient.capture("history_drawer_opened");
    } catch (e) {
      console.warn("[Analytics] Drawer track error:", e);
    }
  },

  trackNewChat: () => {
    try {
      posthogClient.capture("new_chat_started");
    } catch (e) {
      console.warn("[Analytics] New chat track error:", e);
    }
  },

  trackError: (error: unknown, context?: string) => {
    try {
      posthogClient.captureException(
        error instanceof Error ? error : new Error(String(error)),
        cleanProperties({ context: context || "general" })
      );
    } catch (e) {
      console.warn("[Analytics] Error track error:", e);
    }
  },

  identifyUser: (user: { id: string; email?: string; name?: string }) => {
    try {
      posthogClient.identify(
        user.id,
        cleanProperties({
          email: user.email,
          name: user.name,
          app_name: "Zayuno Mobile",
        })
      );
    } catch (e) {
      console.warn("[Analytics] Identify error:", e);
    }
  },

  resetUser: () => {
    try {
      posthogClient.reset();
    } catch (e) {
      console.warn("[Analytics] Reset error:", e);
    }
  },
};

export default analytics;
