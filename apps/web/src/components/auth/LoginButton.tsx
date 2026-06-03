"use client";

import { Button } from "../ui";
import { isLoadingAtom, isAuthenticatedAtom } from "@/store/auth.atom";
import { useAtomValue } from "jotai";

type LoginButtonProps = {
  label: string;
};

export function LoginButton({ label }: LoginButtonProps) {

  const isAuthLoading = useAtomValue(isLoadingAtom);
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);

  const handleLoginClick = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_ENDPOINT}/auth/mezon-oauth/start`;
  };

  if (isAuthLoading || isAuthenticated) return null;

  return (
    <Button
      type="button"
      className="group relative inline-flex h-9 items-center justify-center overflow-hidden rounded-full bg-[linear-gradient(110deg,#7c3aed_0%,#a855f7_50%,#ec4899_100%)] px-6 text-sm font-semibold tracking-wide text-white shadow-md shadow-violet-300/40 transition-all duration-300 hover:shadow-lg hover:shadow-violet-400/50 active:scale-[0.97]"
      onClick={() => {
        void handleLoginClick();
      }}
    >
      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(110deg,transparent_30%,rgba(255,255,255,0.35)_50%,transparent_70%)] transition-transform duration-700 ease-out group-hover:translate-x-full" />
      <span className="relative">{label}</span>
    </Button>
  );
}
