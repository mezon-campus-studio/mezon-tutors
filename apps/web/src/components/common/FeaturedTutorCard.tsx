import type { CSSProperties } from "react";
import { useMemo } from "react";
import {
  ECurrency,
  ESubject,
  formatToCurrency,
  getYoutubeEmbedUrl,
  isCloudinaryVideoUrl,
  ROUTES,
  type VerifiedTutorProfileDto,
} from "@mezon-tutors/shared";
import { ArrowRight, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAtomValue } from "jotai";
import { Button } from "@/components/ui";
import { useGetSubscriptionEligibility } from "@/services";
import { userAtom } from "@/store/auth.atom";

const HEADER_DOT_PATTERN: CSSProperties = {
  backgroundImage:
    "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
  backgroundSize: "16px 16px",
};

export const FEATURED_GRADIENTS = [
  "from-violet-500 via-purple-500 to-fuchsia-500",
  "from-indigo-500 via-violet-500 to-purple-500",
  "from-fuchsia-500 via-rose-500 to-orange-500",
  "from-purple-500 via-fuchsia-500 to-rose-500",
] as const;

function tutorInitials(tutor: VerifiedTutorProfileDto): string {
  const a = tutor.firstName?.trim()?.[0] ?? "";
  const b = tutor.lastName?.trim()?.[0] ?? "";
  return `${a}${b}`.toUpperCase() || "?";
}

function trialLessonPrice(
  tutor: VerifiedTutorProfileDto,
  currency: ECurrency
): number {
  const p = tutor.prices;
  if (currency === ECurrency.USD) return p.usd ?? 0;
  if (currency === ECurrency.PHP) return p.php ?? 0;
  return p.vnd ?? 0;
}

export type FeaturedTutorCardProps = {
  tutor: VerifiedTutorProfileDto;
  gradient: string;
  currency: ECurrency;
};

export function FeaturedTutorCard({ tutor, gradient, currency }: FeaturedTutorCardProps) {
  const t = useTranslations("Home.FeaturedTutors");
  const tSubject = useTranslations("Tutors.Filter.Subject");
  const tCountry = useTranslations("Tutors.Filter.Country");
  const tLanguage = useTranslations("Tutors.Filter.Language");

  const currentUser = useAtomValue(userAtom);
  const senderId = currentUser?.id;
  const isOwnProfile = Boolean(senderId && senderId === tutor.userId);
  const canFetchSub = Boolean(senderId && !isOwnProfile);
  const { data: elig } = useGetSubscriptionEligibility(tutor.id, canFetchSub);
  const hasBookedTrial = Boolean(elig?.trialStatus != null);

  const videoUrl = tutor.videoUrl;
  const embedUrl = useMemo(() => getYoutubeEmbedUrl(videoUrl), [videoUrl]);
  const youtubeId = useMemo(() => {
    if (!embedUrl) return null;
    const last = embedUrl.split("/").filter(Boolean).pop();
    return last ?? null;
  }, [embedUrl]);
  const isCloudinaryVideo = useMemo(() => isCloudinaryVideoUrl(videoUrl), [videoUrl]);
  const thumbnailUrl = useMemo(() => {
    if (youtubeId) return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
    return null;
  }, [youtubeId]);
  const hasThumbnail = Boolean(thumbnailUrl || isCloudinaryVideo);

  const name = `${tutor.firstName} ${tutor.lastName}`.trim();
  const price = trialLessonPrice(tutor, currency);
  const rateLabel = formatToCurrency(currency, price);
  const rating =
    tutor.ratingCount > 0 ? tutor.ratingAverage.toFixed(1) : "—";
  const subjectKey = tutor.subject?.trim();
  const hasSubject =
    Boolean(subjectKey) && subjectKey !== ESubject.ANY_SUBJECT;
  const detailHref = ROUTES.TUTOR.DETAIL(tutor.id);

  const avatarInner = tutor.avatar ? (
    <Image
      src={tutor.avatar}
      alt={name}
      fill
      className="object-cover"
      sizes="80px"
    />
  ) : (
    tutorInitials(tutor)
  );

  return (
    <article className="group flex flex-col overflow-hidden rounded-3xl border border-violet-100 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-violet-200/50">
      <div
        className={`relative h-36${hasThumbnail ? "" : ` bg-gradient-to-br ${gradient}`}`}
      >
        {/* Background image / overlay — clipped to the header only */}
        <div
          className="absolute inset-0 overflow-hidden rounded-t-3xl"
          style={
            thumbnailUrl
              ? { backgroundImage: `url(${thumbnailUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
              : undefined
          }
        >
          {hasThumbnail ? (
            <div className="absolute inset-0 bg-slate-900/30" />
          ) : (
            <div
              className="absolute inset-0 opacity-30"
              style={HEADER_DOT_PATTERN}
            />
          )}
        </div>

        <div className="absolute inset-x-4 -bottom-10 flex items-end justify-between">
          <Link
            href={detailHref}
            className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-white text-2xl font-extrabold text-violet-700 shadow-lg"
          >
            {avatarInner}
          </Link>
          <span className="mb-2 max-w-[55%] truncate rounded-full border border-white/60 bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-700 shadow backdrop-blur">
            {tCountry(tutor.country)}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5 pt-12">
        <div>
          <Link href={detailHref}>
            <h3 className="text-lg font-bold text-slate-900 transition-colors group-hover:text-violet-700">
              {name}
            </h3>
          </Link>
          <p className="line-clamp-2 text-xs leading-5 text-slate-500">
            {tutor.headline || (hasSubject ? tSubject(subjectKey) : "")}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {hasSubject ? (
            <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700">
              {tSubject(subjectKey)}
            </span>
          ) : null}
          {tutor.languages?.slice(0, 2).map((language) => (
            <span
              key={`${tutor.id}-${language.languageCode}-${language.proficiency}`}
              className="rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700"
            >
              {tLanguage(language.languageCode as unknown as string)}
            </span>
          ))}
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-violet-50 pt-3">
          <div className="flex min-w-0 flex-1 items-center gap-3 text-xs">
            <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-amber-600">
              <Star className="size-3.5 fill-amber-400 text-amber-400" />
              {rating}
            </span>
            <span className="truncate text-slate-400">
              {tutor.totalLessonsTaught} {t("lessons")}
            </span>
          </div>
          <div className="shrink-0 pl-2 text-right">
            <p className="text-base font-extrabold leading-none text-slate-900">
              {rateLabel}
            </p>
            <p className="text-[10px] font-medium text-slate-500">
              {t("perHour")}
            </p>
          </div>
        </div>

        <Link href={detailHref}>
          <Button
            variant="gradient"
            className="h-9 w-full rounded-full text-xs font-semibold"
          >
            {hasBookedTrial ? t("tutorDetail") : t("bookTrial")}
            <ArrowRight className="ml-1 size-3.5" />
          </Button>
        </Link>
      </div>
    </article>
  );
}
