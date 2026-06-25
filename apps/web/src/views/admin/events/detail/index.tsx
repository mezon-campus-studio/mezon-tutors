"use client";

import { ROUTES } from "@mezon-tutors/shared";
import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import dayjs from "dayjs";
import { toast } from "sonner";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { pickEventContent } from "@/lib/event-view";
import {
  useAdminEventDetail,
  useApproveEventUpdate,
  useCloseEvent,
  usePublishEvent,
  useRejectEvent,
  useRejectEventUpdate,
} from "@/services";
import ConfirmDialog from "@/views/admin/tutor-applications/detail/components/ConfirmDialog";

type AdminEventDetailViewProps = {
  eventId: string;
};

export default function AdminEventDetailView({ eventId }: AdminEventDetailViewProps) {
  const t = useTranslations("Admin.Events.detail");
  const tPublishStatus = useTranslations("Admin.Events.publishStatus");
  const { data: event, isLoading } = useAdminEventDetail(eventId);
  const publishEvent = usePublishEvent();
  const rejectEvent = useRejectEvent();
  const closeEvent = useCloseEvent();
  const approveEventUpdate = useApproveEventUpdate();
  const rejectEventUpdate = useRejectEventUpdate();
  const [rejectReason, setRejectReason] = useState("");
  const [updateRejectReason, setUpdateRejectReason] = useState("");
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showApproveUpdateDialog, setShowApproveUpdateDialog] = useState(false);
  const [showRejectUpdateDialog, setShowRejectUpdateDialog] = useState(false);

  if (isLoading || !event) {
    return <p className="text-sm text-slate-500">{t("loading")}</p>;
  }

  const content = pickEventContent(event, "vi");

  const handlePublish = async () => {
    try {
      await publishEvent.mutateAsync(eventId);
      toast.success(t("publishSuccess"));
      setShowPublishDialog(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("actionFailed"));
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error(t("rejectReasonRequired"));
      return;
    }
    try {
      await rejectEvent.mutateAsync({ id: eventId, reason: rejectReason.trim() });
      toast.success(t("rejectSuccess"));
      setShowRejectDialog(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("actionFailed"));
    }
  };

  const handleClose = async () => {
    try {
      await closeEvent.mutateAsync(eventId);
      toast.success(t("closeSuccess"));
      setShowCloseDialog(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("actionFailed"));
    }
  };

  const handleApproveUpdate = async () => {
    try {
      await approveEventUpdate.mutateAsync(eventId);
      toast.success(t("approveUpdateSuccess"));
      setShowApproveUpdateDialog(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("actionFailed"));
    }
  };

  const handleRejectUpdate = async () => {
    if (!updateRejectReason.trim()) {
      toast.error(t("rejectReasonRequired"));
      return;
    }
    try {
      await rejectEventUpdate.mutateAsync({
        id: eventId,
        reason: updateRejectReason.trim(),
      });
      toast.success(t("rejectUpdateSuccess"));
      setShowRejectUpdateDialog(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("actionFailed"));
    }
  };

  const pendingUpdateContent = event.pendingUpdate
    ? pickEventContent(
        {
          ...event,
          startAt: event.pendingUpdate.startAt,
          endAt: event.pendingUpdate.endAt ?? null,
          doorsOpenAt: event.pendingUpdate.doorsOpenAt ?? null,
          registrationUrl: event.pendingUpdate.registrationUrl,
          coverImageUrl: event.pendingUpdate.coverImageUrl,
          ogImageUrl: event.pendingUpdate.ogImageUrl,
          content: {
            vi: event.pendingUpdate.contentVi,
            en: event.pendingUpdate.contentEn ?? null,
          },
        },
        "vi",
      )
    : null;

  return (
    <div className="mx-auto w-full max-w-[1280px] p-4 md:p-6 lg:p-8">
    <div className="space-y-6">
      <Link
        href={ROUTES.ADMIN.EVENTS}
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="size-4" />
        {t("back")}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">
              {content.title.replace(/\n/g, " ")}
            </h1>
            <Badge>{tPublishStatus(event.publishStatus)}</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-600">{content.tagline}</p>
          <p className="mt-2 text-xs text-slate-500">
            {t("submittedBy")} {event.createdBy?.username ?? "—"} ·{" "}
            {dayjs(event.createdAt).format("DD/MM/YYYY HH:mm")}
          </p>
        </div>

        {event.publishStatus === "PENDING" ? (
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setShowPublishDialog(true)} disabled={publishEvent.isPending}>
              {t("publish")}
            </Button>
            <Button variant="destructive" onClick={() => setShowRejectDialog(true)}>
              {t("reject")}
            </Button>
          </div>
        ) : null}
        {event.publishStatus === "PUBLISHED" ? (
          <Button variant="outline" onClick={() => setShowCloseDialog(true)} disabled={closeEvent.isPending}>
            {t("close")}
          </Button>
        ) : null}
        {event.publishStatus === "CLOSED" ? (
          <Button onClick={() => setShowPublishDialog(true)} disabled={publishEvent.isPending}>
            {t("republish")}
          </Button>
        ) : null}
      </div>

      {event.updateReviewStatus === "PENDING" && event.pendingUpdate && pendingUpdateContent ? (
        <Card className="border-amber-200 bg-amber-50/40">
          <CardHeader>
            <CardTitle className="text-base text-amber-900">{t("pendingUpdate.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-amber-900/90">{t("pendingUpdate.description")}</p>
            <div className="rounded-xl border border-amber-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-900">
                {pendingUpdateContent.title.replace(/\n/g, " ")}
              </p>
              <p className="mt-1 text-sm text-slate-600">{pendingUpdateContent.tagline}</p>
              <p className="mt-2 text-xs text-slate-500">
                {dayjs(event.pendingUpdate.startAt).format("DD/MM/YYYY HH:mm")}
                {event.updateSubmittedAt
                  ? ` · ${t("pendingUpdate.submittedAt", {
                      date: dayjs(event.updateSubmittedAt).format("DD/MM/YYYY HH:mm"),
                    })}`
                  : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setShowApproveUpdateDialog(true)} disabled={approveEventUpdate.isPending}>
                {t("approveUpdate")}
              </Button>
              <Button variant="destructive" onClick={() => setShowRejectUpdateDialog(true)}>
                {t("rejectUpdate")}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <InfoCard title={t("sections.schedule")}>
          <InfoRow label={t("fields.startAt")} value={dayjs(event.startAt).format("DD/MM/YYYY HH:mm")} />
          {event.endAt ? (
            <InfoRow label={t("fields.endAt")} value={dayjs(event.endAt).format("DD/MM/YYYY HH:mm")} />
          ) : null}
          {event.doorsOpenAt ? (
            <InfoRow
              label={t("fields.doorsOpenAt")}
              value={dayjs(event.doorsOpenAt).format("DD/MM/YYYY HH:mm")}
            />
          ) : null}
          <InfoRow label={t("fields.registrationUrl")} value={event.registrationUrl} />
          <InfoRow
            label={t("fields.location")}
            value={
              event.location?.venue
                ? `${event.location.venue}, ${event.location.city ?? ""}`
                : event.location?.isOnline
                  ? t("online")
                  : t("registrationOnly")
            }
          />
        </InfoCard>

        <InfoCard title={t("sections.content")}>
          <InfoRow label={t("fields.theme")} value={content.theme} />
          <InfoRow label={t("fields.price")} value={content.priceLabel ?? "—"} />
          <p className="text-sm leading-7 text-slate-600">{content.aboutBody}</p>
          {content.aboutHighlight ? (
            <p className="rounded-lg bg-violet-50 p-3 text-sm text-violet-900">
              {content.aboutHighlight}
            </p>
          ) : null}
        </InfoCard>
      </div>

      <InfoCard title={t("sections.images")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <PreviewImage src={event.coverImageUrl} label={t("fields.coverImage")} />
          <PreviewImage src={event.ogImageUrl} label={t("fields.ogImage")} />
        </div>
      </InfoCard>

      <InfoCard title={t("sections.organizers")}>
        <div className="grid gap-3 sm:grid-cols-2">
          {event.organizers.map((organizer) => (
            <div key={organizer.id} className="flex gap-3 rounded-xl border border-slate-200 p-3">
              <div className="relative size-16 shrink-0 overflow-hidden rounded-lg">
                <Image src={organizer.imageUrl} alt="" fill className="object-cover" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{organizer.name}</p>
                <p className="text-xs text-slate-500">{organizer.role}</p>
                {organizer.bio ? (
                  <p className="mt-1 line-clamp-2 text-xs text-slate-600">{organizer.bio}</p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </InfoCard>

      {event.galleryImages.length > 0 ? (
        <InfoCard title={t("sections.gallery")}>
          <div className="grid gap-3 sm:grid-cols-3">
            {event.galleryImages.map((image) => (
              <div key={image.id} className="overflow-hidden rounded-xl border border-slate-200">
                <div className="relative aspect-[4/3]">
                  <Image src={image.imageUrl} alt="" fill className="object-cover" />
                </div>
                {image.caption ? (
                  <p className="px-2 py-1.5 text-xs text-slate-600">{image.caption}</p>
                ) : null}
              </div>
            ))}
          </div>
        </InfoCard>
      ) : null}

      {event.rejectedReason ? (
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader>
            <CardTitle className="text-red-800">{t("rejectedReason")}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-red-700">{event.rejectedReason}</CardContent>
        </Card>
      ) : null}

      <ConfirmDialog
        open={showPublishDialog}
        onOpenChange={setShowPublishDialog}
        title={t("publishDialog.title")}
        description={t("publishDialog.description")}
        confirmLabel={t("publish")}
        onConfirm={handlePublish}
        loading={publishEvent.isPending}
      />

      <ConfirmDialog
        open={showRejectDialog}
        onOpenChange={setShowRejectDialog}
        title={t("rejectDialog.title")}
        description={t("rejectDialog.description")}
        confirmLabel={t("reject")}
        onConfirm={handleReject}
        loading={rejectEvent.isPending}
        variant="destructive"
        emailNote={rejectReason}
        onEmailNoteChange={setRejectReason}
        emailNoteLabel={t("rejectDialog.label")}
        emailNotePlaceholder={t("rejectDialog.placeholder")}
      />

      <ConfirmDialog
        open={showCloseDialog}
        onOpenChange={setShowCloseDialog}
        title={t("closeDialog.title")}
        description={t("closeDialog.description")}
        confirmLabel={t("close")}
        onConfirm={handleClose}
        loading={closeEvent.isPending}
        variant="destructive"
      />

      <ConfirmDialog
        open={showApproveUpdateDialog}
        onOpenChange={setShowApproveUpdateDialog}
        title={t("approveUpdateDialog.title")}
        description={t("approveUpdateDialog.description")}
        confirmLabel={t("approveUpdate")}
        onConfirm={handleApproveUpdate}
        loading={approveEventUpdate.isPending}
      />

      <ConfirmDialog
        open={showRejectUpdateDialog}
        onOpenChange={setShowRejectUpdateDialog}
        title={t("rejectUpdateDialog.title")}
        description={t("rejectUpdateDialog.description")}
        confirmLabel={t("rejectUpdate")}
        onConfirm={handleRejectUpdate}
        loading={rejectEventUpdate.isPending}
        variant="destructive"
        emailNote={updateRejectReason}
        onEmailNoteChange={setUpdateRejectReason}
        emailNoteLabel={t("rejectUpdateDialog.label")}
        emailNotePlaceholder={t("rejectUpdateDialog.placeholder")}
      />
    </div>
    </div>
  );
}

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">{label}</p>
      <p className="text-sm text-slate-800">{value}</p>
    </div>
  );
}

function PreviewImage({ src, label }: { src: string; label: string }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold text-slate-600">{label}</p>
      <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-slate-200">
        <Image src={src} alt="" fill className="object-cover" />
      </div>
    </div>
  );
}
