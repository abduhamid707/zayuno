import posthog from 'posthog-js';

export const POSTHOG_PROJECT_TOKEN = 'phc_zcCoK32AfWUoqbBLE63NHDrxycvKrtzKQFmsqECviw4G';
export const POSTHOG_HOST = 'https://us.i.posthog.com';

export function initProviderAnalytics() {
  if (typeof window === 'undefined') return;

  if (!(window as any).posthog || !(window as any).posthog.__loaded) {
    posthog.init(POSTHOG_PROJECT_TOKEN, {
      api_host: POSTHOG_HOST,
      person_profiles: 'always',
      autocapture: true,
      capture_pageview: true,
      capture_pageleave: true,
      session_recording: {
        maskAllInputs: false,
      },
      loaded: (ph) => {
        ph.register({
          app_name: 'Zayuno Provider Portal',
          app_type: 'web_provider_portal',
        });
      },
    });
  } else {
    (window as any).posthog.register({
      app_name: 'Zayuno Provider Portal',
      app_type: 'web_provider_portal',
    });
  }
}

export const providerAnalytics = {
  trackAction: (action: string, properties?: Record<string, unknown>) => {
    try {
      posthog.capture(action, {
        source: 'provider_portal',
        ...properties,
      });
    } catch (e) {
      console.warn('[Analytics] Failed to track action:', e);
    }
  },

  identifyProvider: (providerId: string, email?: string, providerName?: string) => {
    try {
      posthog.identify(providerId, {
        email,
        provider_name: providerName,
        app_type: 'web_provider_portal',
      });
    } catch (e) {
      console.warn('[Analytics] Failed to identify provider:', e);
    }
  },

  reset: () => {
    try {
      posthog.reset();
    } catch (e) {
      console.warn('[Analytics] Failed to reset provider:', e);
    }
  },
};

export default posthog;
