"use client";

import { RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { redirectToMezonOAuthSync } from "@/lib/mezon-oauth-redirect";
import { Button } from "@/components/ui";

type MezonSyncButtonProps = {
  className?: string;
  onSuccessAction?: () => void;
};

export function MezonSyncButton({ className }: MezonSyncButtonProps) {
  const t = useTranslations("Dashboard");

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={`h-9 w-full rounded-xl border-violet-200 bg-white text-xs font-semibold text-violet-700 shadow-sm hover:bg-violet-50 ${className ?? ""}`}
      onClick={redirectToMezonOAuthSync}
    >
      <RefreshCw className="mr-1.5 size-3.5 shrink-0" />
      {t("sidebar.syncMezon.label")}
    </Button>
  );
}
