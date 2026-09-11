import React, { useEffect, useRef, useState } from "react";
import {
  Image,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  View,
  TextInput,
  Animated,
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  ScrollView,
  BackHandler,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Google from "expo-auth-session/providers/google";
import { Text } from "../../src/components/primitives/Text";
import { brandAssets } from "../../src/theme/assets";
import { useAuthStore } from "../../src/store/authStore";
import { apiFetch } from "../../src/lib/api";
import { useEmailSignIn } from "../../src/components/auth/useEmailSignIn";
import { useReducedMotion } from "../../src/components/food/useReducedMotion";
import { validLoginEmail } from "../../src/lib/email-auth";
import { publicLinks } from "../../src/lib/config";

type SessionResponse = {
  accessToken?: string;
  refreshToken?: string;
  token?: string;
  expiresIn?: number;
  user: { id: string; name?: string; email?: string; avatarUrl?: string };
};

async function createConsumerSession(
  idToken: string,
  setSession: ReturnType<typeof useAuthStore.getState>["setSession"],
) {
  const session = await apiFetch<SessionResponse>(
    "/api/v1/consumer/auth/google",
    {
      method: "POST",
      body: JSON.stringify({ idToken }),
    },
    false,
  );
  const accessToken = session.accessToken || session.token;
  if (!accessToken) throw new Error("Session token missing");
  await setSession({
    accessToken,
    refreshToken: session.refreshToken,
    user: session.user,
    expiresIn: session.expiresIn,
  });
  Haptics.notificationAsync(
    Haptics.NotificationFeedbackType.Success,
  ).catch(() => undefined);
}

function BrowserGoogleButton({
  androidClientId,
  iosClientId,
  webClientId,
}: {
  androidClientId: string;
  iosClientId: string;
  webClientId: string;
}) {
  const setSession = useAuthStore((state) => state.setSession);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    androidClientId,
    iosClientId,
    webClientId,
    scopes: ["openid", "profile", "email"],
    selectAccount: true,
  });

  useEffect(() => {
    const exchange = async () => {
      if (response?.type !== "success") {
        if (response?.type === "error") {
          setMessage(response.error?.message || "Google kirishda xatolik");
        }
        return;
      }
      const idToken =
        response.authentication?.idToken || response.params.id_token;
      if (!idToken) {
        setMessage("Google tasdiqlash kodi olinmadi.");
        return;
      }
      setBusy(true);
      setMessage(null);
      try {
        await createConsumerSession(idToken, setSession);
      } catch (error: any) {
        setMessage(
          error?.message ||
            "Google orqali kirib bo‘lmadi. Qayta urinib ko‘ring.",
        );
      } finally {
        setBusy(false);
      }
    };
    exchange();
  }, [response]);

  return (
    <>
      {message ? <Text style={styles.error}>{message}</Text> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Google bilan davom etish"
        disabled={!request || busy}
        onPress={() => promptAsync()}
        style={({ pressed }) => [
          styles.googleButton,
          pressed && styles.pressed,
          (!request || busy) && styles.disabled,
        ]}
      >
        <Ionicons name="logo-google" size={24} color="#2563EB" />
        <Text style={styles.googleText}>
          {busy ? "Kirilmoqda…" : "Google bilan davom etish"}
        </Text>
      </Pressable>
    </>
  );
}

function NativeGoogleButton({ webClientId }: { webClientId: string }) {
  const setSession = useAuthStore((state) => state.setSession);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    import("react-native-nitro-google-signin")
      .then(({ GoogleOneTapSignIn }) => {
        GoogleOneTapSignIn.configure({
          webClientId,
          offlineAccess: false,
          autoSelectOnSignIn: false,
        });
        if (active) setReady(true);
      })
      .catch(() => {
        if (active) {
          setMessage("Google kirish moduli yuklanmadi. Ilovani yangilang.");
        }
      });
    return () => {
      active = false;
    };
  }, [webClientId]);

  const signIn = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const {
        GoogleOneTapSignIn,
        isCancelledResponse,
        isSuccessResponse,
      } = await import("react-native-nitro-google-signin");
      await GoogleOneTapSignIn.checkPlayServices(true);
      const response = await GoogleOneTapSignIn.presentExplicitSignIn();
      if (isCancelledResponse(response)) return;
      if (!isSuccessResponse(response) || !response.data.idToken) {
        throw new Error("Google tasdiqlash tokeni olinmadi.");
      }
      await createConsumerSession(response.data.idToken, setSession);
    } catch (error: any) {
      const code = typeof error?.code === "string" ? error.code : "";
      if (code === "SIGN_IN_CANCELLED") return;
      if (code === "PLAY_SERVICES_NOT_AVAILABLE") {
        setMessage("Google Play Services’ni yangilang va qayta urinib ko‘ring.");
      } else if (code === "DEVELOPER_ERROR") {
        setMessage("Google OAuth sozlamasi APK imzosi bilan mos emas.");
      } else {
        setMessage(
          error?.message ||
            "Google orqali kirib bo‘lmadi. Qayta urinib ko‘ring.",
        );
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {message ? <Text style={styles.error}>{message}</Text> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Google bilan davom etish"
        disabled={!ready || busy}
        onPress={signIn}
        style={({ pressed }) => [
          styles.googleButton,
          pressed && styles.pressed,
          (!ready || busy) && styles.disabled,
        ]}
      >
        <Ionicons name="logo-google" size={24} color="#2563EB" />
        <Text style={styles.googleText}>
          {busy ? "Kirilmoqda…" : "Google bilan davom etish"}
        </Text>
      </Pressable>
    </>
  );
}


export default function WelcomeScreen() {
  const auth = useEmailSignIn();
  const emailInput = useRef<TextInput>(null);
  const codeInput = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const reducedMotion = useReducedMotion();
  const reveal = useRef(new Animated.Value(1)).current;
  const collapse = useRef(new Animated.Value(0)).current;
  const { height } = useWindowDimensions();
  const compact = focused || keyboardOpen;
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() || "";
  const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim() || "";
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() || "";
  const clientReady = Platform.OS === "android"
    ? Boolean(androidClientId && webClientId)
    : Platform.OS === "ios" ? Boolean(iosClientId && webClientId) : Boolean(webClientId);

  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", () => setKeyboardOpen(true));
    const hide = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", () => { setKeyboardOpen(false); setFocused(false); });
    return () => { show.remove(); hide.remove(); };
  }, []);
  useEffect(() => {
    Animated.timing(collapse, { toValue: compact ? 1 : 0, duration: reducedMotion ? 0 : 200, useNativeDriver: false }).start();
    return () => collapse.stopAnimation();
  }, [compact, reducedMotion, collapse]);
  useEffect(() => {
    reveal.setValue(reducedMotion ? 1 : 0);
    Animated.timing(reveal, { toValue: 1, duration: reducedMotion ? 0 : 200, useNativeDriver: Platform.OS !== "web" }).start();
    const timer = setTimeout(() => {
      if (auth.step === "code") codeInput.current?.focus();
    }, 90);
    return () => { clearTimeout(timer); reveal.stopAnimation(); };
  }, [auth.step, reveal, reducedMotion]);
  const back = () => {
    if (auth.step === "code") {
      auth.changeEmail(); setFocused(true);
      setTimeout(() => emailInput.current?.focus(), 60);
    } else { Keyboard.dismiss(); setFocused(false); }
  };
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (auth.step === "code" || focused) { back(); return true; }
      return false;
    });
    return () => subscription.remove();
  }, [auth.step, focused]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <View style={styles.header}>
            {(auth.step === "code" || compact) && <Pressable accessibilityRole="button" accessibilityLabel="Orqaga" onPress={back} hitSlop={10} style={styles.back}><Ionicons name="arrow-back" size={24} color="#C6C5C1" /></Pressable>}
            <View style={styles.brand}>
              <Image source={brandAssets.logoGlow} style={styles.logo} resizeMode="contain" />
              <Text style={styles.wordmark}>Zayuno</Text>
            </View>
          </View>

          <Animated.View style={[styles.stage, { opacity: reveal, transform: [{ translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }]}>
            {auth.step === "email" ? (
              <View style={styles.emailStage}>
                <View style={[styles.hero, compact && styles.heroCompact]}>
                  <Animated.View style={{ height: collapse.interpolate({ inputRange: [0, 1], outputRange: [Math.min(230, height * 0.29), 105] }), width: "100%", alignItems: "center", justifyContent: "center" }}>
                    <Animated.Image source={brandAssets.logoGlow} resizeMode="contain" style={{ width: 170, height: 170, borderRadius: 40, transform: [{ scale: collapse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.55] }) }] }} />
                  </Animated.View>
                  <Text style={[styles.headline, compact && styles.headlineCompact]}>Istagingizni ayting.{"\n"}Qolganini Zayuno qiladi.</Text>
                </View>
                <View style={styles.form}>
                  <View style={compact ? styles.hidden : undefined}>
                    {clientReady ? (Platform.OS === "android"
                      ? <NativeGoogleButton webClientId={webClientId} />
                      : <BrowserGoogleButton androidClientId={androidClientId} iosClientId={iosClientId || webClientId} webClientId={webClientId} />
                    ) : <Pressable disabled style={[styles.googleButton, styles.disabled]}><Ionicons name="logo-google" size={21} color="#4285F4" /><Text style={styles.googleText}>Google bilan davom etish</Text></Pressable>}
                    <View style={styles.divider}><View style={styles.line} /><Text style={styles.dividerText}>yoki</Text><View style={styles.line} /></View>
                  </View>
                  <View style={[styles.inputFrame, compact && styles.inputFocused, Boolean(auth.error) && styles.inputError]}>
                    <TextInput ref={emailInput} accessibilityLabel="Email manzilingiz" style={styles.input} placeholder="Email manzilingiz" placeholderTextColor="#979791" value={auth.email}
                      onChangeText={auth.setEmail} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
                      autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="emailAddress" autoComplete="email"
                      returnKeyType="go" onSubmitEditing={auth.sendCode} editable={!auth.busy} selectionColor="#A798F5" />
                    {(compact || auth.email.length > 0) && <Pressable accessibilityRole="button" accessibilityLabel="Kirish kodini yuborish" onPress={auth.sendCode} disabled={Boolean(auth.busy) || !validLoginEmail(auth.email)} style={({ pressed }) => [styles.inputArrow, pressed && styles.pressed, (!validLoginEmail(auth.email) || Boolean(auth.busy)) && styles.disabled]}>
                      {auth.busy === "send" ? <ActivityIndicator color="#161616" /> : <Ionicons name="arrow-forward" size={23} color="#161616" />}
                    </Pressable>}
                  </View>
                  {auth.error ? <Text accessibilityRole="alert" style={styles.error}>{auth.error}</Text> : null}
                  <Text style={styles.legal}>
                    Davom etish orqali <Text accessibilityRole="link" style={styles.legalLink} onPress={() => Linking.openURL(publicLinks.terms)}>Foydalanish shartlari</Text> va <Text accessibilityRole="link" style={styles.legalLink} onPress={() => Linking.openURL(publicLinks.privacy)}>Maxfiylik siyosatiga</Text> rozilik bildirasiz.
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.codeStage}>
                <Text style={styles.codeTitle}>Emailga yuborilgan kodni kiriting</Text>
                <View style={[styles.inputFrame, styles.inputFocused, Boolean(auth.error) && styles.inputError]}>
                  <TextInput ref={codeInput} accessibilityLabel="5 xonali kirish kodi" style={[styles.input, styles.codeInput]} placeholder="Kod" placeholderTextColor="#979791"
                    value={auth.code} onChangeText={auth.changeCode} keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code"
                    autoCorrect={false} autoCapitalize="none" returnKeyType="done" onSubmitEditing={() => auth.verifyCode()} editable={!auth.busy}
                    selectionColor="#A798F5" onFocus={() => setFocused(true)} />
                  {auth.busy ? <View style={styles.codeStatus}><ActivityIndicator color="#B5A8FF" /></View>
                    : auth.code.length === 5 && auth.error ? <Pressable accessibilityRole="button" accessibilityLabel="Kodni qayta tekshirish" onPress={() => auth.verifyCode()} style={styles.inputArrow}><Ionicons name="arrow-forward" size={23} color="#161616" /></Pressable> : null}
                </View>
                {auth.error ? <Text accessibilityRole="alert" style={styles.error}>{auth.error}</Text> : null}
                <View style={styles.mailCard}>
                  <Text style={styles.sentCopy}>Kod yuborilgan manzil</Text>
                  <Text selectable style={styles.sentEmail}>{auth.sentEmail}</Text>
                  <View style={styles.envelope}><Ionicons name="mail" size={55} color="#EAE8E3" /><View style={styles.seal}><Ionicons name="sparkles" size={12} color="#FFFFFF" /></View></View>
                </View>
                <Pressable accessibilityRole="button" onPress={back} style={styles.textAction}><Text style={styles.link}>Emailni o‘zgartirish</Text></Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={auth.remaining > 0 ? `Qayta yuborish uchun ${auth.remaining} soniya` : "Kodni qayta yuborish"} onPress={auth.sendCode} disabled={auth.remaining > 0 || Boolean(auth.busy)} style={styles.textAction}>
                  <Text style={styles.resend}>{auth.busy === "send" ? "Yuborilmoqda…" : auth.remaining > 0 ? `Qayta yuborish · ${auth.remaining}s` : "Kodni qayta yuborish"}</Text>
                </Pressable>
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  hidden: { display: "none" },
  safeArea: { flex: 1, backgroundColor: "#141414" },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 18, maxWidth: 520, width: "100%", alignSelf: "center" },
  header: { height: 65, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  brand: { flexDirection: "row", alignItems: "center", gap: 8 },
  logo: { width: 35, height: 35, borderRadius: 8 },
  wordmark: { color: "#F5F4EF", fontSize: 31, letterSpacing: -1, fontWeight: "600" },
  back: { position: "absolute", left: -8, top: 10, width: 44, height: 44, alignItems: "center", justifyContent: "center", zIndex: 1 },
  stage: { flex: 1 },
  emailStage: { flex: 1, justifyContent: "space-between" },
  hero: { flexGrow: 1, alignItems: "center", justifyContent: "center", paddingVertical: 20, gap: 14 },
  heroCompact: { flexGrow: 0, paddingTop: 0, paddingBottom: 18, gap: 0 },
  headline: { color: "#F4F3EF", fontFamily: Platform.select({ ios: "Georgia", android: "serif", web: "Georgia" }), fontSize: 32, lineHeight: 40, letterSpacing: -0.8, textAlign: "center" },
  headlineCompact: { fontSize: 24, lineHeight: 29, letterSpacing: -0.4 },
  form: { paddingTop: 16, gap: 0 },
  googleButton: { height: 55, borderRadius: 30, backgroundColor: "#FAFAF8", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 14 },
  googleText: { color: "#202020", fontSize: 17, fontWeight: "600" },
  pressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.45 },
  divider: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 18 },
  line: { flex: 1, height: 1, backgroundColor: "#353532" },
  dividerText: { color: "#9C9C94", fontSize: 14 },
  inputFrame: { minHeight: 62, borderRadius: 15, borderWidth: 1.5, borderColor: "#454540", backgroundColor: "#222220", flexDirection: "row", alignItems: "center", padding: 6 },
  inputFocused: { borderColor: "#AA97F4", borderWidth: 2 },
  inputError: { borderColor: "#E49A89" },
  input: { flex: 1, minWidth: 0, paddingHorizontal: 10, paddingVertical: 10, fontSize: 19, color: "#F6F5F0", textAlign: "center", outlineStyle: "none" } as any,
  inputArrow: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#F7F6F2", alignItems: "center", justifyContent: "center" },
  error: { color: "#EDAB9A", fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: 10, marginBottom: 6 },
  legal: { fontSize: 13, lineHeight: 20, color: "#91918A", textAlign: "center", marginTop: 18, paddingHorizontal: 7 },
  legalLink: { color: "#CFCEC7", textDecorationLine: "underline" },
  codeStage: { paddingTop: 60, paddingBottom: 12, gap: 0 },
  codeTitle: { color: "#EEEDE8", fontWeight: "600", fontSize: 17, lineHeight: 24, textAlign: "center", marginBottom: 25 },
  codeInput: { letterSpacing: 7, fontSize: 25, paddingLeft: 17 },
  codeStatus: { width: 38, alignItems: "center" },
  mailCard: { marginTop: 24, minHeight: 142, borderColor: "#282825", borderWidth: 1, borderRadius: 17, backgroundColor: "#121212", alignItems: "center", overflow: "hidden", paddingTop: 22, paddingHorizontal: 14 },
  sentCopy: { fontSize: 16, color: "#D4D3CD", textAlign: "center" },
  sentEmail: { marginTop: 5, fontSize: 17, lineHeight: 24, fontWeight: "700", textAlign: "center", color: "#FAF9F5", flexShrink: 1 },
  envelope: { marginTop: 16, alignItems: "center" },
  seal: { position: "absolute", top: 26, width: 18, height: 18, borderRadius: 9, backgroundColor: "#8D77DB", alignItems: "center", justifyContent: "center" },
  textAction: { minHeight: 42, alignItems: "center", justifyContent: "center", padding: 8 },
  link: { color: "#AAA2EC", fontSize: 15, fontWeight: "500", marginTop: 14 },
  resend: { color: "#999A92", fontSize: 13 },
});
