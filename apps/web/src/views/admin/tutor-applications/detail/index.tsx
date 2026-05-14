"use client";

import { ROUTES } from "@mezon-tutors/shared";
import dayjs from "dayjs";
import { ArrowLeft, Check, X } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Spinner,
} from "@/components/ui";
import {
  useAdminTutorApplicationDetail,
  useApproveTutorApplication,
  useRejectTutorApplication,
} from "@/services";
import StatusBadge from "../components/StatusBadge";
import AdminNotesCard from "./components/AdminNotesCard";
import ApplicationMetaCard from "./components/ApplicationMetaCard";
import AvailabilityCard from "./components/AvailabilityCard";
import ConfirmDialog from "./components/ConfirmDialog";
import IdentityVerificationCard from "./components/IdentityVerificationCard";
import PersonalInfoCard from "./components/PersonalInfoCard";
import ProfessionalDocumentsCard from "./components/ProfessionalDocumentsCard";
import VideoBioCard from "./components/VideoBioCard";

type AdminTutorApplicationDetailViewProps = {
  id: string;
};

const formatDate = (date: Date | string | null | undefined) => {
  if (!date) return "—";
  const d = dayjs(date);
  return d.isValid() ? d.format("MMM DD, YYYY") : "—";
};

const getInitials = (firstName?: string, lastName?: string) => {
  const f = firstName?.[0]?.toUpperCase() ?? "";
  const l = lastName?.[0]?.toUpperCase() ?? "";
  return `${f}${l}` || "T";
};

export default function AdminTutorApplicationDetailView({
  id,
}: AdminTutorApplicationDetailViewProps) {
  const t = useTranslations("AdminTutorApplicationDetail");
  const tActions = useTranslations("AdminTutorApplicationDetail.actions");
  const tApprove = useTranslations(
    "AdminTutorApplicationDetail.modals.approve",
  );
  const tReject = useTranslations("AdminTutorApplicationDetail.modals.reject");

  const [confirmAction, setConfirmAction] = useState<
    "approve" | "reject" | null
  >(null);

  const { data, isLoading, error } = useAdminTutorApplicationDetail(id);
  const approveMutation = useApproveTutorApplication();
  const rejectMutation = useRejectTutorApplication();

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Spinner className="h-6 w-6 text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto w-full max-w-[1280px] p-6">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          {t("error")}
        </div>
      </div>
    );
  }

  const { profile, adminNotes, professionalDocuments, identityVerification, availability } =
    data;
  const fullName =
    `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim() || "—";
  const status = profile.verificationStatus;
  const showApprove = status === "PENDING" || status === "REJECTED";
  const showReject = status === "PENDING" || status === "APPROVED";

  const handleApprove = () => {
    approveMutation.mutate(profile.id, {
      onSuccess: () => {
        setConfirmAction(null);
      },
    });
  };

  const handleReject = () => {
    rejectMutation.mutate(profile.id, {
      onSuccess: () => {
        setConfirmAction(null);
      },
    });
  };

  return (
    <div className="mx-auto w-full max-w-[1280px] p-4 md:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href={ROUTES.ADMIN.TUTOR_APPLICATIONS}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
          <span className="text-xs text-slate-500">{t("breadcrumbs")}</span>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 border border-slate-200">
              {profile.avatar ? (
                <AvatarImage src={profile.avatar} alt={fullName} />
              ) : null}
              <AvatarFallback>
                {getInitials(profile.firstName, profile.lastName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">{fullName}</h1>
                <StatusBadge status={profile.verificationStatus} />
              </div>
              <p className="mt-1 text-sm text-slate-600">
                {profile.subject || "—"}
                {profile.country ? ` · ${profile.country}` : ""}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {t("submittedAt", {
                  date: formatDate(profile.createdAt),
                  id: profile.id.slice(0, 8),
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {showReject ? (
              <Button
                variant="outline"
                className="border-rose-200 text-rose-700 hover:bg-rose-50"
                onClick={() => setConfirmAction("reject")}
                disabled={rejectMutation.isPending || approveMutation.isPending}
              >
                <X className="h-4 w-4" />
                {tActions("reject")}
              </Button>
            ) : null}
            {showApprove ? (
              <Button
                onClick={() => setConfirmAction("approve")}
                disabled={approveMutation.isPending || rejectMutation.isPending}
              >
                <Check className="h-4 w-4" />
                {tActions("approve")}
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <PersonalInfoCard profile={profile} />
          <VideoBioCard profile={profile} />
          <IdentityVerificationCard verification={identityVerification} />
          <ProfessionalDocumentsCard documents={professionalDocuments} />
          <AvailabilityCard profile={profile} availability={availability} />
        </div>
        <div className="space-y-5">
          <ApplicationMetaCard profile={profile} />
          <AdminNotesCard tutorId={profile.id} notes={adminNotes} />
        </div>
      </div>

      <ConfirmDialog
        open={confirmAction === "approve"}
        onOpenChange={(open) => (open ? null : setConfirmAction(null))}
        title={tApprove("title")}
        description={tApprove("description", { name: fullName })}
        confirmLabel={tApprove("confirm")}
        loading={approveMutation.isPending}
        onConfirm={handleApprove}
      />
      <ConfirmDialog
        open={confirmAction === "reject"}
        onOpenChange={(open) => (open ? null : setConfirmAction(null))}
        title={tReject("title")}
        description={tReject("description", { name: fullName })}
        confirmLabel={tReject("confirm")}
        variant="destructive"
        loading={rejectMutation.isPending}
        onConfirm={handleReject}
      />
    </div>
  );
}
