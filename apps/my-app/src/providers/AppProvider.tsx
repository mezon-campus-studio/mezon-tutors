'use client';

import type { ReactNode } from 'react';
import AuthInitializer from '@/components/auth/AuthInitializer';
import GlobalChatBubble from '@/components/common/chat/GlobalChatBubble';
import { Toaster } from '@/components/ui';
import { MezonLightProvider } from './MezonLightProvider';
import { QueryProvider } from './QueryProvider';

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <AuthInitializer />
      <MezonLightProvider>
        {children}
        <GlobalChatBubble />
        <Toaster />
      </MezonLightProvider>
    </QueryProvider>
  );
}
