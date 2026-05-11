"use client";

import type { TutorProfile } from "@mezon-tutors/shared";
import { Mail, MapPin, Phone, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui";

type PersonalInfoCardProps = {
  profile: TutorProfile;
};

const Row = ({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) => (
  <div className="flex items-start gap-3">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
      <Icon className="h-4 w-4" />
    </div>
    <div className="flex min-w-0 flex-col">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <span className="truncate text-sm font-medium text-slate-900">
        {value || "—"}
      </span>
    </div>
  </div>
);

export default function PersonalInfoCard({ profile }: PersonalInfoCardProps) {
  const t = useTranslations(
    "AdminTutorApplicationDetail.sections.personalInfo",
  );
  const fullName =
    `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim() || "—";

  return (
    <Card className="border-slate-200">
      <CardContent className="p-5">
        <h3 className="mb-4 text-base font-semibold text-slate-900">
          {t("title")}
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Row icon={User} label={t("fullName")} value={fullName} />
          <Row icon={Mail} label={t("email")} value={profile.email} />
          <Row icon={Phone} label={t("phone")} value={profile.phone} />
          <Row icon={MapPin} label={t("address")} value={profile.country} />
        </div>
      </CardContent>
    </Card>
  );
}
