# Zayuno mobile architecture

```text
Expo mobile chat
  -> authenticated consumer chat API
    -> Gemini conversation + context selection
      -> existing Providers / Catalog services
        -> published provider adapters
    -> final natural-language response
```

The mobile client never calls Gemini or provider APIs directly. It displays the final assistant text returned by the API and does not manufacture provider, catalog, quote, payment, or order cards.

The home screen is intentionally small. Saved conversations live behind the hamburger menu and are persisted locally with AsyncStorage. Authentication tokens remain in SecureStore.

The consumer API exposes authentication and chat only. Specific provider names, services, availability, locations, and prices must be grounded in data returned by Zayuno's existing provider and catalog services. Missing live data is reported honestly instead of being replaced with mock content.
