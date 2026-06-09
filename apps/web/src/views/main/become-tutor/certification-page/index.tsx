"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { Input, Label, YearPicker } from "@/components/ui";
import { BadgeCheck, Wallet, Info } from "lucide-react";
import UploadFile from "@/components/common/UploadFile";
import { tutorProfileCertificationAtom, markStepCompletedAtom, tutorProfileLastSavedAtAtom, defaultCertificationState } from "@/store";
import { CLOUDINARY_FOLDER, EXISTING_SECURE_FILE, MAX_FILE_SIZE_MB, BECOME_TUTOR_STEPS, calculateStepProgress, ACCEPT_FILE_TYPES, PROFESSIONAL_DOCUMENT_EXTENSIONS } from "@mezon-tutors/shared";
import { cloudinaryService } from "@/services";
import { BecomeTutorSection, BecomeTutorShell } from "../_shared/BecomeTutorShell";

const CURRENT_STEP = BECOME_TUTOR_STEPS.CERTIFICATION;
const PROGRESS_PERCENT = calculateStepProgress(CURRENT_STEP);

export default function CertificationPage() {
  const t = useTranslations("BecomeTutor.certification");
  const router = useRouter();
  const [certification, setCertification] = useAtom(tutorProfileCertificationAtom);
  const [, markStepCompleted] = useAtom(markStepCompletedAtom);
  const [teachingUploading, setTeachingUploading] = useState(false);
  const [educationUploading, setEducationUploading] = useState(false);
  const lastSavedAt = useAtomValue(tutorProfileLastSavedAtAtom);
  const [isUploading, setIsUploading] = useState(false);
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
        const allowedExt = new Set<string>(PROFESSIONAL_DOCUMENT_EXTENSIONS);
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

        const hasTeaching = data.teachingCertificateFile !== null || !!certificationMerged.teachingCertificate.file.dataUrl || !!certificationMerged.teachingCertificate.file.publicId;
        if (!hasTeaching) {
          ctx.addIssue({ path: ["teachingCertificateFile"], code: "custom", message: t("validation.certificateFileRequired") });
        } else if (data.teachingCertificateFile) {
          validateFile(data.teachingCertificateFile, "teachingCertificateFile", t("validation.certificateFileInvalidType"), t("validation.certificateFileTooLarge", { max: MAX_FILE_SIZE_MB }));
        }

        const hasEducation = data.educationFile !== null || !!certificationMerged.higherEducation.file.dataUrl || !!certificationMerged.higherEducation.file.publicId;
        if (!hasEducation) {
          ctx.addIssue({ path: ["educationFile"], code: "custom", message: t("validation.educationFileRequired") });
        } else if (data.educationFile) {
          validateFile(data.educationFile, "educationFile", t("validation.educationFileInvalidType"), t("validation.educationFileTooLarge", { max: MAX_FILE_SIZE_MB }));
        }
      }),
    [t, certificationMerged.teachingCertificate.file.dataUrl, certificationMerged.teachingCertificate.file.publicId, certificationMerged.higherEducation.file.dataUrl, certificationMerged.higherEducation.file.publicId]
  );

  type CertificationFormValues = z.infer<typeof certificationSchema>;

  const form = useForm<CertificationFormValues>({
    defaultValues: {
      certificateType: certificationMerged.teachingCertificate.name || "",
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

  const { control, handleSubmit, setFocus, register, getValues, formState: { errors }, setValue } = form;

  const handleTeachingFileChange = async (file: File) => {
    const bytesLimit = MAX_FILE_SIZE_MB * 1024 * 1024;
    if (file.size > bytesLimit) {
      form.setError("teachingCertificateFile", { type: "manual", message: t("validation.certificateFileTooLarge", { max: MAX_FILE_SIZE_MB }) });
      return;
    }

    setValue("teachingCertificateFile", file);
    teachingUploadSeqRef.current += 1;
    const seq = teachingUploadSeqRef.current;
    const previousPublicId = certificationMerged.teachingCertificate?.file?.publicId;
    setTeachingUploading(true);

    const reader = new FileReader();
    reader.onerror = () => {
      if (teachingUploadSeqRef.current === seq) setTeachingUploading(false);
    };
    reader.onload = async () => {
      try {
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

        const uploadedFile = await cloudinaryService.uploadPrivateFile(file, CLOUDINARY_FOLDER.TUTOR_CERTIFICATE, "auto");
        if (teachingUploadSeqRef.current !== seq) return;
        setCertification((prev) => ({ 
          ...prev, 
          teachingCertificate: { 
            ...prev.teachingCertificate, 
            file: { 
              ...(prev.teachingCertificate?.file || {}), 
              uploadedUrl: null,
              publicId: uploadedFile.publicId 
            } 
          } 
        }));
        if (previousPublicId && previousPublicId !== uploadedFile.publicId && previousPublicId !== EXISTING_SECURE_FILE) {
          void cloudinaryService.deleteFile(previousPublicId).catch(() => null);
        }
        await form.trigger("teachingCertificateFile");
      } catch {
        if (teachingUploadSeqRef.current !== seq) return;
        form.setError("teachingCertificateFile", { type: "manual", message: t("validation.certificateUploadFailed") });
      } finally {
        if (teachingUploadSeqRef.current === seq) setTeachingUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleEducationFileChange = async (file: File) => {
    const bytesLimit = MAX_FILE_SIZE_MB * 1024 * 1024;
    if (file.size > bytesLimit) {
      form.setError("educationFile", { type: "manual", message: t("validation.educationFileTooLarge", { max: MAX_FILE_SIZE_MB }) });
      return;
    }

    setValue("educationFile", file);
    educationUploadSeqRef.current += 1;
    const seq = educationUploadSeqRef.current;
    const previousPublicId = certificationMerged.higherEducation?.file?.publicId;
    setEducationUploading(true);

    const reader = new FileReader();
    reader.onerror = () => {
      if (educationUploadSeqRef.current === seq) setEducationUploading(false);
    };
    reader.onload = async () => {
      try {
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

        const uploadedFile = await cloudinaryService.uploadPrivateFile(file, CLOUDINARY_FOLDER.TUTOR_DIPLOMA, "auto");
        if (educationUploadSeqRef.current !== seq) return;
        setCertification((prev) => ({ 
          ...prev, 
          higherEducation: { 
            ...prev.higherEducation, 
            file: { 
              ...(prev.higherEducation?.file || {}), 
              uploadedUrl: null,
              publicId: uploadedFile.publicId 
            } 
          } 
        }));
        if (previousPublicId && previousPublicId !== uploadedFile.publicId && previousPublicId !== EXISTING_SECURE_FILE) {
          void cloudinaryService.deleteFile(previousPublicId).catch(() => null);
        }
        await form.trigger("educationFile");
      } catch {
        if (educationUploadSeqRef.current !== seq) return;
        form.setError("educationFile", { type: "manual", message: t("validation.educationUploadFailed") });
      } finally {
        if (educationUploadSeqRef.current === seq) setEducationUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = async (values: CertificationFormValues) => {
    const { teachingCertificateFile: _tcf, educationFile: _ef, certificateType, ...textFields } = values;
    if (teachingUploading || educationUploading) return;

    if (!certificationMerged.teachingCertificate.file.publicId) {
      form.setError("teachingCertificateFile", { type: "manual", message: t("validation.certificateUploadFailed") });
      return;
    }

    if (!certificationMerged.higherEducation.file.publicId) {
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

  const handleSaveExit = useCallback(async () => {
    if (isUploading) return;
    const values = getValues();
    setCertification((prev) => ({
      ...prev,
      teachingCertificate: {
        ...prev.teachingCertificate,
        name: values.certificateType,
        year: values.teachingYear,
      },
      higherEducation: {
        ...prev.higherEducation,
        university: values.university,
        degree: values.degree,
        specialization: values.specialization,
      },
    }));
    setLastSavedAt(new Date().toISOString());
  }, [getValues, isUploading, setCertification, setLastSavedAt]);


  return (
    <BecomeTutorShell
      headerTitle={t("headerTitle")}
      onSaveExit={handleSaveExit}
      stepLabel={t("stepLabel")}
      progressPercent={PROGRESS_PERCENT}
      progressLabel={t("progressPercentLabel", { percent: PROGRESS_PERCENT })}
      nextLabel={t("currentLabel")}
      backLabel={t("back")}
      continueLabel={t("continue")}
      currentStep={CURRENT_STEP}
      onBack={() => router.push("/become-tutor/photo")}
      onContinue={handleSubmit(onSubmit, onValidationError)}
      continueDisabled={teachingUploading || educationUploading}
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
              <Label
                htmlFor="certificateType"
                className="text-xs font-semibold text-slate-700"
              >
                {t("teaching.certificateLabel")}
              </Label>
              <Input
                id="certificateType"
                placeholder={t("teaching.certificatePlaceholder")}
                {...register("certificateType")}
                className="h-11 rounded-xl border-slate-200 bg-slate-50/60 text-sm transition-colors focus-visible:border-violet-300 focus-visible:bg-white focus-visible:ring-violet-200/60"
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
            <UploadFile
              variant="file"
              accept={ACCEPT_FILE_TYPES}
              fileName={certificationMerged.teachingCertificate.file.fileName}
              isUploading={teachingUploading}
              onFile={handleTeachingFileChange}
              emptyLabel={t("teaching.uploadPrompt")}
              dropHereLabel={t("teaching.dropHere")}
              hint={t("teaching.uploadHint")}
              uploadingLabel={t("teaching.uploading")}
              uploadLabel={t("teaching.uploadPrompt")}
              error={errors.teachingCertificateFile?.message}
            />
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
            <UploadFile
              variant="file"
              accept={ACCEPT_FILE_TYPES}
              fileName={certificationMerged.higherEducation.file.fileName}
              isUploading={educationUploading}
              onFile={handleEducationFileChange}
              emptyLabel={t("education.uploadPrompt")}
              dropHereLabel={t("education.dropHere")}
              hint={t("education.uploadHint")}
              uploadingLabel={t("education.uploading")}
              uploadLabel={t("education.uploadPrompt")}
              error={errors.educationFile?.message}
            />
          </div>
        </form>
      </BecomeTutorSection>
    </BecomeTutorShell>
  );
}

