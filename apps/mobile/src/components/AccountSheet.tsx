import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "./primitives/Text";
import { apiFetch } from "../lib/api";
import { publicLinks } from "../lib/config";
import { useAuthStore } from "../store/authStore";
import { MemorySheet } from "./MemorySheet";

type Props = { visible: boolean; onClose: () => void };

export function AccountSheet({ visible, onClose }: Props) {
  const { user, logout } = useAuthStore();
  const [busy, setBusy] = useState(false);
  const [memoryVisible, setMemoryVisible] = useState(false);
  const initials = (user?.name || user?.email || "Z")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  const confirmLogout = () => {
    Alert.alert(
      "Hisobdan chiqasizmi?",
      "Chatlaringiz hisobingizda saqlanadi va qayta kirganda tiklanadi.",
      [
        { text: "Bekor qilish", style: "cancel" },
        {
          text: "Chiqish",
          style: "destructive",
          onPress: () => {
            setBusy(true);
            void logout().finally(() => {
              setBusy(false);
              onClose();
            });
          },
        },
      ],
    );
  };

  const confirmDelete = () => {
    Alert.alert(
      "Hisobni o‘chirish so‘rovi",
      "Bu oddiy logout emas. Tasdiqlangan so‘rovdan keyin profil, chat va buyurtma ma’lumotlari o‘chiriladi. Keyingi sahifada yana tasdiqlaysiz.",
      [
        { text: "Bekor qilish", style: "cancel" },
        {
          text: "Davom etish",
          style: "destructive",
          onPress: () => void Linking.openURL(publicLinks.accountDeletion),
        },
      ],
    );
  };

  const logoutEverywhere = () => {
    Alert.alert(
      "Barcha qurilmalardan chiqish",
      "Zayuno barcha telefon va brauzerlardagi faol sessiyalarni yopadi.",
      [
        { text: "Bekor qilish", style: "cancel" },
        {
          text: "Hammasidan chiqish",
          style: "destructive",
          onPress: () => {
            setBusy(true);
            void apiFetch("/api/v1/consumer/auth/revoke-all", {
              method: "POST",
            })
              .catch(() => undefined)
              .then(logout)
              .finally(() => {
                setBusy(false);
                onClose();
              });
          },
        },
      ],
    );
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
            accessibilityLabel="Sozlamalarni yopish"
            onPress={onClose}
            style={styles.backdrop}
          />
          <SafeAreaView style={styles.sheet} edges={["bottom"]}>
            <View style={styles.handle} />
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.content}
            >
              <View style={styles.headingRow}>
                <Text style={styles.heading}>Profil va sozlamalar</Text>
                <Pressable
                  accessibilityLabel="Yopish"
                  onPress={onClose}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={23} color="#A7AEC1" />
                </Pressable>
              </View>

              <View style={styles.profileCard}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials || "Z"}</Text>
                </View>
                <View style={styles.profileText}>
                  <Text numberOfLines={1} style={styles.name}>
                    {user?.name || "Zayuno foydalanuvchisi"}
                  </Text>
                  <Text numberOfLines={1} style={styles.email}>
                    {user?.email || "Google orqali kirilgan"}
                  </Text>
                </View>
                <View style={styles.secureBadge}>
                  <Ionicons name="shield-checkmark" size={15} color="#55D78A" />
                  <Text style={styles.secureText}>Himoyalangan</Text>
                </View>
              </View>

              <Text style={styles.sectionLabel}>HUQUQIY VA YORDAM</Text>
              <View style={styles.group}>
                <SettingRow
                  icon="shield-outline"
                  label="Maxfiylik siyosati"
                  onPress={() => void Linking.openURL(publicLinks.privacy)}
                />
                <SettingRow
                  icon="document-text-outline"
                  label="Foydalanish shartlari"
                  onPress={() => void Linking.openURL(publicLinks.terms)}
                />
                <SettingRow
                  icon="help-circle-outline"
                  label="Yordam markazi"
                  onPress={() =>
                    void Linking.openURL("https://zayuno.uz/support")
                  }
                  last
                />
              </View>

              <Text style={styles.sectionLabel}>PERSONALIZATION</Text>
              <View style={styles.group}>
                <SettingRow
                  icon="sparkles-outline"
                  label="Zayuno xotirasi"
                  onPress={() => setMemoryVisible(true)}
                  last
                />
              </View>

              <Text style={styles.sectionLabel}>SESSIYA</Text>
              <View style={styles.group}>
                <SettingRow
                  icon="log-out-outline"
                  label="Hisobdan chiqish"
                  onPress={confirmLogout}
                />
                <SettingRow
                  icon="phone-portrait-outline"
                  label="Barcha qurilmalardan chiqish"
                  onPress={logoutEverywhere}
                  last
                />
              </View>

              <View style={styles.dangerZone}>
                <View style={styles.dangerCopy}>
                  <Text style={styles.dangerTitle}>Hisob va ma’lumotlar</Text>
                  <Text style={styles.dangerDescription}>
                    O‘chirish alohida tasdiq talab qiladi va tasodifan
                    bajarilmaydi.
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={confirmDelete}
                  style={({ pressed }) => [
                    styles.deleteButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons name="trash-outline" size={17} color="#FF879A" />
                  <Text style={styles.deleteText}>O‘chirish</Text>
                </Pressable>
              </View>
            </ScrollView>
            {busy ? (
              <View style={styles.busy}>
                <ActivityIndicator color="#8B7CFF" />
                <Text style={styles.busyText}>Sessiya yangilanmoqda…</Text>
              </View>
            ) : null}
          </SafeAreaView>
        </View>
      </Modal>
      <MemorySheet
        visible={memoryVisible}
        onClose={() => setMemoryVisible(false)}
      />
    </>
  );
}

function SettingRow({
  icon,
  label,
  onPress,
  last = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !last && styles.rowBorder,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={19} color="#9487FF" />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color="#626B82" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,2,10,0.74)",
  },
  sheet: {
    maxHeight: "92%",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: "rgba(126,134,165,0.25)",
    backgroundColor: "#090D1B",
  },
  content: { paddingBottom: 6 },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 14,
    backgroundColor: "#4F586F",
  },
  headingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  heading: { color: "#F5F6FA", fontSize: 21, fontWeight: "700" },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: "#121727",
  },
  profileCard: {
    minHeight: 82,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(119,102,255,0.25)",
    backgroundColor: "rgba(92,73,226,0.09)",
  },
  avatar: {
    width: 49,
    height: 49,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4E42C9",
  },
  avatarText: { color: "#FFFFFF", fontSize: 17, fontWeight: "800" },
  profileText: { flex: 1, marginLeft: 12, marginRight: 8 },
  name: { color: "#F4F5FA", fontSize: 15, fontWeight: "700" },
  email: { color: "#8E96AC", fontSize: 11, marginTop: 4 },
  secureBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  secureText: { color: "#72D99A", fontSize: 9, fontWeight: "700" },
  sectionLabel: {
    color: "#69728A",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.1,
    marginTop: 18,
    marginBottom: 8,
    marginLeft: 3,
  },
  group: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(126,134,165,0.18)",
    backgroundColor: "#0E1322",
  },
  row: {
    minHeight: 53,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(126,134,165,0.18)",
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(112,91,255,0.10)",
  },
  rowLabel: { flex: 1, color: "#E7E9F2", fontSize: 13, marginLeft: 11 },
  dangerZone: {
    minHeight: 76,
    marginTop: 18,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,95,120,0.20)",
    backgroundColor: "rgba(111,30,47,0.10)",
  },
  dangerCopy: { flex: 1, paddingRight: 12 },
  dangerTitle: { color: "#F2DDE2", fontSize: 13, fontWeight: "700" },
  dangerDescription: {
    color: "#967982",
    fontSize: 10,
    lineHeight: 15,
    marginTop: 3,
  },
  deleteButton: {
    height: 38,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 12,
    backgroundColor: "rgba(255,95,120,0.11)",
  },
  deleteText: { color: "#FF879A", fontSize: 11, fontWeight: "700" },
  pressed: { opacity: 0.68 },
  busy: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 22,
    height: 48,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    backgroundColor: "#171C2E",
  },
  busyText: { color: "#BCC2D1", fontSize: 12 },
});
