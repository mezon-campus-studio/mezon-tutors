"use client";

import {
  BLOG_PUBLISH_STATUS_FILTERS,
  ROUTES,
  type BlogPublishStatusFilter,
} from "@mezon-tutors/shared";
import { BookOpen, Search } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { useAdminBlogMetrics, useAdminBlogs } from "@/services";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "secondary",
  PUBLISHED: "default",
  REJECTED: "destructive",
  CLOSED: "outline",
};

export default function AdminBlogsView() {
  const t = useTranslations("Admin.Blogs");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<BlogPublishStatusFilter>("all");
  const { data: posts = [], isLoading } = useAdminBlogs(status);
  const { data: metrics } = useAdminBlogMetrics();

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return posts;
    return posts.filter(
      (post) =>
        post.slug.toLowerCase().includes(query) ||
        post.title.toLowerCase().includes(query) ||
        (post.excerpt?.toLowerCase().includes(query) ?? false),
    );
  }, [posts, search]);

  return (
    <div className="mx-auto w-full max-w-[1280px] p-4 md:p-6 lg:p-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
          <p className="mt-1 text-sm text-slate-600">{t("description")}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <MetricCard title={t("metrics.pending")} value={metrics?.pending ?? 0} />
          <MetricCard title={t("metrics.pendingUpdates")} value={metrics?.pendingUpdates ?? 0} />
          <MetricCard title={t("metrics.published")} value={metrics?.published ?? 0} />
          <MetricCard title={t("metrics.closed")} value={metrics?.closed ?? 0} />
          <MetricCard title={t("metrics.rejected")} value={metrics?.rejected ?? 0} />
          <MetricCard title={t("metrics.total")} value={metrics?.total ?? 0} />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="pl-9"
            />
          </div>
          <Select
            value={status}
            onValueChange={(value) => setStatus(value as BlogPublishStatusFilter)}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue>{(value: string) => t(`statusFilter.${value}`)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {BLOG_PUBLISH_STATUS_FILTERS.map((item) => (
                <SelectItem key={item} value={item}>
                  {t(`statusFilter.${item}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("list.title")}</CardTitle>
            <CardDescription>{t("list.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <p className="text-sm text-slate-500">{t("loading")}</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-slate-500">{t("empty")}</p>
            ) : (
              filtered.map((post) => (
                <Link
                  key={post.id}
                  href={ROUTES.ADMIN.BLOG_DETAIL(post.id)}
                  className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 transition hover:border-violet-200 hover:bg-violet-50/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-slate-900">{post.title}</p>
                      <Badge variant={STATUS_VARIANT[post.publishStatus] ?? "outline"}>
                        {t(`publishStatus.${post.publishStatus}`)}
                      </Badge>
                      {post.updateReviewStatus === "PENDING" ? (
                        <Badge variant="secondary">
                          {t("publishStatus.UPDATE_PENDING")}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="line-clamp-2 text-xs text-slate-500">{post.excerpt ?? "—"}</p>
                    <p className="text-[11px] text-slate-400">
                      {dayjs(post.createdAt).format("DD/MM/YYYY HH:mm")} · /blogs/{post.slug}
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 text-xs font-semibold text-violet-700">
                    <BookOpen className="size-4" />
                    {t("list.review")}
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
