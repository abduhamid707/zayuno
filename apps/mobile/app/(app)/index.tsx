import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Accelerometer } from "expo-sensors";
import { captureRef } from "react-native-view-shot";
import { Text } from "../../src/components/primitives/Text";
import {
  ChatMessage,
  ChatSession,
  useChatStore,
} from "../../src/store/chatStore";
import { apiFetch, streamChat } from "../../src/lib/api";
import { theme } from "../../src/theme";
import { ChatMarkdown } from "../../src/components/ChatMarkdown";
import {
  InteractionCards,
  SelectionTray,
} from "../../src/components/InteractionCards";
import { ProviderPickerCard } from "../../src/components/food/ProviderPickerCard";
import { InChatCatalogWidget } from "../../src/components/food/InChatCatalogWidget";
import { ContextTrayDock } from "../../src/components/food/ContextTrayDock";
import { AccountSheet } from "../../src/components/AccountSheet";
import { useAuthStore } from "../../src/store/authStore";
import { analytics } from "../../src/lib/analytics";
import {
  ChatInteraction,
  InteractionChoice,
  choiceLabel,
  TrayItem,
  CatalogOfferingItem,
  ProviderCardItem,
} from "../../src/lib/interaction";

type QuickSuggestion = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  key?: string;
  type?: string;
};

const defaultSuggestions: QuickSuggestion[] = [
  {
    label: "Restoranlarni ko‘rsat",
    icon: "restaurant-outline" as const,
    color: "#FF9D45",
  },
  {
    label: "Lavash va burgerlarni ko‘rsat",
    icon: "fast-food-outline" as const,
    color: "#46D37B",
  },
  {
    label: "Pitsalarni ko‘rsat",
    icon: "pizza-outline" as const,
    color: "#B05CFF",
  },
  {
    label: "Sushi va rollarni ko‘rsat",
    icon: "fish-outline" as const,
    color: "#5590FF",
  },
];

function formatTime(value: string) {
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString("uz-UZ", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return date.toLocaleDateString("uz-UZ", { day: "2-digit", month: "short" });
}

function BrandHeader({
  onOpenHistory,
  onOpenAccount,
}: {
  onOpenHistory: () => void;
  onOpenAccount: () => void;
}) {
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityLabel="Chatlar tarixini ochish"
        hitSlop={10}
        onPress={onOpenHistory}
        style={({ pressed }) => [
          styles.headerButton,
          pressed && styles.pressed,
        ]}
      >
        <Ionicons name="menu-outline" size={31} color={theme.colors.text} />
      </Pressable>

      <View style={styles.brandRow} pointerEvents="none">
        <Image
          source={require("../../assets/brand/logo2.png")}
          style={styles.brandMark}
        />
        <Text style={styles.brandName}>Z A Y U N O</Text>
      </View>

      <Pressable
        accessibilityLabel="Profil va sozlamalarni ochish"
        onPress={onOpenAccount}
        style={({ pressed }) => [
          styles.headerButton,
          pressed && styles.pressed,
        ]}
      >
        <Ionicons name="person-circle-outline" size={29} color="#838CA5" />
      </Pressable>
    </View>
  );
}

function AssistantAvatar() {
  return (
    <View style={styles.assistantAvatarBadge}>
      <Image
        source={require("../../assets/brand/logo2.png")}
        style={styles.assistantAvatarImage}
      />
    </View>
  );
}

export default function HomeScreen() {
  const [input, setInput] = useState("");
  const [lastFailed, setLastFailed] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState("");
  const [streamingInteraction, setStreamingInteraction] =
    useState<ChatInteraction | null>(null);
  const [selectedChoices, setSelectedChoices] = useState<InteractionChoice[]>(
    [],
  );
  const [trayItems, setTrayItems] = useState<TrayItem[]>([]);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [accountVisible, setAccountVisible] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [reportText, setReportText] = useState("");
  const [reportScreenshot, setReportScreenshot] = useState<string | null>(null);
  const [includeChat, setIncludeChat] = useState(true);
  const [reportSending, setReportSending] = useState(false);
  const [reportSentId, setReportSentId] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [quickSuggestions, setQuickSuggestions] =
    useState<QuickSuggestion[]>(defaultSuggestions);
  const screenRef = useRef<View>(null);
  const lastShakeRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const user = useAuthStore((state) => state.user);
  const {
    sessions,
    activeSessionId,
    isLoading,
    hydrate,
    newChat,
    selectSession,
    deleteSession,
    addMessage,
    setLoading,
  } = useChatStore();

  const trackSuggestion = (
    event: "CLICKED" | "DISMISSED",
    type: string,
    key: string,
    text: string,
    personalized = false,
    position?: number,
  ) => {
    analytics.trackSuggestion({
      event: event === "CLICKED" ? "clicked" : "dismissed",
      type,
      personalized,
      position,
    });
    void apiFetch("/api/v1/consumer/memory/suggestion-events", {
      method: "POST",
      body: JSON.stringify({
        event,
        type,
        key,
        text,
        sessionId: activeSessionId,
      }),
    }).catch(() => undefined);
  };

  const handleAddToCart = (offering: CatalogOfferingItem) => {
    trackSuggestion("CLICKED", "offering", offering.offeringId, offering.title);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
      () => undefined,
    );
    setTrayItems((current) => {
      const existingIndex = current.findIndex(
        (item) =>
          item.type === "offering" && item.offeringId === offering.offeringId,
      );
      if (existingIndex >= 0) {
        const updated = [...current];
        const existing = updated[existingIndex] as any;
        updated[existingIndex] = {
          ...existing,
          quantity: (existing.quantity || 1) + 1,
        };
        return updated;
      }
      return [
        ...current,
        {
          type: "offering",
          id: `tray_offering_${Date.now()}_${offering.offeringId}`,
          offeringId: offering.offeringId,
          providerSlug: offering.providerSlug,
          title: offering.title,
          price: offering.price,
          currency: offering.currency,
          imageUrl: offering.imageUrl,
          quantity: 1,
        },
      ];
    });
    analytics.trackFoodItemAdded({
      itemId: offering.offeringId,
      name: offering.title,
      price: offering.price,
      providerId: offering.providerSlug,
    });
  };

  const handleRemoveTrayItem = (id: string) => {
    analytics.trackFoodItemRemoved({ itemId: id });
    setTrayItems((current) => current.filter((item) => item.id !== id));
  };

  const handleSelectProvider = (provider: ProviderCardItem) => {
    trackSuggestion("CLICKED", "provider", provider.slug, provider.name);
    analytics.trackProviderSelected({
      providerId: provider.slug,
      name: provider.name,
      cuisine: provider.cuisine,
    });
    sendMessage(provider.name);
  };

  const messages = useMemo(
    () =>
      sessions.find((session) => session.id === activeSessionId)?.messages ||
      [],
    [sessions, activeSessionId],
  );

  const historySessions = useMemo(
    () => sessions.filter((session) => session.messages.length > 0),
    [sessions],
  );
  const suggestionRefreshBucket = useMemo(
    () =>
      Math.floor(
        sessions.reduce(
          (count, session) =>
            count +
            session.messages.filter((message) => message.role === "user")
              .length,
          0,
        ) / 10,
      ),
    [sessions],
  );

  useEffect(() => {
    if (user?.id) void hydrate(user.id);
  }, [hydrate, user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const timer = setTimeout(
      () => {
        void apiFetch<{
          suggestions?: Array<{ key: string; label: string; type: string }>;
        }>("/api/v1/consumer/memory/suggestions")
          .then((result) => {
            const personalized = (result.suggestions || []).map(
              (item, index) => ({
                key: item.key,
                type: item.type,
                label: item.label,
                icon: (index === 0
                  ? "sparkles-outline"
                  : "restaurant-outline") as keyof typeof Ionicons.glyphMap,
                color: index === 0 ? "#A996FF" : "#46D37B",
              }),
            );
            setQuickSuggestions(
              personalized.length
                ? [...personalized, ...defaultSuggestions].slice(0, 3)
                : defaultSuggestions,
            );
            personalized.forEach((item, position) =>
              analytics.trackSuggestion({
                event: "shown",
                type: item.type || "personalized",
                personalized: true,
                position,
              }),
            );
          })
          .catch(() => setQuickSuggestions(defaultSuggestions));
      },
      suggestionRefreshBucket > 0 ? 8_000 : 0,
    );
    return () => clearTimeout(timer);
  }, [suggestionRefreshBucket, user?.id]);

  useEffect(() => {
    if (!messages.length) return;
    const timer = setTimeout(
      () => listRef.current?.scrollToEnd({ animated: true }),
      60,
    );
    return () => clearTimeout(timer);
  }, [messages.length, isLoading]);

  const [streamingDuration, setStreamingDuration] = useState<number | null>(
    null,
  );
  const streamStartRef = useRef<number | null>(null);

  useEffect(() => {
    let interval: any;
    if (isLoading && streamStartRef.current) {
      interval = setInterval(() => {
        if (streamStartRef.current) {
          setStreamingDuration((Date.now() - streamStartRef.current) / 1000);
        }
      }, 100);
    } else {
      setStreamingDuration(null);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const sendMessage = async (
    value = input,
    choices: InteractionChoice[] = selectedChoices,
    currentTray: TrayItem[] = trayItems,
  ) => {
    const offeringTrayItems = currentTray.filter(
      (i): i is Extract<TrayItem, { type: "offering" }> =>
        i.type === "offering",
    );
    const trayChoices: InteractionChoice[] = offeringTrayItems.map((item) => ({
      id: `offering:${item.providerSlug}:${item.offeringId}`,
      kind: "offering",
      title: item.title,
      price: item.price,
      currency: item.currency || "UZS",
      providerSlug: item.providerSlug,
      offeringId: item.offeringId,
      prompt: `${item.title} (${item.quantity || 1} ta)`,
      groupId: `offerings:${item.providerSlug}`,
      multiSelect: true,
    }));

    const allChoices = [...choices, ...trayChoices];
    const noteItems = currentTray.filter(
      (i): i is Extract<TrayItem, { type: "note" }> => i.type === "note",
    );
    const notesText = noteItems.map((n) => n.text).join(". ");

    const selectionText = allChoices.map(choiceLabel).join(", ");
    const promptParts = [selectionText, notesText, value.trim()].filter(
      Boolean,
    );
    const prompt = promptParts.join(". ");
    if (!prompt || isLoading) return;

    const submittedChoices = [...allChoices];
    const itemsSummary =
      offeringTrayItems.length > 0
        ? offeringTrayItems
            .map(
              (item) =>
                `${item.title}${item.quantity > 1 ? ` (${item.quantity} ta)` : ""}`,
            )
            .join(", ")
        : allChoices.map((c) => c.title).join(", ");
    const userTextParts = [itemsSummary, notesText, value.trim()].filter(
      Boolean,
    );
    const visibleUserContent = userTextParts.join("\n") || selectionText;

    const conversation = messages.slice(-16).map(({ role, content }) => ({
      role,
      content,
    }));
    setInput("");
    setSelectedChoices([]);
    setTrayItems([]);
    setLastFailed(null);
    setStreamingText("");
    setStreamingInteraction(null);
    Keyboard.dismiss();
    analytics.trackMessageSent({
      length: prompt.length,
      source: submittedChoices.length ? "tray_selection" : "composer",
      selectionCount: submittedChoices.length,
      trayItemCount: currentTray.length,
    });
    const conversationId = addMessage({
      role: "user",
      content: visibleUserContent,
      selections: submittedChoices,
    });
    setLoading(true);
    const startTime = Date.now();
    streamStartRef.current = startTime;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
      () => undefined,
    );

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const result = await streamChat(
        prompt,
        conversation,
        conversationId,
        (delta) => setStreamingText((current) => current + delta),
        (interaction) => setStreamingInteraction(interaction),
        submittedChoices,
        controller.signal,
      );
      const latencyMs = Date.now() - startTime;
      addMessage({
        role: "assistant",
        content: result.content,
        interaction: result.interaction,
        latencyMs,
      });
      analytics.trackChatResponse({
        latencyMs,
        success: true,
        interactionKind: result.interaction?.kind,
        responseLength: result.content.length,
      });
      setStreamingText("");
      setStreamingInteraction(null);
    } catch (error: any) {
      setStreamingText("");
      setStreamingInteraction(null);
      const latencyMs = Date.now() - startTime;
      if (error?.name !== "AbortError") {
        analytics.trackError(error, "chat_stream");
        analytics.trackChatResponse({ latencyMs, success: false });
        setLastFailed(prompt);
        setSelectedChoices(submittedChoices);
        addMessage({
          role: "assistant",
          content:
            error?.message ||
            "Hozir javob bera olmadim. Internetni tekshirib, qayta urinib ko‘ring.",
          latencyMs,
        });
      }
    } finally {
      abortRef.current = null;
      streamStartRef.current = null;
      setLoading(false);
    }
  };

  const selectChoice = (choice: InteractionChoice) => {
    if (isLoading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
      () => undefined,
    );
    const wasSelected = selectedChoices.some(
      (item) => item.groupId === choice.groupId && item.id === choice.id,
    );
    trackSuggestion(
      wasSelected ? "DISMISSED" : "CLICKED",
      choice.kind,
      choice.id,
      choice.title,
    );
    setSelectedChoices((current) => {
      const existing = current.some(
        (item) => item.groupId === choice.groupId && item.id === choice.id,
      );
      if (existing) {
        return current.filter(
          (item) => !(item.groupId === choice.groupId && item.id === choice.id),
        );
      }
      if (!choice.multiSelect) {
        return [
          ...current.filter((item) => item.groupId !== choice.groupId),
          choice,
        ];
      }
      return [...current, choice];
    });
  };

  const removeChoice = (choice: InteractionChoice) => {
    setSelectedChoices((current) =>
      current.filter(
        (item) => !(item.groupId === choice.groupId && item.id === choice.id),
      ),
    );
  };

  const openReport = useCallback(async () => {
    if (reportVisible) return;
    setHistoryVisible(false);
    setReportSentId(null);
    setReportError(null);
    await new Promise((resolve) => setTimeout(resolve, 80));
    try {
      const dataUrl = await captureRef(screenRef, {
        format: "jpg",
        quality: 0.65,
        result: "data-uri",
      });
      setReportScreenshot(dataUrl);
    } catch {
      setReportScreenshot(null);
    }
    setReportVisible(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(
      () => undefined,
    );
  }, [reportVisible]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    Accelerometer.setUpdateInterval(180);
    const subscription = Accelerometer.addListener(({ x, y, z }) => {
      const force = Math.sqrt(x * x + y * y + z * z);
      const now = Date.now();
      if (force > 2.35 && now - lastShakeRef.current > 1800) {
        lastShakeRef.current = now;
        void openReport();
      }
    });
    return () => subscription.remove();
  }, [openReport]);

  const submitReport = async () => {
    if (!reportText.trim() && !includeChat) return;
    setReportSending(true);
    setReportError(null);
    try {
      const report = await apiFetch<{ id: string }>(
        "/api/v1/consumer/reports",
        {
          method: "POST",
          body: JSON.stringify({
            description: reportText.trim(),
            screenshotDataUrl: reportScreenshot || undefined,
            messages: includeChat ? messages : [],
            metadata: {
              platform: Platform.OS,
              sessionId: activeSessionId || "new",
              appVersion: "1.0.0",
              capturedAt: new Date().toISOString(),
            },
          }),
        },
      );
      setReportSentId(report.id);
      setReportText("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => undefined,
      );
    } catch (error: any) {
      setReportError(error?.message || "Reportni yuborib bo‘lmadi.");
    } finally {
      setReportSending(false);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const mine = item.role === "user";
    if (mine) {
      return (
        <View style={styles.userMessage}>
          <Text style={styles.userMessageText}>{item.content}</Text>
        </View>
      );
    }

    return (
      <View style={styles.assistantBlock}>
        <View style={styles.assistantMessage}>
          <AssistantAvatar />
          <View style={styles.assistantContentWrap}>
            <ChatMarkdown content={item.content} />
            {item.latencyMs !== undefined ? (
              <View style={styles.latencyBadge}>
                <Ionicons name="timer-outline" size={12} color="#7E86A5" />
                <Text style={styles.latencyText}>
                  {(item.latencyMs / 1000).toFixed(2)}s
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {item.interaction ? (
          <View style={styles.interactionBlock}>
            {item.interaction.kind === "provider_list" ? (
              <ProviderPickerCard
                providers={item.interaction.providers || []}
                title={item.interaction.title}
                subtitle={item.interaction.subtitle}
                onSelectProvider={handleSelectProvider}
                disabled={isLoading}
              />
            ) : item.interaction.kind === "catalog_menu" ? (
              <InChatCatalogWidget
                providerSlug={item.interaction.providerSlug || "evos"}
                providerName={item.interaction.providerName || "Restoran"}
                providerLogoUrl={item.interaction.providerLogoUrl}
                locationName={item.interaction.locationName}
                categories={item.interaction.categories || []}
                sections={item.interaction.sections || []}
                onAddToCart={handleAddToCart}
                disabled={isLoading}
              />
            ) : (
              <InteractionCards
                interaction={item.interaction}
                onSelect={selectChoice}
              />
            )}
          </View>
        ) : null}
      </View>
    );
  };

  const openSession = (session: ChatSession) => {
    selectSession(session.id);
    setSelectedChoices([]);
    setInput("");
    setHistoryVisible(false);
  };

  const startNewChat = () => {
    analytics.trackNewChat();
    newChat();
    setSelectedChoices([]);
    setInput("");
    setHistoryVisible(false);
  };

  const emptyState = (
    <View style={styles.emptyState}>
      <View style={styles.hero}>
        <Ionicons name="sparkles" size={38} color="#7668F6" />
        <Text style={styles.heroEyebrow}>AI FOOD ASSISTANT</Text>
        <Text style={styles.greeting}>Bugun nima yegingiz kelyapti?</Text>
        <Text style={styles.subtitle}>
          Sevimli restoraningizni tanlang yoki xohlagan taomingizni yozing.
        </Text>
      </View>

      <View style={styles.suggestionList}>
        {quickSuggestions.map((suggestion) => (
          <Pressable
            key={suggestion.label}
            onPress={() => {
              if (suggestion.key) {
                trackSuggestion(
                  "CLICKED",
                  suggestion.type || "personalized",
                  suggestion.key,
                  suggestion.label,
                  true,
                  quickSuggestions.indexOf(suggestion),
                );
              }
              sendMessage(suggestion.label);
            }}
            style={({ pressed }) => [
              styles.suggestion,
              pressed && styles.suggestionPressed,
            ]}
          >
            <Ionicons
              name={suggestion.icon}
              size={22}
              color={suggestion.color}
            />
            <Text numberOfLines={1} style={styles.suggestionText}>
              {suggestion.label}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={theme.colors.mutedText}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView
      ref={screenRef}
      collapsable={false}
      style={styles.safe}
      edges={["top", "bottom"]}
    >
      <BrandHeader
        onOpenHistory={() => {
          analytics.trackDrawerOpened();
          setHistoryVisible(true);
        }}
        onOpenAccount={() => setAccountVisible(true)}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <FlatList
          ref={listRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={emptyState}
          ListFooterComponent={
            isLoading ? (
              streamingText || streamingInteraction ? (
                <View style={styles.assistantBlock}>
                  <View style={styles.assistantMessage}>
                    <AssistantAvatar />
                    <View style={styles.assistantContentWrap}>
                      {streamingText ? (
                        <ChatMarkdown content={streamingText} />
                      ) : null}
                      {streamingDuration !== null ? (
                        <View style={styles.latencyBadge}>
                          <Ionicons
                            name="timer-outline"
                            size={12}
                            color="#7E86A5"
                          />
                          <Text style={styles.latencyText}>
                            {streamingDuration.toFixed(1)}s…
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                  {streamingInteraction ? (
                    <View style={styles.interactionBlock}>
                      {streamingInteraction.kind === "provider_list" ? (
                        <ProviderPickerCard
                          providers={streamingInteraction.providers || []}
                          title={streamingInteraction.title}
                          subtitle={streamingInteraction.subtitle}
                          onSelectProvider={handleSelectProvider}
                          disabled
                        />
                      ) : streamingInteraction.kind === "catalog_menu" ? (
                        <InChatCatalogWidget
                          providerSlug={
                            streamingInteraction.providerSlug || "evos"
                          }
                          providerName={
                            streamingInteraction.providerName || "Restoran"
                          }
                          providerLogoUrl={streamingInteraction.providerLogoUrl}
                          locationName={streamingInteraction.locationName}
                          categories={streamingInteraction.categories || []}
                          sections={streamingInteraction.sections || []}
                          onAddToCart={handleAddToCart}
                          disabled
                        />
                      ) : (
                        <InteractionCards
                          interaction={streamingInteraction}
                          onSelect={selectChoice}
                          disabled
                        />
                      )}
                    </View>
                  ) : null}
                </View>
              ) : (
                <View style={styles.thinking}>
                  <View style={styles.pulse} />
                  <Text style={styles.thinkingText}>
                    Zayuno yozmoqda…{" "}
                    {streamingDuration !== null
                      ? `(${streamingDuration.toFixed(1)}s)`
                      : ""}
                  </Text>
                </View>
              )
            ) : lastFailed ? (
              <Pressable
                onPress={() => sendMessage(lastFailed)}
                style={styles.retry}
              >
                <Ionicons name="refresh" size={16} color="#8B7CFF" />
                <Text style={styles.retryText}>Qayta urinish</Text>
              </Pressable>
            ) : null
          }
          contentContainerStyle={[
            styles.list,
            messages.length === 0 && styles.emptyList,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />

        <View style={styles.composerShell}>
          <ContextTrayDock
            items={trayItems}
            onRemoveItem={handleRemoveTrayItem}
          />
          {selectedChoices.length > 0 && trayItems.length === 0 ? (
            <SelectionTray choices={selectedChoices} onRemove={removeChoice} />
          ) : null}

          <View style={styles.composer}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Xabar yozing…"
              placeholderTextColor={theme.colors.mutedText}
              style={styles.input}
              multiline
              submitBehavior="submit"
              onSubmitEditing={() => sendMessage()}
              maxLength={1200}
              accessibilityLabel="Zayunoga xabar yozish"
            />

            <Pressable
              accessibilityLabel={
                isLoading ? "Javobni to‘xtatish" : "Xabarni yuborish"
              }
              disabled={
                !isLoading &&
                !input.trim() &&
                !selectedChoices.length &&
                !trayItems.length
              }
              onPress={() =>
                isLoading ? abortRef.current?.abort() : sendMessage()
              }
              style={({ pressed }) => [
                styles.sendButton,
                !isLoading &&
                  !input.trim() &&
                  !selectedChoices.length &&
                  !trayItems.length &&
                  styles.sendDisabled,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name={isLoading ? "stop" : "paper-plane"}
                size={20}
                color={
                  isLoading ||
                  input.trim() ||
                  selectedChoices.length ||
                  trayItems.length
                    ? "#FFFFFF"
                    : "#657087"
                }
              />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={historyVisible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => setHistoryVisible(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            accessibilityLabel="Chatlar tarixini yopish"
            onPress={() => setHistoryVisible(false)}
            style={styles.modalBackdrop}
          />
          <SafeAreaView style={styles.historyPanel} edges={["top", "bottom"]}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>Chatlar</Text>
              <Pressable
                accessibilityLabel="Yangi chat"
                hitSlop={10}
                onPress={startNewChat}
                style={styles.historyIconButton}
              >
                <Ionicons name="create-outline" size={24} color="#8B7CFF" />
              </Pressable>
            </View>

            <FlatList
              data={historySessions}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.historyList}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.historyEmpty}>
                  <Text style={styles.historyEmptyTitle}>
                    Hali chatlar yo‘q
                  </Text>
                  <Text style={styles.historyEmptyCopy}>
                    Yangi suhbat boshlashingiz mumkin.
                  </Text>
                </View>
              }
              renderItem={({ item }) => (
                <View style={styles.historyRow}>
                  <Pressable
                    onPress={() => openSession(item)}
                    style={({ pressed }) => [
                      styles.historyRowContent,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.historyChatIcon}>
                      <Ionicons
                        name="chatbubble-outline"
                        size={17}
                        color="#8B7CFF"
                      />
                    </View>
                    <View style={styles.historyRowText}>
                      <Text numberOfLines={1} style={styles.historyRowTitle}>
                        {item.title}
                      </Text>
                      <Text numberOfLines={1} style={styles.historyRowPreview}>
                        {item.messages[item.messages.length - 1]?.content}
                      </Text>
                    </View>
                    <Text style={styles.historyTime}>
                      {formatTime(item.updatedAt)}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityLabel="Chatni o‘chirish"
                    hitSlop={8}
                    onPress={() => deleteSession(item.id)}
                    style={styles.historyDeleteButton}
                  >
                    <Ionicons name="trash-outline" size={17} color="#687085" />
                  </Pressable>
                </View>
              )}
            />
            <Pressable
              accessibilityLabel="Joriy chatni supportga yuborish"
              onPress={() => void openReport()}
              style={({ pressed }) => [
                styles.reportEntry,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="bug-outline" size={20} color="#8B7CFF" />
              <View style={styles.reportEntryText}>
                <Text style={styles.reportEntryTitle}>Muammo haqida xabar</Text>
                <Text style={styles.reportEntryCopy}>
                  Screenshot va chatni supportga yuboring
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#687085" />
            </Pressable>
            <Pressable
              accessibilityLabel="Profil va sozlamalarni ochish"
              onPress={() => {
                setHistoryVisible(false);
                setAccountVisible(true);
              }}
              style={({ pressed }) => [
                styles.accountEntry,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.accountEntryIcon}>
                <Ionicons name="person-outline" size={19} color="#9B8DFF" />
              </View>
              <View style={styles.reportEntryText}>
                <Text style={styles.reportEntryTitle}>
                  Profil va sozlamalar
                </Text>
                <Text style={styles.reportEntryCopy}>
                  Sessiya, maxfiylik va hisob boshqaruvi
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#687085" />
            </Pressable>
          </SafeAreaView>
        </View>
      </Modal>

      <AccountSheet
        visible={accountVisible}
        onClose={() => setAccountVisible(false)}
      />

      <Modal
        visible={reportVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setReportVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.reportModalRoot}
        >
          <Pressable
            accessibilityLabel="Report oynasini yopish"
            onPress={() => setReportVisible(false)}
            style={styles.reportBackdrop}
          />
          <SafeAreaView style={styles.reportSheet} edges={["bottom"]}>
            <View style={styles.sheetHandle} />
            <View style={styles.reportTitleRow}>
              <View style={styles.reportIcon}>
                <Ionicons name="bug-outline" size={22} color="#9B82FF" />
              </View>
              <View style={styles.reportHeadingWrap}>
                <Text style={styles.reportTitle}>Muammo haqida xabar</Text>
                <Text style={styles.reportSubtitle}>
                  Tafsilotlar yechimni tez topishimizga yordam beradi.
                </Text>
              </View>
            </View>

            {reportSentId ? (
              <View style={styles.reportSuccess}>
                <Ionicons name="checkmark-circle" size={24} color="#46D37B" />
                <Text style={styles.reportSuccessText}>
                  Report qabul qilindi: {reportSentId}
                </Text>
              </View>
            ) : (
              <>
                <TextInput
                  value={reportText}
                  onChangeText={setReportText}
                  multiline
                  maxLength={4000}
                  placeholder="Nima bo‘ldi? Qaysi natijani kutgandingiz?"
                  placeholderTextColor="#737B95"
                  style={styles.reportInput}
                  accessibilityLabel="Muammo tavsifi"
                />
                <View style={styles.reportOption}>
                  <View style={styles.reportOptionText}>
                    <Text style={styles.reportOptionTitle}>
                      Chat tarixini biriktirish
                    </Text>
                    <Text style={styles.reportOptionCopy}>
                      Support kontekst va javob vaqtlarini ko‘radi
                    </Text>
                  </View>
                  <Switch
                    value={includeChat}
                    onValueChange={setIncludeChat}
                    trackColor={{ false: "#2A3042", true: "#5B4ED6" }}
                    thumbColor={includeChat ? "#A997FF" : "#8A91A6"}
                  />
                </View>
                <View style={styles.attachmentRow}>
                  <Ionicons
                    name={reportScreenshot ? "image" : "image-outline"}
                    size={18}
                    color={reportScreenshot ? "#46D37B" : "#7E86A5"}
                  />
                  <Text style={styles.attachmentText}>
                    {reportScreenshot
                      ? "Joriy ekran biriktirildi"
                      : "Screenshot olinmadi"}
                  </Text>
                </View>
                {reportError ? (
                  <Text style={styles.reportError}>{reportError}</Text>
                ) : null}
                <Pressable
                  disabled={
                    reportSending || (!reportText.trim() && !includeChat)
                  }
                  onPress={() => void submitReport()}
                  style={({ pressed }) => [
                    styles.reportButton,
                    (reportSending || (!reportText.trim() && !includeChat)) &&
                      styles.reportButtonDisabled,
                    pressed && styles.pressed,
                  ]}
                >
                  {reportSending ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.reportButtonText}>
                      Supportga yuborish
                    </Text>
                  )}
                </Pressable>
              </>
            )}
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: "#060916" },
  pressed: { opacity: 0.72 },
  header: {
    height: 70,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerSpacer: { width: 44, height: 44 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 11 },
  brandMark: { width: 31, height: 31, borderRadius: 8 },
  brandName: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 5,
  },
  list: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12 },
  emptyList: { flexGrow: 1 },
  emptyState: { flex: 1, justifyContent: "flex-end" },
  hero: { flex: 1, alignItems: "center", justifyContent: "center" },
  greeting: {
    marginTop: 19,
    color: theme.colors.text,
    fontSize: 27,
    lineHeight: 34,
    fontWeight: "400",
    letterSpacing: -0.35,
    textAlign: "center",
  },
  subtitle: {
    marginTop: 10,
    color: theme.colors.secondaryText,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  heroEyebrow: {
    color: "#9186FF",
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  suggestionList: { gap: 9, paddingBottom: 8 },
  suggestion: {
    height: 58,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(126,134,165,0.22)",
    backgroundColor: "rgba(8,12,25,0.72)",
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  suggestionPressed: {
    backgroundColor: "rgba(18,24,43,0.9)",
    borderColor: "rgba(124,103,255,0.4)",
  },
  suggestionText: {
    flex: 1,
    color: "#E7E9F1",
    fontSize: 14,
    lineHeight: 19,
  },
  userMessage: {
    alignSelf: "flex-end",
    maxWidth: "84%",
    marginVertical: 6,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    backgroundColor: "#315CFF",
    flexGrow: 0,
    flexShrink: 1,
  },
  userMessageText: { color: "#FFFFFF", fontSize: 14, lineHeight: 20 },
  assistantBlock: {
    width: "100%",
    marginVertical: 4,
  },
  assistantMessage: {
    width: "100%",
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  assistantAvatarBadge: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: "rgba(20, 24, 44, 0.95)",
    borderWidth: 1,
    borderColor: "rgba(120, 104, 246, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  assistantAvatarImage: {
    width: 17,
    height: 17,
    resizeMode: "contain",
  },
  assistantContentWrap: { flex: 1 },
  interactionBlock: {
    width: "100%",
    marginTop: 8,
    marginBottom: 4,
  },
  latencyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  latencyText: {
    fontSize: 11,
    color: "#7E86A5",
    fontWeight: "500",
  },
  thinking: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingVertical: 13,
  },
  pulse: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#7868FF" },
  thinkingText: { color: theme.colors.secondaryText, fontSize: 12 },
  retry: {
    flexDirection: "row",
    gap: 7,
    alignItems: "center",
    paddingVertical: 8,
  },
  retryText: { color: "#8B7CFF", fontSize: 12 },
  composerShell: {
    paddingHorizontal: 12,
    paddingTop: 7,
    paddingBottom: 8,
    backgroundColor: "#060916",
  },
  composer: {
    minHeight: 61,
    maxHeight: 122,
    borderRadius: 29,
    borderWidth: 1,
    borderColor: "rgba(126,134,165,0.42)",
    backgroundColor: "rgba(20,25,44,0.88)",
    flexDirection: "row",
    alignItems: "flex-end",
    paddingLeft: 18,
    paddingRight: 7,
    paddingVertical: 6,
  },
  input: {
    flex: 1,
    minHeight: 47,
    maxHeight: 108,
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 21,
    paddingTop: 12,
    paddingBottom: 10,
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#4B3AE0",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
    marginBottom: 2,
  },
  sendDisabled: { opacity: 0.45 },
  modalRoot: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "rgba(0,2,10,0.54)",
  },
  modalBackdrop: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  historyPanel: {
    width: "84%",
    maxWidth: 390,
    height: "100%",
    backgroundColor: "#080B18",
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: "rgba(126,134,165,0.28)",
  },
  historyHeader: {
    height: 70,
    paddingLeft: 20,
    paddingRight: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(126,134,165,0.18)",
  },
  historyTitle: { color: theme.colors.text, fontSize: 17, fontWeight: "600" },
  historyIconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  historyList: { paddingHorizontal: 16, paddingVertical: 8, flexGrow: 1 },
  historyRow: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(126,134,165,0.16)",
  },
  historyRowContent: {
    flex: 1,
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  historyChatIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(107,87,255,0.11)",
  },
  historyRowText: { flex: 1 },
  historyRowTitle: { color: "#EFF1F7", fontSize: 13, fontWeight: "500" },
  historyRowPreview: {
    color: theme.colors.secondaryText,
    fontSize: 11,
    marginTop: 4,
  },
  historyTime: { color: theme.colors.mutedText, fontSize: 10, marginLeft: 6 },
  historyDeleteButton: {
    width: 36,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  historyEmpty: { flex: 1, alignItems: "center", justifyContent: "center" },
  historyEmptyTitle: { color: "#E7E9F1", fontSize: 15, fontWeight: "500" },
  historyEmptyCopy: {
    color: theme.colors.secondaryText,
    fontSize: 12,
    marginTop: 7,
  },
  reportEntry: {
    minHeight: 72,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 15,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "rgba(126,134,165,0.22)",
    backgroundColor: "rgba(107,87,255,0.08)",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  reportEntryText: { flex: 1 },
  reportEntryTitle: { color: "#F1F2F7", fontSize: 13, fontWeight: "600" },
  reportEntryCopy: { color: "#838BA3", fontSize: 11, marginTop: 3 },
  accountEntry: {
    minHeight: 58,
    marginHorizontal: 16,
    marginBottom: 13,
    paddingHorizontal: 14,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    backgroundColor: "rgba(255,255,255,0.025)",
  },
  accountEntryIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(107,87,255,0.12)",
  },
  reportModalRoot: { flex: 1, justifyContent: "flex-end" },
  reportBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,2,10,0.72)",
  },
  reportSheet: {
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 18,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: "rgba(126,134,165,0.24)",
    backgroundColor: "#0B0F1C",
  },
  sheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
    backgroundColor: "#687085",
  },
  reportTitleRow: { flexDirection: "row", alignItems: "flex-start", gap: 13 },
  reportIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(107,87,255,0.14)",
  },
  reportHeadingWrap: { flex: 1 },
  reportTitle: { color: "#F5F6FA", fontSize: 19, fontWeight: "700" },
  reportSubtitle: {
    color: "#8D95AA",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 5,
  },
  reportInput: {
    minHeight: 118,
    maxHeight: 210,
    marginTop: 20,
    paddingHorizontal: 15,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(126,134,165,0.3)",
    backgroundColor: "#111625",
    color: "#F1F2F7",
    fontSize: 14,
    lineHeight: 20,
    textAlignVertical: "top",
  },
  reportOption: {
    minHeight: 68,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  reportOptionText: { flex: 1, paddingRight: 12 },
  reportOptionTitle: { color: "#E9EAF1", fontSize: 13, fontWeight: "600" },
  reportOptionCopy: { color: "#7E86A5", fontSize: 11, marginTop: 4 },
  attachmentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  attachmentText: { color: "#8D95AA", fontSize: 11 },
  reportError: { color: "#FF7A90", fontSize: 12, marginBottom: 12 },
  reportButton: {
    height: 54,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#5368F7",
  },
  reportButtonDisabled: { opacity: 0.45 },
  reportButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  reportSuccess: {
    minHeight: 110,
    marginTop: 20,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "rgba(70,211,123,0.08)",
  },
  reportSuccessText: { color: "#D9FBE6", fontSize: 13, textAlign: "center" },
});
