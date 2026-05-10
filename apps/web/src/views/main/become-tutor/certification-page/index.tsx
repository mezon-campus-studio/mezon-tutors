"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { Button, Input, Label, YearPicker, Combobox, ComboboxInput, ComboboxContent, ComboboxList, ComboboxItem, ComboboxEmpty } from "@/components/ui";
import { BadgeCheck, Wallet, Info, Upload, FileText } from "lucide-react";
import { tutorProfileCertificationAtom, markStepCompletedAtom, tutorProfileLastSavedAtAtom, defaultCertificationState } from "@/store";
import { CLOUDINARY_FOLDER, formatLastSavedTime, MAX_FILE_SIZE_MB, TEACHING_CERTIFICATES, BECOME_TUTOR_STEPS, calculateStepProgress, ACCEPT_FILE_TYPES } from "@mezon-tutors/shared";
import { cloudinaryService } from "@/services";
import { BecomeTutorSection, BecomeTutorShell } from "../_shared/BecomeTutorShell";

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

  const renderUploadZone = (
    id: string,
    fileName: string | null | undefined,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
    promptText: string,
    hintText: string,
  ) => (
    <button
      type="button"
      onClick={() => document.getElementById(id)?.click()}
      className="group flex w-full cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/30 p-6 transition-all hover:border-violet-300 hover:bg-violet-50/60"
    >
      <div className="flex size-11 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#ede9fe,#fce7f3)] text-violet-700 ring-1 ring-violet-100">
        {fileName ? <FileText className="size-5" /> : <Upload className="size-5" />}
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-slate-900">{promptText}</p>
        <p className="text-xs text-slate-500">{hintText}</p>
      </div>
      {fileName ? (
        <span className="mt-1 inline-flex max-w-full items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-[11px] font-bold text-violet-700">
          <FileText className="size-3 shrink-0" />
          <span className="truncate">{fileName}</span>
        </span>
      ) : null}
      <input
        type="file"
        id={id}
        accept={ACCEPT_FILE_TYPES}
        onChange={onChange}
        className="hidden"
      />
    </button>
  );

  return (
    <BecomeTutorShell
      headerTitle={t("headerTitle")}
      saveExitLabel={t("saveExit")}
      draftSavedLabel={draftSavedLabel || undefined}
      stepLabel={t("stepLabel")}
      progressPercent={PROGRESS_PERCENT}
      progressLabel={t("progressPercentLabel", { percent: PROGRESS_PERCENT })}
      nextLabel={t("currentLabel")}
      backLabel={t("back")}
      continueLabel={t("continue")}
      currentStep={CURRENT_STEP}
      onBack={() => router.push("/become-tutor/photo")}
      onContinue={handleSubmit(onSubmit, onValidationError)}
      continueDisabled={isUploading}
    >
      <BecomeTutorSection
        eyebrow="Teaching"
        title={t("teachingTitle")}
        contentRef={teachingCardRef}
      >
        <div className="mb-5 flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#ede9fe,#fce7f3)] text-violet-700 ring-1 ring-violet-100">
            <BadgeCheck className="size-5" />
          </div>
          <p className="text-xs text-slate-500">
            {t("teaching.reviewDescription")}
          </p>
        </div>
        <form className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                {t("teaching.certificateLabel")}
              </Label>
              <Controller
                name="certificateType"
                control={control}
                render={({ field }) => {
                  const query = (field.value || "").trim().toLowerCase();
                  const filteredCertificates = query
                    ? TEACHING_CERTIFICATES.filter((cert) =>
                        cert.toLowerCase().includes(query),
                      )
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
                        className="h-11 rounded-xl border-slate-200 bg-slate-50/60 text-sm transition-colors focus-visible:border-violet-300 focus-visible:bg-white focus-visible:ring-violet-200/60"
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
                            <ComboboxEmpty>
                              {t("teaching.noResults")}
                            </ComboboxEmpty>
                          )}
                        </ComboboxList>
                      </ComboboxContent>
                    </Combobox>
                  );
                }}
              />
              {errors.certificateType && (
                <p className="text-xs text-rose-600">
                  {errors.certificateType.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                {t("teaching.yearLabel")}
              </Label>
              <Controller
                name="teachingYear"
                control={control}
                render={({ field }) => (
                  <YearPicker
                    value={field.value}
                    onChange={field.onChange}
                    placeholder={t("teaching.yearPlaceholder")}
                  />
                )}
              />
              {errors.teachingYear && (
                <p className="text-xs text-rose-600">
                  {errors.teachingYear.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-700">
              {t("teaching.uploadTitle")}
            </Label>
            {renderUploadZone(
              "teachingFile",
              certificationMerged.teachingCertificate.file.fileName,
              handleTeachingFileChange,
              t("teaching.uploadPrompt"),
              t("teaching.uploadHint"),
            )}
            {errors.teachingCertificateFile && (
              <p className="text-xs text-rose-600">
                {errors.teachingCertificateFile.message}
              </p>
            )}
            <div className="flex items-start gap-2 rounded-xl border border-violet-100 bg-[linear-gradient(110deg,#faf5ff,#fdf2f8)] p-3">
              <Info className="mt-0.5 size-4 shrink-0 text-violet-600" />
              <div className="leading-tight">
                <p className="text-xs font-bold text-violet-900">
                  {t("teaching.reviewTitle")}
                </p>
                <p className="mt-0.5 text-[11px] text-violet-700/80">
                  {t("teaching.reviewDescription")}
                </p>
              </div>
            </div>
          </div>
        </form>
      </BecomeTutorSection>

      <BecomeTutorSection
        eyebrow="Education"
        title={t("educationTitle")}
        contentRef={educationCardRef}
      >
        <div className="mb-5 flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#fce7f3,#fbcfe8)] text-fuchsia-700 ring-1 ring-fuchsia-100">
            <Wallet className="size-5" />
          </div>
          <p className="text-xs text-slate-500">{t("educationTitle")}</p>
        </div>
        <form className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label
                htmlFor="university"
                className="text-xs font-semibold text-slate-700"
              >
                {t("education.universityLabel")}
              </Label>
              <Input
                id="university"
                placeholder={t("education.universityPlaceholder")}
                {...register("university")}
                className="h-11 rounded-xl border-slate-200 bg-slate-50/60 text-sm transition-colors focus-visible:border-violet-300 focus-visible:bg-white focus-visible:ring-violet-200/60"
              />
              {errors.university && (
                <p className="text-xs text-rose-600">
                  {errors.university.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="degree"
                className="text-xs font-semibold text-slate-700"
              >
                {t("education.degreeLabel")}
              </Label>
              <Input
                id="degree"
                placeholder={t("education.degreePlaceholder")}
                {...register("degree")}
                className="h-11 rounded-xl border-slate-200 bg-slate-50/60 text-sm transition-colors focus-visible:border-violet-300 focus-visible:bg-white focus-visible:ring-violet-200/60"
              />
              {errors.degree && (
                <p className="text-xs text-rose-600">{errors.degree.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="specialization"
              className="text-xs font-semibold text-slate-700"
            >
              {t("education.specializationLabel")}
            </Label>
            <Input
              id="specialization"
              placeholder={t("education.specializationPlaceholder")}
              {...register("specialization")}
              className="h-11 rounded-xl border-slate-200 bg-slate-50/60 text-sm transition-colors focus-visible:border-violet-300 focus-visible:bg-white focus-visible:ring-violet-200/60"
            />
            {errors.specialization && (
              <p className="text-xs text-rose-600">
                {errors.specialization.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-700">
              {t("education.uploadTitle")}
            </Label>
            {renderUploadZone(
              "educationFile",
              certificationMerged.higherEducation.file.fileName,
              handleEducationFileChange,
              t("education.uploadPrompt"),
              t("education.uploadHint"),
            )}
            {errors.educationFile && (
              <p className="text-xs text-rose-600">
                {errors.educationFile.message}
              </p>
            )}
          </div>
        </form>
      </BecomeTutorSection>
    </BecomeTutorShell>
  );
}

