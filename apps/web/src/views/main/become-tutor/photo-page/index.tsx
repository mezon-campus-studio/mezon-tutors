"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  Focus,
  GraduationCap,
  Image as ImageIcon,
  MapPin,
  Star,
  Sun,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch, type Control, type FieldValues } from "react-hook-form";
import { z } from "zod";
import {
  ACCEPT_IMAGE_TYPES,
  BECOME_TUTOR_STEPS,
  calculateStepProgress,
  CLOUDINARY_FOLDER,
  DEFAULT_AVATAR_URL,
  EXISTING_SECURE_FILE,
  MAX_IMAGE_SIZE_MB,
} from "@mezon-tutors/shared";
import Image from "next/image";
import { Textarea } from "@/components/ui";
import UploadFile from "@/components/common/UploadFile";
import { cloudinaryService } from "@/services";
import {
  markStepCompletedAtom,
  tutorProfileAboutAtom,
  tutorProfileLastSavedAtAtom,
  tutorProfilePhotoAtom,
  userAtom,
} from "@/store";
import {
  BecomeTutorSection,
  BecomeTutorShell,
} from "../_shared/BecomeTutorShell";
import { useBecomeTutorPhotoPreviewSync } from "../_shared/useBecomeTutorLivePreview";
import {
  BecomeTutorFieldLabel,
} from "../_shared/BecomeTutorFormFields";
import { MezonSyncButton } from "@/components/dashboard";

const CURRENT_STEP = BECOME_TUTOR_STEPS.PHOTO;
const PROGRESS_PERCENT = calculateStepProgress(CURRENT_STEP);

export default function PhotoPage() {
  const t = useTranslations("BecomeTutor.photo");
  const tCard = useTranslations("Tutors.TutorCard");
  const router = useRouter();
  const identityCardRef = useRef<HTMLDivElement | null>(null);
  const formCardRef = useRef<HTMLDivElement | null>(null);
  const [tutorProfilePhoto, setTutorProfilePhoto] = useAtom(
    tutorProfilePhotoAtom,
  );
  const [, markStepCompleted] = useAtom(markStepCompletedAtom);
  const currentUser = useAtomValue(userAtom);
  const tutorProfileAbout = useAtomValue(tutorProfileAboutAtom);
  const [previewIdentityUrl, setPreviewIdentityUrl] = useState<string | null>(
    tutorProfilePhoto.identity?.dataUrl || null,
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
            !!tutorProfilePhoto.identity?.publicId;
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
    [t, tutorProfilePhoto.identity?.publicId, allowedImageExt],
  );

  type PhotoFormValues = z.infer<typeof photoFormSchema>;

  const form = useForm<PhotoFormValues>({
    defaultValues: {
      introduce: tutorProfilePhoto.introduce,
      headline: tutorProfilePhoto.headline,
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
    getValues,
    control,
    formState: { errors },
    setValue,
  } = form;

  useBecomeTutorPhotoPreviewSync(control as unknown as Control<FieldValues>);

  const watchedHeadline = useWatch({ control, name: 'headline' });
  const watchedIntroduce = useWatch({ control, name: 'introduce' });

  useEffect(() => {
    const dataUrl = tutorProfilePhoto.identity?.dataUrl;
    if (dataUrl) {
      setPreviewIdentityUrl(dataUrl);
    }
  }, [tutorProfilePhoto.identity?.dataUrl]);

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

  const processIdentityPhotoFile = useCallback(
    async (file: File) => {
      const bytesLimit = MAX_IMAGE_SIZE_MB * 1024 * 1024;
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      const mimeOk = file.type.startsWith("image/");

      if (!allowedImageExt.has(ext) || !mimeOk) {
        form.setError("identityPhotoFile", {
          type: "manual",
          message: t("validation.identityInvalidType"),
        });
        return;
      }

      if (file.size > bytesLimit) {
        form.setError("identityPhotoFile", {
          type: "manual",
          message: t("validation.identityInvalidSize", {
            max: MAX_IMAGE_SIZE_MB,
          }),
        });
        return;
      }

      form.clearErrors("identityPhotoFile");
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

          const uploadedFile = await cloudinaryService.uploadPrivateFile(
            file,
            CLOUDINARY_FOLDER.TUTOR_IDENTITY,
            "image",
          );
          if (identityUploadSeqRef.current !== seq) return;
          setTutorProfilePhoto((prev) => ({
            ...prev,
            identity: {
              ...prev.identity,
              uploadedUrl: null,
              publicId: uploadedFile.publicId,
            },
          }));
          if (
            previousPublicId &&
            previousPublicId !== uploadedFile.publicId &&
            previousPublicId !== EXISTING_SECURE_FILE
          ) {
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
    },
    [
      allowedImageExt,
      form,
      setLastSavedAt,
      setTutorProfilePhoto,
      setValue,
      t,
      tutorProfilePhoto.identity?.publicId,
    ],
  );


  const onSaveContinue = async (values: PhotoFormValues) => {
    const { identityPhotoFile: _identityPhotoFile, ...textValues } = values;
    if (isUploading) return;

    if (!tutorProfilePhoto.identity?.publicId) {
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
    if (["headline", "introduce"].includes(firstError))
      setFocus(firstError);
  };

  const handleSaveExit = useCallback(async () => {
    if (isUploading) return;
    const values = getValues();
    setTutorProfilePhoto((prev) => ({
      ...prev,
      headline: values.headline,
      introduce: values.introduce,
    }));
    setLastSavedAt(new Date().toISOString());
  }, [getValues, isUploading, setLastSavedAt, setTutorProfilePhoto]);

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
      onSaveExit={handleSaveExit}
      stepLabel={t("stepLabel")}
      progressPercent={PROGRESS_PERCENT}
      progressLabel={t("progressPercentLabel", { percent: PROGRESS_PERCENT })}
      nextLabel={t("nextLabel")}
      backLabel={t("back")}
      continueLabel={t("saveContinue")}
      currentStep={CURRENT_STEP}
      onBack={() => router.push("/become-tutor/about")}
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
          <div>
            <MezonSyncButton className="mt-3" />
          </div>
          <div className="space-y-1 text-center text-xs text-slate-500">
            <p>{t("avatar.syncedNote")}</p>
            <p>{t("avatar.manualSyncNote")}</p>
          </div>
        </div>
      </BecomeTutorSection>

      <BecomeTutorSection
        eyebrow="Profile"
        title={t("cardTitle")}
        description={t("cardSubtitle")}
        contentRef={formCardRef}
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <form
            onSubmit={handleSubmit(onSaveContinue, onValidationError)}
            className="flex flex-col gap-4 lg:col-span-3"
          >
            <div className="space-y-1.5">
              <BecomeTutorFieldLabel htmlFor="headline" required>
                {t("fields.headlineLabel")}
              </BecomeTutorFieldLabel>
              <Textarea
                id="headline"
                placeholder={t("fields.headlinePlaceholder")}
                {...register("headline")}
                className="min-h-30 rounded-xl border-slate-200 bg-slate-50/60 text-sm transition-colors focus-visible:border-violet-300 focus-visible:bg-white focus-visible:ring-violet-200/60"
              />
              {errors.headline && (
                <p className="text-xs text-rose-600">
                  {errors.headline.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <BecomeTutorFieldLabel htmlFor="introduce" required>
                {t("fields.introduceLabel")}
              </BecomeTutorFieldLabel>
              <Textarea
                id="introduce"
                placeholder={t("fields.introducePlaceholder")}
                {...register("introduce")}
                className="min-h-40 rounded-xl border-slate-200 bg-slate-50/60 text-sm transition-colors focus-visible:border-violet-300 focus-visible:bg-white focus-visible:ring-violet-200/60"
              />
              {errors.introduce && (
                <p className="text-xs text-rose-600">{errors.introduce.message}</p>
              )}
            </div>
          </form>

          <div className="lg:col-span-2 lg:sticky lg:top-6 lg:self-start">
            <div className="overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm">
              <div className="bg-[linear-gradient(135deg,#ede9fe,#fce7f3)] px-4 py-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-600">
                  {t("previewLabel")}
                </p>
              </div>
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="relative shrink-0">
                    <Image
                      src={currentUser?.avatar || DEFAULT_AVATAR_URL}
                      alt="avatar"
                      width={56}
                      height={56}
                      className="size-14 rounded-xl object-cover object-center shadow-sm ring-1 ring-white"
                    />
                    <div className="absolute -bottom-1 -right-1 rounded-full bg-[linear-gradient(135deg,#7c3aed,#ec4899)] px-1.5 py-0.5 text-[8px] font-bold text-white ring-1 ring-white">
                      Pro
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold text-slate-900">
                      {tutorProfileAbout.firstName} {tutorProfileAbout.lastName}
                    </p>
                    <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600 ring-1 ring-amber-100">
                      <Star className="size-3 fill-amber-400 text-amber-400" />
                      0.00
                    </span>
                  </div>
                </div>

                {watchedHeadline && (
                  <p className="mt-3 text-xs leading-5 text-slate-600 line-clamp-2">
                    {watchedHeadline}
                  </p>
                )}

                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700 ring-1 ring-violet-100">
                    <GraduationCap className="size-3" />
                    {tutorProfileAbout.subject || tCard("noSubject")}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-fuchsia-50 px-2 py-0.5 text-[10px] font-semibold text-fuchsia-700 ring-1 ring-fuchsia-100">
                    <MapPin className="size-3" />
                    {tutorProfileAbout.country || tCard("noCountry")}
                  </span>
                </div>

                <div className="mt-4 border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-2">
                    <div className="flex size-6 items-center justify-center rounded-md bg-[linear-gradient(135deg,#ede9fe,#fce7f3)] text-violet-700 ring-1 ring-violet-100">
                      <User className="size-3" />
                    </div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-violet-500">
                      Introduction
                    </p>
                  </div>
                  {watchedIntroduce ? (
                    <p className="mt-2 text-xs leading-5 text-slate-700 line-clamp-4">
                      {watchedIntroduce}
                    </p>
                  ) : (
                    <p className="mt-2 text-xs italic leading-5 text-slate-400">
                      {t("noInformation")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </BecomeTutorSection>

      <BecomeTutorSection
        eyebrow="Verification"
        title={t("identity.title")}
        description={t("identity.subtitle")}
        contentRef={identityCardRef}
      >
        <BecomeTutorFieldLabel required className="mb-2 block">
          {t("identity.uploadButton")}
        </BecomeTutorFieldLabel>
        <UploadFile
          variant="image"
          accept={ACCEPT_IMAGE_TYPES}
          previewUrl={previewIdentityUrl}
          isUploading={isUploading}
          onFile={processIdentityPhotoFile}
          uploadLabel={t("identity.uploadButton")}
          uploadingLabel={t("identity.uploading")}
          emptyLabel={t("identity.emptyState")}
          dropHereLabel={t("identity.dropHere")}
          hint={t("uploadHint")}
          error={errors.identityPhotoFile?.message}
        />

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
    </BecomeTutorShell>
  );
}
