"use client";

import { ROUTES, isCloudinaryVideoUrl } from "@mezon-tutors/shared";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import {
  useAdminTutorApplicationDetail,
  useAdminTutorStats,
  useApproveTutorApplication,
  useRejectTutorApplication,
} from "@/services";
import StatusBadge from "../components/StatusBadge";
import AdminNotesCard from "./components/AdminNotesCard";
import ApplicationMetaCard from "./components/ApplicationMetaCard";
import AvailabilityCard from "./components/AvailabilityCard";
import LessonChangeHistoryCard from "./components/LessonChangeHistoryCard";
import TutorStatsTab from "./components/TutorStatsTab";
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
  const tModals = useTranslations("AdminTutorApplicationDetail.modals");

  const [confirmAction, setConfirmAction] = useState<
    "approve" | "reject" | null
  >(null);
  const [emailNote, setEmailNote] = useState("");

  const { data, isLoading, error } = useAdminTutorApplicationDetail(id);
  const { data: statsData } = useAdminTutorStats(id);
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
  const willUploadIntroVideoToYoutube = isCloudinaryVideoUrl(profile.videoUrl);

  const closeConfirmDialog = () => {
    setConfirmAction(null);
    setEmailNote("");
  };

  const handleApprove = () => {
    const note = emailNote.trim() || undefined;
    approveMutation.mutate(
      { id: profile.id, note },
      { onSuccess: closeConfirmDialog },
    );
  };

  const handleReject = () => {
    const note = emailNote.trim() || undefined;
    rejectMutation.mutate(
      { id: profile.id, note },
      { onSuccess: closeConfirmDialog },
    );
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
        <hr className="my-4 border-slate-200" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-500">{t("sections.profileStats.joinedAt")}</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{formatDate(profile.createdAt)}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-500">{t("sections.profileStats.rating")}</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {profile.ratingCount > 0
                ? `${Number(profile.ratingAverage).toFixed(1)} (${profile.ratingCount})`
                : "—"}
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-500">{t("sections.profileStats.status")}</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {profile.activeStatus
                ? t("sections.profileStats.active")
                : t("sections.profileStats.inactive")}
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-500">{t("sections.profileStats.currentStudents")}</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {(statsData?.students.current ?? 0).toLocaleString("vi-VN")}
            </p>
          </div>
        </div>

        <Tabs defaultValue="application" className="w-full pt-5">
          <TabsList className="mb-6">
            <TabsTrigger value="application">
              {t("tabs.fullApplication")}
            </TabsTrigger>
            <TabsTrigger value="stats">
              {t("tabs.tutorStats")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="application" className="space-y-6">
            <div className="mb-6">
              <LessonChangeHistoryCard
                tutorId={profile.id}
                timezoneName={profile.timezone ?? "UTC"}
              />
            </div>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <div className="space-y-5 lg:col-span-2">
                <PersonalInfoCard profile={profile} />
                <VideoBioCard profile={profile} />
                <IdentityVerificationCard verification={identityVerification} tutorId={profile.id} />
                <ProfessionalDocumentsCard documents={professionalDocuments} tutorId={profile.id} />
                <AvailabilityCard profile={profile} availability={availability} />
              </div>
              <div className="space-y-5">
                <ApplicationMetaCard profile={profile} />
                <AdminNotesCard tutorId={profile.id} notes={adminNotes} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="stats">
            <TutorStatsTab
              tutorProfileId={profile.id}
              userId={profile.userId}
            />
          </TabsContent>
        </Tabs>

        <ConfirmDialog
          open={confirmAction === "approve"}
          onOpenChange={(open) => {
            if (!open) closeConfirmDialog();
          }}
          title={tApprove("title")}
          description={tApprove("description", { name: fullName })}
          loadingMessage={
            approveMutation.isPending && willUploadIntroVideoToYoutube
              ? tApprove("youtubeUploading")
              : undefined
          }
          confirmLabel={tApprove("confirm")}
          cancelLabel={tModals("cancel")}
          loading={approveMutation.isPending}
          onConfirm={handleApprove}
          emailNote={emailNote}
          onEmailNoteChange={setEmailNote}
          emailNoteLabel={tModals("emailNote.label")}
          emailNotePlaceholder={tModals("emailNote.placeholder")}
        />
        <ConfirmDialog
          open={confirmAction === "reject"}
          onOpenChange={(open) => {
            if (!open) closeConfirmDialog();
          }}
          title={tReject("title")}
          description={tReject("description", { name: fullName })}
          confirmLabel={tReject("confirm")}
          cancelLabel={tModals("cancel")}
          variant="destructive"
          loading={rejectMutation.isPending}
          onConfirm={handleReject}
          emailNote={emailNote}
          onEmailNoteChange={setEmailNote}
          emailNoteLabel={tModals("emailNote.label")}
          emailNotePlaceholder={tModals("emailNote.placeholder")}
        />
      </div>
    </div>
  );
}
