'use client';

import { Suspense, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChannelAppAuthView } from '@/components/auth/ChannelAppAuthView';
import { getAuthDataFromURL } from '@/lib/mezon-channel-app';
import { authService } from '@/services';

function MezonChannelAppAuthHandlerInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const authData = getAuthDataFromURL(searchParams);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authData) {
      return;
    }

    let cancelled = false;

    void authService
      .loginWithChannelAppHash(authData)
      .then(() => {
        if (!cancelled) {
          router.replace(pathname);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Đăng nhập thất bại');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authData, router]);

  if (!authData) {
    return null;
  }

  if (error) {
    return (
      <ChannelAppAuthView
        variant="error"
        message={error}
      />
    );
  }

  return <ChannelAppAuthView variant="loading" />;
}

export function MezonChannelAppAuthHandler() {
  return (
    <Suspense fallback={null}>
      <MezonChannelAppAuthHandlerInner />
    </Suspense>
  );
}
