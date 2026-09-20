type ProviderSession = { accessToken: string; user: any };

// Share pending requests across StrictMode effect remounts and timer restores.
// Refresh tokens rotate once, so concurrent refresh calls must be coalesced.
export function createProviderSessionClient(apiBase: string, request: typeof fetch = fetch) {
  let restoring: Promise<ProviderSession | null> | undefined;
  let refreshing: Promise<ProviderSession | null> | undefined;

  async function readSession(response: Response): Promise<ProviderSession> {
    if (!response.ok) throw new Error(`Session request failed (${response.status})`);
    const data = await response.json();
    if (!data?.accessToken || !data?.user) throw new Error('Invalid session response');
    return { accessToken: data.accessToken, user: data.user };
  }

  function refresh(): Promise<ProviderSession | null> {
    if (!refreshing) {
      refreshing = (async () => {
        const response = await request(`${apiBase}/api/v1/auth/refresh`, { method: 'POST', credentials: 'include' });
        if (response.status === 401) return null;
        return readSession(response);
      })().finally(() => { refreshing = undefined; });
    }
    return refreshing;
  }

  function restore(): Promise<ProviderSession | null> {
    if (!restoring) {
      restoring = (async () => {
        const response = await request(`${apiBase}/api/v1/auth/session`, { credentials: 'include' });
        if (response.status === 401) return refresh();
        return readSession(response);
      })().finally(() => { restoring = undefined; });
    }
    return restoring;
  }

  return { restore, refresh };
}
