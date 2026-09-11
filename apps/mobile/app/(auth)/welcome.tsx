import React, { useEffect, useState } from "react";
import {
  Image,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  View,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Google from "expo-auth-session/providers/google";
import { Text } from "../../src/components/primitives/Text";
import { brandAssets } from "../../src/theme/assets";
import { gradients, theme } from "../../src/theme";
import { useAuthStore } from "../../src/store/authStore";
import { apiFetch } from "../../src/lib/api";
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

function EmailAuth() {
  const setSession = useAuthStore((state) => state.setSession);
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendCode = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail.includes("@")) {
      setError("Yaroqli email kiriting.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiFetch(
        "/api/v1/consumer/auth/email/send-code",
        {
          method: "POST",
          body: JSON.stringify({ email: cleanEmail }),
        },
        false,
      );
      setStep("otp");
      setOtp("");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    } catch (err: any) {
      setError(err?.message || "Emailga kod yuborishda xatolik.");
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyCode = async () => {
    if (otp.length !== 5) return;
    setBusy(true);
    setError(null);
    try {
      const session = await apiFetch<SessionResponse>(
        "/api/v1/consumer/auth/email/verify-code",
        {
          method: "POST",
          body: JSON.stringify({ email: email.trim(), code: otp }),
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    } catch (err: any) {
      setError(err?.message || "Kod noto'g'ri.");
      setOtp(""); // reset input on error
    } finally {
      setBusy(false);
    }
  };

  if (step === "otp") {
    return (
      <View style={styles.emailContainer}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Text style={styles.otpPrompt}>
          {email} manziliga 5 xonali kod yuborildi. Kodni kiriting:
        </Text>
        <TextInput
          style={styles.input}
          placeholder="00000"
          placeholderTextColor="#9CA3AF"
          value={otp}
          onChangeText={(t) => {
            const val = t.replace(/[^0-9]/g, "").slice(0, 5);
            setOtp(val);
            setError(null);
          }}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoFocus
        />
        <View style={styles.otpActions}>
          <Pressable
            disabled={busy}
            onPress={() => {
              setStep("email");
              setOtp("");
              setError(null);
            }}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          >
            <Text style={styles.backBtnText}>Orqaga</Text>
          </Pressable>
          <Pressable
            disabled={busy || otp.length !== 5}
            onPress={handleVerifyCode}
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && styles.pressed,
              (busy || otp.length !== 5) && styles.disabled,
            ]}
          >
            <Text style={styles.primaryBtnText}>
              {busy ? "Kutilmoqda..." : "Tasdiqlash"}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.emailContainer}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.emailInputWrapper}>
        <Ionicons name="mail-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
        <TextInput
          style={[styles.input, styles.inputWithIcon]}
          placeholder="Email manzilingiz"
          placeholderTextColor="#9CA3AF"
          value={email}
          onChangeText={(t) => {
            setEmail(t);
            setError(null);
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
      <Pressable
        disabled={busy || !email.includes("@")}
        onPress={handleSendCode}
        style={({ pressed }) => [
          styles.primaryBtn,
          pressed && styles.pressed,
          (busy || !email.includes("@")) && styles.disabled,
        ]}
      >
        <Text style={styles.primaryBtnText}>
          {busy ? "Yuborilmoqda..." : "Email bilan davom etish"}
        </Text>
      </Pressable>
    </View>
  );
}

export default function WelcomeScreen() {
  const webClientId =
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() || "";
  const androidClientId =
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim() || "";
  const iosClientId =
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() || "";
  const clientReady =
    Platform.OS === "android"
      ? Boolean(androidClientId && webClientId)
      : Platform.OS === "ios"
        ? Boolean(iosClientId && webClientId)
        : Boolean(webClientId);

  return (
    <LinearGradient colors={gradients.night} style={styles.background}>
      <SafeAreaView style={styles.safeArea}>
        <View pointerEvents="none" style={styles.ambientGlow} />
        <View pointerEvents="none" style={[styles.orbit, styles.orbitOne]} />
        <View pointerEvents="none" style={[styles.orbit, styles.orbitTwo]} />
        <View pointerEvents="none" style={styles.starOne} />
        <View pointerEvents="none" style={styles.starTwo} />

        <View style={styles.brandBlock}>
          <Image
            source={brandAssets.logoGlow}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.wordmark}>Z A Y U N O</Text>
          <Text style={styles.tagline}>AI orqali toping, solishtiring,</Text>
          <Text style={styles.tagline}>bron qiling va buyurtma qiling.</Text>
        </View>

        <View style={styles.horizonWrap} pointerEvents="none">
          <LinearGradient
            colors={["transparent", "#315CFF", "#8B5CFF", "transparent"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.horizonLine}
          />
          <View style={styles.horizonGlow} />
        </View>

        <View style={styles.bottomBlock}>
          <Text style={styles.welcomeTitle}>Xush kelibsiz!</Text>
          <Text style={styles.welcomeCopy}>
            Sevimli restoranlaringizdan taomni toping,{`\n`}tanlang va bir necha soniyada buyurtma bering.
          </Text>

          {clientReady ? (
            Platform.OS === "android" ? (
              <NativeGoogleButton webClientId={webClientId} />
            ) : (
              <BrowserGoogleButton
                androidClientId={androidClientId}
                iosClientId={iosClientId || webClientId}
                webClientId={webClientId}
              />
            )
          ) : (
            <Pressable disabled style={[styles.googleButton, styles.disabled]}>
              <Ionicons name="logo-google" size={24} color="#6B7280" />
              <Text style={[styles.googleText, styles.googleTextDisabled]}>
                Google bilan davom etish
              </Text>
            </Pressable>
          )}

          <View style={styles.divider}>
            <View style={styles.line} />
            <Text style={styles.dividerText}>yoki</Text>
            <View style={styles.line} />
          </View>

          <EmailAuth />

          <View style={styles.legalRow}>
            <Ionicons
              name="shield-checkmark-outline"
              size={20}
              color="#6D63FF"
            />
            <Text style={styles.legalText}>
              Davom etish orqali siz{" "}
              <Text
                style={styles.legalLink}
                onPress={() => Linking.openURL(publicLinks.terms)}
              >
                Foydalanish shartlari
              </Text>{" "}
              va{" "}
              <Text
                style={styles.legalLink}
                onPress={() => Linking.openURL(publicLinks.privacy)}
              >
                Maxfiylik siyosatiga
              </Text>{" "}
              rozilik bildirasiz.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: 24, overflow: "hidden" },
  ambientGlow: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "rgba(77,45,255,0.13)",
    top: 250,
    right: -120,
  },
  orbit: {
    position: "absolute",
    width: 520,
    height: 155,
    borderRadius: 260,
    borderWidth: 1,
    borderColor: "rgba(45,75,255,0.30)",
    transform: [{ rotate: "15deg" }],
  },
  orbitOne: { top: 295, left: -92 },
  orbitTwo: {
    top: 356,
    left: -76,
    width: 470,
    borderColor: "rgba(114,60,255,0.18)",
  },
  starOne: {
    position: "absolute",
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#8D8BFF",
    top: 325,
    left: 52,
    shadowColor: "#5B7CFF",
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  starTwo: {
    position: "absolute",
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#FFFFFF",
    top: 430,
    right: 56,
    shadowColor: "#755CFF",
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  brandBlock: { alignItems: "center", paddingTop: 40 },
  logo: { width: 140, height: 140, borderRadius: 28 },
  wordmark: {
    fontSize: 28,
    fontWeight: "500",
    letterSpacing: 8,
    marginTop: 12,
    color: theme.colors.text,
  },
  tagline: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.secondaryText,
    textAlign: "center",
  },
  horizonWrap: {
    position: "absolute",
    top: "50%",
    left: -45,
    right: -45,
    height: 90,
    alignItems: "center",
  },
  horizonLine: {
    width: "110%",
    height: 2,
    borderRadius: 2,
    transform: [{ rotate: "-4deg" }],
  },
  horizonGlow: {
    width: 260,
    height: 35,
    marginTop: -18,
    borderRadius: 130,
    backgroundColor: "rgba(94,76,255,0.20)",
    shadowColor: "#6D5CFF",
    shadowOpacity: 0.9,
    shadowRadius: 28,
  },
  bottomBlock: { marginTop: "auto", paddingBottom: 16 },
  welcomeTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
    textAlign: "center",
    color: theme.colors.text,
  },
  welcomeCopy: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.secondaryText,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 20,
  },
  googleButton: {
    height: 54,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    shadowColor: "#5B63FF",
    shadowOpacity: 0.18,
    shadowRadius: 18,
  },
  googleText: { color: "#111827", fontSize: 16, fontWeight: "700" },
  googleTextDisabled: { color: "#6B7280" },
  pressed: { transform: [{ scale: 0.985 }], opacity: 0.94 },
  disabled: { opacity: 0.72 },
  error: {
    color: theme.colors.error,
    fontSize: 13,
    textAlign: "center",
    marginBottom: 10,
  },
  legalRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: 10,
    marginTop: 18,
  },
  legalText: {
    flex: 1,
    color: theme.colors.secondaryText,
    fontSize: 11,
    lineHeight: 16,
  },
  legalLink: { color: "#8178FF" },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 18,
    gap: 12,
  },
  line: { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.15)" },
  dividerText: { color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: "500" },
  emailContainer: { width: "100%", gap: 12 },
  emailInputWrapper: { position: "relative", justifyContent: "center" },
  inputIcon: { position: "absolute", left: 16, zIndex: 10 },
  input: {
    height: 54,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    color: "#FFF",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 16,
    textAlign: "center",
  },
  inputWithIcon: {
    textAlign: "left",
    paddingLeft: 46,
  },
  primaryBtn: {
    height: 54,
    borderRadius: 14,
    backgroundColor: "#315CFF",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  otpPrompt: {
    color: "#FFF",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 4,
  },
  otpActions: { flexDirection: "row", gap: 12 },
  backBtn: {
    flex: 1,
    height: 54,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnText: { color: "#FFF", fontSize: 15, fontWeight: "600" },
});
