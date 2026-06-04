"use client";

import { formatToCurrency, ROUTES } from "@mezon-tutors/shared";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import { Clock, CreditCard } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { Button, Card, CardContent, Skeleton } from "@/components/ui";
import { useCurrency, useUserTimezone } from "@/hooks";
import { formatInstantRangeLabels } from "@/lib/timezone";
import { useGetStudentPendingPaymentBookings } from "@/services";

dayjs.extend(duration);

function formatCountdown(expiresAt: string, nowMs: number): string {
  const diff = new Date(expiresAt).getTime() - nowMs;
  if (diff <= 0) {
    return "";
  }
  const d = dayjs.duration(diff);
  const minutes = Math.floor(d.asMinutes());
  const seconds = d.seconds();
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function PendingBookingCard({
  booking,
  nowMs,
}: {
  booking: {
    id: string;
    tutorName: string;
    tutorAvatarUrl: string | null;
    startAt: string;
    durationMinutes: number;
    grossAmount: number;
    currency: string;
    paymentUrl: string | null;
    expiresAt: string;
  };
  nowMs: number;
}) {
  const t = useTranslations("Dashboard.pendingBookings");
  const userTimezone = useUserTimezone();
  const countdown = formatCountdown(booking.expiresAt, nowMs);
  const isExpired = !countdown;
  const { dateLabel, timeLabel } = formatInstantRangeLabels(
    booking.startAt,
    booking.durationMinutes,
    userTimezone,
  );

  const handlePay = () => {
    if (booking.paymentUrl && typeof window !== "undefined") {
      window.location.assign(booking.paymentUrl);
    }
  };

  return (
    <Card className="overflow-hidden border-violet-100">
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <Image
            src={booking.tutorAvatarUrl || "/images/default-avatar.png"}
            alt={booking.tutorName}
            width={48}
            height={48}
            className="size-12 shrink-0 rounded-xl object-cover"
          />
          <div className="min-w-0 space-y-1">
            <p className="font-semibold text-slate-900">
              {t("lessonWith", { tutor: booking.tutorName })}
            </p>
            <p className="text-sm text-slate-600">
              {dateLabel}
              <span className="mx-1.5 text-slate-300">·</span>
              {timeLabel}
            </p>
            <p className="text-xs text-slate-500">
              {t("duration", { minutes: booking.durationMinutes })}
              {" · "}
              {formatToCurrency(
                booking.currency as Parameters<typeof formatToCurrency>[0],
                booking.grossAmount,
              )}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
          <div
            className={`inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
              isExpired
                ? "bg-slate-100 text-slate-600"
                : "bg-amber-100 text-amber-900"
            }`}
          >
            <Clock className="size-3.5" />
            {isExpired
              ? t("expired")
              : t("expiresIn", { time: countdown })}
          </div>
          <Button
            size="sm"
            className="gap-2"
            disabled={isExpired || !booking.paymentUrl}
            onClick={handlePay}
          >
            <CreditCard className="size-4" />
            {t("payNow")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PendingBookingsPage() {
  const t = useTranslations("Dashboard.pendingBookings");
  const { data, isPending, isError, refetch } = useGetStudentPendingPaymentBookings();
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const hasExpired = (data?.items ?? []).some(
      (item) => new Date(item.expiresAt).getTime() <= nowMs,
    );
    if (hasExpired) {
      void refetch();
    }
  }, [data?.items, nowMs, refetch]);

  const activeItems = useMemo(() => {
    return (data?.items ?? []).filter(
      (item) => new Date(item.expiresAt).getTime() > nowMs,
    );
  }, [data?.items, nowMs]);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <header className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-wider text-violet-600">
          {t("eyebrow")}
        </p>
        <h1 className="text-2xl font-extrabold text-slate-900">{t("title")}</h1>
        <p className="text-sm text-slate-600">{t("subtitle")}</p>
      </header>

      {isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="p-6 text-sm text-destructive">
            Failed to load pending bookings.
          </CardContent>
        </Card>
      ) : activeItems.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="space-y-2 p-8 text-center">
            <p className="text-lg font-semibold text-slate-900">
              {t("empty.title")}
            </p>
            <p className="text-sm text-slate-600">{t("empty.description")}</p>
            <Button variant="outline" className="mt-4">
              <Link href={ROUTES.TUTOR.INDEX}>Browse tutors</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {activeItems.map((booking) => (
            <PendingBookingCard
              key={booking.id}
              booking={booking}
              nowMs={nowMs}
            />
          ))}
        </div>
      )}
    </div>
  );
}
