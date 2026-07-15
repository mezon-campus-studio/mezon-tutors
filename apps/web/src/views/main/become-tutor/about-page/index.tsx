"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useAtom } from "jotai";
import { ShieldCheck, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Controller, useFieldArray, useForm, type Control, type FieldValues } from "react-hook-form";
import { z } from "zod";
import {
  BECOME_TUTOR_STEPS,
  calculateStepProgress,
  ECountry,
  ELanguage,
  EProficiencyLevel,
  ESubject,
  joinLanguagesArray,
  joinProficienciesArray,
  parseLanguagesString,
  parseProficienciesString,
  ROUTES,
  VIETNAM_PHONE_REGEX,
  CLOUDINARY_FOLDER,
  EXISTING_SECURE_FILE,
  MAX_IMAGE_SIZE_MB,
  ACCEPT_CV_TYPES,
  PROFESSIONAL_DOCUMENT_EXTENSIONS,
} from "@mezon-tutors/shared";
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import UploadFile from "@/components/common/UploadFile";
import { cloudinaryService } from "@/services";
import {
  markStepCompletedAtom,
  tutorProfileAboutAtom,
  tutorProfileLastSavedAtAtom,
  defaultAboutState,
} from "@/store";
import {
  BecomeTutorSection,
  BecomeTutorShell,
} from "../_shared/BecomeTutorShell";
import { useBecomeTutorAboutPreviewSync } from "../_shared/useBecomeTutorLivePreview";
import {
  BecomeTutorFieldLabel,
} from "../_shared/BecomeTutorFormFields";

const CURRENT_STEP = BECOME_TUTOR_STEPS.ABOUT;
const PROGRESS_PERCENT = calculateStepProgress(CURRENT_STEP);

export function buildLanguageEntries(languages: string, proficiencies: string) {
  const parsedLangs = languages?.trim() ? parseLanguagesString(languages) : [];
  const parsedProfs = proficiencies?.trim()
    ? parseProficienciesString(proficiencies)
    : [];
  return parsedLangs.length > 0
    ? parsedLangs.map((lang, i) => ({
        language: lang,
        proficiency: parsedProfs[i] ?? "",
      }))
    : [{ language: "", proficiency: "" }];
}

export default function AboutPage() {
  const t = useTranslations("BecomeTutor.about");
  const tp = useTranslations("BecomeTutor.about.placeholders");
  const tCountry = useTranslations("Tutors.Filter.Country");
  const tSubject = useTranslations("Tutors.Filter.Subject");
  const tLanguage = useTranslations("Tutors.Filter.Language");
  const tProficiency = useTranslations("Tutors.Filter.Proficiency");

  const router = useRouter();
  const [aboutState, setAbout] = useAtom(tutorProfileAboutAtom);
  const about = useMemo(
    () => ({
      ...defaultAboutState,
      ...aboutState,
      cv: { ...defaultAboutState.cv, ...(aboutState.cv ?? {}) },
    }),
    [aboutState],
  );
  const [, markStepCompleted] = useAtom(markStepCompletedAtom);
  const [, setLastSavedAt] = useAtom(tutorProfileLastSavedAtAtom);
  const [isUploadingCv, setIsUploadingCv] = useState(false);
  const cvUploadSeqRef = useRef(0);
  const cvCardRef = useRef<HTMLDivElement | null>(null);

  const allowedCvExt = useMemo(
    () => new Set<string>(PROFESSIONAL_DOCUMENT_EXTENSIONS),
    [],
  );

  const aboutSchema = useMemo(
    () =>
      z
        .object({
          firstName: z.string().min(1, t("validation.firstNameRequired")),
          lastName: z.string().min(1, t("validation.lastNameRequired")),
          email: z.string().email(t("validation.emailInvalid")),
          country: z
            .string()
            .min(1, t("validation.countryRequired"))
            .refine(
              (v) => (Object.values(ECountry) as readonly string[]).includes(v),
              { message: t("validation.countryFromList") },
            ),
          phone: z
            .string()
            .min(1, t("validation.phoneRequired"))
            .transform((value) => value.replace(/[\s-]/g, ""))
            .refine((value) => VIETNAM_PHONE_REGEX.test(value), {
              message: t("validation.phoneInvalid"),
            }),
          subject: z
            .string()
            .min(1, t("validation.subjectRequired"))
            .refine(
              (v) => (Object.values(ESubject) as readonly string[]).includes(v),
              { message: t("validation.subjectFromList") },
            ),
          languageEntries: z
            .array(
              z.object({
                language: z.string().refine(
                  (v) =>
                    !v ||
                    (Object.values(ELanguage) as readonly string[]).includes(v),
                  { message: t("validation.languagesFromList") },
                ),
                proficiency: z.string().refine(
                  (v) =>
                    !v ||
                    (Object.values(EProficiencyLevel) as readonly string[]).includes(
                      v,
                    ),
                  { message: t("validation.proficiencyFromList") },
                ),
              }),
            )
            .superRefine((arr, ctx) => {
              const hasAnyCompletePair = arr.some(
                (e) => e.language && e.proficiency,
              );
              if (!hasAnyCompletePair) {
                const idx =
                  arr.findIndex((e) => !e.language || !e.proficiency) ?? 0;
                const entry = arr[idx] ?? { language: "", proficiency: "" };
                if (!entry.language) {
                  ctx.addIssue({
                    code: "custom",
                    path: [idx, "language"],
                    message: t("validation.languagesRequired"),
                  });
                }
                if (!entry.proficiency) {
                  ctx.addIssue({
                    code: "custom",
                    path: [idx, "proficiency"],
                    message: t("validation.proficiencyRequired"),
                  });
                }
                return;
              }
              arr.forEach((entry, idx) => {
                const hasAnyValue = entry.language || entry.proficiency;
                if (!hasAnyValue) return;
                if (!entry.language) {
                  ctx.addIssue({
                    code: "custom",
                    path: [idx, "language"],
                    message: t("validation.languagesRequired"),
                  });
                }
                if (!entry.proficiency) {
                  ctx.addIssue({
                    code: "custom",
                    path: [idx, "proficiency"],
                    message: t("validation.proficiencyRequired"),
                  });
                }
              });
            }),
          cvFile: z.instanceof(File).nullable(),
        })
        .superRefine((data, ctx) => {
          if (!data.cvFile) return;
          const bytesLimit = MAX_IMAGE_SIZE_MB * 1024 * 1024;
          const ext = data.cvFile.name.split(".").pop()?.toLowerCase() ?? "";
          if (!allowedCvExt.has(ext)) {
            ctx.addIssue({
              path: ["cvFile"],
              code: "custom",
              message: t("validation.cvInvalidType"),
            });
            return;
          }
          if (data.cvFile.size > bytesLimit) {
            ctx.addIssue({
              path: ["cvFile"],
              code: "custom",
              message: t("validation.cvTooLarge", { max: MAX_IMAGE_SIZE_MB }),
            });
          }
        }),
    [t, allowedCvExt],
  );

  type AboutFormValues = z.infer<typeof aboutSchema>;

  const initialEntries = buildLanguageEntries(
    about.languages,
    about.proficiencies,
  );

  const form = useForm<AboutFormValues>({
    defaultValues: {
      firstName: about.firstName,
      lastName: about.lastName,
      email: about.email,
      country: about.country,
      phone: about.phone,
      subject: about.subject,
      languageEntries: initialEntries,
      cvFile: null,
    },
    resolver: zodResolver(aboutSchema),
    mode: "onChange",
  });

  const {
    control,
    handleSubmit,
    setFocus,
    register,
    formState: { errors },
    setValue,
    clearErrors,
  } = form;
  const { fields, append, remove } = useFieldArray({
    control,
    name: "languageEntries",
  });
  const formCardRef = useRef<HTMLDivElement | null>(null);

  useBecomeTutorAboutPreviewSync(control as unknown as Control<FieldValues>);

  // Sync persisted draft into the form when text fields change (e.g. returning from step 2).
  // Do NOT depend on `about.cv` — CV upload updates the atom mid-edit while form text
  // fields still live only in react-hook-form, and resetting would wipe user input.
  useEffect(() => {
    const entries = buildLanguageEntries(about.languages, about.proficiencies);
    form.reset({
      firstName: about.firstName,
      lastName: about.lastName,
      email: about.email,
      country: about.country,
      phone: about.phone,
      subject: about.subject,
      languageEntries: entries,
      cvFile: null,
    });
  }, [
    about.firstName,
    about.lastName,
    about.email,
    about.country,
    about.phone,
    about.subject,
    about.languages,
    about.proficiencies,
    form,
  ]);

  const processCvFile = useCallback(
    async (file: File) => {
      const bytesLimit = MAX_IMAGE_SIZE_MB * 1024 * 1024;
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

      if (!allowedCvExt.has(ext)) {
        form.setError("cvFile", {
          type: "manual",
          message: t("validation.cvInvalidType"),
        });
        return;
      }

      if (file.size > bytesLimit) {
        form.setError("cvFile", {
          type: "manual",
          message: t("validation.cvTooLarge", { max: MAX_IMAGE_SIZE_MB }),
        });
        return;
      }

      clearErrors("cvFile");
      setValue("cvFile", file);
      cvUploadSeqRef.current += 1;
      const seq = cvUploadSeqRef.current;
      const previousPublicId = about.cv?.publicId;
      setIsUploadingCv(true);

      const uploadCv = async (dataUrl: string | null) => {
        try {
          setAbout((prev) => ({
            ...prev,
            cv: {
              ...defaultAboutState.cv,
              ...(prev.cv ?? {}),
              dataUrl,
              fileName: file.name,
            },
          }));
          setLastSavedAt(new Date().toISOString());

          const uploadedFile = await cloudinaryService.uploadPrivateFile(
            file,
            CLOUDINARY_FOLDER.TUTOR_CV,
            "auto",
          );
          if (cvUploadSeqRef.current !== seq) return;
          setAbout((prev) => ({
            ...prev,
            cv: {
              ...defaultAboutState.cv,
              ...(prev.cv ?? {}),
              uploadedUrl: null,
              publicId: uploadedFile.publicId,
              fileName: file.name,
            },
          }));
          if (
            previousPublicId &&
            previousPublicId !== uploadedFile.publicId &&
            previousPublicId !== EXISTING_SECURE_FILE
          ) {
            void cloudinaryService.deleteFile(previousPublicId).catch(() => null);
          }
          await form.trigger("cvFile");
        } catch {
          if (cvUploadSeqRef.current !== seq) return;
          form.setError("cvFile", {
            type: "manual",
            message: t("validation.cvUploadFailed"),
          });
        } finally {
          if (cvUploadSeqRef.current === seq) setIsUploadingCv(false);
        }
      };

      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onerror = () => {
          if (cvUploadSeqRef.current === seq) setIsUploadingCv(false);
        };
        reader.onload = () => {
          void uploadCv(reader.result as string);
        };
        reader.readAsDataURL(file);
        return;
      }

      await uploadCv(null);
    },
    [
      about.cv?.publicId,
      allowedCvExt,
      clearErrors,
      form,
      setAbout,
      setLastSavedAt,
      setValue,
      t,
    ],
  );

  const onSubmit = (values: AboutFormValues) => {
    if (isUploadingCv) return;

    const entries = values.languageEntries.filter(
      (e) => e.language && e.proficiency,
    );
    const { languageEntries: _e, cvFile: _cv, ...rest } = values;
    setAbout({
      ...rest,
      languages: joinLanguagesArray(entries.map((e) => e.language)),
      proficiencies: joinProficienciesArray(entries.map((e) => e.proficiency)),
      cv: about.cv,
    });
    setLastSavedAt(new Date().toISOString());
    markStepCompleted(CURRENT_STEP);
    router.push(ROUTES.BECOME_TUTOR.PHOTO);
  };

  const handleSaveExit = useCallback(async () => {
    if (isUploadingCv) return;
    const values = form.getValues();
    const entries = values.languageEntries.filter((e) => e.language && e.proficiency);
    const { languageEntries: _le, cvFile: _cv, ...rest } = values;
    setAbout({
      ...rest,
      languages: joinLanguagesArray(entries.map((e) => e.language)),
      proficiencies: joinProficienciesArray(entries.map((e) => e.proficiency)),
      cv: about.cv,
    });
    setLastSavedAt(new Date().toISOString());
  }, [about.cv, form, isUploadingCv, setAbout, setLastSavedAt]);

  const onValidationError = (errors: Record<string, unknown>) => {
    if (errors.cvFile) {
      cvCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    formCardRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
    const firstError = Object.keys(errors)[0] as keyof AboutFormValues | undefined;
    if (firstError) setFocus(firstError);
  };

  return (
    <BecomeTutorShell
      headerTitle={t("headerTitle")}
      onSaveExit={handleSaveExit}
      stepLabel={t("stepLabel")}
      progressPercent={PROGRESS_PERCENT}
      progressLabel={t("progressPercentLabel", { percent: PROGRESS_PERCENT })}
      nextLabel={t("nextLabel")}
      continueLabel={t("continue")}
      currentStep={CURRENT_STEP}
      onContinue={handleSubmit(onSubmit, onValidationError)}
      continueDisabled={isUploadingCv}
    >
      <BecomeTutorSection
        eyebrow={t("sectionEyebrow", { step: CURRENT_STEP })}
        title={t("title")}
        description={t("subtitle")}
        isShowNote
        contentRef={formCardRef}
      >
        <form
          onSubmit={handleSubmit(onSubmit, onValidationError)}
          className="flex flex-col gap-4"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <BecomeTutorFieldLabel htmlFor="firstName" required>
                {t("fields.firstNameLabel")}
              </BecomeTutorFieldLabel>
              <Input
                id="firstName"
                placeholder={tp("firstName")}
                {...register("firstName")}
                className="h-11 rounded-xl border-slate-200 bg-slate-50/60 text-sm transition-colors focus-visible:border-violet-300 focus-visible:bg-white focus-visible:ring-violet-200/60"
              />
              {errors.firstName && (
                <p className="text-xs text-rose-600">{errors.firstName.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <BecomeTutorFieldLabel htmlFor="lastName" required>
                {t("fields.lastNameLabel")}
              </BecomeTutorFieldLabel>
              <Input
                id="lastName"
                placeholder={tp("lastName")}
                {...register("lastName")}
                className="h-11 rounded-xl border-slate-200 bg-slate-50/60 text-sm transition-colors focus-visible:border-violet-300 focus-visible:bg-white focus-visible:ring-violet-200/60"
              />
              {errors.lastName && (
                <p className="text-xs text-rose-600">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <BecomeTutorFieldLabel htmlFor="email" required>
              {t("fields.emailLabel")}
            </BecomeTutorFieldLabel>
            <Input
              id="email"
              type="email"
              placeholder={tp("email")}
              {...register("email")}
              className="h-11 rounded-xl border-slate-200 bg-slate-50/60 text-sm transition-colors focus-visible:border-violet-300 focus-visible:bg-white focus-visible:ring-violet-200/60"
            />
            {errors.email && (
              <p className="text-xs text-rose-600">{errors.email.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <BecomeTutorFieldLabel required>
                {t("fields.countryLabel")}
              </BecomeTutorFieldLabel>
              <Controller
                name="country"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-11! w-full rounded-xl border-slate-200 bg-slate-50/60 text-sm">
                      <SelectValue placeholder={tp("country")}>
                        {(value) =>
                          value ? tCountry(value) : tp("country")
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(ECountry)
                        .slice(1)
                        .map((country) => (
                          <SelectItem key={country} value={country}>
                            {tCountry(country)}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.country && (
                <p className="text-xs text-rose-600">{errors.country.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <BecomeTutorFieldLabel htmlFor="phone" required>
                {t("fields.phoneLabel")}
              </BecomeTutorFieldLabel>
              <Input
                id="phone"
                placeholder={tp("phone")}
                {...register("phone")}
                className="h-11 rounded-xl border-slate-200 bg-slate-50/60 text-sm transition-colors focus-visible:border-violet-300 focus-visible:bg-white focus-visible:ring-violet-200/60"
              />
              {errors.phone && (
                <p className="text-xs text-rose-600">{errors.phone.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <BecomeTutorFieldLabel required>
              {t("fields.subjectLabel")}
            </BecomeTutorFieldLabel>
            <Controller
              name="subject"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="h-11! w-full rounded-xl border-slate-200 bg-slate-50/60 text-sm">
                    <SelectValue placeholder={tp("subject")}>
                      {(value) => (value ? tSubject(value) : tp("subject"))}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(ESubject)
                      .slice(1)
                      .map((value) => (
                        <SelectItem key={value} value={value}>
                          {tSubject(value)}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            />
            <p className="text-xs text-slate-500">{t("fields.subjectHelper")}</p>
            {errors.subject && (
              <p className="text-xs text-rose-600">{errors.subject.message}</p>
            )}
          </div>

          <div className="space-y-3 rounded-2xl border border-violet-100 bg-violet-50/30 p-4">
            <div className="flex items-center justify-between">
              <BecomeTutorFieldLabel required>
                {t("fields.languagesLabel")}
              </BecomeTutorFieldLabel>
              <button
                type="button"
                onClick={() => append({ language: "", proficiency: "" })}
                className="rounded-full bg-violet-100 px-3 py-1 text-[11px] font-bold text-violet-700 transition hover:bg-violet-200"
              >
                {t("addAnotherLanguage")}
              </button>
            </div>
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end"
              >
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {t("fields.languageLabel")}
                  </Label>
                  <Controller
                    name={`languageEntries.${index}.language`}
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="h-11! w-full rounded-xl border-slate-200 bg-white text-sm">
                          <SelectValue
                            placeholder={tp("language")}
                          >
                            {(value) =>
                              value
                                ? tLanguage(value)
                                : tp("language")
                            }
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(ELanguage)
                            .slice(1)
                            .map((language) => (
                              <SelectItem key={language} value={language}>
                                {tLanguage(language)}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {t("fields.proficiencyLabel")}
                  </Label>
                  <Controller
                    name={`languageEntries.${index}.proficiency`}
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="h-11! w-full rounded-xl border-slate-200 bg-white text-sm">
                          <SelectValue
                            placeholder={tp("proficiency")}
                          >
                            {(value) =>
                              value
                                ? tProficiency(value)
                                : tp("proficiency")
                            }
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(EProficiencyLevel).map((proficiency) => (
                            <SelectItem key={proficiency} value={proficiency}>
                              {tProficiency(proficiency)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                {fields.length > 1 ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => remove(index)}
                    className="h-11 rounded-xl border-rose-200 px-3 text-rose-600 hover:border-rose-300 hover:bg-rose-50"
                    aria-label={t("removeLanguage")}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                ) : null}
              </div>
            ))}
          </div>

          <div className="space-y-1.5" ref={cvCardRef}>
            <BecomeTutorFieldLabel optional>
              {t("fields.cvLabel")}
            </BecomeTutorFieldLabel>
            <p className="text-xs text-slate-500">{t("fields.cvHelper")}</p>
            <UploadFile
              accept={ACCEPT_CV_TYPES}
              previewUrl={about.cv?.dataUrl}
              fileName={about.cv?.fileName}
              isUploading={isUploadingCv}
              onFile={processCvFile}
              uploadLabel={t("fields.cvUploadButton")}
              uploadingLabel={t("fields.cvUploading")}
              emptyLabel={t("fields.cvEmptyState")}
              dropHereLabel={t("fields.cvDropHere")}
              hint={t("fields.cvHint", { max: MAX_IMAGE_SIZE_MB })}
              error={errors.cvFile?.message}
            />
          </div>
        </form>
      </BecomeTutorSection>

      <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-[linear-gradient(110deg,#ecfdf5,#f0fdfa)] p-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-700">
          <ShieldCheck className="size-5" />
        </div>
        <div className="flex-1 space-y-0.5">
          <p className="text-sm font-extrabold text-emerald-900">
            {t("privacyTitle")}
          </p>
          <p className="text-xs leading-5 text-emerald-700/80">
            {t("privacyDescription")}
          </p>
        </div>
      </div>
    </BecomeTutorShell>
  );
}
