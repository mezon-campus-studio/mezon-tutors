"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage, Button, Card, CardContent } from "@/components/ui";
import type { VerifiedTutorProfileDto } from "@mezon-tutors/shared";
import VideoPreview from "./VideoPreview";
import { useTranslations } from "next-intl";

function getInitials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0]?.toUpperCase())
      .join("")
      .slice(0, 2) || "U"
  );
}

export default function TutorPreviewCard({
  tutor,
}: {
  tutor: VerifiedTutorProfileDto | null;
}) {
  const t = useTranslations("Tutors.PreviewCard");

  if (!tutor) {
    return (
      <Card className="border-violet-100">
        <CardContent className="p-6 text-sm text-slate-500">{t("selectTutor")}</CardContent>
      </Card>
    );
  }

  const name = `${tutor.firstName} ${tutor.lastName}`.trim();

  return (
    <Card className="border-primary border py-0">
      <CardContent className="space-y-5 p-4">
        <div className="flex items-center gap-3">
          <Avatar className="size-14">
            {tutor.avatar ? (
              <AvatarImage
                src={tutor.avatar}
                alt={name}
              />
            ) : null}
            <AvatarFallback>{getInitials(name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold text-slate-900">{name}</h3>
            <p className="text-sm text-slate-600">{tutor.subject}</p>
          </div>
        </div>

        <VideoPreview
          videoUrl={tutor.videoUrl}
          height={260}
        />

        <div className="flex flex-col gap-3">
          <Link href={`/tutors/${tutor.id}`}>
            <Button className="w-full h-10 text-base">{t("seeProfile")}</Button>
          </Link>
          <Button
            variant="outline"
            className="w-full h-10 text-base"
          >
            {t("viewSchedule")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
