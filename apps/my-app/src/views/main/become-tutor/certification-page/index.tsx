"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { Button, Input, Label, YearPicker, Combobox, ComboboxInput, ComboboxContent, ComboboxList, ComboboxItem, ComboboxEmpty } from "@/components/ui";
import { BadgeCheck, Wallet, Info, Upload, GraduationCap, ArrowRight, ArrowLeft } from "lucide-react";
import { tutorProfileCertificationAtom, markStepCompletedAtom, tutorProfileLastSavedAtAtom, defaultCertificationState } from "@mezon-tutors/app/store";
import { CLOUDINARY_FOLDER, formatLastSavedTime, MAX_FILE_SIZE_MB, TEACHING_CERTIFICATES, BECOME_TUTOR_STEPS, calculateStepProgress, ACCEPT_FILE_TYPES } from "@mezon-tutors/shared";
import { cloudinaryService } from "@mezon-tutors/app/services";

const CURRENT_STEP = BECOME_TUTOR_STEPS.CERTIFICATION;
const PROGRESS_PERCENT = calculateStepProgress(CURRENT_STEP);

export default function CertificationPage() {
  const t = useTranslations("TutorProfile.Certification");
  const router = useRouter();
  const [certification, setCertification] = useAtom(tutorProfileCertificationAtom);
  const [, markStepCompleted] = useAtom(markStepCompletedAtom);
  const [isUploading, setIsUploading] = useState(false);
  const lastSavedAt = useAtomValue(tutorProfileLastSavedAtAtom);
  const setLastSavedAt = useSetAtom(tutorProfileLastSavedAtAtom);
  const teachingCardRef = useRef<HTMLDivElement>(null);
  const educationCardRef = useRef<HTMLDivElement | null>(null);
  const teachingUploadSeqRef = useRef(0);
  const educationUploadSeqRef = useRef(0);

  const certificationMerged = useMemo(() => ({ ...defaultCertificationState, ...certification }), [certification]);

  const certificationSchema = useMemo(
    () =>
      z.object({
        certificateType: z.string().min(1, t("validation.certificateTypeRequired")),
        teachingYear: z.string().min(4, t("validation.yearRequired")).regex(/^\d{4}$/, t("validation.yearInvalid")),
        university: z.string().min(1, t("validation.universityRequired")),
        degree: z.string().min(1, t("validation.degreeRequired")),
        specialization: z.string().min(1, t("validation.specializationRequired")),
        teachingCertificateFile: z.instanceof(File).nullable(),
        educationFile: z.instanceof(File).nullable(),
      }).superRefine((data, ctx) => {
        const allowedExt = new Set(["pdf", "jpg", "jpeg", "png"]);
        const bytesLimit = MAX_FILE_SIZE_MB * 1024 * 1024;

        const validateFile = (file: File, path: "teachingCertificateFile" | "educationFile", invalidTypeMsg: string, tooLargeMsg: string) => {
          const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
          if (!allowedExt.has(ext)) {
            ctx.addIssue({ path: [path], code: "custom", message: invalidTypeMsg });
            return;
          }
          if (file.size > bytesLimit) {
            ctx.addIssue({ path: [path], code: "custom", message: tooLargeMsg });
          }
        };

        const hasTeaching = data.teachingCertificateFile !== null || !!certificationMerged.teachingCertificate.file.dataUrl || !!certificationMerged.teachingCertificate.file.uploadedUrl;
        if (!hasTeaching) {
          ctx.addIssue({ path: ["teachingCertificateFile"], code: "custom", message: t("validation.certificateFileRequired") });
        } else if (data.teachingCertificateFile) {
          validateFile(data.teachingCertificateFile, "teachingCertificateFile", t("validation.certificateFileInvalidType"), t("validation.certificateFileTooLarge", { max: MAX_FILE_SIZE_MB }));
        }

        const hasEducation = data.educationFile !== null || !!certificationMerged.higherEducation.file.dataUrl || !!certificationMerged.higherEducation.file.uploadedUrl;
        if (!hasEducation) {
          ctx.addIssue({ path: ["educationFile"], code: "custom", message: t("validation.educationFileRequired") });
        } else if (data.educationFile) {
          validateFile(data.educationFile, "educationFile", t("validation.educationFileInvalidType"), t("validation.educationFileTooLarge", { max: MAX_FILE_SIZE_MB }));
        }
      }),
    [t, certificationMerged.teachingCertificate.file.dataUrl, certificationMerged.teachingCertificate.file.uploadedUrl, certificationMerged.higherEducation.file.dataUrl, certificationMerged.higherEducation.file.uploadedUrl]
  );

  type CertificationFormValues = z.infer<typeof certificationSchema>;

  const draftSavedLabel = lastSavedAt && formatLastSavedTime(lastSavedAt) ? t("draftSaved", { time: formatLastSavedTime(lastSavedAt) }) : "";

  const form = useForm<CertificationFormValues>({
    defaultValues: {
      certificateType: certificationMerged.teachingCertificate.name || TEACHING_CERTIFICATES[0] || "",
      teachingYear: certificationMerged.teachingCertificate.year || '',
      university: certificationMerged.higherEducation.university || '',
      degree: certificationMerged.higherEducation.degree || '',
      specialization: certificationMerged.higherEducation.specialization || '',
      teachingCertificateFile: null,
      educationFile: null,
    },
    resolver: zodResolver(certificationSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
  });

  const { control, handleSubmit, setFocus, register, formState: { errors }, setValue } = form;

  useEffect(() => {
    const currentName = certificationMerged.teachingCertificate.name;
    if (currentName) {
      setValue('certificateType', currentName);
    } else {
      setValue('certificateType', TEACHING_CERTIFICATES[0]);
    }
  }, [certificationMerged.teachingCertificate.name, setValue]);

  const handleTeachingFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const bytesLimit = MAX_FILE_SIZE_MB * 1024 * 1024;
    if (file.size > bytesLimit) {
      form.setError("teachingCertificateFile", { type: "manual", message: t("validation.certificateFileTooLarge", { max: MAX_FILE_SIZE_MB }) });
      return;
    }

    setValue("teachingCertificateFile", file);
    teachingUploadSeqRef.current += 1;
    const seq = teachingUploadSeqRef.current;
    const previousPublicId = certificationMerged.teachingCertificate?.file?.publicId;

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setCertification((prev) => ({ 
        ...prev, 
        teachingCertificate: { 
          ...prev.teachingCertificate, 
          file: { 
            ...(prev.teachingCertificate?.file || {}), 
            dataUrl, 
            uploadedUrl: null, 
            fileName: file.name 
          } 
        } 
      }));
      setLastSavedAt(new Date().toISOString());

      try {
        setIsUploading(true);
        const uploadedFile = await cloudinaryService.uploadFileWithSignature(file, CLOUDINARY_FOLDER.TUTOR_CERTIFICATE, "auto");
        if (teachingUploadSeqRef.current !== seq) return;
        setCertification((prev) => ({ 
          ...prev, 
          teachingCertificate: { 
            ...prev.teachingCertificate, 
            file: { 
              ...(prev.teachingCertificate?.file || {}), 
              uploadedUrl: uploadedFile.secureUrl, 
              publicId: uploadedFile.publicId 
            } 
          } 
        }));
        if (previousPublicId && previousPublicId !== uploadedFile.publicId) {
          void cloudinaryService.deleteFile(previousPublicId).catch(() => null);
        }
        await form.trigger("teachingCertificateFile");
      } catch {
        if (teachingUploadSeqRef.current !== seq) return;
        form.setError("teachingCertificateFile", { type: "manual", message: t("validation.certificateUploadFailed") });
      } finally {
        if (teachingUploadSeqRef.current === seq) setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleEducationFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const bytesLimit = MAX_FILE_SIZE_MB * 1024 * 1024;
    if (file.size > bytesLimit) {
      form.setError("educationFile", { type: "manual", message: t("validation.educationFileTooLarge", { max: MAX_FILE_SIZE_MB }) });
      return;
    }

    setValue("educationFile", file);
    educationUploadSeqRef.current += 1;
    const seq = educationUploadSeqRef.current;
    const previousPublicId = certificationMerged.higherEducation?.file?.publicId;

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setCertification((prev) => ({ 
        ...prev, 
        higherEducation: { 
          ...prev.higherEducation, 
          file: { 
            ...(prev.higherEducation?.file || {}), 
            dataUrl, 
            uploadedUrl: null, 
            fileName: file.name 
          } 
        } 
      }));
      setLastSavedAt(new Date().toISOString());

      try {
        setIsUploading(true);
        const uploadedFile = await cloudinaryService.uploadFileWithSignature(file, CLOUDINARY_FOLDER.TUTOR_DIPLOMA, "auto");
        if (educationUploadSeqRef.current !== seq) return;
        setCertification((prev) => ({ 
          ...prev, 
          higherEducation: { 
            ...prev.higherEducation, 
            file: { 
              ...(prev.higherEducation?.file || {}), 
              uploadedUrl: uploadedFile.secureUrl, 
              publicId: uploadedFile.publicId 
            } 
          } 
        }));
        if (previousPublicId && previousPublicId !== uploadedFile.publicId) {
          void cloudinaryService.deleteFile(previousPublicId).catch(() => null);
        }
        await form.trigger("educationFile");
      } catch {
        if (educationUploadSeqRef.current !== seq) return;
        form.setError("educationFile", { type: "manual", message: t("validation.educationUploadFailed") });
      } finally {
        if (educationUploadSeqRef.current === seq) setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = async (values: CertificationFormValues) => {
    const { teachingCertificateFile: _tcf, educationFile: _ef, certificateType, ...textFields } = values;
    if (isUploading) return;

    if (!certificationMerged.teachingCertificate.file.uploadedUrl) {
      form.setError("teachingCertificateFile", { type: "manual", message: t("validation.certificateUploadFailed") });
      return;
    }

    if (!certificationMerged.higherEducation.file.uploadedUrl) {
      form.setError("educationFile", { type: "manual", message: t("validation.educationUploadFailed") });
      return;
    }

    setCertification((prev) => ({ 
      ...prev, 
      teachingCertificate: { 
        ...prev.teachingCertificate, 
        name: certificateType, 
        year: textFields.teachingYear 
      }, 
      higherEducation: { 
        ...prev.higherEducation, 
        university: textFields.university, 
        degree: textFields.degree, 
        specialization: textFields.specialization 
      } 
    }));
    setLastSavedAt(new Date().toISOString());
    markStepCompleted(CURRENT_STEP);
    router.push("/become-tutor/video");
  };

  const teachingFields = new Set<keyof CertificationFormValues>(["certificateType", "teachingYear", "teachingCertificateFile"]);
  const focusableFields = new Set<keyof CertificationFormValues>(["teachingYear", "university", "degree", "specialization"]);

  const onValidationError = (errors: Partial<Record<keyof CertificationFormValues, { message?: string }>>) => {
    const firstError = Object.keys(errors)[0] as keyof CertificationFormValues | undefined;
    if (!firstError) return;

    const targetSectionRef = teachingFields.has(firstError) ? teachingCardRef : educationCardRef;
    targetSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });

    if (focusableFields.has(firstError)) setFocus(firstError);
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
                  <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">{t("currentLabel")}</p>
                </div>
              </div>

              <div ref={teachingCardRef} className="become-tutor-card rounded-lg md:rounded-xl p-3 sm:p-4 md:p-6 flex flex-col gap-3 sm:gap-4 md:gap-5 border shadow-sm">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <BadgeCheck className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                  <h2 className="text-base sm:text-lg md:text-xl font-bold">{t("teachingTitle")}</h2>
                </div>

                <form className="flex flex-col gap-2.5 sm:gap-3 md:gap-4">
                  <div className="flex gap-2.5 sm:gap-3 md:gap-4 flex-col md:flex-row">
                    <div className="flex-1 flex flex-col gap-1 sm:gap-1.5 md:gap-2">
                      <Label className="text-xs sm:text-sm">{t("teaching.certificateLabel")}</Label>
                      <Controller
                        name="certificateType"
                        control={control}
                        render={({ field }) => {
                          const query = (field.value || "").trim().toLowerCase();
                          const filteredCertificates = query
                            ? TEACHING_CERTIFICATES.filter((cert) => cert.toLowerCase().includes(query))
                            : TEACHING_CERTIFICATES;

                          return (
                            <Combobox
                              value={field.value}
                              onValueChange={(value) => {
                                if (value) {
                                  field.onChange(value);
                                }
                              }}
                            >
                              <ComboboxInput 
                                className="become-tutor-field h-9 sm:h-10 md:h-11 text-sm"
                                placeholder={t("teaching.certificatePlaceholder")}
                                value={field.value || ""}
                                onChange={(e) => field.onChange(e.target.value)}
                              />
                              <ComboboxContent>
                                <ComboboxList>
                                  {filteredCertificates.length > 0 ? (
                                    filteredCertificates.map((cert) => (
                                      <ComboboxItem key={cert} value={cert}>
                                        {cert}
                                      </ComboboxItem>
                                    ))
                                  ) : (
                                    <ComboboxEmpty>{t("teaching.noResults")}</ComboboxEmpty>
                                  )}
                                </ComboboxList>
                              </ComboboxContent>
                            </Combobox>
                          );
                        }}
                      />
                      {errors.certificateType && <p className="text-xs sm:text-sm text-destructive">{errors.certificateType.message}</p>}
                    </div>
                    <div className="flex-1 flex flex-col gap-1 sm:gap-1.5 md:gap-2">
                      <Label className="text-xs sm:text-sm">{t("teaching.yearLabel")}</Label>
                      <Controller name="teachingYear" control={control} render={({ field }) => (
                        <YearPicker value={field.value} onChange={field.onChange} placeholder={t("teaching.yearPlaceholder")} />
                      )} />
                      {errors.teachingYear && <p className="text-xs sm:text-sm text-destructive">{errors.teachingYear.message}</p>}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 sm:gap-2">
                    <Label className="text-xs sm:text-sm font-semibold">{t("teaching.uploadTitle")}</Label>
                    <div className="border-2 border-dashed rounded-lg p-4 sm:p-5 md:p-6 flex flex-col items-center gap-2 sm:gap-2.5 md:gap-3 hover:border-primary/50 transition-colors cursor-pointer" onClick={() => document.getElementById("teachingFile")?.click()}>
                      <Upload className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-muted-foreground" />
                      <div className="text-center">
                        <p className="text-xs sm:text-sm font-medium">{t("teaching.uploadPrompt")}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">{t("teaching.uploadHint")}</p>
                      </div>
                      {certificationMerged.teachingCertificate.file.fileName && (
                        <p className="text-xs sm:text-sm text-primary font-medium break-all">{certificationMerged.teachingCertificate.file.fileName}</p>
                      )}
                    </div>
                    <input type="file" id="teachingFile" accept={ACCEPT_FILE_TYPES} onChange={handleTeachingFileChange} className="hidden" />
                    {errors.teachingCertificateFile && <p className="text-xs sm:text-sm text-destructive">{errors.teachingCertificateFile.message}</p>}

                    <div className="mt-1 sm:mt-2 rounded-lg p-2 sm:p-2.5 md:p-3 bg-muted/50 flex gap-1.5 sm:gap-2 items-start">
                      <Info className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div className="flex-1 flex flex-col gap-0.5 sm:gap-1">
                        <p className="text-xs sm:text-sm font-semibold text-primary">{t("teaching.reviewTitle")}</p>
                        <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">{t("teaching.reviewDescription")}</p>
                      </div>
                    </div>
                  </div>
                </form>
              </div>

              <div ref={educationCardRef} className="become-tutor-card rounded-lg md:rounded-xl p-3 sm:p-4 md:p-6 flex flex-col gap-3 sm:gap-4 md:gap-5 border shadow-sm">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                  <h2 className="text-base sm:text-lg md:text-xl font-bold">{t("educationTitle")}</h2>
                </div>

                <form className="flex flex-col gap-2.5 sm:gap-3 md:gap-4">
                  <div className="flex gap-2.5 sm:gap-3 md:gap-4 flex-col md:flex-row">
                    <div className="flex-1 flex flex-col gap-1 sm:gap-1.5 md:gap-2">
                      <Label htmlFor="university" className="text-xs sm:text-sm">{t("education.universityLabel")}</Label>
                      <Input className="become-tutor-field h-9 sm:h-10 md:h-11 text-sm" id="university" placeholder={t("education.universityPlaceholder")} {...register("university")} />
                      {errors.university && <p className="text-xs sm:text-sm text-destructive">{errors.university.message}</p>}
                    </div>
                    <div className="flex-1 flex flex-col gap-1 sm:gap-1.5 md:gap-2">
                      <Label htmlFor="degree" className="text-xs sm:text-sm">{t("education.degreeLabel")}</Label>
                      <Input className="become-tutor-field h-9 sm:h-10 md:h-11 text-sm" id="degree" placeholder={t("education.degreePlaceholder")} {...register("degree")} />
                      {errors.degree && <p className="text-xs sm:text-sm text-destructive">{errors.degree.message}</p>}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 sm:gap-1.5 md:gap-2">
                    <Label htmlFor="specialization" className="text-xs sm:text-sm">{t("education.specializationLabel")}</Label>
                    <Input className="become-tutor-field h-9 sm:h-10 md:h-11 text-sm" id="specialization" placeholder={t("education.specializationPlaceholder")} {...register("specialization")} />
                    {errors.specialization && <p className="text-xs sm:text-sm text-destructive">{errors.specialization.message}</p>}
                  </div>

                  <div className="flex flex-col gap-1.5 sm:gap-2">
                    <Label className="text-xs sm:text-sm font-semibold">{t("education.uploadTitle")}</Label>
                    <div className="border-2 border-dashed rounded-lg p-4 sm:p-5 md:p-6 flex flex-col items-center gap-2 sm:gap-2.5 md:gap-3 hover:border-primary/50 transition-colors cursor-pointer" onClick={() => document.getElementById("educationFile")?.click()}>
                      <Upload className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-muted-foreground" />
                      <div className="text-center">
                        <p className="text-xs sm:text-sm font-medium">{t("education.uploadPrompt")}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">{t("education.uploadHint")}</p>
                      </div>
                      {certificationMerged.higherEducation.file.fileName && (
                        <p className="text-xs sm:text-sm text-primary font-medium break-all">{certificationMerged.higherEducation.file.fileName}</p>
                      )}
                    </div>
                    <input type="file" id="educationFile" accept={ACCEPT_FILE_TYPES} onChange={handleEducationFileChange} className="hidden" />
                    {errors.educationFile && <p className="text-xs sm:text-sm text-destructive">{errors.educationFile.message}</p>}
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t shadow-lg py-2.5 sm:py-3 md:py-4 z-10">
          <div className="max-w-[960px] w-full mx-auto px-3 sm:px-4 md:px-6">
            <div className="flex justify-between items-center gap-2">
              <Button variant="outline" onClick={() => router.push("/become-tutor/photo")} className="gap-1.5 sm:gap-2 h-9 sm:h-10 md:h-11 text-xs sm:text-sm px-3 sm:px-4">
                <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {t("back")}
              </Button>
              <Button type="submit" size="lg" disabled={isUploading} onClick={handleSubmit(onSubmit, onValidationError)} className="gap-1.5 sm:gap-2 h-9 sm:h-10 md:h-11 text-xs sm:text-sm px-3 sm:px-4">
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

