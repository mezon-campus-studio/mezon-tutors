"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  Focus,
  GraduationCap,
  Image as ImageIcon,
  Sun,
  Upload,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  ACCEPT_IMAGE_TYPES,
  BECOME_TUTOR_STEPS,
  calculateStepProgress,
  CLOUDINARY_FOLDER,
  DEFAULT_AVATAR_URL,
  formatLastSavedTime,
  MAX_IMAGE_SIZE_MB,
} from "@mezon-tutors/shared";
import { Button, Input, Label, Spinner } from "@/components/ui";
import { cloudinaryService } from "@/services";
import {
  markStepCompletedAtom,
  tutorProfileLastSavedAtAtom,
  tutorProfilePhotoAtom,
  userAtom,
} from "@/store";
import {
  BecomeTutorSection,
  BecomeTutorShell,
} from "../_shared/BecomeTutorShell";

const CURRENT_STEP = BECOME_TUTOR_STEPS.PHOTO;
const PROGRESS_PERCENT = calculateStepProgress(CURRENT_STEP);

export default function PhotoPage() {
  const t = useTranslations("TutorProfile.Photo");
  const router = useRouter();
  const identityCardRef = useRef<HTMLDivElement | null>(null);
  const formCardRef = useRef<HTMLDivElement | null>(null);
  const [tutorProfilePhoto, setTutorProfilePhoto] = useAtom(
    tutorProfilePhotoAtom,
  );
  const [, markStepCompleted] = useAtom(markStepCompletedAtom);
  const currentUser = useAtomValue(userAtom);
  const [previewIdentityUrl, setPreviewIdentityUrl] = useState<string | null>(
    tutorProfilePhoto.identity?.dataUrl ||
      tutorProfilePhoto.identity?.uploadedUrl ||
      null,
  );
  const [isUploading, setIsUploading] = useState(false);
  const identityUploadSeqRef = useRef(0);
  const lastSavedAt = useAtomValue(tutorProfileLastSavedAtAtom);
  const setLastSavedAt = useSetAtom(tutorProfileLastSavedAtAtom);

  const allowedImageExt = useMemo(() => new Set(["jpg", "jpeg", "png"]), []);

  const photoFormSchema = useMemo(
    () =>
      z
        .object({
          introduce: z.string().min(1, t("validation.introduceRequired")),
          headline: z.string().min(1, t("validation.headlineRequired")),
          motivate: z.string().min(1, t("validation.motivateRequired")),
          identityPhotoFile: z.instanceof(File).nullable(),
        })
        .superRefine((data, ctx) => {
          const bytesLimit = MAX_IMAGE_SIZE_MB * 1024 * 1024;
          const checkImageFile = (
            file: File | null,
            path: "identityPhotoFile",
          ) => {
            if (!file) return;
            const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
            const mimeOk = file.type.startsWith("image/");
            if (!allowedImageExt.has(ext) || !mimeOk) {
              ctx.addIssue({
                path: [path],
                code: "custom",
                message: t("validation.identityInvalidType"),
              });
              return;
            }
            if (file.size > bytesLimit) {
              ctx.addIssue({
                path: [path],
                code: "custom",
                message: t("validation.identityInvalidSize", {
                  max: MAX_IMAGE_SIZE_MB,
                }),
              });
            }
          };

          const hasIdentity =
            data.identityPhotoFile !== null ||
            !!tutorProfilePhoto.identity?.dataUrl ||
            !!tutorProfilePhoto.identity?.uploadedUrl;
          if (!hasIdentity) {
            ctx.addIssue({
              path: ["identityPhotoFile"],
              code: "custom",
              message: t("validation.identityRequired"),
            });
          } else if (data.identityPhotoFile) {
            checkImageFile(data.identityPhotoFile, "identityPhotoFile");
          }
        }),
    [
      t,
      tutorProfilePhoto.identity?.dataUrl,
      tutorProfilePhoto.identity?.uploadedUrl,
      allowedImageExt,
    ],
  );

  type PhotoFormValues = z.infer<typeof photoFormSchema>;

  const form = useForm<PhotoFormValues>({
    defaultValues: {
      introduce: tutorProfilePhoto.introduce,
      headline: tutorProfilePhoto.headline,
      motivate: tutorProfilePhoto.motivate,
      identityPhotoFile: null,
    },
    resolver: zodResolver(photoFormSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
  });

  const {
    handleSubmit,
    setFocus,
    register,
    formState: { errors },
    setValue,
  } = form;

  useEffect(() => {
    setPreviewIdentityUrl(
      tutorProfilePhoto.identity?.dataUrl ||
        tutorProfilePhoto.identity?.uploadedUrl ||
        null,
    );
  }, [
    tutorProfilePhoto.identity?.dataUrl,
    tutorProfilePhoto.identity?.uploadedUrl,
  ]);

  useEffect(() => {
    const avatarUrl = currentUser?.avatar || DEFAULT_AVATAR_URL;
    if (avatarUrl && tutorProfilePhoto.photo?.uploadedUrl !== avatarUrl) {
      setTutorProfilePhoto((prev) => ({
        ...prev,
        photo: {
          ...prev.photo,
          uploadedUrl: avatarUrl,
        },
      }));
    }
  }, [
    currentUser?.avatar,
    setTutorProfilePhoto,
    tutorProfilePhoto.photo?.uploadedUrl,
  ]);

  const handleIdentityPhotoChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const bytesLimit = MAX_IMAGE_SIZE_MB * 1024 * 1024;
    if (file.size > bytesLimit) {
      form.setError("identityPhotoFile", {
        type: "manual",
        message: t("validation.identityInvalidSize", {
          max: MAX_IMAGE_SIZE_MB,
        }),
      });
      return;
    }

    setValue("identityPhotoFile", file);
    identityUploadSeqRef.current += 1;
    const seq = identityUploadSeqRef.current;
    const previousPublicId = tutorProfilePhoto.identity?.publicId;
    setIsUploading(true);

    const reader = new FileReader();
    reader.onerror = () => {
      if (identityUploadSeqRef.current === seq) setIsUploading(false);
    };
    reader.onload = async () => {
      try {
        const dataUrl = reader.result as string;
        setTutorProfilePhoto((prev) => ({
          ...prev,
          identity: { ...prev.identity, dataUrl },
        }));
        setPreviewIdentityUrl(dataUrl);
        setLastSavedAt(new Date().toISOString());

        const uploadedFile = await cloudinaryService.uploadFileWithSignature(
          file,
          CLOUDINARY_FOLDER.TUTOR_IDENTITY,
          "image",
        );
        if (identityUploadSeqRef.current !== seq) return;
        setTutorProfilePhoto((prev) => ({
          ...prev,
          identity: {
            ...prev.identity,
            uploadedUrl: uploadedFile.secureUrl,
            publicId: uploadedFile.publicId,
          },
        }));
        if (previousPublicId && previousPublicId !== uploadedFile.publicId) {
          void cloudinaryService.deleteFile(previousPublicId).catch(() => null);
        }
        await form.trigger("identityPhotoFile");
      } catch {
        if (identityUploadSeqRef.current !== seq) return;
        form.setError("identityPhotoFile", {
          type: "manual",
          message: t("validation.identityUploadFailed"),
        });
      } finally {
        if (identityUploadSeqRef.current === seq) setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const onSaveContinue = async (values: PhotoFormValues) => {
    const { identityPhotoFile: _identityPhotoFile, ...textValues } = values;
    if (isUploading) return;

    if (!tutorProfilePhoto.identity?.uploadedUrl) {
      form.setError("identityPhotoFile", {
        type: "manual",
        message: t("validation.identityUploadFailed"),
      });
      return;
    }

    setTutorProfilePhoto((prev) => ({ ...prev, ...textValues }));
    setLastSavedAt(new Date().toISOString());
    markStepCompleted(CURRENT_STEP);
    router.push("/become-tutor/certification");
  };

  const onValidationError = (
    errors: Partial<Record<keyof PhotoFormValues, { message?: string }>>,
  ) => {
    const firstError = Object.keys(errors)[0] as
      | keyof PhotoFormValues
      | undefined;
    if (!firstError) return;
    if (firstError === "identityPhotoFile") {
      identityCardRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      return;
    }

    formCardRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
    if (["headline", "motivate", "introduce"].includes(firstError))
      setFocus(firstError);
  };

  const draftSavedLabel =
    lastSavedAt && formatLastSavedTime(lastSavedAt)
      ? t("draftSaved", { time: formatLastSavedTime(lastSavedAt) })
      : "";
  const avatarPreviewUrl =
    tutorProfilePhoto.photo?.uploadedUrl || DEFAULT_AVATAR_URL;

  const tips = [
    { key: "clear", Icon: Focus },
    { key: "noReflection", Icon: Sun },
    { key: "fullDocument", Icon: ImageIcon },
    { key: "validDocument", Icon: GraduationCap },
  ] as const;

  return (
    <BecomeTutorShell
      headerTitle={t("headerTitle")}
      saveExitLabel={t("saveExit")}
      draftSavedLabel={draftSavedLabel || undefined}
      stepLabel={t("stepLabel")}
      progressPercent={PROGRESS_PERCENT}
      progressLabel={t("progressPercentLabel", { percent: PROGRESS_PERCENT })}
      nextLabel={t("nextLabel")}
      backLabel={t("back")}
      continueLabel={t("saveContinue")}
      currentStep={CURRENT_STEP}
      onBack={() => router.push("/become-tutor")}
      onContinue={handleSubmit(onSaveContinue, onValidationError)}
      continueDisabled={isUploading}
    >
      <BecomeTutorSection
        eyebrow={t("avatar.label")}
        title={t("avatar.title")}
        description={t("avatar.subtitle")}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-full bg-[linear-gradient(135deg,#ede9fe,#fce7f3)] p-1.5 shadow-md shadow-violet-200/50">
            <div className="size-32 overflow-hidden rounded-full ring-4 ring-white sm:size-36">
              <img
                src={avatarPreviewUrl}
                alt={t("avatar.label")}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
          <div className="space-y-1 text-center text-xs text-slate-500">
            <p>{t("avatar.syncedNote")}</p>
            <p>{t("avatar.manualSyncNote")}</p>
          </div>
        </div>
      </BecomeTutorSection>

      <BecomeTutorSection
        eyebrow="Verification"
        title={t("identity.title")}
        description={t("identity.subtitle")}
        contentRef={identityCardRef}
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className="relative aspect-[16/10] w-full max-w-2xl overflow-hidden rounded-2xl border border-violet-100 bg-[linear-gradient(135deg,#faf7ff,#ffffff)]"
            aria-busy={isUploading}
          >
            {previewIdentityUrl ? (
              <img
                src={previewIdentityUrl}
                alt="Identity"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#ede9fe,#fce7f3)] text-violet-600">
                  <ImageIcon className="size-6" />
                </div>
                <p className="px-4 text-center text-xs sm:text-sm">
                  {t("identity.emptyState")}
                </p>
              </div>
            )}
            {isUploading ? (
              <div className="absolute inset-0 z-1 flex flex-col items-center justify-center gap-2 bg-white/75 backdrop-blur-[2px]">
                <Spinner className="size-10 text-violet-600" />
                <p className="text-xs font-semibold text-violet-800">
                  {t("identity.uploading")}
                </p>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col items-center gap-2">
            <input
              type="file"
              id="identityPhoto"
              accept={ACCEPT_IMAGE_TYPES}
              onChange={handleIdentityPhotoChange}
              className="hidden"
            />
            <Button
              type="button"
              onClick={() => document.getElementById("identityPhoto")?.click()}
              disabled={isUploading}
              className="group h-10 rounded-full bg-[linear-gradient(110deg,#7c3aed_0%,#9333ea_50%,#db2777_100%)] px-5 text-xs font-semibold text-white shadow-md shadow-violet-300/40 hover:shadow-lg hover:shadow-violet-400/50"
            >
              {isUploading ? (
                <Spinner className="mr-1.5 size-4 text-white" />
              ) : (
                <Upload className="mr-1.5 size-4" />
              )}
              {isUploading ? t("identity.uploading") : t("identity.uploadButton")}
            </Button>
            <p className="text-center text-xs text-slate-500">
              {t("uploadHint")}
            </p>
            {errors.identityPhotoFile && (
              <p className="text-center text-xs text-rose-600">
                {errors.identityPhotoFile.message}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-violet-500">
            {t("identity.tipsTitle")}
          </h3>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {tips.map(({ key, Icon }) => (
              <div
                key={key}
                className="flex items-start gap-2.5 rounded-2xl border border-violet-100 bg-violet-50/30 p-3"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#ede9fe,#fce7f3)] text-violet-700 ring-1 ring-violet-100">
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 sm:text-sm">
                    {t(`identity.tips.${key}.title`)}
                  </h4>
                  <p className="mt-0.5 text-[11px] leading-5 text-slate-600 sm:text-xs">
                    {t(`identity.tips.${key}.description`)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </BecomeTutorSection>

      <BecomeTutorSection
        eyebrow="Profile"
        title={t("cardTitle")}
        description={t("cardSubtitle")}
        contentRef={formCardRef}
      >
        <form
          onSubmit={handleSubmit(onSaveContinue, onValidationError)}
          className="flex flex-col gap-4"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="headline" className="text-xs font-semibold text-slate-700">
                {t("fields.headlineLabel")}
              </Label>
              <Input
                id="headline"
                placeholder={t("fields.headlinePlaceholder")}
                {...register("headline")}
                className="h-11 rounded-xl border-slate-200 bg-slate-50/60 text-sm transition-colors focus-visible:border-violet-300 focus-visible:bg-white focus-visible:ring-violet-200/60"
              />
              {errors.headline && (
                <p className="text-xs text-rose-600">
                  {errors.headline.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="motivate" className="text-xs font-semibold text-slate-700">
                {t("fields.motivateLabel")}
              </Label>
              <Input
                id="motivate"
                placeholder={t("fields.motivatePlaceholder")}
                {...register("motivate")}
                className="h-11 rounded-xl border-slate-200 bg-slate-50/60 text-sm transition-colors focus-visible:border-violet-300 focus-visible:bg-white focus-visible:ring-violet-200/60"
              />
              {errors.motivate && (
                <p className="text-xs text-rose-600">
                  {errors.motivate.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="introduce" className="text-xs font-semibold text-slate-700">
              {t("fields.introduceLabel")}
            </Label>
            <Input
              id="introduce"
              placeholder={t("fields.introducePlaceholder")}
              {...register("introduce")}
              className="h-11 rounded-xl border-slate-200 bg-slate-50/60 text-sm transition-colors focus-visible:border-violet-300 focus-visible:bg-white focus-visible:ring-violet-200/60"
            />
            {errors.introduce && (
              <p className="text-xs text-rose-600">{errors.introduce.message}</p>
            )}
          </div>
        </form>
      </BecomeTutorSection>
    </BecomeTutorShell>
  );
}
