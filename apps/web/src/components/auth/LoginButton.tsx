"use client";

import { LogIn } from "lucide-react";
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
      aria-label={label}
      className="group relative inline-flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[linear-gradient(110deg,#7c3aed_0%,#a855f7_50%,#ec4899_100%)] px-0 text-xs font-semibold tracking-wide text-white shadow-md shadow-violet-300/40 transition-all duration-300 min-[420px]:w-auto min-[420px]:px-3.5 sm:h-9 sm:px-6 sm:text-sm hover:shadow-lg hover:shadow-violet-400/50 active:scale-[0.97]"
      onClick={() => {
        void handleLoginClick();
      }}
    >
      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(110deg,transparent_30%,rgba(255,255,255,0.35)_50%,transparent_70%)] transition-transform duration-700 ease-out group-hover:translate-x-full" />
      <LogIn className="relative size-4 min-[420px]:hidden" aria-hidden />
      <span className="relative hidden min-[420px]:inline sm:inline">{label}</span>
    </Button>
  );
}
