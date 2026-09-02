# Zayuno Mobile

Expo 57 + React Native consumer chat. The client talks only to the Zayuno consumer API; Gemini and live provider/catalog access stay server-side. The UI renders the final assistant text and keeps saved chats behind the hamburger menu.

## Local run

```powershell
cd D:\works\DEV\Zayuno
pnpm install
pnpm --filter @zayuno/api dev

# another terminal
cd apps\mobile
Copy-Item .env.example .env
pnpm start -- --lan --clear
```

Set `EXPO_PUBLIC_API_URL` to a URL reachable from the phone. When omitted in development, the app derives the Metro host IP and uses port `4000`. Expo Go is acceptable for UI checks; Google OAuth should be verified in an Android/iOS development build because redirect identity belongs to the installed native app.

## Required public mobile configuration

- `EXPO_PUBLIC_API_URL`
- `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
- `EXPO_PUBLIC_TERMS_URL`
- `EXPO_PUBLIC_PRIVACY_URL`

Client IDs and URLs are public identifiers. Never put Gemini keys, Google client secrets, JWT secrets, refresh tokens, or provider credentials in `EXPO_PUBLIC_*` variables.

## Checks

```powershell
pnpm --filter mobile lint
cd apps\mobile
npx expo-doctor@latest
pnpm exec expo export --platform android
```

Package/bundle identifiers are `uz.zayuno.mobile`. Production builds require configured EAS credentials and a new native build after auth/plugin changes.
