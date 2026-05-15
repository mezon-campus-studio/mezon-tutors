"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { authService } from "@/services";
import {
  MEZONLY_OAUTH_ACTION_KEY,
  MEZON_OAUTH_RESULT_CHANNEL,
  MEZON_SYNC_RESULT_CHANNEL,
} from "@mezon-tutors/shared";

type MezonAuthSuccessMessage = {
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
};

type MezonAuthErrorMessage = {
  type: "MEZON_AUTH_ERROR";
  error?: string;
};

type MezonSyncSuccessMessage = {
  type: "MEZON_SYNC_SUCCESS";
  data: {
    user: {
      sub?: string;
      id?: string;
      mezonUserId?: string;
      username?: string;
      email?: string | null;
      avatar?: string | null;
      role?: string;
    };
    accessToken: string;
    idToken?: string | null;
  };
};

type MezonSyncErrorMessage = {
  type: "MEZON_SYNC_ERROR";
  error?: string;
};

function sendLoginResult(payload: MezonAuthSuccessMessage | MezonAuthErrorMessage) {
  try {
    const channel = new BroadcastChannel(MEZON_OAUTH_RESULT_CHANNEL);
    channel.postMessage(payload);
    channel.close();
  } catch {
    // ignore
  }
}

function sendSyncResult(payload: MezonSyncSuccessMessage | MezonSyncErrorMessage) {
  try {
    const channel = new BroadcastChannel(MEZON_SYNC_RESULT_CHANNEL);
    channel.postMessage(payload);
    channel.close();
  } catch {
    // ignore
  }
}

function postSyncResultToOpener(payload: MezonSyncSuccessMessage | MezonSyncErrorMessage) {
  try {
    const opener = window.opener;
    if (opener && !opener.closed) {
      opener.postMessage(payload, window.location.origin);
    }
  } catch {
    // ignore
  }
}

function consumeOauthAction(): 'sync' | 'login' {
  if (typeof localStorage === 'undefined') return 'login';
  try {
    const raw = localStorage.getItem(MEZONLY_OAUTH_ACTION_KEY);
    localStorage.removeItem(MEZONLY_OAUTH_ACTION_KEY);
    return raw === 'sync' ? 'sync' : 'login';
  } catch {
    return 'login';
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

    async function run() {
      const action = consumeOauthAction();

      try {
        if (action === 'sync') {
          const syncData = await authService.syncMezonProfileWithCode(code, state);
          const syncPayload: MezonSyncSuccessMessage = {
            type: 'MEZON_SYNC_SUCCESS',
            data: {
              user: syncData.user,
              accessToken: syncData.accessToken,
              idToken: syncData.idToken,
            },
          };
          sendSyncResult(syncPayload);
          postSyncResultToOpener(syncPayload);
          window.close();
          return;
        }

        const exchangeData = await authService.exchangeCode(code, state);
        const { accessToken, user, idToken } = exchangeData;

        sendLoginResult({
          type: 'MEZON_AUTH_SUCCESS',
          data: { accessToken, user, idToken },
        });

        window.close();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unexpected error during OAuth.';
        setError(message);

        if (action === 'sync') {
          const errPayload: MezonSyncErrorMessage = { type: 'MEZON_SYNC_ERROR', error: message };
          sendSyncResult(errPayload);
          postSyncResultToOpener(errPayload);
        } else {
          sendLoginResult({ type: 'MEZON_AUTH_ERROR', error: message });
        }
        setTimeout(() => window.close(), 500);
      }
    }

    void run();
  }, [searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-white">
      <div className="rounded-lg border border-zinc-200 px-6 py-4 shadow-sm">
        <h1 className="mb-2 text-lg font-semibold text-zinc-900">Completing login with Mezon...</h1>
        {error ? (
          <p className="text-sm text-red-600">{error} You can close this window.</p>
        ) : (
          <p className="text-sm text-zinc-600">Please wait while we finish signing you in.</p>
        )}
      </div>
    </main>
  );
}
