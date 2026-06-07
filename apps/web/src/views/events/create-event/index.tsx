"use client";

import {
  ACCEPT_IMAGE_TYPES,
  CLOUDINARY_FOLDER,
  EVENT_ORGANIZER_GRADIENTS,
  MAX_IMAGE_SIZE_MB,
  ROUTES,
  type CreateEventPayload,
  type EventDetailDto,
} from "@mezon-tutors/shared";
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Clock,
  Eye,
  FileText,
  ImageIcon,
  Plus,
  Send,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { toast } from "sonner";
import UploadFile from "@/components/common/UploadFile";
import { EventHomeCard } from "@/components/events/EventHomeCard";
import { Button, Input, Label, Spinner, Textarea } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  cloudinaryService,
  useCreateEvent,
  useMyEventSubmission,
  useUpdateEvent,
} from "@/services";
import {
  initAuthAtom,
  isAuthenticatedAtom,
  isLoadingAtom,
  userAtom,
} from "@/store/auth.atom";

type OrganizerDraft = {
  name: string;
  role: string;
  category: string;
  bio: string;
  imageUrl: string;
  gradient: string;
};

type GalleryDraft = {
  imageUrl: string;
  captionVi: string;
};

type StatDraft = {
  value: string;
  labelVi: string;
};

const INPUT_CLASS =
  "h-11 rounded-xl border-slate-200 bg-slate-50/60 text-sm transition-colors focus-visible:border-violet-300 focus-visible:bg-white focus-visible:ring-violet-200/60";
const TEXTAREA_CLASS =
  "rounded-xl border-slate-200 bg-slate-50/60 text-sm transition-colors focus-visible:border-violet-300 focus-visible:bg-white focus-visible:ring-violet-200/60";

const EMPTY_ORGANIZER = (): OrganizerDraft => ({
  name: "",
  role: "",
  category: "",
  bio: "",
  imageUrl: "",
  gradient: EVENT_ORGANIZER_GRADIENTS[0],
});

type CreateEventViewProps = {
  eventId?: string;
};

function toDatetimeLocalValue(iso?: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function isFreePriceLabel(label: string | undefined, freeLabels: string[]): boolean {
  const normalized = label?.trim().toLowerCase() ?? "";
  if (!normalized) return true;
  return freeLabels.some((item) => item.toLowerCase() === normalized);
}

function populateFormFromDetail(
  detail: EventDetailDto,
  freeLabels: string[],
  setters: {
    setTitle: (value: string) => void;
    setTagline: (value: string) => void;
    setTheme: (value: string) => void;
    setAboutTitle: (value: string) => void;
    setAboutBody: (value: string) => void;
    setAboutHighlight: (value: string) => void;
    setSeoTitle: (value: string) => void;
    setSeoDescription: (value: string) => void;
    setRegisterTitle: (value: string) => void;
    setRegisterDescription: (value: string) => void;
    setPriceIsFree: (value: boolean) => void;
    setPriceLabel: (value: string) => void;
    setCardDescription: (value: string) => void;
    setCardTag: (value: string) => void;
    setMarquee: (value: string) => void;
    setStartAt: (value: string) => void;
    setEndAt: (value: string) => void;
    setDoorsOpenAt: (value: string) => void;
    setIsOnline: (value: boolean) => void;
    setCity: (value: string) => void;
    setCountry: (value: string) => void;
    setVenue: (value: string) => void;
    setRegistrationUrl: (value: string) => void;
    setCoverImageUrl: (value: string) => void;
    setOgImageUrl: (value: string) => void;
    setOrganizers: (value: OrganizerDraft[]) => void;
    setGalleryImages: (value: GalleryDraft[]) => void;
    setStats: (value: StatDraft[]) => void;
  },
) {
  const vi = detail.content.vi;
  const price = vi.priceLabel?.trim() ?? "";

  setters.setTitle(vi.title);
  setters.setTagline(vi.tagline);
  setters.setTheme(vi.theme);
  setters.setAboutTitle(vi.aboutTitle ?? "");
  setters.setAboutBody(vi.aboutBody);
  setters.setAboutHighlight(vi.aboutHighlight ?? "");
  setters.setSeoTitle(vi.seoTitle ?? "");
  setters.setSeoDescription(vi.seoDescription ?? "");
  setters.setRegisterTitle(vi.registerTitle ?? "");
  setters.setRegisterDescription(vi.registerDescription ?? "");
  setters.setPriceIsFree(isFreePriceLabel(price, freeLabels));
  setters.setPriceLabel(price);
  setters.setCardDescription(vi.cardDescription ?? "");
  setters.setCardTag(vi.cardTag ?? "");
  setters.setMarquee(vi.marquee ?? "");
  setters.setStartAt(toDatetimeLocalValue(detail.startAt));
  setters.setEndAt(toDatetimeLocalValue(detail.endAt));
  setters.setDoorsOpenAt(toDatetimeLocalValue(detail.doorsOpenAt));
  setters.setIsOnline(detail.location?.isOnline ?? true);
  setters.setCity(detail.location?.city ?? "");
  setters.setCountry(detail.location?.country ?? "Việt Nam");
  setters.setVenue(detail.location?.venue ?? "");
  setters.setRegistrationUrl(detail.registrationUrl);
  setters.setCoverImageUrl(detail.coverImageUrl);
  setters.setOgImageUrl(detail.ogImageUrl);
  setters.setOrganizers(
    detail.organizers.length > 0
      ? detail.organizers.map((organizer) => ({
          name: organizer.name,
          role: organizer.role,
          category: organizer.category,
          bio: organizer.bio ?? "",
          imageUrl: organizer.imageUrl,
          gradient: organizer.gradient,
        }))
      : [EMPTY_ORGANIZER()],
  );
  setters.setGalleryImages(
    detail.galleryImages.map((image) => ({
      imageUrl: image.imageUrl,
      captionVi: image.caption ?? "",
    })),
  );
  setters.setStats(
    detail.stats.length > 0
      ? detail.stats.map((stat) => ({
          value: stat.value,
          labelVi: stat.label,
        }))
      : [
          { value: "4", labelVi: "Ban tổ chức" },
          { value: "1", labelVi: "Buổi" },
        ],
  );
}

type FormSetters = Parameters<typeof populateFormFromDetail>[2];

function populateFormFromPayload(
  payload: CreateEventPayload,
  freeLabels: string[],
  setters: FormSetters,
) {
  const vi = payload.contentVi;
  const price = vi.priceLabel?.trim() ?? "";

  setters.setTitle(vi.title);
  setters.setTagline(vi.tagline);
  setters.setTheme(vi.theme);
  setters.setAboutTitle(vi.aboutTitle ?? "");
  setters.setAboutBody(vi.aboutBody);
  setters.setAboutHighlight(vi.aboutHighlight ?? "");
  setters.setSeoTitle(vi.seoTitle ?? "");
  setters.setSeoDescription(vi.seoDescription ?? "");
  setters.setRegisterTitle(vi.registerTitle ?? "");
  setters.setRegisterDescription(vi.registerDescription ?? "");
  setters.setPriceIsFree(isFreePriceLabel(price, freeLabels));
  setters.setPriceLabel(price);
  setters.setCardDescription(vi.cardDescription ?? "");
  setters.setCardTag(vi.cardTag ?? "");
  setters.setMarquee(vi.marquee ?? "");
  setters.setStartAt(toDatetimeLocalValue(payload.startAt));
  setters.setEndAt(toDatetimeLocalValue(payload.endAt));
  setters.setDoorsOpenAt(toDatetimeLocalValue(payload.doorsOpenAt));
  setters.setIsOnline(payload.isOnline);
  setters.setCity(payload.city ?? "");
  setters.setCountry(payload.country ?? "Việt Nam");
  setters.setVenue(payload.venue ?? "");
  setters.setRegistrationUrl(payload.registrationUrl);
  setters.setCoverImageUrl(payload.coverImageUrl);
  setters.setOgImageUrl(payload.ogImageUrl);
  setters.setOrganizers(
    payload.organizers.length > 0
      ? payload.organizers.map((organizer) => ({
          name: organizer.name,
          role: organizer.role,
          category: organizer.category,
          bio: organizer.bio ?? "",
          imageUrl: organizer.imageUrl,
          gradient: organizer.gradient ?? EVENT_ORGANIZER_GRADIENTS[0],
        }))
      : [EMPTY_ORGANIZER()],
  );
  setters.setGalleryImages(
    payload.galleryImages.map((image) => ({
      imageUrl: image.imageUrl,
      captionVi: image.captionVi ?? "",
    })),
  );
  setters.setStats(
    payload.stats.length > 0
      ? payload.stats.map((stat) => ({
          value: stat.value,
          labelVi: stat.labelVi,
        }))
      : [
          { value: "4", labelVi: "Ban tổ chức" },
          { value: "1", labelVi: "Buổi" },
        ],
  );
}

export default function CreateEventView({ eventId }: CreateEventViewProps = {}) {
  const isEditMode = Boolean(eventId);
  const t = useTranslations("Events.create");
  const tEdit = useTranslations("Events.create.edit");
  const tHome = useTranslations("Home.Events");
  const tDetail = useTranslations("Events.detail");
  const locale = useLocale();
  const router = useRouter();
  const user = useAtomValue(userAtom);
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const isAuthLoading = useAtomValue(isLoadingAtom);
  const initAuth = useSetAtom(initAuthAtom);
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const { data: existingEvent, isLoading: isLoadingEvent } = useMyEventSubmission(
    eventId ?? "",
    isEditMode && isAuthenticated,
  );
  const isLoggedIn = isAuthenticated || Boolean(user);
  const isPublished = existingEvent?.publishStatus === "PUBLISHED";
  const isClosed = existingEvent?.publishStatus === "CLOSED";
  const isLocked = isClosed;
  const hasPendingUpdate = existingEvent?.updateReviewStatus === "PENDING";
  const isSubmitting = createEvent.isPending || updateEvent.isPending;
  const [formInitialized, setFormInitialized] = useState(!isEditMode);

  const [title, setTitle] = useState("");
  const [tagline, setTagline] = useState("");
  const [theme, setTheme] = useState("");
  const [aboutTitle, setAboutTitle] = useState("");
  const [aboutBody, setAboutBody] = useState("");
  const [aboutHighlight, setAboutHighlight] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [registerTitle, setRegisterTitle] = useState("");
  const [registerDescription, setRegisterDescription] = useState("");
  const [priceIsFree, setPriceIsFree] = useState(true);
  const [priceLabel, setPriceLabel] = useState("");
  const [cardDescription, setCardDescription] = useState("");
  const [cardTag, setCardTag] = useState("");
  const [marquee, setMarquee] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [doorsOpenAt, setDoorsOpenAt] = useState("");
  const [isOnline, setIsOnline] = useState(true);
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("Việt Nam");
  const [venue, setVenue] = useState("");
  const [registrationUrl, setRegistrationUrl] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [ogImageUrl, setOgImageUrl] = useState("");
  const [organizers, setOrganizers] = useState<OrganizerDraft[]>([EMPTY_ORGANIZER()]);
  const [galleryImages, setGalleryImages] = useState<GalleryDraft[]>([]);
  const [stats, setStats] = useState<StatDraft[]>([
    { value: "4", labelVi: "Ban tổ chức" },
    { value: "1", labelVi: "Buổi" },
  ]);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingOg, setUploadingOg] = useState(false);
  const [uploadingOrganizerIndex, setUploadingOrganizerIndex] = useState<number | null>(null);
  const [uploadingGalleryIndex, setUploadingGalleryIndex] = useState<number | null>(null);

  useEffect(() => {
    void initAuth();
  }, [initAuth]);

  useEffect(() => {
    if (!isAuthLoading && !isLoggedIn) {
      const nextPath = isEditMode && eventId ? ROUTES.EVENTS.EDIT(eventId) : ROUTES.EVENTS.CREATE;
      router.replace(`/?login=required&next=${encodeURIComponent(nextPath)}`);
    }
  }, [isAuthLoading, isLoggedIn, router, isEditMode, eventId]);

  useEffect(() => {
    if (!isEditMode || !existingEvent || formInitialized) return;

    const freeLabels = [t("fields.priceFree"), "Free", "Miễn phí"];
    const setters = {
      setTitle,
      setTagline,
      setTheme,
      setAboutTitle,
      setAboutBody,
      setAboutHighlight,
      setSeoTitle,
      setSeoDescription,
      setRegisterTitle,
      setRegisterDescription,
      setPriceIsFree,
      setPriceLabel,
      setCardDescription,
      setCardTag,
      setMarquee,
      setStartAt,
      setEndAt,
      setDoorsOpenAt,
      setIsOnline,
      setCity,
      setCountry,
      setVenue,
      setRegistrationUrl,
      setCoverImageUrl,
      setOgImageUrl,
      setOrganizers,
      setGalleryImages,
      setStats,
    };

    if (existingEvent.pendingUpdate && existingEvent.updateReviewStatus === "PENDING") {
      populateFormFromPayload(existingEvent.pendingUpdate, freeLabels, setters);
    } else {
      populateFormFromDetail(existingEvent, freeLabels, setters);
    }
    setFormInitialized(true);
  }, [isEditMode, existingEvent, formInitialized, t]);

  const resolvedPriceLabel = priceIsFree
    ? t("fields.priceFree")
    : priceLabel.trim() || t("fields.priceFree");

  const previewLocationLabel = useMemo(() => {
    if (isOnline && !venue.trim() && !city.trim()) {
      return tDetail("meta.online");
    }
    if (venue.trim() && city.trim()) {
      return `${venue.trim()}, ${city.trim()}`;
    }
    if (city.trim() && country.trim()) {
      return `${city.trim()}, ${country.trim()}`;
    }
    return tHome("registrationOnly");
  }, [isOnline, venue, city, country, tDetail, tHome]);

  const uploadImage = async (file: File) => {
    const result = await cloudinaryService.uploadFileWithSignature(
      file,
      CLOUDINARY_FOLDER.EVENT,
      "image",
    );
    return result.secureUrl;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isLocked) return;

    if (!coverImageUrl || !ogImageUrl) {
      toast.error(t("errors.imagesRequired"));
      return;
    }

    const validOrganizers = organizers.filter(
      (item) => item.name.trim() && item.role.trim() && item.imageUrl,
    );
    if (validOrganizers.length === 0) {
      toast.error(t("errors.organizerRequired"));
      return;
    }

    const payload: CreateEventPayload = {
      startAt: new Date(startAt).toISOString(),
      endAt: endAt ? new Date(endAt).toISOString() : undefined,
      doorsOpenAt: doorsOpenAt ? new Date(doorsOpenAt).toISOString() : undefined,
      isOnline,
      city: city.trim() || undefined,
      country: country.trim() || undefined,
      venue: venue.trim() || undefined,
      registrationUrl,
      coverImageUrl,
      ogImageUrl,
      contentVi: {
        title,
        tagline,
        theme,
        aboutTitle: aboutTitle || undefined,
        aboutBody,
        aboutHighlight: aboutHighlight || undefined,
        seoTitle: seoTitle || undefined,
        seoDescription: seoDescription || undefined,
        registerTitle: registerTitle || undefined,
        registerDescription: registerDescription || undefined,
        priceLabel: resolvedPriceLabel,
        cardDescription: cardDescription || undefined,
        cardTag: cardTag || undefined,
        marquee: marquee || undefined,
      },
      organizers: validOrganizers,
      galleryImages: galleryImages.filter((item) => item.imageUrl),
      stats: stats.filter((item) => item.value.trim() && item.labelVi.trim()),
    };

    try {
      if (isEditMode && eventId) {
        await updateEvent.mutateAsync({ id: eventId, payload });
        toast.success(isPublished ? tEdit("updateSubmitted") : tEdit("success"));
        router.push(ROUTES.DASHBOARD.MY_EVENTS);
        return;
      }

      await createEvent.mutateAsync(payload);
      toast.success(t("success"));
      router.push(ROUTES.EVENTS.CREATE_SUCCESS);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("errors.submitFailed"));
    }
  };

  if ((isAuthLoading && !isLoggedIn) || (isEditMode && (isLoadingEvent || !formInitialized))) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner className="size-8 text-violet-600" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  return (
    <main className="relative min-h-screen pb-28">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#faf7ff_0%,#ffffff_65%)]" />
        <div className="absolute -top-32 left-1/2 size-[40rem] -translate-x-1/2 rounded-full bg-violet-300/20 blur-[120px]" />
        <div className="absolute top-1/3 -right-24 size-[24rem] rounded-full bg-fuchsia-200/25 blur-[100px]" />
      </div>

      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-6 lg:px-8 lg:py-10">
        <Link
          href={isEditMode ? ROUTES.DASHBOARD.MY_EVENTS : ROUTES.HOME.events}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-violet-700"
        >
          <ArrowLeft className="size-4" />
          {isEditMode ? tEdit("backToList") : "Events"}
        </Link>

        <header className="mb-8 space-y-4">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#7c3aed,#ec4899)] text-white shadow-lg shadow-violet-300/40">
              <CalendarDays className="size-6" />
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold tracking-[0.2em] text-violet-600 uppercase">
                {isEditMode ? tEdit("badge") : t("badge")}
              </p>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                {isEditMode ? tEdit("title") : t("title")}
              </h1>
              <p className="max-w-xl text-sm leading-7 text-slate-600">
                {isEditMode ? tEdit("description") : t("description")}
              </p>
            </div>
          </div>

          {isEditMode && existingEvent?.publishStatus === "REJECTED" && existingEvent.rejectedReason ? (
            <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/70 px-4 py-3.5">
              <p className="text-xs leading-6 text-rose-800">
                {tEdit("rejectedBanner", { reason: existingEvent.rejectedReason })}
              </p>
            </div>
          ) : null}

          {isPublished && hasPendingUpdate ? (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3.5">
              <p className="text-xs leading-6 text-amber-800">{tEdit("updatePendingBanner")}</p>
            </div>
          ) : null}

          {isPublished && existingEvent?.updateReviewStatus === "REJECTED" && existingEvent.updateRejectedReason ? (
            <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/70 px-4 py-3.5">
              <p className="text-xs leading-6 text-rose-800">
                {tEdit("updateRejectedBanner", { reason: existingEvent.updateRejectedReason })}
              </p>
            </div>
          ) : null}

          {isPublished ? (
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3.5">
              <p className="text-xs leading-6 text-emerald-800">{tEdit("publishedEditBanner")}</p>
            </div>
          ) : isClosed ? (
            <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3.5">
              <p className="text-xs leading-6 text-slate-700">{tEdit("closedBanner")}</p>
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-2xl border border-violet-100 bg-violet-50/50 px-4 py-3.5">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-violet-600" />
              <p className="text-xs leading-6 text-violet-800/90">{t("pendingNote")}</p>
            </div>
          )}
        </header>

        <form
          id="create-event-form"
          onSubmit={handleSubmit}
          className={cn("space-y-5", isLocked && "pointer-events-none opacity-60")}
        >
          <EventFormSection
            icon={FileText}
            eyebrow="01"
            title={t("sections.basic")}
          >
            <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] xl:items-start">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label={t("fields.title")} className="sm:col-span-2">
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    placeholder={t("preview.titlePlaceholder")}
                    className={INPUT_CLASS}
                  />
                </FormField>
                <FormField label={t("fields.tagline")} className="sm:col-span-2">
                  <Textarea
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    required
                    rows={2}
                    placeholder={t("preview.taglinePlaceholder")}
                    className={TEXTAREA_CLASS}
                  />
                </FormField>
                <FormField label={t("fields.theme")}>
                  <Input
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    required
                    className={INPUT_CLASS}
                  />
                </FormField>
                <FormField label={t("fields.cardTag")}>
                  <Input
                    value={cardTag}
                    onChange={(e) => setCardTag(e.target.value)}
                    className={INPUT_CLASS}
                  />
                </FormField>
                <FormField label={t("fields.priceLabel")} className="sm:col-span-2">
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <PriceOptionButton
                        active={priceIsFree}
                        onClick={() => setPriceIsFree(true)}
                        label={t("fields.priceFree")}
                      />
                      <PriceOptionButton
                        active={!priceIsFree}
                        onClick={() => setPriceIsFree(false)}
                        label={t("fields.priceCustom")}
                      />
                    </div>
                    {!priceIsFree ? (
                      <Input
                        value={priceLabel}
                        onChange={(e) => setPriceLabel(e.target.value)}
                        placeholder={t("fields.priceCustomPlaceholder")}
                        className={INPUT_CLASS}
                      />
                    ) : (
                      <p className="rounded-xl border border-emerald-100 bg-emerald-50/80 px-3 py-2.5 text-sm font-semibold text-emerald-700">
                        {t("fields.priceFree")}
                      </p>
                    )}
                  </div>
                </FormField>
                <FormField label={t("fields.cardDescription")} className="sm:col-span-2">
                  <Textarea
                    value={cardDescription}
                    onChange={(e) => setCardDescription(e.target.value)}
                    rows={2}
                    className={TEXTAREA_CLASS}
                  />
                </FormField>
              </div>

              <aside className="xl:sticky xl:top-24">
                <div className="mb-3 flex items-center gap-2">
                  <Eye className="size-4 text-violet-600" />
                  <div>
                    <p className="text-xs font-bold text-violet-800">
                      {t("preview.homeLabel")}
                    </p>
                    <p className="text-[11px] leading-5 text-slate-500">
                      {t("preview.homeHint")}
                    </p>
                  </div>
                </div>
                <div className="scale-[0.98] origin-top rounded-2xl ring-1 ring-violet-100/80 xl:scale-100">
                  <EventHomeCard
                    preview
                    coverImage={coverImageUrl || null}
                    status="upcoming"
                    statusLabel={tHome("status.upcoming")}
                    theme={theme || "—"}
                    title={title || t("preview.titlePlaceholder")}
                    tagline={tagline || t("preview.taglinePlaceholder")}
                    description={cardDescription || tagline || "—"}
                    tag={cardTag || theme || "—"}
                    price={resolvedPriceLabel}
                    registerLabel={tHome("register")}
                    locale={locale}
                    startAt={startAt || undefined}
                    startAtLabel={startAt ? undefined : t("preview.datePlaceholder")}
                    locationLabel={previewLocationLabel}
                  />
                </div>
              </aside>
            </div>
          </EventFormSection>

          <EventFormSection icon={Clock} eyebrow="02" title={t("sections.schedule")}>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={t("fields.startAt")}>
                <Input
                  type="datetime-local"
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                  required
                  className={INPUT_CLASS}
                />
              </FormField>
              <FormField label={t("fields.endAt")}>
                <Input
                  type="datetime-local"
                  value={endAt}
                  onChange={(e) => setEndAt(e.target.value)}
                  className={INPUT_CLASS}
                />
              </FormField>
              <FormField label={t("fields.doorsOpenAt")}>
                <Input
                  type="datetime-local"
                  value={doorsOpenAt}
                  onChange={(e) => setDoorsOpenAt(e.target.value)}
                  className={INPUT_CLASS}
                />
              </FormField>
              <FormField label={t("fields.registrationUrl")} className="sm:col-span-2">
                <Input
                  type="url"
                  value={registrationUrl}
                  onChange={(e) => setRegistrationUrl(e.target.value)}
                  required
                  className={INPUT_CLASS}
                />
              </FormField>

              <div className="sm:col-span-2">
                <button
                  type="button"
                  role="switch"
                  aria-checked={isOnline}
                  onClick={() => setIsOnline((value) => !value)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 text-left transition-colors",
                    isOnline
                      ? "border-violet-200 bg-violet-50/60"
                      : "border-slate-200 bg-slate-50/40",
                  )}
                >
                  <span className="text-sm font-semibold text-slate-800">
                    {t("fields.isOnline")}
                  </span>
                  <span
                    className={cn(
                      "relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors",
                      isOnline ? "bg-violet-600" : "bg-slate-300",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform",
                        isOnline ? "translate-x-5" : "translate-x-0.5",
                      )}
                    />
                  </span>
                </button>
              </div>

              <FormField label={t("fields.venue")}>
                <Input
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  disabled={isOnline}
                  className={cn(INPUT_CLASS, isOnline && "opacity-50")}
                />
              </FormField>
              <FormField label={t("fields.city")}>
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className={INPUT_CLASS}
                />
              </FormField>
              <FormField label={t("fields.country")}>
                <Input
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className={INPUT_CLASS}
                />
              </FormField>
            </div>
          </EventFormSection>

          <EventFormSection icon={FileText} eyebrow="03" title={t("sections.content")}>
            <div className="grid gap-4">
              <FormField label={t("fields.aboutTitle")}>
                <Input
                  value={aboutTitle}
                  onChange={(e) => setAboutTitle(e.target.value)}
                  className={INPUT_CLASS}
                />
              </FormField>
              <FormField label={t("fields.aboutBody")}>
                <Textarea
                  value={aboutBody}
                  onChange={(e) => setAboutBody(e.target.value)}
                  required
                  rows={4}
                  className={TEXTAREA_CLASS}
                />
              </FormField>
              <FormField label={t("fields.aboutHighlight")}>
                <Textarea
                  value={aboutHighlight}
                  onChange={(e) => setAboutHighlight(e.target.value)}
                  rows={2}
                  className={TEXTAREA_CLASS}
                />
              </FormField>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label={t("fields.seoTitle")}>
                  <Input
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                    className={INPUT_CLASS}
                  />
                </FormField>
                <FormField label={t("fields.registerTitle")}>
                  <Input
                    value={registerTitle}
                    onChange={(e) => setRegisterTitle(e.target.value)}
                    className={INPUT_CLASS}
                  />
                </FormField>
              </div>
              <FormField label={t("fields.seoDescription")}>
                <Textarea
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  rows={2}
                  className={TEXTAREA_CLASS}
                />
              </FormField>
              <FormField label={t("fields.registerDescription")}>
                <Textarea
                  value={registerDescription}
                  onChange={(e) => setRegisterDescription(e.target.value)}
                  rows={2}
                  className={TEXTAREA_CLASS}
                />
              </FormField>
              <FormField label={t("fields.marquee")}>
                <Input
                  value={marquee}
                  onChange={(e) => setMarquee(e.target.value)}
                  className={INPUT_CLASS}
                />
              </FormField>
            </div>
          </EventFormSection>

          <EventFormSection icon={ImageIcon} eyebrow="04" title={t("sections.images")}>
            <div className="grid gap-6 sm:grid-cols-2">
              <UploadField
                label={t("fields.coverImage")}
                previewUrl={coverImageUrl}
                isUploading={uploadingCover}
                onFile={async (file) => {
                  setUploadingCover(true);
                  try {
                    setCoverImageUrl(await uploadImage(file));
                  } finally {
                    setUploadingCover(false);
                  }
                }}
              />
              <UploadField
                label={t("fields.ogImage")}
                previewUrl={ogImageUrl}
                isUploading={uploadingOg}
                onFile={async (file) => {
                  setUploadingOg(true);
                  try {
                    setOgImageUrl(await uploadImage(file));
                  } finally {
                    setUploadingOg(false);
                  }
                }}
              />
            </div>
          </EventFormSection>

          <EventFormSection
            icon={Users}
            eyebrow="05"
            title={t("sections.organizers")}
            action={
              <AddItemButton
                label={t("actions.addOrganizer")}
                onClick={() => setOrganizers((items) => [...items, EMPTY_ORGANIZER()])}
              />
            }
          >
            <div className="space-y-4">
              {organizers.map((organizer, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-violet-100/80 bg-violet-50/20 p-4 sm:p-5"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 text-sm font-bold text-slate-800">
                      <span className="flex size-6 items-center justify-center rounded-full bg-violet-600 text-[10px] font-extrabold text-white">
                        {index + 1}
                      </span>
                      {t("organizerLabel", { index: index + 1 })}
                    </span>
                    {organizers.length > 1 ? (
                      <RemoveItemButton
                        onClick={() =>
                          setOrganizers((items) => items.filter((_, i) => i !== index))
                        }
                      />
                    ) : null}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField label={t("fields.organizerName")}>
                      <Input
                        value={organizer.name}
                        onChange={(e) =>
                          setOrganizers((items) =>
                            items.map((item, i) =>
                              i === index ? { ...item, name: e.target.value } : item,
                            ),
                          )
                        }
                        className={INPUT_CLASS}
                      />
                    </FormField>
                    <FormField label={t("fields.organizerRole")}>
                      <Input
                        value={organizer.role}
                        onChange={(e) =>
                          setOrganizers((items) =>
                            items.map((item, i) =>
                              i === index ? { ...item, role: e.target.value } : item,
                            ),
                          )
                        }
                        className={INPUT_CLASS}
                      />
                    </FormField>
                    <FormField label={t("fields.organizerCategory")}>
                      <Input
                        value={organizer.category}
                        onChange={(e) =>
                          setOrganizers((items) =>
                            items.map((item, i) =>
                              i === index ? { ...item, category: e.target.value } : item,
                            ),
                          )
                        }
                        className={INPUT_CLASS}
                      />
                    </FormField>
                    <FormField label={t("fields.organizerBio")} className="sm:col-span-2">
                      <Textarea
                        value={organizer.bio}
                        onChange={(e) =>
                          setOrganizers((items) =>
                            items.map((item, i) =>
                              i === index ? { ...item, bio: e.target.value } : item,
                            ),
                          )
                        }
                        rows={2}
                        className={TEXTAREA_CLASS}
                      />
                    </FormField>
                    <UploadField
                      label={t("fields.organizerImage")}
                      previewUrl={organizer.imageUrl}
                      isUploading={uploadingOrganizerIndex === index}
                      onFile={async (file) => {
                        setUploadingOrganizerIndex(index);
                        try {
                          const url = await uploadImage(file);
                          setOrganizers((items) =>
                            items.map((item, i) =>
                              i === index ? { ...item, imageUrl: url } : item,
                            ),
                          );
                        } finally {
                          setUploadingOrganizerIndex(null);
                        }
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </EventFormSection>

          <EventFormSection
            icon={ImageIcon}
            eyebrow="06"
            title={t("sections.gallery")}
            action={
              <AddItemButton
                label={t("actions.addImage")}
                onClick={() =>
                  setGalleryImages((items) => [...items, { imageUrl: "", captionVi: "" }])
                }
              />
            }
          >
            {galleryImages.length === 0 ? (
              <EmptyBlock
                label={t("actions.addImage")}
                onClick={() =>
                  setGalleryImages([{ imageUrl: "", captionVi: "" }])
                }
              />
            ) : (
              <div className="space-y-4">
                {galleryImages.map((image, index) => (
                  <div
                    key={index}
                    className="grid gap-4 rounded-2xl border border-violet-100/80 bg-white p-4 sm:grid-cols-[1fr_1fr_auto]"
                  >
                    <UploadField
                      label={t("fields.galleryImage")}
                      previewUrl={image.imageUrl}
                      isUploading={uploadingGalleryIndex === index}
                      onFile={async (file) => {
                        setUploadingGalleryIndex(index);
                        try {
                          const url = await uploadImage(file);
                          setGalleryImages((items) =>
                            items.map((item, i) =>
                              i === index ? { ...item, imageUrl: url } : item,
                            ),
                          );
                        } finally {
                          setUploadingGalleryIndex(null);
                        }
                      }}
                    />
                    <FormField label={t("fields.galleryCaption")}>
                      <Input
                        value={image.captionVi}
                        onChange={(e) =>
                          setGalleryImages((items) =>
                            items.map((item, i) =>
                              i === index ? { ...item, captionVi: e.target.value } : item,
                            ),
                          )
                        }
                        className={INPUT_CLASS}
                      />
                    </FormField>
                    <div className="flex items-end justify-end sm:pb-1">
                      <RemoveItemButton
                        onClick={() =>
                          setGalleryImages((items) => items.filter((_, i) => i !== index))
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </EventFormSection>

          <EventFormSection
            icon={BarChart3}
            eyebrow="07"
            title={t("sections.stats")}
            action={
              <AddItemButton
                label={t("actions.addStat")}
                onClick={() => setStats((items) => [...items, { value: "", labelVi: "" }])}
              />
            }
          >
            <div className="space-y-3">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className="flex flex-col gap-3 rounded-2xl border border-violet-100/80 bg-white p-4 sm:flex-row sm:items-end"
                >
                  <FormField label={t("fields.statValue")} className="flex-1">
                    <Input
                      value={stat.value}
                      onChange={(e) =>
                        setStats((items) =>
                          items.map((item, i) =>
                            i === index ? { ...item, value: e.target.value } : item,
                          ),
                        )
                      }
                      className={INPUT_CLASS}
                    />
                  </FormField>
                  <FormField label={t("fields.statLabel")} className="flex-[1.4]">
                    <Input
                      value={stat.labelVi}
                      onChange={(e) =>
                        setStats((items) =>
                          items.map((item, i) =>
                            i === index ? { ...item, labelVi: e.target.value } : item,
                          ),
                        )
                      }
                      className={INPUT_CLASS}
                    />
                  </FormField>
                  <RemoveItemButton
                    onClick={() => setStats((items) => items.filter((_, i) => i !== index))}
                  />
                </div>
              ))}
            </div>
          </EventFormSection>
        </form>
      </div>

      {!isLocked ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-violet-100/90 bg-white/85 backdrop-blur-md">
          <div className="mx-auto flex max-w-5xl flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <p className="text-xs leading-5 text-slate-500">
              {isPublished ? tEdit("publishedEditNote") : t("pendingNote")}
            </p>
            <Button
              type="submit"
              form="create-event-form"
              variant="gradient"
              disabled={isSubmitting}
              className="h-11 shrink-0 rounded-full px-8 text-sm font-semibold shadow-lg shadow-violet-300/30"
            >
              {isSubmitting ? (
                <>
                  <Spinner className="mr-2 size-4 text-white" />
                  {t("actions.submitting")}
                </>
              ) : (
                <>
                  <Send className="mr-2 size-4" />
                  {isEditMode
                    ? isPublished
                      ? tEdit("submitUpdate")
                      : tEdit("submit")
                    : t("actions.submit")}
                </>
              )}
            </Button>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function EventFormSection({
  icon: Icon,
  eyebrow,
  title,
  action,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  eyebrow: string;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-violet-100 bg-white/90 p-5 shadow-sm shadow-violet-100/40 sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600 ring-1 ring-violet-100">
            <Icon className="size-4" />
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-[0.18em] text-violet-500 uppercase">
              {eyebrow}
            </p>
            <h2 className="text-lg font-extrabold text-slate-900">{title}</h2>
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function FormField({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-semibold text-slate-700">{label}</Label>
      {children}
    </div>
  );
}

function PriceOptionButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-4 py-2 text-xs font-semibold transition-colors",
        active
          ? "border-violet-300 bg-violet-600 text-white shadow-sm shadow-violet-300/30"
          : "border-violet-200 bg-white text-violet-700 hover:border-violet-300 hover:bg-violet-50",
      )}
    >
      {label}
    </button>
  );
}

function AddItemButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      className="h-9 rounded-full border-violet-200 bg-white px-4 text-xs font-semibold text-violet-700 shadow-sm hover:border-violet-300 hover:bg-violet-50 hover:text-violet-800"
    >
      <Plus className="mr-1.5 size-3.5" />
      {label}
    </Button>
  );
}

function RemoveItemButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      onClick={onClick}
      className="rounded-full border-slate-200 text-slate-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
      aria-label="Remove"
    >
      <Trash2 className="size-4" />
    </Button>
  );
}

function EmptyBlock({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-violet-200 bg-violet-50/30 px-6 py-10 text-center transition-colors hover:border-violet-300 hover:bg-violet-50/60"
    >
      <div className="flex size-10 items-center justify-center rounded-full bg-white text-violet-600 shadow-sm ring-1 ring-violet-100">
        <Plus className="size-5" />
      </div>
      <span className="text-sm font-semibold text-violet-700">{label}</span>
    </button>
  );
}

function UploadField({
  label,
  previewUrl,
  isUploading,
  onFile,
}: {
  label: string;
  previewUrl?: string;
  isUploading?: boolean;
  onFile: (file: File) => void | Promise<void>;
}) {
  const t = useTranslations("Events.create");
  return (
    <FormField label={label}>
      <UploadFile
        accept={ACCEPT_IMAGE_TYPES}
        variant="image"
        previewUrl={previewUrl}
        isUploading={isUploading}
        onFile={onFile}
        uploadLabel={t("actions.upload")}
        uploadingLabel={t("actions.uploading")}
        hint={t("uploadHint", { maxMb: MAX_IMAGE_SIZE_MB })}
        className="rounded-2xl border-violet-100 bg-violet-50/20"
      />
    </FormField>
  );
}
