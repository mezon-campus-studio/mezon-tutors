"use client";

import { useTranslations } from "next-intl";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import {
  useAdminCommunityReports,
  useApproveCommunityReport,
  useDismissCommunityReport,
} from "@/services/admin-community-report/admin-community-report.api";
import ConfirmDialog from "../tutor-applications/detail/components/ConfirmDialog";

const STATUS_OPTIONS = [
  { value: "ALL", labelKey: "all" },
  { value: "PENDING", labelKey: "pending" },
  { value: "REVIEWED", labelKey: "reviewed" },
  { value: "DISMISSED", labelKey: "dismissed" },
  { value: "ACTION_TAKEN", labelKey: "actionTaken" },
] as const;

function statusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "PENDING") return "secondary";
  if (status === "ACTION_TAKEN") return "default";
  if (status === "DISMISSED") return "outline";
  if (status === "REVIEWED") return "outline";
  return "outline";
}

export default function AdminCommunityReportsView() {
  const t = useTranslations("Admin.CommunityReports");
  const [status, setStatus] = useState("all");
  const [confirmState, setConfirmState] = useState<{
    action: "approve" | "dismiss";
    id: string;
  } | null>(null);

  const { data: items = [], isLoading } = useAdminCommunityReports(status);
  const approveMutation = useApproveCommunityReport();
  const dismissMutation = useDismissCommunityReport();

  const handleApprove = async (id: string) => {
    try {
      await approveMutation.mutateAsync(id);
      toast.success(t("approveSuccess"));
      return true;
    } catch {
      toast.error(t("actionFailed"));
      return false;
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await dismissMutation.mutateAsync(id);
      toast.success(t("dismissSuccess"));
      return true;
    } catch {
      toast.error(t("actionFailed"));
      return false;
    }
  };

  const handleConfirm = async () => {
    if (!confirmState) return;
    const success =
      confirmState.action === "approve"
        ? await handleApprove(confirmState.id)
        : await handleDismiss(confirmState.id);
    if (success) setConfirmState(null);
  };

  return (
    <div className="mx-auto w-full max-w-[1280px] p-4 md:p-6">
      <div className="mb-6 flex flex-col gap-1">
        <h2 className="text-2xl font-bold text-slate-900">{t("title")}</h2>
        <p className="text-sm text-slate-600">{t("description")}</p>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Select
            value={status}
            onValueChange={(v) => v && setStatus(v)}
          >
            <SelectTrigger className="h-10 w-40">
              <SelectValue
                placeholder={t("statusFilter.all")}
              >
                {t(`statusFilter.${STATUS_OPTIONS.find((o) => o.value === status)?.labelKey ?? status}`)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {t(`statusFilter.${opt.labelKey}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-slate-500">
          {t("count", { count: items.length })}
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[800px] text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">{t("table.reporter")}</th>
                  <th className="px-4 py-3 font-medium">{t("table.author")}</th>
                  <th className="px-4 py-3 font-medium">{t("table.reason")}</th>
                  <th className="px-4 py-3 font-medium">{t("table.content")}</th>
                  <th className="px-4 py-3 font-medium">{t("table.status")}</th>
                  <th className="px-4 py-3 font-medium">{t("table.date")}</th>
                  <th className="px-4 py-3 font-medium">{t("table.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      …
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      {t("empty")}
                    </td>
                  </tr>
                ) : (
                  items.map((item) => {
                    const isPending = item.status === "PENDING";
                    const busy =
                      approveMutation.isPending || dismissMutation.isPending;

                    return (
                      <tr key={item.id} className="border-t align-top">
                        <td className="px-4 py-4">
                          <p className="font-medium text-slate-900">
                            {item.reporter.username}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-medium text-slate-900">
                            {item.post?.author.username ?? "—"}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-medium">
                            {t(`reasons.${item.reason}`)}
                          </p>
                          {item.description ? (
                            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                              {item.description}
                            </p>
                          ) : null}
                        </td>
                        <td className="max-w-[200px] px-4 py-4">
                          <p className="line-clamp-2 text-xs text-muted-foreground">
                            {item.post?.content ?? "—"}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <Badge variant={statusVariant(item.status)}>
                            {t(`status.${item.status}`)}
                          </Badge>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-xs text-muted-foreground">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-4">
                          {isPending ? (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                disabled={busy}
                                onClick={() =>
                                  setConfirmState({
                                    action: "approve",
                                    id: item.id,
                                  })
                                }
                              >
                                {t("approve")}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={busy}
                                onClick={() =>
                                  setConfirmState({
                                    action: "dismiss",
                                    id: item.id,
                                  })
                                }
                              >
                                {t("dismiss")}
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmState?.action === "approve"}
        onOpenChange={(open) => {
          if (!open)
            setConfirmState((c) =>
              c?.action === "approve" ? null : c,
            );
        }}
        title={t("confirmApprove.title")}
        description={t("confirmApprove.description")}
        confirmLabel={t("confirmApprove.confirm")}
        cancelLabel={t("confirmApprove.cancel")}
        loading={approveMutation.isPending}
        onConfirm={handleConfirm}
        variant="destructive"
      />
      <ConfirmDialog
        open={confirmState?.action === "dismiss"}
        onOpenChange={(open) => {
          if (!open)
            setConfirmState((c) =>
              c?.action === "dismiss" ? null : c,
            );
        }}
        title={t("confirmDismiss.title")}
        description={t("confirmDismiss.description")}
        confirmLabel={t("confirmDismiss.confirm")}
        cancelLabel={t("confirmDismiss.cancel")}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
