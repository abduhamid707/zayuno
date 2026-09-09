import posthog from 'posthog-js';

export const POSTHOG_PROJECT_TOKEN = 'phc_zcCoK32AfWUoqbBLE63NHDrxycvKrtzKQFmsqECviw4G';
export const POSTHOG_HOST = 'https://us.i.posthog.com';

export function initAdminAnalytics() {
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
          app_name: 'Zayuno Admin Console',
          app_type: 'web_admin',
        });
      },
    });
  } else {
    (window as any).posthog.register({
      app_name: 'Zayuno Admin Console',
      app_type: 'web_admin',
    });
  }
}

export const adminAnalytics = {
  trackAction: (action: string, properties?: Record<string, unknown>) => {
    try {
      posthog.capture(action, {
        source: 'admin_portal',
        ...properties,
      });
    } catch (e) {
      console.warn('[Analytics] Failed to track action:', e);
    }
  },

  identifyAdmin: (adminId: string, email?: string, role?: string) => {
    try {
      posthog.identify(adminId, {
        email,
        role: role || 'admin',
        app_type: 'web_admin',
      });
    } catch (e) {
      console.warn('[Analytics] Failed to identify admin:', e);
    }
  },

  reset: () => {
    try {
      posthog.reset();
    } catch (e) {
      console.warn('[Analytics] Failed to reset admin:', e);
    }
  },
};

export default posthog;
