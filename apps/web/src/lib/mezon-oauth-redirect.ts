const API_BASE = process.env.NEXT_PUBLIC_API_ENDPOINT;

function buildOAuthStartUrl(path: string, params: Record<string, string>) {
  const search = new URLSearchParams(params);
  return `${API_BASE}${path}?${search.toString()}`;
}

export function redirectToMezonOAuthLogin(timezone: string, returnTo?: string) {
  const redirectPath = returnTo || window.location.pathname || "/";
  window.location.href = buildOAuthStartUrl("/auth/mezon-oauth/start", {
    returnTo: redirectPath,
    timezone,
  });
}

export function redirectToMezonOAuthSync() {
  const returnTo = window.location.pathname || "/";
  window.location.href = buildOAuthStartUrl("/auth/mezon-oauth/sync/start", {
    returnTo,
  });
}
