import { atom } from "jotai";
import { authService, clearAuthSession } from "@/services";
import { accessTokenAtom } from "./token.atom";

function isUnauthorizedError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error as { status: unknown }).status === 401
  );
}

export type AuthUser = {
  id: string;
  mezonUserId: string;
  email: string | null;
  username: string | null;
  firstName?: string | null;
  lastName?: string | null;
  avatar?: string | null;
  role?: string | null;
  idToken?: string | null;
  timezone?: string | null;
};

export type AuthUserSource = {
  sub?: string;
  id?: string;
  mezonUserId?: string;
  email?: string | null;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  avatar?: string | null;
  role?: string | null;
  idToken?: string | null;
  timezone?: string | null;
};

export function toAuthUser(source: AuthUserSource): AuthUser {
  return {
    id: source.sub ?? source.id ?? "",
    mezonUserId: source.mezonUserId ?? "",
    email: source.email ?? "",
    username: source.username ?? "",
    firstName: source.firstName ?? null,
    lastName: source.lastName ?? null,
    avatar: source.avatar ?? null,
    role: source.role ?? null,
    idToken: source.idToken ?? null,
    timezone: source.timezone ?? null,
  };
}

export const userAtom = atom<AuthUser | null>(null);
export const isLoadingAtom = atom<boolean>(true);

let loadUserInFlight: Promise<void> | null = null;

export const isAuthenticatedAtom = atom((get) => {
  return Boolean(get(accessTokenAtom));
});

export const initAuthAtom = atom(null, async (get, set) => {
  if (loadUserInFlight) {
    await loadUserInFlight;
    return;
  }
  loadUserInFlight = (async () => {
    set(isLoadingAtom, true);
    try {
      let token = get(accessTokenAtom);

      if (!token) {
        try {
          ({ accessToken: token } = await authService.refreshToken());
        } catch (error) {
          if (isUnauthorizedError(error)) {
            clearAuthSession();
            set(userAtom, null);
          } else {
            set(userAtom, null);
          }
          return;
        }
      }

      try {
        const data = await authService.getMe();
        if (!get(accessTokenAtom)) {
          return;
        }
        set(userAtom, toAuthUser(data));
      } catch (error) {
        if (isUnauthorizedError(error)) {
          clearAuthSession();
          set(userAtom, null);
        } else {
          set(userAtom, null);
        }
      }
    } finally {
      set(isLoadingAtom, false);
      loadUserInFlight = null;
    }
  })();
  await loadUserInFlight;
});
