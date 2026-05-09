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

let isInitialized = false;

export const isAuthenticatedAtom = atom((get) => {
  return Boolean(get(accessTokenAtom));
});

export const initAuthAtom = atom(null, async (get, set) => {
  if (isInitialized) return;
  isInitialized = true;

  const token = get(accessTokenAtom);

  if (!token) {
    set(isLoadingAtom, false);
    return;
  }

  try {
    const data = await authService.getMe();
    set(userAtom, toAuthUser(data));
  } catch (error) {
    set(accessTokenAtom, null);
    set(userAtom, null);
  } finally {
    set(isLoadingAtom, false);
  }
});