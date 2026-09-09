import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "./primitives/Text";
import { apiFetch } from "../lib/api";

type Signal = {
  id: string;
  kind: string;
  label: string;
  value: unknown;
  confidence: number;
  source: string;
  lastSeenAt: string;
  expiresAt: string | null;
};

type MemoryResponse = {
  enabled: boolean;
  summary?: { text?: string };
  signals: Signal[];
  stats: {
    analyzedMessages: number;
    pendingMessages: number;
    nextAnalysisIn: number | null;
  };
};

type Props = {
  visible: boolean;
  onClose: () => void;
};

const KIND_LABELS: Record<string, string> = {
  INTEREST: "Qiziqish",
  PROVIDER_PREFERENCE: "Sevimli restoran",
  OFFERING_PREFERENCE: "Sevimli taom",
  BUDGET: "Budjet",
  DIETARY_PREFERENCE: "Taom talabi",
  FULFILLMENT_PREFERENCE: "Yetkazish usuli",
  LANGUAGE_STYLE: "Muloqot uslubi",
  ACTIVITY_WINDOW: "Faol vaqt",
  ORDER_PATTERN: "Buyurtma odati",
  DISLIKE: "Yoqtirmaydi",
};

export function MemorySheet({ visible, onClose }: Props) {
  const [memory, setMemory] = useState<MemoryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Signal | null>(null);
  const [editValue, setEditValue] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      setMemory(await apiFetch<MemoryResponse>("/api/v1/consumer/memory"));
    } catch {
      Alert.alert(
        "Xotirani yuklab bo‘lmadi",
        "Internetni tekshirib, qayta urinib ko‘ring.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) void load();
  }, [visible]);

  const changeConsent = (enabled: boolean) => {
    Alert.alert(
      enabled
        ? "Aqlli tavsiyalarni yoqasizmi?"
        : "Aqlli tavsiyalarni o‘chirasizmi?",
      enabled
        ? "Rozilik bersangiz, Zayuno chat va tanlovlaringizdan taom, restoran, budjet va foydalanish odatlarini o‘rganadi. Karta, OTP, parol, telefon va aniq manzil memory profiliga kiritilmaydi. Istalgan payt ko‘rish va o‘chirish mumkin."
        : "Personalization to‘xtaydi va hosil qilingan memory profili o‘chiriladi. Chat tarixingiz saqlanib qoladi.",
      [
        { text: "Bekor qilish", style: "cancel" },
        {
          text: enabled ? "Roziman, yoqilsin" : "O‘chirish",
          style: enabled ? "default" : "destructive",
          onPress: () => {
            setBusy(true);
            void apiFetch<MemoryResponse>("/api/v1/consumer/memory/consent", {
              method: "PUT",
              body: JSON.stringify({ enabled }),
            })
              .then(setMemory)
              .catch(() => Alert.alert("Xatolik", "Sozlamani saqlab bo‘lmadi."))
              .finally(() => setBusy(false));
          },
        },
      ],
    );
  };

  const forgetSignal = (signal: Signal) => {
    Alert.alert("Buni unutish", `“${signal.label}” xotiradan o‘chirilsinmi?`, [
      { text: "Bekor qilish", style: "cancel" },
      {
        text: "Unutish",
        style: "destructive",
        onPress: () => {
          setBusy(true);
          void apiFetch(
            `/api/v1/consumer/memory/signals/${encodeURIComponent(signal.id)}`,
            {
              method: "DELETE",
            },
          )
            .then(load)
            .finally(() => setBusy(false));
        },
      },
    ]);
  };

  const saveEdit = () => {
    if (!editing || !editValue.trim()) return;
    setBusy(true);
    void apiFetch<MemoryResponse>(
      `/api/v1/consumer/memory/signals/${encodeURIComponent(editing.id)}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          label: editValue.trim(),
          value: editValue.trim(),
        }),
      },
    )
      .then((next) => {
        setMemory(next);
        setEditing(null);
      })
      .catch(() =>
        Alert.alert(
          "Saqlanmadi",
          "Bu qiymat memory uchun mos emas yoki server javob bermadi.",
        ),
      )
      .finally(() => setBusy(false));
  };

  const clearAll = () => {
    Alert.alert(
      "Barcha xotirani tozalash",
      "Hosil qilingan profil va suggestion signallari o‘chadi. Chat tarixingiz o‘chmaydi.",
      [
        { text: "Bekor qilish", style: "cancel" },
        {
          text: "Hammasini tozalash",
          style: "destructive",
          onPress: () => {
            setBusy(true);
            void apiFetch("/api/v1/consumer/memory", { method: "DELETE" })
              .then(load)
              .finally(() => setBusy(false));
          },
        },
      ],
    );
  };

  const exportMemory = () => {
    setBusy(true);
    void apiFetch<Record<string, unknown>>("/api/v1/consumer/memory/export")
      .then((data) =>
        Share.share({
          title: "Zayuno xotiram",
          message: JSON.stringify(data, null, 2),
        }),
      )
      .catch(() =>
        Alert.alert("Eksport tayyorlanmadi", "Qayta urinib ko‘ring."),
      )
      .finally(() => setBusy(false));
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={onClose}
      >
        <View style={styles.root}>
          <Pressable
            style={styles.backdrop}
            onPress={onClose}
            accessibilityLabel="Xotirani yopish"
          />
          <SafeAreaView style={styles.sheet} edges={["bottom"]}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>Zayuno xotirasi</Text>
                <Text style={styles.subtitle}>Tavsiyalar sizga moslashadi</Text>
              </View>
              <Pressable
                onPress={onClose}
                style={styles.close}
                accessibilityLabel="Yopish"
              >
                <Ionicons name="close" size={23} color="#A7AEC1" />
              </Pressable>
            </View>

            {loading && !memory ? (
              <View style={styles.loading}>
                <ActivityIndicator color="#8B7CFF" />
              </View>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.content}
              >
                <View style={styles.consentCard}>
                  <View style={styles.consentIcon}>
                    <Ionicons name="sparkles" size={21} color="#B5AAFF" />
                  </View>
                  <View style={styles.consentCopy}>
                    <Text style={styles.consentTitle}>
                      Aqlli personalization
                    </Text>
                    <Text style={styles.consentText}>
                      {memory?.enabled
                        ? "Yoqilgan — faqat foydali preference signallari ishlatiladi"
                        : "O‘chiq — chatlar profilingizni o‘zgartirmaydi"}
                    </Text>
                  </View>
                  <Switch
                    value={Boolean(memory?.enabled)}
                    disabled={busy}
                    onValueChange={changeConsent}
                    trackColor={{ false: "#30364A", true: "#6558D9" }}
                    thumbColor="#F5F3FF"
                  />
                </View>

                {memory?.enabled ? (
                  <>
                    <View style={styles.summaryCard}>
                      <Text style={styles.eyebrow}>SIZ UCHUN O‘RGANILGAN</Text>
                      <Text style={styles.summary}>
                        {memory.summary?.text ||
                          "10 ta yangi xabardan keyin birinchi foydali profil tayyor bo‘ladi."}
                      </Text>
                      <Text style={styles.progress}>
                        Tahlil qilingan: {memory.stats.analyzedMessages} ·
                        Keyingi yangilanishgacha:{" "}
                        {memory.stats.nextAnalysisIn ?? 0} ta xabar
                      </Text>
                    </View>

                    <View style={styles.sectionHead}>
                      <Text style={styles.sectionTitle}>Memory signallari</Text>
                      <Text style={styles.sectionCount}>
                        {memory.signals.length}
                      </Text>
                    </View>
                    {memory.signals.length ? (
                      memory.signals.map((signal) => (
                        <View key={signal.id} style={styles.signalRow}>
                          <View style={styles.signalIcon}>
                            <Ionicons
                              name="bulb-outline"
                              size={18}
                              color="#A697FF"
                            />
                          </View>
                          <View style={styles.signalCopy}>
                            <Text style={styles.signalKind}>
                              {KIND_LABELS[signal.kind] || "Afzallik"}
                            </Text>
                            <Text style={styles.signalLabel}>
                              {signal.label}
                            </Text>
                            <Text style={styles.confidence}>
                              {Math.round(signal.confidence * 100)}% ishonch ·{" "}
                              {signal.source === "USER_EDITED"
                                ? "siz tuzatgansiz"
                                : "chatlardan"}
                            </Text>
                          </View>
                          <Pressable
                            onPress={() => {
                              setEditing(signal);
                              setEditValue(signal.label);
                            }}
                            style={styles.miniButton}
                            accessibilityLabel="Xotirani tahrirlash"
                          >
                            <Ionicons
                              name="pencil-outline"
                              size={17}
                              color="#9CA4BA"
                            />
                          </Pressable>
                          <Pressable
                            onPress={() => forgetSignal(signal)}
                            style={styles.miniButton}
                            accessibilityLabel="Xotirani unutish"
                          >
                            <Ionicons
                              name="close-circle-outline"
                              size={18}
                              color="#E28A9A"
                            />
                          </Pressable>
                        </View>
                      ))
                    ) : (
                      <View style={styles.empty}>
                        <Ionicons
                          name="hourglass-outline"
                          size={22}
                          color="#787F96"
                        />
                        <Text style={styles.emptyText}>
                          Hali yetarli signal yo‘q. Zayuno har 10 ta yangi
                          xabardan keyin profilni yangilaydi.
                        </Text>
                      </View>
                    )}

                    <Pressable
                      onPress={exportMemory}
                      style={({ pressed }) => [
                        styles.exportButton,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Ionicons
                        name="share-outline"
                        size={17}
                        color="#A99DFF"
                      />
                      <Text style={styles.exportText}>
                        Xotiramni eksport qilish
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={clearAll}
                      style={({ pressed }) => [
                        styles.clearButton,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={17}
                        color="#FF879A"
                      />
                      <Text style={styles.clearText}>Memory’ni tozalash</Text>
                    </Pressable>
                  </>
                ) : (
                  <View style={styles.infoCard}>
                    <Text style={styles.infoTitle}>Siz boshqarasiz</Text>
                    <Text style={styles.infoText}>
                      Yoqilganda Zayuno takroriy tanlovlaringizni eslab, mos
                      restoran va taomlarni yuqoriroq chiqaradi. Sensitive
                      ma’lumot va yashirin xarakter tahlili qilinmaydi.
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}
            {busy ? (
              <View style={styles.busy}>
                <ActivityIndicator color="#8B7CFF" />
                <Text style={styles.busyText}>Saqlanmoqda…</Text>
              </View>
            ) : null}
          </SafeAreaView>
        </View>
      </Modal>

      <Modal
        visible={Boolean(editing)}
        transparent
        animationType="fade"
        onRequestClose={() => setEditing(null)}
      >
        <View style={styles.editorRoot}>
          <Pressable
            style={styles.editorBackdrop}
            onPress={() => setEditing(null)}
          />
          <View style={styles.editorCard}>
            <Text style={styles.editorTitle}>Xotirani tuzatish</Text>
            <Text style={styles.editorHint}>
              Zayuno nimani eslab qolishini aniq yozing.
            </Text>
            <TextInput
              value={editValue}
              onChangeText={setEditValue}
              autoFocus
              maxLength={120}
              placeholder="Masalan: Achchiq ovqat yoqmaydi"
              placeholderTextColor="#626B82"
              style={styles.input}
            />
            <View style={styles.editorActions}>
              <Pressable
                onPress={() => setEditing(null)}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelText}>Bekor qilish</Text>
              </Pressable>
              <Pressable onPress={saveEdit} style={styles.saveButton}>
                <Text style={styles.saveText}>Saqlash</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,2,10,0.78)",
  },
  sheet: {
    height: "88%",
    paddingHorizontal: 20,
    paddingTop: 10,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: "rgba(126,134,165,0.25)",
    backgroundColor: "#090D1B",
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 14,
    backgroundColor: "#4F586F",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: { color: "#F5F6FA", fontSize: 22, fontWeight: "800" },
  subtitle: { color: "#7F879D", fontSize: 11, marginTop: 3 },
  close: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: "#121727",
  },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { paddingBottom: 30 },
  consentCard: {
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(126,108,255,0.32)",
    backgroundColor: "rgba(92,73,226,0.12)",
  },
  consentIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(117,99,255,0.18)",
  },
  consentCopy: { flex: 1, marginHorizontal: 11 },
  consentTitle: { color: "#F2F1FA", fontSize: 14, fontWeight: "700" },
  consentText: { color: "#969DB1", fontSize: 10, lineHeight: 14, marginTop: 3 },
  summaryCard: {
    marginTop: 15,
    padding: 16,
    borderRadius: 20,
    backgroundColor: "#111728",
  },
  eyebrow: {
    color: "#756BE4",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  summary: { color: "#E9EAF1", fontSize: 14, lineHeight: 21, marginTop: 9 },
  progress: { color: "#747D94", fontSize: 9, marginTop: 11 },
  sectionHead: {
    marginTop: 21,
    marginBottom: 9,
    flexDirection: "row",
    alignItems: "center",
  },
  sectionTitle: { color: "#DADCE6", fontSize: 13, fontWeight: "700" },
  sectionCount: {
    marginLeft: 7,
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 2,
    textAlign: "center",
    borderRadius: 8,
    overflow: "hidden",
    color: "#9186F3",
    fontSize: 9,
    backgroundColor: "rgba(115,96,255,0.12)",
  },
  signalRow: {
    minHeight: 72,
    marginBottom: 8,
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "rgba(126,134,165,0.16)",
    backgroundColor: "#0E1322",
  },
  signalIcon: {
    width: 35,
    height: 35,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(112,91,255,0.10)",
  },
  signalCopy: { flex: 1, marginLeft: 10 },
  signalKind: {
    color: "#707990",
    fontSize: 8,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  signalLabel: {
    color: "#E5E7EF",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  confidence: { color: "#687187", fontSize: 8, marginTop: 4 },
  miniButton: {
    width: 32,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    padding: 22,
    alignItems: "center",
    borderRadius: 18,
    backgroundColor: "#0E1322",
  },
  emptyText: {
    color: "#7D859A",
    textAlign: "center",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 8,
  },
  infoCard: {
    marginTop: 15,
    padding: 17,
    borderRadius: 19,
    backgroundColor: "#0E1322",
  },
  infoTitle: { color: "#E8E9F0", fontSize: 14, fontWeight: "700" },
  infoText: { color: "#858DA2", fontSize: 11, lineHeight: 18, marginTop: 7 },
  exportButton: {
    marginTop: 16,
    height: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: 15,
    backgroundColor: "rgba(112,91,255,0.10)",
  },
  exportText: { color: "#A99DFF", fontSize: 12, fontWeight: "700" },
  clearButton: {
    marginTop: 8,
    height: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: 15,
    backgroundColor: "rgba(255,95,120,0.09)",
  },
  clearText: { color: "#FF879A", fontSize: 12, fontWeight: "700" },
  pressed: { opacity: 0.7 },
  busy: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 24,
    height: 48,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#181D30",
  },
  busyText: { color: "#BCC2D1", fontSize: 11 },
  editorRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  editorBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,2,10,0.82)",
  },
  editorCard: {
    width: "100%",
    maxWidth: 420,
    padding: 20,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(126,134,165,0.25)",
    backgroundColor: "#101525",
  },
  editorTitle: { color: "#F2F3F7", fontSize: 18, fontWeight: "800" },
  editorHint: { color: "#858DA2", fontSize: 11, marginTop: 5 },
  input: {
    height: 49,
    marginTop: 15,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#30384E",
    color: "#F2F3F7",
    backgroundColor: "#090D1B",
  },
  editorActions: {
    marginTop: 15,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 9,
  },
  cancelButton: {
    height: 42,
    paddingHorizontal: 15,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: "#1B2132",
  },
  cancelText: { color: "#A8AFC1", fontSize: 12, fontWeight: "600" },
  saveButton: {
    height: 42,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: "#6658DB",
  },
  saveText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
});
