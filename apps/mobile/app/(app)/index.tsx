import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Text } from "../../src/components/primitives/Text";
import {
  ChatMessage,
  ChatSession,
  useChatStore,
} from "../../src/store/chatStore";
import { streamChat } from "../../src/lib/api";
import { theme } from "../../src/theme";

const suggestions = [
  {
    label: "Bugun nima ovqat buyurtma qilsam bo‘ladi?",
    icon: "restaurant-outline" as const,
    color: "#FF9D45",
  },
  {
    label: "Ertaga soat 10:00 da shifokor qabuliga yozil",
    icon: "calendar-outline" as const,
    color: "#46D37B",
  },
  {
    label: "Toshkentdan Samarqandga chipta top",
    icon: "ticket-outline" as const,
    color: "#B05CFF",
  },
  {
    label: "Yaqin atrofdagi dorixonalarni ko‘rsat",
    icon: "location-outline" as const,
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

function BrandHeader({ onOpenHistory }: { onOpenHistory: () => void }) {
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

      <View style={styles.headerSpacer} />
    </View>
  );
}

export default function HomeScreen() {
  const [input, setInput] = useState("");
  const [lastFailed, setLastFailed] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState("");
  const [historyVisible, setHistoryVisible] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const {
    sessions,
    activeSessionId,
    isLoading,
    isHydrated,
    hydrate,
    newChat,
    selectSession,
    deleteSession,
    addMessage,
    setLoading,
  } = useChatStore();

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

  useEffect(() => {
    if (!isHydrated) hydrate();
  }, [hydrate, isHydrated]);

  useEffect(() => {
    if (!messages.length) return;
    const timer = setTimeout(
      () => listRef.current?.scrollToEnd({ animated: true }),
      60,
    );
    return () => clearTimeout(timer);
  }, [messages.length, isLoading]);

  const [streamingDuration, setStreamingDuration] = useState<number | null>(null);
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

  const sendMessage = async (value = input) => {
    const prompt = value.trim();
    if (!prompt || isLoading) return;

    const conversation = messages.slice(-16).map(({ role, content }) => ({
      role,
      content,
    }));
    setInput("");
    setLastFailed(null);
    setStreamingText("");
    Keyboard.dismiss();
    addMessage({ role: "user", content: prompt });
    setLoading(true);
    const startTime = Date.now();
    streamStartRef.current = startTime;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
      () => undefined,
    );

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const content = await streamChat(
        prompt,
        conversation,
        (delta) => setStreamingText((current) => current + delta),
        controller.signal,
      );
      const latencyMs = Date.now() - startTime;
      addMessage({ role: "assistant", content, latencyMs });
      setStreamingText("");
    } catch (error: any) {
      setStreamingText("");
      const latencyMs = Date.now() - startTime;
      if (error?.name !== "AbortError") {
        setLastFailed(prompt);
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
      <View style={styles.assistantMessage}>
        <Ionicons name="sparkles" size={17} color="#8376FF" />
        <View style={styles.assistantContentWrap}>
          <Text style={styles.assistantText}>{item.content}</Text>
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
    );
  };

  const openSession = (session: ChatSession) => {
    selectSession(session.id);
    setHistoryVisible(false);
  };

  const startNewChat = () => {
    newChat();
    setHistoryVisible(false);
  };

  const emptyState = (
    <View style={styles.emptyState}>
      <View style={styles.hero}>
        <Ionicons name="sparkles" size={38} color="#7668F6" />
        <Text style={styles.greeting}>Assalomu alaykum!</Text>
        <Text style={styles.subtitle}>
          Zayuno sizga qanday yordam berishi mumkin?
        </Text>
      </View>

      <View style={styles.suggestionList}>
        {suggestions.map((suggestion) => (
          <Pressable
            key={suggestion.label}
            onPress={() => sendMessage(suggestion.label)}
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
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <BrandHeader onOpenHistory={() => setHistoryVisible(true)} />
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
              streamingText ? (
                <View style={styles.assistantMessage}>
                  <Ionicons name="sparkles" size={17} color="#8376FF" />
                  <View style={styles.assistantContentWrap}>
                    <Text style={styles.assistantText}>{streamingText}</Text>
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
              disabled={!isLoading && !input.trim()}
              onPress={() =>
                isLoading ? abortRef.current?.abort() : sendMessage()
              }
              style={({ pressed }) => [
                styles.sendButton,
                !isLoading && !input.trim() && styles.sendDisabled,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name={isLoading ? "stop" : "paper-plane-outline"}
                size={23}
                color={isLoading || input.trim() ? "#9B82FF" : "#657087"}
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
                  <Text style={styles.historyEmptyTitle}>Hali chatlar yo‘q</Text>
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
          </SafeAreaView>
        </View>
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
    paddingHorizontal: 20,
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
  list: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12 },
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
    marginVertical: 7,
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderRadius: 19,
    borderBottomRightRadius: 6,
    backgroundColor: "#315CFF",
  },
  userMessageText: { color: "#FFFFFF", fontSize: 14, lineHeight: 20 },
  assistantMessage: {
    width: "100%",
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  assistantContentWrap: { flex: 1 },
  assistantText: {
    color: "#E8EAF2",
    fontSize: 14,
    lineHeight: 21,
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
    paddingHorizontal: 20,
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
    width: 49,
    height: 49,
    borderRadius: 24,
    backgroundColor: "rgba(92,72,173,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  sendDisabled: { opacity: 0.72 },
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
});
