import posthog from 'posthog-js';

export const POSTHOG_PROJECT_TOKEN = 'phc_zcCoK32AfWUoqbBLE63NHDrxycvKrtzKQFmsqECviw4G';
export const POSTHOG_HOST = 'https://us.i.posthog.com';
const BLOCKED_PROPERTY =
  /prompt|preview|message|content|email|phone|address|token|secret|password|card|cvv|otp/i;

function cleanProperties(properties?: Record<string, unknown>) {
  const safe: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(properties || {})) {
    if (BLOCKED_PROPERTY.test(key) || value === undefined) continue;
    if (
      value === null ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      safe[key] = value;
    } else if (typeof value === 'string') {
      safe[key] = value.slice(0, 120);
    }
  }
  return safe;
}

export function initProviderAnalytics() {
  if (typeof window === 'undefined') return;

  if (!(window as any).posthog || !(window as any).posthog.__loaded) {
    posthog.init(POSTHOG_PROJECT_TOKEN, {
      api_host: POSTHOG_HOST,
      person_profiles: 'always',
      autocapture: true,
      capture_pageview: true,
      capture_pageleave: true,
      mask_all_text: true,
      mask_all_element_attributes: true,
      session_recording: {
        maskAllInputs: true,
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
        ...cleanProperties(properties),
      });
    } catch (e) {
      console.warn('[Analytics] Failed to track action:', e);
    }
  },

  identifyProvider: (
    providerId: string,
    _email?: string,
    _providerName?: string,
  ) => {
    try {
      posthog.identify(providerId, {
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
