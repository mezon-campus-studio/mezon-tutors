"use client";

import { useEffect, useMemo, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAtom } from "jotai";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, Controller } from "react-hook-form";
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";
import { ShieldCheck, ArrowRight, GraduationCap } from "lucide-react";
import { ECountry, ELanguage, ESubject, EProficiencyLevel, joinLanguagesArray, parseLanguagesString, parseProficienciesString, joinProficienciesArray, formatLastSavedTime, VIETNAM_PHONE_REGEX, BECOME_TUTOR_STEPS, calculateStepProgress } from "@mezon-tutors/shared";
import { tutorProfileAboutAtom, markStepCompletedAtom, tutorProfileLastSavedAtAtom } from "@/store";
import { z } from "zod";

const CURRENT_STEP = BECOME_TUTOR_STEPS.ABOUT;
const PROGRESS_PERCENT = calculateStepProgress(CURRENT_STEP);

export function buildLanguageEntries(languages: string, proficiencies: string) {
  const parsedLangs = languages?.trim() ? parseLanguagesString(languages) : [];
  const parsedProfs = proficiencies?.trim() ? parseProficienciesString(proficiencies) : [];
  return parsedLangs.length > 0
    ? parsedLangs.map((lang, i) => ({ language: lang, proficiency: parsedProfs[i] ?? "" }))
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
        country: z.string().min(1, t("validation.countryRequired")).refine((v) => (Object.values(ECountry) as readonly string[]).includes(v), { message: t("validation.countryFromList") }),
        phone: z.string().min(1, t("validation.phoneRequired")).transform((value) => value.replace(/[\s-]/g, "")).refine((value) => VIETNAM_PHONE_REGEX.test(value), { message: t("validation.phoneInvalid") }),
        subject: z.string().min(1, t("validation.subjectRequired")).refine((v) => (Object.values(ESubject) as readonly string[]).includes(v), { message: t("validation.subjectFromList") }),
        languageEntries: z.array(z.object({ language: z.string().refine((v) => !v || (Object.values(ELanguage) as readonly string[]).includes(v), { message: t("validation.languagesFromList") }), proficiency: z.string().refine((v) => !v || (Object.values(EProficiencyLevel) as readonly string[]).includes(v), { message: t("validation.proficiencyFromList") }) })).superRefine((arr, ctx) => {
          const hasAnyCompletePair = arr.some((e) => e.language && e.proficiency);
          if (!hasAnyCompletePair) {
            const idx = arr.findIndex((e) => !e.language || !e.proficiency) ?? 0;
            const entry = arr[idx] ?? { language: "", proficiency: "" };
            if (!entry.language) {
              ctx.addIssue({ code: "custom", path: [idx, "language"], message: t("validation.languagesRequired") });
            }
            if (!entry.proficiency) {
              ctx.addIssue({ code: "custom", path: [idx, "proficiency"], message: t("validation.proficiencyRequired") });
            }
            return;
          }
          arr.forEach((entry, idx) => {
            const hasAnyValue = entry.language || entry.proficiency;
            if (!hasAnyValue) return;
            if (!entry.language) {
              ctx.addIssue({ code: "custom", path: [idx, "language"], message: t("validation.languagesRequired") });
            }
            if (!entry.proficiency) {
              ctx.addIssue({ code: "custom", path: [idx, "proficiency"], message: t("validation.proficiencyRequired") });
            }
          });
        }),
      }),
    [t]
  );

  type AboutFormValues = z.infer<typeof aboutSchema>;

  const draftSavedLabel = lastSavedAt && formatLastSavedTime(lastSavedAt) ? t("draftSaved", { time: formatLastSavedTime(lastSavedAt) }) : "";

  const initialEntries = buildLanguageEntries(about.languages, about.proficiencies);

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

  const { control, handleSubmit, setFocus, register, formState: { errors } } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "languageEntries" });
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
    const entries = values.languageEntries.filter((e) => e.language && e.proficiency);
    const { languageEntries: _e, ...rest } = values;
    setAbout({ ...rest, languages: joinLanguagesArray(entries.map((e) => e.language)), proficiencies: joinProficienciesArray(entries.map((e) => e.proficiency)) });
    setLastSavedAt(new Date().toISOString());
    markStepCompleted(CURRENT_STEP);
    router.push("/become-tutor/photo");
  };

  const onValidationError = (errors: Record<string, unknown>) => {
    formCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    const firstError = Object.keys(errors)[0] as keyof AboutFormValues | undefined;
    if (firstError) setFocus(firstError);
  };

  return (
    <div className="min-h-screen become-tutor-shell">
      <div className="flex flex-col min-h-screen">
        <div className="flex-1 overflow-y-auto pb-20 md:pb-28">
          <div className="py-3 px-3 sm:py-4 sm:px-4 md:py-6 md:px-4 lg:py-5 lg:px-6">
            <div className="max-w-[960px] w-full mx-auto flex flex-col gap-3 sm:gap-4 md:gap-6">
              <div className="flex items-center justify-between gap-2 sm:gap-3 flex-wrap">
                <div className="flex items-center gap-2 md:gap-3">
                  <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-primary flex-shrink-0" />
                  <h1 className="font-bold text-sm sm:text-base md:text-lg">{t("headerTitle")}</h1>
                </div>
                <div className="flex items-center gap-2 md:gap-3">
                  {draftSavedLabel && <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">{draftSavedLabel}</p>}
                  <Button variant="ghost" size="sm" className="bg-muted hover:bg-muted/80 text-xs sm:text-sm h-7 sm:h-8 md:h-9 px-2 sm:px-3">{t("saveExit")}</Button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 sm:gap-2 md:gap-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-[10px] sm:text-xs md:text-sm font-bold tracking-[0.1em] uppercase text-primary">{t("stepLabel")}</p>
                  <p className="text-[10px] sm:text-xs md:text-sm font-medium text-primary">{t("progressPercentLabel", { percent: PROGRESS_PERCENT })}</p>
                </div>
                <div className="flex flex-col gap-1 sm:gap-1.5 md:gap-2">
                  <div className="h-1 md:h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary transition-all duration-300" style={{ width: `${PROGRESS_PERCENT}%` }} />
                  </div>
                  <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">{t("nextLabel")}</p>
                </div>
              </div>

              <div ref={formCardRef} className="bg-card rounded-lg md:rounded-xl p-3 sm:p-4 md:p-6 flex flex-col gap-3 sm:gap-4 md:gap-6 border shadow-sm">
                <div className="flex flex-col gap-1 sm:gap-1.5 md:gap-2">
                  <h2 className="text-lg sm:text-xl md:text-2xl font-bold">{t("title")}</h2>
                  <p className="text-muted-foreground text-xs sm:text-sm">{t("subtitle")}</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit, onValidationError)} className="flex flex-col gap-2.5 sm:gap-3 md:gap-4">
                  <div className="flex gap-2.5 sm:gap-3 md:gap-4 flex-col md:flex-row">
                    <div className="flex-1 flex flex-col gap-1 sm:gap-1.5 md:gap-2">
                      <Label htmlFor="firstName" className="text-xs sm:text-sm">{t("fields.firstNameLabel")}</Label>
                      <Input id="firstName" placeholder={t("fields.firstNamePlaceholder")} {...register("firstName")} className="h-9 sm:h-10 md:h-11 text-sm" />
                      {errors.firstName && <p className="text-xs sm:text-sm text-destructive">{errors.firstName.message}</p>}
                    </div>
                    <div className="flex-1 flex flex-col gap-1 sm:gap-1.5 md:gap-2">
                      <Label htmlFor="lastName" className="text-xs sm:text-sm">{t("fields.lastNameLabel")}</Label>
                      <Input id="lastName" placeholder={t("fields.lastNamePlaceholder")} {...register("lastName")} className="h-9 sm:h-10 md:h-11 text-sm" />
                      {errors.lastName && <p className="text-xs sm:text-sm text-destructive">{errors.lastName.message}</p>}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 sm:gap-1.5 md:gap-2">
                    <Label htmlFor="email" className="text-xs sm:text-sm">{t("fields.emailLabel")}</Label>
                    <Input id="email" type="email" placeholder={t("fields.emailPlaceholder")} {...register("email")} className="h-9 sm:h-10 md:h-11 text-sm" />
                    {errors.email && <p className="text-xs sm:text-sm text-destructive">{errors.email.message}</p>}
                  </div>

                  <div className="flex gap-2.5 sm:gap-3 md:gap-4 flex-col md:flex-row">
                    <div className="flex-1 flex flex-col gap-1 sm:gap-1.5 md:gap-2">
                      <Label className="text-xs sm:text-sm">{t("fields.countryLabel")}</Label>
                      <Controller name="country" control={control} render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="h-9 sm:h-10 md:h-11 text-sm"><SelectValue placeholder={t("fields.countryPlaceholder")} /></SelectTrigger>
                          <SelectContent>
                            {Object.values(ECountry).slice(1).map((country) => (
                              <SelectItem key={country} value={country}>{tCountry(country)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )} />
                      {errors.country && <p className="text-xs sm:text-sm text-destructive">{errors.country.message}</p>}
                    </div>
                    <div className="flex-1 flex flex-col gap-1 sm:gap-1.5 md:gap-2">
                      <Label htmlFor="phone" className="text-xs sm:text-sm">{t("fields.phoneLabel")}</Label>
                      <Input id="phone" placeholder={t("fields.phonePlaceholder")} {...register("phone")} className="h-9 sm:h-10 md:h-11 text-sm" />
                      {errors.phone && <p className="text-xs sm:text-sm text-destructive">{errors.phone.message}</p>}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 sm:gap-1.5 md:gap-2">
                    <Label className="text-xs sm:text-sm">{t("fields.subjectLabel")}</Label>
                    <Controller name="subject" control={control} render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="h-9 sm:h-10 md:h-11 text-sm"><SelectValue placeholder={t("fields.subjectPlaceholder")} /></SelectTrigger>
                        <SelectContent>
                          {Object.values(ESubject).slice(1).map((value) => (
                            <SelectItem key={value} value={value}>{tSubject(value)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )} />
                    <p className="text-xs sm:text-sm text-muted-foreground">{t("fields.subjectHelper")}</p>
                    {errors.subject && <p className="text-xs sm:text-sm text-destructive">{errors.subject.message}</p>}
                  </div>

                  <div className="flex flex-col gap-1.5 sm:gap-2 md:gap-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <p className="text-xs sm:text-sm text-muted-foreground">{t("fields.languagesLabel")}</p>
                      <button type="button" onClick={() => append({ language: "", proficiency: "" })} className="text-xs sm:text-sm text-primary hover:opacity-80 cursor-pointer font-medium">+ {t("addAnotherLanguage")}</button>
                    </div>
                    {fields.map((field, index) => (
                      <div key={field.id} className="flex gap-2 sm:gap-2.5 md:gap-3 items-start flex-col md:flex-row md:items-stretch">
                        <div className="flex-1 flex flex-col gap-1 sm:gap-1.5 md:gap-2 w-full">
                          <Label className="text-xs sm:text-sm">{t("fields.languageLabel")}</Label>
                          <Controller name={`languageEntries.${index}.language`} control={control} render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger className="h-9 sm:h-10 md:h-11 text-sm"><SelectValue placeholder={t("fields.languagesPlaceholder")} /></SelectTrigger>
                              <SelectContent>
                                {Object.values(ELanguage).slice(1).map((language) => (
                                  <SelectItem key={language} value={language}>{tLanguage(language)}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )} />
                        </div>
                        <div className="flex-1 flex flex-col gap-1 sm:gap-1.5 md:gap-2 w-full">
                          <Label className="text-xs sm:text-sm">{t("fields.proficiencyLabel")}</Label>
                          <Controller name={`languageEntries.${index}.proficiency`} control={control} render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger className="h-9 sm:h-10 md:h-11 text-sm"><SelectValue placeholder={t("fields.proficiencyPlaceholder")} /></SelectTrigger>
                              <SelectContent>
                                {Object.values(EProficiencyLevel).map((proficiency) => (
                                  <SelectItem key={proficiency} value={proficiency}>{tProficiency(proficiency)}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )} />
                        </div>
                        {fields.length > 1 && (
                          <div className="flex flex-col gap-1 shrink-0 self-start md:self-stretch w-full md:w-auto">
                            <p className="text-xs sm:text-sm font-medium text-muted-foreground opacity-0 pointer-events-none select-none hidden md:block">{t("fields.languageLabel")}</p>
                            <Button type="button" variant="outline" size="sm" onClick={() => remove(index)} className="md:self-center h-8 sm:h-9 md:h-10 text-xs sm:text-sm">{t("removeLanguage")}</Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </form>
              </div>

              <div className="bg-card rounded-lg md:rounded-xl p-2.5 sm:p-3 md:p-4 border shadow-sm">
                <div className="flex items-start md:items-center gap-2 sm:gap-2.5 md:gap-3">
                  <div className="flex-shrink-0">
                    <ShieldCheck className="w-8 h-8 sm:w-10 sm:h-10 md:w-14 md:h-14 text-primary/20" />
                  </div>
                  <div className="flex-1 flex flex-col gap-0.5 sm:gap-1">
                    <h3 className="font-semibold text-xs sm:text-sm md:text-base">{t("privacyTitle")}</h3>
                    <p className="text-muted-foreground text-[10px] sm:text-xs md:text-sm leading-relaxed">{t("privacyDescription")}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t shadow-lg py-2.5 sm:py-3 md:py-4 z-10">
          <div className="max-w-[960px] w-full mx-auto px-3 sm:px-4 lg:px-6">
            <div className="flex justify-between md:justify-end items-center gap-2 sm:gap-3">
              <Button type="submit" size="lg" onClick={handleSubmit(onSubmit, onValidationError)} className="gap-1.5 sm:gap-2 w-full md:w-auto h-10 sm:h-11 md:h-12 text-xs sm:text-sm md:text-base">
                {t("continue")}
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
