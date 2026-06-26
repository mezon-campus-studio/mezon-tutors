'use client';

import { useEffect } from 'react';
import { useSetAtom } from 'jotai';
import { BecomeTutorGuard } from '@/components/guards/BecomeTutorGuard';
import { isEditingRejectedProfileAtom, tutorProfileLivePreviewAtom, defaultTutorProfileLivePreviewPatch } from '@/store';

export default function BecomeTutorClientLayout({ children }: { children: React.ReactNode }) {
  const setIsEditing = useSetAtom(isEditingRejectedProfileAtom);
  const setLivePreview = useSetAtom(tutorProfileLivePreviewAtom);

  useEffect(() => {
    return () => {
      setIsEditing(false);
      setLivePreview(defaultTutorProfileLivePreviewPatch);
    };
  }, [setIsEditing, setLivePreview]);

  return <BecomeTutorGuard>{children}</BecomeTutorGuard>;
}
