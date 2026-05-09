"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { authService } from "@/services";

const OAUTH_CHANNEL = "mezon-oauth-result";

type MezonAuthMessage =
  | {
      type: "MEZON_AUTH_SUCCESS";
      data: {
        user?: {
          id?: string;
          mezonUserId?: string;
          username?: string;
          email?: string | null;
          avatar?: string | null;
          idToken?: string | null;
        };
        accessToken: string;
        idToken?: string | null;
      };
    }
  | {
      type: "MEZON_AUTH_ERROR";
      error?: string;
    };

function sendResult(payload: MezonAuthMessage) {
  try {
    const channel = new BroadcastChannel(OAUTH_CHANNEL);
    channel.postMessage(payload);
    channel.close();
  } catch {
    // ignore
  }
}

export default function CallbackPage() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams?.get("code") ?? "";
    const state = searchParams?.get("state") ?? "";

    if (!code) {
      setError("Missing authorization code from Mezon.");
      return;
    }

    if (!state) {
      setError("Missing OAuth state.");
      return;
    }

    async function exchangeCode() {
      try {
        const exchangeData = await authService.exchangeCode(code, state);
        const { accessToken, user, idToken } = exchangeData;

        sendResult({
          type: "MEZON_AUTH_SUCCESS",
          data: { accessToken, user, idToken },
        });

        window.close();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unexpected error during login.";
        setError(message);

        sendResult({
          type: "MEZON_AUTH_ERROR",
          error: message,
        });
        setTimeout(() => window.close(), 500);
      }
    }

    void exchangeCode();
  }, [searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-white">
      <div className="rounded-lg border border-zinc-200 px-6 py-4 shadow-sm">
        <h1 className="mb-2 text-lg font-semibold text-zinc-900">
          Completing login with Mezon...
        </h1>
        {error ? (
          <p className="text-sm text-red-600">{error} You can close this window.</p>
        ) : (
          <p className="text-sm text-zinc-600">
            Please wait while we finish signing you in.
          </p>
        )}
      </div>
    </main>
  );
}
