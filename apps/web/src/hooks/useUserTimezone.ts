"use client";

import { useAtomValue } from "jotai";
import { useMemo } from "react";
import {
  detectBrowserTimezone,
  resolveUserTimezone,
} from "@/lib/timezone";
import { userAtom } from "@/store";

export function useUserTimezone(): string {
  const user = useAtomValue(userAtom);
  return useMemo(
    () => resolveUserTimezone(user?.timezone, detectBrowserTimezone()),
    [user?.timezone],
  );
}
