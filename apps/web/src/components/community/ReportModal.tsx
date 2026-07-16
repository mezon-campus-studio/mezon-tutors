"use client";

import { useAtomValue } from "jotai";
import { Flag } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@/components/ui";
import { communityApi } from "@/services";
import { isAuthenticatedAtom, isLoadingAtom } from "@/store";

const REPORT_REASONS = [
  "SPAM",
  "HARASSMENT",
  "INAPPROPRIATE",
  "MISINFORMATION",
  "OTHER",
] as const;

type ReportModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  onLoginRequired?: () => void;
};

export function ReportModal({
  open,
  onOpenChange,
  postId,
  onLoginRequired,
}: ReportModalProps) {
  const t = useTranslations("Community.report");
  const isAuthLoading = useAtomValue(isLoadingAtom);
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const [reason, setReason] = useState<string>("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!isAuthenticated) {
      onLoginRequired?.();
      return;
    }
    if (!reason) {
      toast.error(t("reasonRequired"));
      return;
    }
    setSubmitting(true);
    try {
      await communityApi.createReport({
        postId,
        reason: reason as
          | "SPAM"
          | "HARASSMENT"
          | "INAPPROPRIATE"
          | "MISINFORMATION"
          | "OTHER",
        description: description.trim() || undefined,
      });
      toast.success(t("success"));
      setReason("");
      setDescription("");
      onOpenChange(false);
    } catch {
      toast.error(t("failed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="size-4" />
              {t("title")}
            </DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("reasonLabel")}</Label>
              <Select value={reason} onValueChange={(v) => v && setReason(v)}>
                <SelectTrigger>
                  <SelectValue placeholder={t("reasonPlaceholder")}>
                    {reason ? t(`reasons.${reason}.label`) : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {REPORT_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {t(`reasons.${r}.label`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="report-description">{t("detailLabel")}</Label>
              <Textarea
                id="report-description"
                rows={3}
                placeholder={t("detailPlaceholder")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={1000}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="h-9 rounded-full px-4"
            >
              {t("cancel")}
            </Button>
            <Button
              variant="gradient"
              onClick={handleSubmit}
              disabled={submitting || !reason}
              className="h-9 rounded-full px-4"
            >
              {submitting ? t("submitting") : t("submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
