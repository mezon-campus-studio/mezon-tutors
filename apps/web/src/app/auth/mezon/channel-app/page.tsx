import { Suspense } from "react";
import ChannelAppAuthPage from "@/components/auth/ChannelAppAuthPage";
import { ChannelAppAuthView } from "@/components/auth/ChannelAppAuthView";

export default function Page() {
  return (
    <Suspense fallback={<ChannelAppAuthView variant="loading" />}>
      <ChannelAppAuthPage />
    </Suspense>
  );
}
