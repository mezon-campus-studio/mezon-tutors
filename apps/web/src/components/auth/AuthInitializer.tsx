"use client";

import { useEffect } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { initAuthAtom } from "@/store/auth.atom";
import { accessTokenAtom } from "@/store/token.atom";

export default function AuthInitializer() {
  const initAuth = useSetAtom(initAuthAtom);
  const token = useAtomValue(accessTokenAtom);
  const hasToken = Boolean(token);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("oauth") === "success" || params.get("sync") === "success") {
      return;
    }
    void initAuth();
  }, [initAuth, hasToken]);

  return null;
}
