import { RoleGuard } from '@/components/guards/RoleGuard';
import WalletPage from '@/views/main/wallet';

export default function Page() {
  return (
    <RoleGuard allowedRoles={['STUDENT', 'TUTOR']}>
      <WalletPage />
    </RoleGuard>
  );
}
