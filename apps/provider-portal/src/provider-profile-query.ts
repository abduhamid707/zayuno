type ProviderAccount = { providerId?: string | null } | null;

export function providerProfileQuery(
  token: string,
  account: ProviderAccount,
  apiFetch: (path: string) => Promise<Response>,
) {
  return {
    queryKey: ['provider-details', token, account?.providerId],
    queryFn: async () => {
      // A successful login/session explicitly reports an unassigned account.
      // Do not infer this state from translated API errors or HTTP 403/404.
      if (account?.providerId === null) return null;
      return (await apiFetch('/api/v1/providers/me')).json();
    },
    enabled: !!token,
    retry: 1,
  };
}
