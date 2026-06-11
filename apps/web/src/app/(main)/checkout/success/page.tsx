import { Suspense } from 'react';
import CheckoutSuccessPage from '@/views/main/checkout/success';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <CheckoutSuccessPage />
    </Suspense>
  );
}
