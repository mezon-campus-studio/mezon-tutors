'use client';

import { useEffect } from 'react';
import { useSetAtom } from 'jotai';
import { BecomeTutorGuard } from '@/components/guards/BecomeTutorGuard';
import { isEditingRejectedProfileAtom } from '@/store';

export default function BecomeTutorClientLayout({ children }: { children: React.ReactNode }) {
  const setIsEditing = useSetAtom(isEditingRejectedProfileAtom);

  useEffect(() => {
    return () => {
      setIsEditing(false);
    };
  }, [setIsEditing]);

  return <BecomeTutorGuard>{children}</BecomeTutorGuard>;
}
