import { atom } from "jotai";
import { authService } from "@/services";
import { accessTokenAtom } from "./token.atom";

export type AuthUser = {
  id: string;
  mezonUserId: string;
  email: string | null;
  username: string | null;
  avatar?: string | null;
  role?: string | null;
  idToken?: string | null;
};

export type AuthUserSource = {
  sub?: string;
  id?: string;
  mezonUserId?: string;
  email?: string | null;
  username?: string | null;
  avatar?: string | null;
  role?: string | null;
  idToken?: string | null;
};

export function toAuthUser(source: AuthUserSource): AuthUser {
  return {
    id: source.sub ?? source.id ?? "",
    mezonUserId: source.mezonUserId ?? "",
    email: source.email ?? "",
    username: source.username ?? "",
    avatar: source.avatar ?? null,
    role: source.role ?? null,
    idToken: source.idToken ?? null,
  };
}

export const userAtom = atom<AuthUser | null>(null);
export const isLoadingAtom = atom<boolean>(true);

let loadUserInFlight: Promise<void> | null = null;

export const isAuthenticatedAtom = atom((get) => {
  return Boolean(get(accessTokenAtom));
});

export const initAuthAtom = atom(null, async (get, set) => {
  const token = get(accessTokenAtom);
  if (!token) {
    set(userAtom, null);
    set(isLoadingAtom, false);
    return;
  }
  if (loadUserInFlight) {
    await loadUserInFlight;
    return;
  }
  loadUserInFlight = (async () => {
    set(isLoadingAtom, true);
    try {
      const data = await authService.getMe();
      if (!get(accessTokenAtom)) {
        return;
      }
      set(userAtom, toAuthUser(data));
    } catch {
      set(accessTokenAtom, null);
      set(userAtom, null);
    } finally {
      set(isLoadingAtom, false);
      loadUserInFlight = null;
    }
  })();
  await loadUserInFlight;
});
