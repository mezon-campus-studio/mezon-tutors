"use client";

import { ROUTES, type TutorProfile } from "@mezon-tutors/shared";
import dayjs from "dayjs";
import { Check, Eye, X } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Skeleton,
} from "@/components/ui";
import StatusBadge from "./StatusBadge";

type ApplicationsTableProps = {
  applications: TutorProfile[];
  isLoading?: boolean;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  approvingId?: string | null;
  rejectingId?: string | null;
};

const formatDate = (date: Date | string) => {
  const d = dayjs(date);
  return d.isValid() ? d.format("MMM DD, YYYY") : "—";
};

const getInitials = (firstName?: string, lastName?: string) => {
  const f = firstName?.[0]?.toUpperCase() ?? "";
  const l = lastName?.[0]?.toUpperCase() ?? "";
  return `${f}${l}` || "T";
};

export default function ApplicationsTable({
  applications,
  isLoading,
  onApprove,
  onReject,
  approvingId,
  rejectingId,
}: ApplicationsTableProps) {
  const t = useTranslations("Admin.TutorApplications.list");

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {(["r1", "r2", "r3", "r4", "r5"] as const).map((slot) => (
          <div
            key={slot}
            className="flex items-center gap-4 border-b border-slate-100 p-4 last:border-b-0"
          >
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">
        No applications found.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-5 py-3">{t("columns.tutorName")}</th>
              <th className="px-5 py-3">{t("columns.subject")}</th>
              <th className="px-5 py-3">{t("columns.date")}</th>
              <th className="px-5 py-3">{t("columns.status")}</th>
              <th className="px-5 py-3 text-right">{t("columns.actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {applications.map((app) => {
              const fullName =
                `${app.firstName ?? ""} ${app.lastName ?? ""}`.trim() || "—";
              const isApproving = approvingId === app.id;
              const isRejecting = rejectingId === app.id;
              const s = app.verificationStatus;
              const showApprove = s === "PENDING" || s === "REJECTED";
              const showReject = s === "PENDING" || s === "APPROVED";

              return (
                <tr key={app.id} className="bg-white hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border border-slate-200">
                        {app.avatar ? (
                          <AvatarImage src={app.avatar} alt={fullName} />
                        ) : null}
                        <AvatarFallback>
                          {getInitials(app.firstName, app.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-900">
                          {fullName}
                        </span>
                        <span className="text-xs text-slate-500">
                          {app.email || "—"}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-700">
                    {app.subject || "—"}
                  </td>
                  <td className="px-5 py-3 text-slate-700">
                    {formatDate(app.createdAt)}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={app.verificationStatus} />
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={ROUTES.ADMIN.TUTOR_APPLICATION_DETAIL(app.id)}
                      >
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      {onApprove && showApprove && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                          onClick={() => onApprove(app.id)}
                          disabled={isApproving || isRejecting}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      {onReject && showReject && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-rose-200 text-rose-700 hover:bg-rose-50"
                          onClick={() => onReject(app.id)}
                          disabled={isApproving || isRejecting}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
