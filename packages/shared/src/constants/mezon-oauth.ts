/**
 * Tells `/auth/mezon/callback` whether to finish login or profile sync.
 * Stored in `localStorage` (not `sessionStorage`) so the OAuth popup can read
 * the same value as the opener window.
 */
export const MEZONLY_OAUTH_ACTION_KEY = "mezonly_oauth_action";

export type MezonlyOauthAction = "login" | "sync";

/** Login OAuth result (BroadcastChannel). */
export const MEZON_OAUTH_RESULT_CHANNEL = "mezon-oauth-result";

/** Profile sync OAuth result (BroadcastChannel). */
export const MEZON_SYNC_RESULT_CHANNEL = "mezon-sync-result";
