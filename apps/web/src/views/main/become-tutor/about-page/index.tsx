"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useAtom } from "jotai";
import { ShieldCheck, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import {
  BECOME_TUTOR_STEPS,
  calculateStepProgress,
  ECountry,
  ELanguage,
  EProficiencyLevel,
  ESubject,
  formatLastSavedTime,
  joinLanguagesArray,
  joinProficienciesArray,
  parseLanguagesString,
  parseProficienciesString,
  VIETNAM_PHONE_REGEX,
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
import {
  markStepCompletedAtom,
  tutorProfileAboutAtom,
  tutorProfileLastSavedAtAtom,
} from "@/store";
import {
  BecomeTutorSection,
  BecomeTutorShell,
} from "../_shared/BecomeTutorShell";

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
  const t = useTranslations("TutorProfile.About");
  const tCountry = useTranslations("Tutors.Filter.Country");
  const tSubject = useTranslations("Tutors.Filter.Subject");
  const tLanguage = useTranslations("Tutors.Filter.Language");
  const tProficiency = useTranslations("Tutors.Filter.Proficiency");

  const router = useRouter();
  const [about, setAbout] = useAtom(tutorProfileAboutAtom);
  const [, markStepCompleted] = useAtom(markStepCompletedAtom);
  const [lastSavedAt, setLastSavedAt] = useAtom(tutorProfileLastSavedAtAtom);

  const aboutSchema = useMemo(
    () =>
      z.object({
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
      }),
    [t],
  );

  type AboutFormValues = z.infer<typeof aboutSchema>;

  const draftSavedLabel =
    lastSavedAt && formatLastSavedTime(lastSavedAt)
      ? t("draftSaved", { time: formatLastSavedTime(lastSavedAt) })
      : "";

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
  } = form;
  const { fields, append, remove } = useFieldArray({
    control,
    name: "languageEntries",
  });
  const formCardRef = useRef<HTMLDivElement | null>(null);

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
    });
  }, [about, form]);

  const onSubmit = (values: AboutFormValues) => {
    const entries = values.languageEntries.filter(
      (e) => e.language && e.proficiency,
    );
    const { languageEntries: _e, ...rest } = values;
    setAbout({
      ...rest,
      languages: joinLanguagesArray(entries.map((e) => e.language)),
      proficiencies: joinProficienciesArray(entries.map((e) => e.proficiency)),
    });
    setLastSavedAt(new Date().toISOString());
    markStepCompleted(CURRENT_STEP);
    router.push("/become-tutor/photo");
  };

  const onValidationError = (errors: Record<string, unknown>) => {
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
      saveExitLabel={t("saveExit")}
      draftSavedLabel={draftSavedLabel || undefined}
      stepLabel={t("stepLabel")}
      progressPercent={PROGRESS_PERCENT}
      progressLabel={t("progressPercentLabel", { percent: PROGRESS_PERCENT })}
      nextLabel={t("nextLabel")}
      continueLabel={t("continue")}
      currentStep={CURRENT_STEP}
      onContinue={handleSubmit(onSubmit, onValidationError)}
    >
      <BecomeTutorSection
        eyebrow="Step 1"
        title={t("title")}
        description={t("subtitle")}
        contentRef={formCardRef}
      >
        <form
          onSubmit={handleSubmit(onSubmit, onValidationError)}
          className="flex flex-col gap-4"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="firstName" className="text-xs font-semibold text-slate-700">
                {t("fields.firstNameLabel")}
              </Label>
              <Input
                id="firstName"
                placeholder={t("fields.firstNamePlaceholder")}
                {...register("firstName")}
                className="h-11 rounded-xl border-slate-200 bg-slate-50/60 text-sm transition-colors focus-visible:border-violet-300 focus-visible:bg-white focus-visible:ring-violet-200/60"
              />
              {errors.firstName && (
                <p className="text-xs text-rose-600">{errors.firstName.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName" className="text-xs font-semibold text-slate-700">
                {t("fields.lastNameLabel")}
              </Label>
              <Input
                id="lastName"
                placeholder={t("fields.lastNamePlaceholder")}
                {...register("lastName")}
                className="h-11 rounded-xl border-slate-200 bg-slate-50/60 text-sm transition-colors focus-visible:border-violet-300 focus-visible:bg-white focus-visible:ring-violet-200/60"
              />
              {errors.lastName && (
                <p className="text-xs text-rose-600">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
              {t("fields.emailLabel")}
            </Label>
            <Input
              id="email"
              type="email"
              placeholder={t("fields.emailPlaceholder")}
              {...register("email")}
              className="h-11 rounded-xl border-slate-200 bg-slate-50/60 text-sm transition-colors focus-visible:border-violet-300 focus-visible:bg-white focus-visible:ring-violet-200/60"
            />
            {errors.email && (
              <p className="text-xs text-rose-600">{errors.email.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                {t("fields.countryLabel")}
              </Label>
              <Controller
                name="country"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-11! w-full rounded-xl border-slate-200 bg-slate-50/60 text-sm">
                      <SelectValue placeholder={t("fields.countryPlaceholder")}>
                        {(value) =>
                          value ? tCountry(value) : t("fields.countryPlaceholder")
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
              <Label htmlFor="phone" className="text-xs font-semibold text-slate-700">
                {t("fields.phoneLabel")}
              </Label>
              <Input
                id="phone"
                placeholder={t("fields.phonePlaceholder")}
                {...register("phone")}
                className="h-11 rounded-xl border-slate-200 bg-slate-50/60 text-sm transition-colors focus-visible:border-violet-300 focus-visible:bg-white focus-visible:ring-violet-200/60"
              />
              {errors.phone && (
                <p className="text-xs text-rose-600">{errors.phone.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">
              {t("fields.subjectLabel")}
            </Label>
            <Controller
              name="subject"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="h-11! w-full rounded-xl border-slate-200 bg-slate-50/60 text-sm">
                    <SelectValue placeholder={t("fields.subjectPlaceholder")}>
                      {(value) =>
                        value ? tSubject(value) : t("fields.subjectPlaceholder")
                      }
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
              <p className="text-xs font-semibold text-slate-700">
                {t("fields.languagesLabel")}
              </p>
              <button
                type="button"
                onClick={() => append({ language: "", proficiency: "" })}
                className="rounded-full bg-violet-100 px-3 py-1 text-[11px] font-bold text-violet-700 transition hover:bg-violet-200"
              >
                + {t("addAnotherLanguage")}
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
                            placeholder={t("fields.languagesPlaceholder")}
                          >
                            {(value) =>
                              value
                                ? tLanguage(value)
                                : t("fields.languagesPlaceholder")
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
                            placeholder={t("fields.proficiencyPlaceholder")}
                          >
                            {(value) =>
                              value
                                ? tProficiency(value)
                                : t("fields.proficiencyPlaceholder")
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
                  >
                    <Trash2 className="size-4" />
                  </Button>
                ) : null}
              </div>
            ))}
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
