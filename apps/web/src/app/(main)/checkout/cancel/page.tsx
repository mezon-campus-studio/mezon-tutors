import { Suspense } from 'react';
import CheckoutCancelPage from '@/views/main/checkout/cancel';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <CheckoutCancelPage />
    </Suspense>
  );
}
