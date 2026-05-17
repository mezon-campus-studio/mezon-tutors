'use client';

import { useAtomValue } from 'jotai';
import { userAtom } from '@/store';
import StudentWalletView from './student/StudentWalletView';
import TutorWalletView from './tutor/TutorWalletView';

export default function WalletPage() {
  const user = useAtomValue(userAtom);
  const isTutor = user?.role === 'TUTOR';

  if (!isTutor) {
    return <StudentWalletView />;
  }

  return <TutorWalletView />;
}
