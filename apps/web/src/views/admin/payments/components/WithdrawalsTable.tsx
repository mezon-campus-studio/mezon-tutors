"use client";

import type { AdminWalletWithdrawalApiItem } from "@mezon-tutors/shared";
import dayjs from "dayjs";
import { MoreHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Skeleton,
} from "@/components/ui";
import { useApproveWithdrawal, useRejectWithdrawal } from "@/services";
import WalletWithdrawDialog from "@/views/main/wallet/components/WalletWithdrawDialog";

export type Withdrawal = AdminWalletWithdrawalApiItem;

type WithdrawalsTableProps = {
  withdrawals: Withdrawal[];
  isLoading?: boolean;
};

const formatDate = (date: Date | string | null) => {
  if (!date) return "—";
  const d = dayjs(date);
  return d.isValid() ? d.format("DD/MM/YYYY HH:mm") : "—";
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
};

const ACTIVE_WITHDRAWAL_STATUSES = ["PENDING", "APPROVED", "PROCESSING"];

export default function WithdrawalsTable({
  withdrawals,
  isLoading,
}: WithdrawalsTableProps) {
  const t = useTranslations("Admin.Payments.withdrawals");
  const approveMutation = useApproveWithdrawal();
  const rejectMutation = useRejectWithdrawal();
  const [approvingWithdrawal, setApprovingWithdrawal] =
    useState<Withdrawal | null>(null);
  const [rejectingWithdrawal, setRejectingWithdrawal] =
    useState<Withdrawal | null>(null);
  const [detailWithdrawal, setDetailWithdrawal] =
    useState<Withdrawal | null>(null);

  const handleApprove = async (params: {
    adminNote?: string;
    paymentProofUrl?: string;
    paymentProofPublicId?: string;
  }) => {
    if (!approvingWithdrawal) return;

    try {
      await approveMutation.mutateAsync({
        id: approvingWithdrawal.id,
        adminNote: params.adminNote,
        paymentProofUrl: params.paymentProofUrl,
        paymentProofPublicId: params.paymentProofPublicId,
      });
      toast.success(t("approveDialog.success"));
      setApprovingWithdrawal(null);
    } catch (error) {
      console.error(error);
      toast.error(t("approveDialog.error"));
    }
  };

  const handleReject = async (params: { adminNote?: string }) => {
    if (!rejectingWithdrawal) return;

    try {
      await rejectMutation.mutateAsync({
        id: rejectingWithdrawal.id,
        adminNote: params.adminNote,
      });
      toast.success(t("rejectDialog.success"));
      setRejectingWithdrawal(null);
    } catch (error) {
      console.error(error);
      toast.error(t("rejectDialog.error"));
    }
  };

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {(["r1", "r2", "r3"] as const).map((slot) => (
          <div
            key={slot}
            className="flex items-center gap-4 border-b border-slate-100 p-4 last:border-b-0"
          >
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (withdrawals.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">
        {t("empty")}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-5 py-3">{t("columns.tutor")}</th>
              <th className="px-5 py-3">{t("columns.amount")}</th>
              <th className="px-5 py-3">{t("columns.status")}</th>
              <th className="px-5 py-3">{t("columns.requestedAt")}</th>
              <th className="px-5 py-3">{t("columns.processedAt")}</th>
              <th className="px-5 py-3">{t("columns.note")}</th>
              <th className="px-5 py-3 text-right">{t("columns.actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {withdrawals.map((item) => {
              const tutorName = item.tutor?.username || t("unknownTutor");
              const canApprove = ACTIVE_WITHDRAWAL_STATUSES.includes(item.status);
              const isActionDisabled =
                !canApprove || approveMutation.isPending || rejectMutation.isPending;

              return (
                <tr key={item.id} className="bg-white hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-900">
                        {tutorName}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3 font-semibold text-slate-900">
                    {formatCurrency(item.amount)}
                  </td>

                  <td className="px-5 py-3">
                    {(() => {
                      const status = item.status;
                      const statusStyles: Record<string, string> = {
                        PENDING: "bg-amber-100 text-amber-800 border-amber-200",
                        COMPLETED:
                          "bg-emerald-100 text-emerald-800 border-emerald-200",
                        REJECTED: "bg-rose-100 text-rose-800 border-rose-200",
                        PROCESSING: "bg-blue-100 text-blue-800 border-blue-200",
                        APPROVED:
                          "bg-indigo-100 text-indigo-800 border-indigo-200",
                      };
                      const cls =
                        statusStyles[status] ||
                        "bg-slate-100 text-slate-800 border-slate-200";

                      return (
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}
                        >
                          {t(`status.${status}`)}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-5 py-3 text-slate-700">
                    {formatDate(item.createdAt)}
                  </td>
                  <td className="px-5 py-3 text-slate-700">
                    {formatDate(item.processedAt)}
                  </td>
                  <td className="px-5 py-3 text-slate-700">
                    {item.adminNote || "—"}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end" className="min-w-40">
                        <DropdownMenuItem
                          onClick={() => setDetailWithdrawal(item)}
                        >
                          {t("actions.detail")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={isActionDisabled}
                          onClick={() => setApprovingWithdrawal(item)}
                        >
                          {t("actions.accept")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          disabled={isActionDisabled}
                          onClick={() => setRejectingWithdrawal(item)}
                        >
                          {t("actions.reject")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {approvingWithdrawal ? (
        <WalletWithdrawDialog
          mode="review"
          open={Boolean(approvingWithdrawal)}
          onOpenChange={(open) => {
            if (!open) setApprovingWithdrawal(null);
          }}
          maxAmount={approvingWithdrawal.amount}
          reviewDetails={{
            amount: approvingWithdrawal.amount,
            bankName: approvingWithdrawal.bankName,
            bankAccountNumber: approvingWithdrawal.bankAccountNumber,
            bankAccountName: approvingWithdrawal.bankAccountName,
            tutorName: approvingWithdrawal.tutor?.username || t("unknownTutor"),
          }}
          reviewLabels={{
            title: t("approveDialog.title"),
            description: t("approveDialog.description"),
            tutor: t("approveDialog.tutor"),
            transferAmount: t("approveDialog.transferAmount"),
            bankSectionTitle: t("approveDialog.bankSectionTitle"),
            bankName: t("columns.bank"),
            accountNumber: t("columns.accountNumber"),
            accountName: t("columns.accountHolder"),
            confirm: t("approveDialog.confirm"),
            cancel: t("approveDialog.cancel"),
            submitting: t("approveDialog.submitting"),
            proofTitle: t("approveDialog.proofTitle"),
            proofHint: t("approveDialog.proofHint"),
            proofUploadPrompt: t("approveDialog.proofUploadPrompt"),
            proofUploading: t("approveDialog.proofUploading"),
            proofDropHere: t("approveDialog.proofDropHere"),
            proofRequiredError: t("approveDialog.proofRequiredError"),
            proofUploadError: t("approveDialog.proofUploadError"),
            proofTooLargeError: t("approveDialog.proofTooLargeError"),
            proofInvalidTypeError: t("approveDialog.proofInvalidTypeError"),
            proofRemove: t("approveDialog.proofRemove"),
          }}
          isConfirming={approveMutation.isPending}
          onConfirm={handleApprove}
        />
      ) : null}

      {rejectingWithdrawal ? (
        <WalletWithdrawDialog
          mode="review"
          reviewAction="reject"
          open={Boolean(rejectingWithdrawal)}
          onOpenChange={(open) => {
            if (!open) setRejectingWithdrawal(null);
          }}
          maxAmount={rejectingWithdrawal.amount}
          reviewDetails={{
            amount: rejectingWithdrawal.amount,
            tutorName: rejectingWithdrawal.tutor?.username || t("unknownTutor"),
          }}
          reviewLabels={{
            title: t("rejectDialog.title"),
            description: t("rejectDialog.description"),
            tutor: t("rejectDialog.tutor"),
            transferAmount: t("rejectDialog.transferAmount"),
            bankSectionTitle: "",
            bankName: "",
            accountNumber: "",
            accountName: "",
            noteLabel: t("rejectDialog.noteLabel"),
            notePlaceholder: t("rejectDialog.notePlaceholder"),
            noteRequiredError: t("rejectDialog.noteRequiredError"),
            confirm: t("rejectDialog.confirm"),
            cancel: t("rejectDialog.cancel"),
            submitting: t("rejectDialog.submitting"),
          }}
          isConfirming={rejectMutation.isPending}
          onConfirm={handleReject}
        />
      ) : null}

      {detailWithdrawal ? (
        <WalletWithdrawDialog
          mode="review"
          reviewAction="detail"
          open={Boolean(detailWithdrawal)}
          onOpenChange={(open) => {
            if (!open) setDetailWithdrawal(null);
          }}
          maxAmount={detailWithdrawal.amount}
          reviewDetails={{
            amount: detailWithdrawal.amount,
            bankName: detailWithdrawal.bankName,
            bankAccountNumber: detailWithdrawal.bankAccountNumber,
            bankAccountName: detailWithdrawal.bankAccountName,
            tutorName: detailWithdrawal.tutor?.username || t("unknownTutor"),
            paymentProofUrl: detailWithdrawal.paymentProofUrl,
            adminNote: detailWithdrawal.adminNote,
            processedAt: detailWithdrawal.processedAt,
          }}
          reviewLabels={{
            title: t("detailDialog.title"),
            description: t("detailDialog.description"),
            tutor: t("detailDialog.tutor"),
            transferAmount: t("detailDialog.transferAmount"),
            bankSectionTitle: t("detailDialog.bankSectionTitle"),
            bankName: t("columns.bank"),
            accountNumber: t("columns.accountNumber"),
            accountName: t("columns.accountHolder"),
            confirm: t("detailDialog.close"),
            cancel: t("detailDialog.close"),
            submitting: t("detailDialog.close"),
            close: t("detailDialog.close"),
            noteLabel: t("detailDialog.noteLabel"),
            proofTitle: t("detailDialog.proofTitle"),
            viewProof: t("detailDialog.viewProof"),
            noProof: t("detailDialog.noProof"),
            copyProof: t("detailDialog.copyProof"),
            downloadProof: t("detailDialog.downloadProof"),
            copyProofSuccess: t("detailDialog.copyProofSuccess"),
            copyProofError: t("detailDialog.copyProofError"),
          }}
        />
      ) : null}
    </div>
  );
}
