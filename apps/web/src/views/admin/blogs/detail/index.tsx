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
import {
  useAdminBlogDetail,
  useApproveBlogUpdate,
  useCloseBlog,
  usePublishBlog,
  useRejectBlog,
  useRejectBlogUpdate,
} from "@/services";
import { BlogContentHtml } from "@/components/blogs/BlogContentHtml";
import ConfirmDialog from "@/views/admin/tutor-applications/detail/components/ConfirmDialog";

type AdminBlogDetailViewProps = {
  blogId: string;
};

export default function AdminBlogDetailView({ blogId }: AdminBlogDetailViewProps) {
  const t = useTranslations("Admin.Blogs.detail");
  const { data: post, isLoading } = useAdminBlogDetail(blogId);
  const publishBlog = usePublishBlog();
  const rejectBlog = useRejectBlog();
  const closeBlog = useCloseBlog();
  const approveBlogUpdate = useApproveBlogUpdate();
  const rejectBlogUpdate = useRejectBlogUpdate();
  const [rejectReason, setRejectReason] = useState("");
  const [updateRejectReason, setUpdateRejectReason] = useState("");
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showApproveUpdateDialog, setShowApproveUpdateDialog] = useState(false);
  const [showRejectUpdateDialog, setShowRejectUpdateDialog] = useState(false);

  if (isLoading || !post) {
    return <p className="text-sm text-slate-500">{t("loading")}</p>;
  }

  const pendingUpdate = post.pendingUpdate;

  const handlePublish = async () => {
    try {
      await publishBlog.mutateAsync(blogId);
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
      await rejectBlog.mutateAsync({ id: blogId, reason: rejectReason.trim() });
      toast.success(t("rejectSuccess"));
      setShowRejectDialog(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("actionFailed"));
    }
  };

  const handleClose = async () => {
    try {
      await closeBlog.mutateAsync(blogId);
      toast.success(t("closeSuccess"));
      setShowCloseDialog(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("actionFailed"));
    }
  };

  const handleApproveUpdate = async () => {
    try {
      await approveBlogUpdate.mutateAsync(blogId);
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
      await rejectBlogUpdate.mutateAsync({
        id: blogId,
        reason: updateRejectReason.trim(),
      });
      toast.success(t("rejectUpdateSuccess"));
      setShowRejectUpdateDialog(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("actionFailed"));
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1280px] p-4 md:p-6 lg:p-8">
      <div className="space-y-6">
        <Link
          href={ROUTES.ADMIN.BLOGS}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="size-4" />
          {t("back")}
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{post.title}</h1>
              <Badge>{post.publishStatus}</Badge>
            </div>
            {post.excerpt ? (
              <p className="mt-1 text-sm text-slate-600">{post.excerpt}</p>
            ) : null}
            <p className="mt-2 text-xs text-slate-500">
              {t("submittedBy")} {post.createdBy?.username ?? "—"} ·{" "}
              {dayjs(post.createdAt).format("DD/MM/YYYY HH:mm")} ·{" "}
              {t("readTime", { minutes: post.readingTime })}
            </p>
          </div>

          {post.publishStatus === "PENDING" ? (
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setShowPublishDialog(true)} disabled={publishBlog.isPending}>
                {t("publish")}
              </Button>
              <Button variant="destructive" onClick={() => setShowRejectDialog(true)}>
                {t("reject")}
              </Button>
            </div>
          ) : null}
          {post.publishStatus === "PUBLISHED" ? (
            <Button variant="outline" onClick={() => setShowCloseDialog(true)} disabled={closeBlog.isPending}>
              {t("close")}
            </Button>
          ) : null}
          {post.publishStatus === "CLOSED" ? (
            <Button onClick={() => setShowPublishDialog(true)} disabled={publishBlog.isPending}>
              {t("republish")}
            </Button>
          ) : null}
        </div>

        {post.updateReviewStatus === "PENDING" && pendingUpdate ? (
          <Card className="border-amber-200 bg-amber-50/40">
            <CardHeader>
              <CardTitle className="text-base text-amber-900">
                {t("pendingUpdate.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-amber-900/90">{t("pendingUpdate.description")}</p>
              <div className="rounded-xl border border-amber-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">{pendingUpdate.title}</p>
                {pendingUpdate.excerpt ? (
                  <p className="mt-1 text-sm text-slate-600">{pendingUpdate.excerpt}</p>
                ) : null}
                {post.updateSubmittedAt ? (
                  <p className="mt-2 text-xs text-slate-500">
                    {t("pendingUpdate.submittedAt", {
                      date: dayjs(post.updateSubmittedAt).format("DD/MM/YYYY HH:mm"),
                    })}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => setShowApproveUpdateDialog(true)}
                  disabled={approveBlogUpdate.isPending}
                >
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
          <InfoCard title={t("sections.content")}>
            <BlogContentHtml content={post.content} className="text-sm" />
          </InfoCard>

          <div className="space-y-4">
            <InfoCard title={t("sections.tags")}>
              <div className="flex flex-wrap gap-2">
                {post.tags.length > 0 ? (
                  post.tags.map((tag) => (
                    <Badge key={tag.id} variant="secondary">
                      {tag.name}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">—</p>
                )}
              </div>
            </InfoCard>

            <InfoCard title={t("sections.images")}>
              <div className="grid gap-4 sm:grid-cols-2">
                {post.coverImageUrl ? (
                  <PreviewImage src={post.coverImageUrl} label={t("fields.coverImage")} />
                ) : null}
                {post.ogImageUrl ? (
                  <PreviewImage src={post.ogImageUrl} label={t("fields.ogImage")} />
                ) : null}
              </div>
            </InfoCard>
          </div>
        </div>

        {post.rejectedReason ? (
          <Card className="border-red-200 bg-red-50/50">
            <CardHeader>
              <CardTitle className="text-red-800">{t("rejectedReason")}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-red-700">{post.rejectedReason}</CardContent>
          </Card>
        ) : null}

        <ConfirmDialog
          open={showPublishDialog}
          onOpenChange={setShowPublishDialog}
          title={t("publishDialog.title")}
          description={t("publishDialog.description")}
          confirmLabel={t("publish")}
          onConfirm={handlePublish}
          loading={publishBlog.isPending}
        />

        <ConfirmDialog
          open={showRejectDialog}
          onOpenChange={setShowRejectDialog}
          title={t("rejectDialog.title")}
          description={t("rejectDialog.description")}
          confirmLabel={t("reject")}
          onConfirm={handleReject}
          loading={rejectBlog.isPending}
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
          loading={closeBlog.isPending}
          variant="destructive"
        />

        <ConfirmDialog
          open={showApproveUpdateDialog}
          onOpenChange={setShowApproveUpdateDialog}
          title={t("approveUpdateDialog.title")}
          description={t("approveUpdateDialog.description")}
          confirmLabel={t("approveUpdate")}
          onConfirm={handleApproveUpdate}
          loading={approveBlogUpdate.isPending}
        />

        <ConfirmDialog
          open={showRejectUpdateDialog}
          onOpenChange={setShowRejectUpdateDialog}
          title={t("rejectUpdateDialog.title")}
          description={t("rejectUpdateDialog.description")}
          confirmLabel={t("rejectUpdate")}
          onConfirm={handleRejectUpdate}
          loading={rejectBlogUpdate.isPending}
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
