import SubscriptionPlanCheckoutSuccessPage from "@/views/main/checkout/subscription-plan/success";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  return <SubscriptionPlanCheckoutSuccessPage enrollmentId={id} />;
}
