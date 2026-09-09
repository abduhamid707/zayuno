import { PostHog } from "posthog-react-native";

export const POSTHOG_API_KEY = "phc_zcCoK32AfWUoqbBLE63NHDrxycvKrtzKQFmsqECviw4G";
export const POSTHOG_HOST = "https://us.i.posthog.com";

export const posthogClient = new PostHog(POSTHOG_API_KEY, {
  host: POSTHOG_HOST,
  enableSessionReplay: true,
  sessionReplayConfig: {
    sampleRate: 0.5,
    captureLog: false,
    maskAllTextInputs: true,
    maskAllImages: true,
    throttleDelayMs: 1000,
  },
  captureAppLifecycleEvents: true,
  personProfiles: "always",
});

const BLOCKED_PROPERTY =
  /prompt|preview|message|content|email|phone|address|name|token|secret|password|card|cvv|otp/i;

function cleanProperties(obj: Record<string, unknown>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || BLOCKED_PROPERTY.test(key)) continue;
    if (
      value === null ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      result[key] = value;
    } else if (typeof value === "string") {
      result[key] = value.slice(0, 120);
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
    length: number;
    intent?: string;
    source?: string;
    selectionCount?: number;
    trayItemCount?: number;
  }) => {
    try {
      posthogClient.capture(
        "chat_message_sent",
        cleanProperties({
          prompt_length: data.length,
          intent: data.intent || "unknown",
          source: data.source || "user_input",
          selection_count: data.selectionCount || 0,
          tray_item_count: data.trayItemCount || 0,
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

  trackChatResponse: (data: {
    latencyMs: number;
    success: boolean;
    interactionKind?: string;
    responseLength?: number;
  }) => {
    try {
      posthogClient.capture(
        "chat_response_received",
        cleanProperties({
          latency_ms: data.latencyMs,
          success: data.success,
          interaction_kind: data.interactionKind || "text",
          response_length: data.responseLength || 0,
        }),
      );
    } catch (e) {
      console.warn("[Analytics] Chat response track error:", e);
    }
  },

  trackSuggestion: (data: {
    event: "shown" | "clicked" | "dismissed";
    type: string;
    personalized: boolean;
    position?: number;
  }) => {
    try {
      posthogClient.capture(
        "suggestion_interacted",
        cleanProperties({
          interaction: data.event,
          suggestion_type: data.type,
          personalized: data.personalized,
          position: data.position,
        }),
      );
    } catch (e) {
      console.warn("[Analytics] Suggestion track error:", e);
    }
  },

  trackMemory: (
    action: "viewed" | "consent_enabled" | "consent_disabled" | "signal_edited" | "signal_deleted" | "exported" | "cleared",
    properties?: Record<string, unknown>,
  ) => {
    try {
      posthogClient.capture(
        `memory_${action}`,
        cleanProperties(properties || {}),
      );
    } catch (e) {
      console.warn("[Analytics] Memory track error:", e);
    }
  },

  trackAuthSession: (
    action: "restore_started" | "restore_succeeded" | "restore_failed",
    properties?: Record<string, unknown>,
  ) => {
    try {
      posthogClient.capture(
        `auth_session_${action}`,
        cleanProperties(properties || {}),
      );
    } catch (e) {
      console.warn("[Analytics] Auth session track error:", e);
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
          app_name: "Zayuno Mobile",
          account_type: "consumer",
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
