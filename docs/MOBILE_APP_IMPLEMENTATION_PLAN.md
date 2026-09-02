# Zayuno Mobile — current implementation

## Product rules

- The home screen stays minimal: brand header, one greeting, four example prompts, and the composer.
- The hamburger opens saved chat conversations.
- There is no order-history page, bottom tab bar, provider-card registry, or dynamic card response contract.
- The mobile client renders the assistant's final text without inventing a second presentation layer.
- Conversations are stored locally on the device and recent messages are sent as context on the next turn.

## Backend rules

- `POST /api/v1/consumer/chat` is the only consumer assistant endpoint.
- Gemini writes the final user-facing response.
- Provider, service, availability, and price claims must come from Zayuno's existing live provider/catalog services.
- The consumer layer does not expose a separate order-history or capabilities endpoint.
- Google identity is verified by the API and mobile session tokens remain in SecureStore.

## Verification

- Mobile TypeScript check
- Android Expo export
- Expo Doctor
- API build and health check
- Authenticated chat E2E after Google development-build authentication is available
