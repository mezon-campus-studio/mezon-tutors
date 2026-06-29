"use client";

import type { TutorProfile } from "@mezon-tutors/shared";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui";
import VideoPreview from "../../../../main/tutors/components/VideoPreview";

type VideoBioCardProps = {
  profile: TutorProfile;
};

export default function VideoBioCard({ profile }: VideoBioCardProps) {
  const t = useTranslations("AdminTutorApplicationDetail.sections.videoBio");

  return (
    <Card className="border-slate-200">
      <CardContent className="p-5">
        <h3 className="mb-4 text-base font-semibold text-slate-900">
          {t("title")}
        </h3>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <VideoPreview
            videoUrl={profile.videoUrl}
            height={260}
            title={profile.headline || t("videoPlaceholder")}
          />
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {t("aboutLabel")}
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {profile.headline || "—"}
              </p>
            </div>
            {profile.introduce ? (
              <p className="text-sm leading-relaxed text-slate-600">
                {profile.introduce}
              </p>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
