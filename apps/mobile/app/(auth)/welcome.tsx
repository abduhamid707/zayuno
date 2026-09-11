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
  LayoutAnimation,
  UIManager,
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
import { LinearGradient } from "expo-linear-gradient";
import MaskedView from "@react-native-masked-view/masked-view";

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type SessionResponse = {
  accessToken?: string;
  refreshToken?: string;
  token?: string;
  expiresIn?: number;
  user: { id: string; name?: string; email?: string; avatarUrl?: string };
};

async function createConsumerSession(idToken: string, setSession: ReturnType<typeof useAuthStore.getState>["setSession"]) {
  const session = await apiFetch<SessionResponse>("/api/v1/consumer/auth/google", {
    method: "POST",
    body: JSON.stringify({ idToken }),
  }, false);
  const accessToken = session.accessToken || session.token;
  if (!accessToken) throw new Error("Session token missing");
  await setSession({ accessToken, refreshToken: session.refreshToken, user: session.user, expiresIn: session.expiresIn });
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
}

function BrowserGoogleButton({ androidClientId, iosClientId, webClientId }: { androidClientId: string; iosClientId: string; webClientId: string; }) {
  const setSession = useAuthStore((state) => state.setSession);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    androidClientId, iosClientId, webClientId,
    scopes: ["openid", "profile", "email"],
    selectAccount: true,
  });

  useEffect(() => {
    const exchange = async () => {
      if (response?.type !== "success") {
        if (response?.type === "error") setMessage(response.error?.message || "Google kirishda xatolik");
        return;
      }
      const idToken = response.authentication?.idToken || response.params.id_token;
      if (!idToken) return setMessage("Google tasdiqlash kodi olinmadi.");
      setBusy(true); setMessage(null);
      try { await createConsumerSession(idToken, setSession); } 
      catch (error: any) { setMessage(error?.message || "Google orqali kirib bo'lmadi. Qayta urinib ko'ring."); } 
      finally { setBusy(false); }
    };
    exchange();
  }, [response]);

  return (
    <View>
      {message ? <Text style={styles.error}>{message}</Text> : null}
      <Pressable
        accessibilityRole="button"
        disabled={!request || busy}
        onPress={() => promptAsync()}
        style={({ pressed }) => [styles.googleButton, pressed && styles.pressed, (!request || busy) && styles.disabled]}
      >
        <Ionicons name="logo-google" size={24} color="#4285F4" />
        <Text style={styles.googleText}>{busy ? "Kirilmoqda..." : "Google bilan davom etish"}</Text>
      </Pressable>
    </View>
  );
}

function NativeGoogleButton({ webClientId }: { webClientId: string }) {
  const setSession = useAuthStore((state) => state.setSession);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    import("react-native-nitro-google-signin").then(({ GoogleOneTapSignIn }) => {
      GoogleOneTapSignIn.configure({ webClientId, offlineAccess: false, autoSelectOnSignIn: false });
      if (active) setReady(true);
    }).catch(() => {
      if (active) setMessage("Google kirish moduli yuklanmadi. Ilovani yangilang.");
    });
    return () => { active = false; };
  }, [webClientId]);

  const signIn = async () => {
    if (!ready || busy) return;
    setBusy(true); setMessage(null);
    try {
      const { GoogleOneTapSignIn, isCancelledResponse, isSuccessResponse } = await import("react-native-nitro-google-signin");
      await GoogleOneTapSignIn.checkPlayServices(true);
      const response = await GoogleOneTapSignIn.presentExplicitSignIn();
      if (isCancelledResponse(response)) return;
      if (!isSuccessResponse(response) || !response.data.idToken) throw new Error("Google tasdiqlash tokeni olinmadi.");
      await createConsumerSession(response.data.idToken, setSession);
    } catch (error: any) {
      const code = typeof error?.code === "string" ? error.code : "";
      if (code === "SIGN_IN_CANCELLED") return;
      if (code === "PLAY_SERVICES_NOT_AVAILABLE") setMessage("Google Play Services'ni yangilang va qayta urinib ko'ring.");
      else if (code === "DEVELOPER_ERROR") setMessage("Google OAuth sozlamasi APK imzosi bilan mos emas.");
      else setMessage(error?.message || "Google orqali kirib bo'lmadi. Qayta urinib ko'ring.");
    } finally { setBusy(false); }
  };

  return (
    <View>
      {message ? <Text style={styles.error}>{message}</Text> : null}
      <Pressable
        accessibilityRole="button"
        disabled={!ready || busy}
        onPress={signIn}
        style={({ pressed }) => [styles.googleButton, pressed && styles.pressed, (!ready || busy) && styles.disabled]}
      >
        <Ionicons name="logo-google" size={24} color="#4285F4" />
        <Text style={styles.googleText}>{busy ? "Kirilmoqda..." : "Google bilan davom etish"}</Text>
      </Pressable>
    </View>
  );
}

export default function WelcomeScreen() {
  const auth = useEmailSignIn();
  const emailInput = useRef<TextInput>(null);
  const codeInput = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() || "";
  const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim() || "";
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() || "";
  const clientReady = Platform.OS === "android" ? Boolean(androidClientId && webClientId) : Platform.OS === "ios" ? Boolean(iosClientId && webClientId) : Boolean(webClientId);

  useEffect(() => {
    const customAnim = {
      duration: 300,
      create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
      update: { type: LayoutAnimation.Types.easeInEaseOut },
      delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
    };

    const show = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", () => {
      LayoutAnimation.configureNext(customAnim);
      setKeyboardOpen(true);
    });
    const hide = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", () => {
      LayoutAnimation.configureNext(customAnim);
      setKeyboardOpen(false);
      setFocused(false);
    });
    return () => { show.remove(); hide.remove(); };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (auth.step === "code") {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        codeInput.current?.focus();
      }
    }, 90);
    return () => clearTimeout(timer);
  }, [auth.step]);

  const back = () => {
    if (auth.step === "code") {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      auth.changeEmail(); 
      setFocused(true);
      setTimeout(() => emailInput.current?.focus(), 60);
    } else { 
      Keyboard.dismiss(); 
      setFocused(false); 
    }
  };

  useEffect(() => {
    if (Platform.OS === "web") return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (auth.step === "code" || focused) { back(); return true; }
      return false;
    });
    return () => subscription.remove();
  }, [auth.step, focused]);

  return (
    <View style={styles.container}>
      <Image source={require("../../assets/images/22.jpg")} style={StyleSheet.absoluteFill} resizeMode="cover" />
      
      <SafeAreaView style={styles.safeArea}>
        
        {/* TOP HEADER */}
        <View style={styles.topHeader}>
          {auth.step === "code" ? (
            <>
              {/* Back button pinned to left */}
              <Pressable accessibilityRole="button" onPress={back} hitSlop={15} style={styles.backButtonAbsolute}>
                <Ionicons name="arrow-back" size={26} color="#FFF" />
              </Pressable>
              {/* Logo perfectly centered */}
              <View style={styles.centerLogoWrapper}>
                <Image source={brandAssets.logoLight} style={styles.topLogoCode} resizeMode="contain" />
              </View>
            </>
          ) : (
            <>
              <View style={styles.brandRow}>
                <Image source={brandAssets.logoLight} style={styles.topLogo} resizeMode="contain" />
                <Text style={styles.topWordmark}>Zayuno</Text>
              </View>
              <View style={styles.servicesLabel}>
                <Text style={styles.servicesText}>SERVICES</Text>
                <Text style={styles.servicesText}>JUST HAPPEN</Text>
              </View>
            </>
          )}
        </View>

        {/* KEYBOARD VIEW */}
        <KeyboardAvoidingView 
          style={styles.fill} 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView 
            keyboardShouldPersistTaps="handled" 
            keyboardDismissMode="interactive" 
            showsVerticalScrollIndicator={false} 
            contentContainerStyle={styles.scroll}
            bounces={false}
          >
            {auth.step === "email" ? (
              <View style={styles.emailStage}>
                {/* Hero / Texts */}
                <View style={[styles.hero, keyboardOpen && styles.heroSmall]}>
                  <Text style={[styles.headline, keyboardOpen && styles.headlineSmall]}>Xizmatlar</Text>
                  <MaskedView maskElement={<Text style={[styles.headline, keyboardOpen && styles.headlineSmall, {backgroundColor: 'transparent'}]}>yaqinroq.</Text>}>
                    <LinearGradient colors={["#00E5FF", "#B026FF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                      <Text style={[styles.headline, keyboardOpen && styles.headlineSmall, { opacity: 0 }]}>yaqinroq.</Text>
                    </LinearGradient>
                  </MaskedView>
                  <Text style={[styles.subtitle, keyboardOpen && styles.subtitleSmall]}>Bir so'rov. Ming imkoniyat.</Text>
                </View>

                {/* Form Elements */}
                <View style={styles.form}>
                  
                  {/* DYNAMIC HIDING: Disappears smoothly when keyboard opens */}
                  {!keyboardOpen && (
                    <View style={styles.socialGroup}>
                      {clientReady ? (Platform.OS === "android"
                        ? <NativeGoogleButton webClientId={webClientId} />
                        : <BrowserGoogleButton androidClientId={androidClientId} iosClientId={iosClientId || webClientId} webClientId={webClientId} />
                      ) : (
                        <Pressable disabled style={[styles.googleButton, styles.disabled]}>
                          <Ionicons name="logo-google" size={24} color="#4285F4" />
                          <Text style={styles.googleText}>Google bilan davom etish</Text>
                        </Pressable>
                      )}
                      
                      <View style={styles.divider}>
                        <View style={styles.line} />
                        <Text style={styles.dividerText}>yoki</Text>
                        <View style={styles.line} />
                      </View>
                    </View>
                  )}

                  {/* Email Input */}
                  <View style={[styles.inputFrame, focused && styles.inputFocused, Boolean(auth.error) && styles.inputError]}>
                    <TextInput ref={emailInput} accessibilityLabel="Email manzilingiz" style={styles.input} placeholder="Email manzilingiz" placeholderTextColor="#7A7A7A"
                      value={auth.email} onChangeText={auth.setEmail} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
                      autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="emailAddress" autoComplete="email"
                      returnKeyType="go" onSubmitEditing={auth.sendCode} editable={!auth.busy} selectionColor="#315CFF" />
                    {(focused || auth.email.length > 0) && (
                      <Pressable accessibilityRole="button" onPress={auth.sendCode} disabled={Boolean(auth.busy) || !validLoginEmail(auth.email)} style={({ pressed }) => [styles.inputArrow, pressed && styles.pressed, (!validLoginEmail(auth.email) || Boolean(auth.busy)) && styles.disabled]}>
                        {auth.busy === "send" ? <ActivityIndicator color="#161616" /> : <Ionicons name="arrow-forward" size={20} color="#161616" />}
                      </Pressable>
                    )}
                  </View>
                  {auth.error ? <Text style={styles.error}>{auth.error}</Text> : null}
                  
                  {/* Terms - Closer to keyboard */}
                  <Text style={[styles.legal, keyboardOpen && styles.legalClose]}>
                    Davom etish orqali <Text style={styles.legalLink} onPress={() => Linking.openURL(publicLinks.terms)}>Foydalanish shartlari</Text> va <Text style={styles.legalLink} onPress={() => Linking.openURL(publicLinks.privacy)}>Maxfiylik siyosatiga</Text> rozilik bildirasiz.
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.codeStage}>
                
                {/* Code Form Content */}
                <View style={styles.codeTop}>
                  <Text style={styles.instructionText}>Tasdiqlash kodini kiriting</Text>
                  
                  <View style={[styles.inputFrame, styles.inputFocused, Boolean(auth.error) && styles.inputError, { marginBottom: 20 }]}>
                    <TextInput ref={codeInput} style={[styles.input, styles.codeInput]} placeholder="K o d" placeholderTextColor="#7A7A7A"
                      value={auth.code} onChangeText={auth.changeCode} keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code"
                      autoCorrect={false} autoCapitalize="none" returnKeyType="done" onSubmitEditing={() => auth.verifyCode()} editable={!auth.busy}
                      selectionColor="#315CFF" onFocus={() => setFocused(true)} />
                    {auth.busy ? <View style={styles.codeStatus}><ActivityIndicator color="#315CFF" /></View>
                      : auth.code.length === 5 && auth.error ? <Pressable onPress={() => auth.verifyCode()} style={styles.inputArrow}><Ionicons name="arrow-forward" size={20} color="#161616" /></Pressable> : null}
                  </View>
                  {auth.error ? <Text style={styles.error}>{auth.error}</Text> : null}
                  
                  <View style={styles.mailCard}>
                    <Text style={styles.sentCopy}>Kod yuborilgan manzil</Text>
                    <Text selectable style={styles.sentEmail}>{auth.sentEmail}</Text>
                    <View style={styles.envelope}>
                      <Ionicons name="mail" size={40} color="#EAE8E3" />
                      <View style={styles.seal}><Ionicons name="sparkles" size={10} color="#FFFFFF" /></View>
                    </View>
                  </View>
                </View>

                {/* PINNED TO KEYBOARD BOTTOM ACTIONS */}
                <View style={styles.codeBottom}>
                  <Pressable onPress={back} style={styles.textAction}><Text style={styles.link}>Emailni o'zgartirish</Text></Pressable>
                  <Pressable disabled={auth.remaining > 0 || Boolean(auth.busy)} style={[styles.textAction, {marginTop: 0}]} onPress={auth.sendCode}>
                    <Text style={styles.resend}>{auth.busy === "send" ? "Yuborilmoqda..." : auth.remaining > 0 ? `Qayta yuborish • ${auth.remaining}s` : "Kodni qayta yuborish"}</Text>
                  </Pressable>
                </View>

              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  container: { flex: 1, backgroundColor: "#0A0A0A" },
  safeArea: { flex: 1 },
  
  /* Header Styles */
  topHeader: { height: 60, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingTop: 10, zIndex: 10 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  topLogo: { width: 34, height: 34, borderRadius: 8 },
  topWordmark: { color: "#FFF", fontSize: 24, fontWeight: "600", letterSpacing: -0.5 },
  servicesLabel: { alignItems: "flex-end", paddingRight: 4 },
  servicesText: { color: "#9CA3AF", fontSize: 10, fontWeight: "600", letterSpacing: 2, lineHeight: 14 },
  
  /* Code Stage Header */
  backButtonAbsolute: { position: "absolute", left: 16, top: 18, zIndex: 20 },
  centerLogoWrapper: { flex: 1, alignItems: "center" },
  topLogoCode: { width: 42, height: 42, borderRadius: 10 },

  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 16, maxWidth: 520, width: "100%", alignSelf: "center", justifyContent: "space-between" },
  
  /* Email Stage Layout */
  emailStage: { flex: 1, justifyContent: "space-between" },
  hero: { flex: 1, alignItems: "center", justifyContent: "center" },
  heroSmall: { flex: 0, marginTop: 40, marginBottom: 30 }, // shrinks beautifully
  headline: { color: "#FFF", fontSize: 48, fontWeight: "800", lineHeight: 52, letterSpacing: -1.5, textAlign: "center" },
  headlineSmall: { fontSize: 36, lineHeight: 40 },
  subtitle: { color: "#9CA3AF", fontSize: 16, marginTop: 12, textAlign: "center", letterSpacing: 0.2 },
  subtitleSmall: { fontSize: 14, marginTop: 8 },
  
  form: { paddingBottom: 0 },
  socialGroup: { overflow: "hidden" },
  googleButton: { height: 60, borderRadius: 30, backgroundColor: "#FFF", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 14 },
  googleText: { color: "#111", fontSize: 16, fontWeight: "600" },
  pressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.45 },
  divider: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 20 },
  line: { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.15)" },
  dividerText: { color: "#6B7280", fontSize: 13 },
  
  /* Input Boxes */
  inputFrame: { minHeight: 60, borderRadius: 16, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.15)", backgroundColor: "transparent", flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 4 },
  inputFocused: { borderColor: "#315CFF", backgroundColor: "rgba(20,20,20,0.5)" },
  inputError: { borderColor: "#E49A89" },
  input: { flex: 1, minWidth: 0, fontSize: 16, color: "#FFF", outlineStyle: "none" } as any,
  inputArrow: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center", marginLeft: 10 },
  error: { color: "#EDAB9A", fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: 10, marginBottom: 6 },
  
  /* Legal Text */
  legal: { fontSize: 12, lineHeight: 18, color: "#6B7280", textAlign: "center", marginTop: 24, paddingHorizontal: 10 },
  legalClose: { marginTop: 12 }, // gets closer to keyboard
  legalLink: { color: "#D1D5DB", textDecorationLine: "underline" },
  
  /* Code Stage Layout */
  codeStage: { flex: 1, justifyContent: "space-between" },
  codeTop: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 20 },
  instructionText: { fontSize: 16, color: "#EAE8E3", textAlign: "center", marginBottom: 24, fontWeight: "500", letterSpacing: 0.2 },
  codeInput: { letterSpacing: 8, fontSize: 22, textAlign: "center", paddingLeft: 0 },
  codeStatus: { width: 38, alignItems: "center", marginLeft: 10 },
  mailCard: { width: "100%", minHeight: 120, borderColor: "rgba(255,255,255,0.1)", borderWidth: 1, borderRadius: 16, backgroundColor: "rgba(20,20,20,0.5)", alignItems: "center", overflow: "hidden", paddingTop: 20, paddingHorizontal: 14, marginBottom: 10 },
  sentCopy: { fontSize: 14, color: "#9CA3AF", textAlign: "center" },
  sentEmail: { marginTop: 6, fontSize: 16, fontWeight: "700", textAlign: "center", color: "#FFF" },
  envelope: { marginTop: 14, alignItems: "center" },
  seal: { position: "absolute", top: 18, width: 16, height: 16, borderRadius: 8, backgroundColor: "#315CFF", alignItems: "center", justifyContent: "center" },
  
  /* Pinned Bottom */
  codeBottom: { paddingBottom: 10, alignItems: "center", paddingTop: 10 },
  textAction: { minHeight: 40, alignItems: "center", justifyContent: "center", padding: 4 },
  link: { color: "#315CFF", fontSize: 15, fontWeight: "600" },
  resend: { color: "#6B7280", fontSize: 14 },
});
