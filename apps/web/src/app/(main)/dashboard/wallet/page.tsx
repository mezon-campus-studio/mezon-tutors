import type { Metadata } from "next";
import { ROUTES } from "@mezon-tutors/shared";
import { createNoIndexMetadata } from "@/lib/seo";
import { getSeoMessages } from "@/lib/seo-messages";
import { RoleGuard } from '@/components/guards/RoleGuard';
import WalletPage from '@/views/main/wallet';

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoMessages();
  return createNoIndexMetadata({
    title: seo.wallet.title,
    description: seo.wallet.description,
    path: ROUTES.DASHBOARD.WALLET,
  });
}

export default function Page() {
  return (
    <RoleGuard allowedRoles={['STUDENT', 'TUTOR', 'ADMIN']}>
      <WalletPage />
    </RoleGuard>
  );
}
