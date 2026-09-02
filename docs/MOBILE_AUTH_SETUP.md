# Mobile authentication setup

## Google Cloud OAuth clients

Create separate clients under one Google Cloud project:

- Android: package `uz.zayuno.mobile` plus debug/release SHA-1 fingerprints.
- iOS: bundle ID `uz.zayuno.mobile`.
- Web: used by web/testing flows and accepted by the backend allowlist.

Mobile `.env`:

```dotenv
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
EXPO_PUBLIC_API_URL=https://api.zayuno.uz
```

API server environment:

```dotenv
GOOGLE_CLIENT_ID=
GOOGLE_ANDROID_CLIENT_ID=
GOOGLE_IOS_CLIENT_ID=
GOOGLE_WEB_CLIENT_ID=
JWT_SECRET=
CONSUMER_REFRESH_TOKEN_SECRET=
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
```

`JWT_SECRET` and `CONSUMER_REFRESH_TOKEN_SECRET` must be different random values; the refresh secret must contain at least 32 characters. The server verifies Google issuer, audience, email verification, and token validity. Access tokens live for 15 minutes; rotating refresh sessions live for 30 days and are stored in Redis. Logout revokes the refresh session.

Google sign-in is deliberately disabled in the UI until a public client ID is present. There is no demo login or production bypass.
