'use client';

import { BecomeTutorGuard } from '@/components/guards/BecomeTutorGuard';

export default function BecomeTutorLayout({ children }: { children: React.ReactNode }) {
  return (
    <BecomeTutorGuard>{children}</BecomeTutorGuard>
  );
}