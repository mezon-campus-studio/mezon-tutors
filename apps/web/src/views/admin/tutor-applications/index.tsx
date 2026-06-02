"use client";

import {
  ADMIN_TUTOR_APPLICATION_PAGE_SIZE,
  ADMIN_TUTOR_APPLICATION_STATUS_FILTERS,
  type AdminTutorApplicationStatusFilter,
  type TutorProfile,
} from "@mezon-tutors/shared";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import {
  useAdminTutorApplicationMetrics,
  useAdminTutorApplications,
  useApproveTutorApplication,
  useRejectTutorApplication,
} from "@/services";
import ApplicationsTable from "./components/ApplicationsTable";
import MetricsCards from "./components/MetricsCards";
import ConfirmDialog from "./detail/components/ConfirmDialog";
import TutorsPagination from "@/views/main/tutors/components/TutorsPagination";

const statusFilterLabel: Record<AdminTutorApplicationStatusFilter, string> = {
  all: "All",
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

type ConfirmAction = {
  type: "approve" | "reject";
  id: string;
  name: string;
};

const filterApplications = (
  applications: TutorProfile[],
  search: string,
  status: AdminTutorApplicationStatusFilter,
): TutorProfile[] => {
  const trimmed = search.trim().toLowerCase();
  return applications.filter((app) => {
    if (status !== "all" && app.verificationStatus !== status) return false;
    if (!trimmed) return true;
    const haystack = [
      app.firstName,
      app.lastName,
      app.email,
      app.subject,
      app.country,
      `${app.firstName ?? ""} ${app.lastName ?? ""}`,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(trimmed);
  });
};

const getFullName = (app: TutorProfile) =>
  `${app.firstName ?? ""} ${app.lastName ?? ""}`.trim() || "—";

export default function AdminTutorApplicationsView() {
  const t = useTranslations("Admin.TutorApplications");
  const tList = useTranslations("Admin.TutorApplications.list");
  const tApprove = useTranslations(
    "AdminTutorApplicationDetail.modals.approve",
  );
  const tReject = useTranslations("AdminTutorApplicationDetail.modals.reject");
  const tModals = useTranslations("AdminTutorApplicationDetail.modals");

  const [search, setSearch] = useState("");
  const [status, setStatus] =
    useState<AdminTutorApplicationStatusFilter>("all");
  const [page, setPage] = useState(1);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(
    null,
  );
  const [emailNote, setEmailNote] = useState("");

  const { data: applications = [], isLoading: isListLoading, isFetching } =
    useAdminTutorApplications();
  const { data: metrics, isLoading: isMetricsLoading } =
    useAdminTutorApplicationMetrics();
  const approveMutation = useApproveTutorApplication();
  const rejectMutation = useRejectTutorApplication();

  const filtered = useMemo(
    () => filterApplications(applications, search, status),
    [applications, search, status],
  );

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / ADMIN_TUTOR_APPLICATION_PAGE_SIZE),
  );
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (safePage - 1) * ADMIN_TUTOR_APPLICATION_PAGE_SIZE,
    safePage * ADMIN_TUTOR_APPLICATION_PAGE_SIZE,
  );

  const closeConfirmDialog = () => {
    setConfirmAction(null);
    setEmailNote("");
  };

  const handleApproveClick = (app: TutorProfile) => {
    setEmailNote("");
    setConfirmAction({
      type: "approve",
      id: app.id,
      name: getFullName(app),
    });
  };

  const handleRejectClick = (app: TutorProfile) => {
    setEmailNote("");
    setConfirmAction({
      type: "reject",
      id: app.id,
      name: getFullName(app),
    });
  };

  const handleConfirmApprove = () => {
    if (!confirmAction) return;
    const note = emailNote.trim() || undefined;
    approveMutation.mutate(
      { id: confirmAction.id, note },
      { onSuccess: closeConfirmDialog },
    );
  };

  const handleConfirmReject = () => {
    if (!confirmAction) return;
    const note = emailNote.trim() || undefined;
    rejectMutation.mutate(
      { id: confirmAction.id, note },
      { onSuccess: closeConfirmDialog },
    );
  };

  const handlePageChange = (nextPage: number) => {
    const clamped = Math.max(1, Math.min(totalPages, nextPage));
    setPage(clamped);
  };

  return (
    <div className="mx-auto w-full max-w-[1280px] p-4 md:p-6">
      <div className="mb-6 flex flex-col gap-1">
        <h2 className="text-2xl font-bold text-slate-900">{t("title")}</h2>
        <p className="text-sm text-slate-600">{t("description")}</p>
      </div>

      <div className="mb-6">
        <MetricsCards metrics={metrics} isLoading={isMetricsLoading} />
      </div>

      <div className="mb-4 flex flex-col items-stretch gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 items-center gap-3 md:max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder={t("searchPlaceholder")}
              className="pl-9"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value as AdminTutorApplicationStatusFilter);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-10 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ADMIN_TUTOR_APPLICATION_STATUS_FILTERS.map((value) => (
                <SelectItem key={value} value={value}>
                  {statusFilterLabel[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900">
          {tList("title")}
        </h3>
        <p className="text-xs text-slate-500">
          {tList("subtitle", {
            count: pageItems.length,
            total: filtered.length,
          })}
        </p>
      </div>

      <ApplicationsTable
        applications={pageItems}
        isLoading={isListLoading}
        onApprove={handleApproveClick}
        onReject={handleRejectClick}
        approvingId={
          approveMutation.isPending
            ? approveMutation.variables?.id ?? null
            : null
        }
        rejectingId={
          rejectMutation.isPending ? rejectMutation.variables?.id ?? null : null
        }
      />

      <div className="pt-4">
        <TutorsPagination
          page={page}
          totalPages={totalPages}
          isFetching={isFetching}
          onPageChangeAction={handlePageChange}
        />
      </div>

      <ConfirmDialog
        open={confirmAction?.type === "approve"}
        onOpenChange={(open) => {
          if (!open) closeConfirmDialog();
        }}
        title={tApprove("title")}
        description={tApprove("description", {
          name: confirmAction?.name ?? "",
        })}
        confirmLabel={tApprove("confirm")}
        cancelLabel={tModals("cancel")}
        loading={approveMutation.isPending}
        onConfirm={handleConfirmApprove}
        emailNote={emailNote}
        onEmailNoteChange={setEmailNote}
        emailNoteLabel={tModals("emailNote.label")}
        emailNotePlaceholder={tModals("emailNote.placeholder")}
      />
      <ConfirmDialog
        open={confirmAction?.type === "reject"}
        onOpenChange={(open) => {
          if (!open) closeConfirmDialog();
        }}
        title={tReject("title")}
        description={tReject("description", {
          name: confirmAction?.name ?? "",
        })}
        confirmLabel={tReject("confirm")}
        cancelLabel={tModals("cancel")}
        variant="destructive"
        loading={rejectMutation.isPending}
        onConfirm={handleConfirmReject}
        emailNote={emailNote}
        onEmailNoteChange={setEmailNote}
        emailNoteLabel={tModals("emailNote.label")}
        emailNotePlaceholder={tModals("emailNote.placeholder")}
      />
    </div>
  );
}
