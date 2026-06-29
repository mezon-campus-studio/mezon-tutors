'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useSetAtom } from 'jotai';
import { Button } from '@/components/ui';
import { CheckCircle2, Clock3, RefreshCw, type LucideIcon } from 'lucide-react';
import { Spinner } from '@/components/ui';
import {
  ROUTES,
  VerificationStatus,
  PROFESSIONAL_DOCUMENT_TYPE,
  normalizeUtcAvailabilityRows,
  EXISTING_SECURE_FILE,
  resolveVideoIdFromUrl,
} from '@mezon-tutors/shared';
import { useGetMyProfile } from '@/services';
import {
  tutorProfileAboutAtom,
  tutorProfilePhotoAtom,
  tutorProfileCertificationAtom,
  tutorProfileVideoAtom,
  tutorProfileAvailabilityAtom,
  isEditingRejectedProfileAtom,
  resetTutorProfileAfterSubmitAtom,
} from '@/store';

type StatusMeta = {
  icon: LucideIcon;
  badge: string;
};

type StatusLayoutProps = {
  statusMeta: StatusMeta;
  statusLabel: string;
  title: string;
  description: string;
  children?: React.ReactNode;
};

function StatusLayout({ statusMeta, statusLabel, title, description, children }: StatusLayoutProps) {
  const StatusIcon = statusMeta.icon;

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#faf7ff_0%,#ffffff_70%)]" />
        <div className="absolute -top-40 left-1/2 size-[44rem] -translate-x-1/2 rounded-full bg-violet-300/25 blur-[140px]" />
        <div className="absolute top-1/3 -right-24 size-[28rem] rounded-full bg-fuchsia-200/30 blur-[120px]" />
      </div>

      <div className="flex min-h-[80vh] items-center px-4 sm:px-6">
        <div className="mx-auto w-full max-w-3xl">
          <div className="relative overflow-hidden rounded-[2rem] border border-violet-100 bg-white/90 p-8 shadow-2xl shadow-violet-200/40 backdrop-blur sm:p-12">
            <div className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full bg-[radial-gradient(circle,rgba(124,58,237,0.18),transparent_70%)] blur-2xl" />

            <div className="relative flex flex-col items-center text-center">
              <div className="relative mb-5">
                <div className="absolute inset-0 -z-10 animate-pulse rounded-3xl bg-[linear-gradient(135deg,#ede9fe,#fce7f3)] blur-2xl" />
                <div className={`flex size-16 items-center justify-center rounded-3xl border ${statusMeta.badge} shadow-md`}>
                  <StatusIcon className="size-7" />
                </div>
              </div>

              <span className={`mb-4 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${statusMeta.badge}`}>
                {statusLabel}
              </span>

              <h1 className="text-balance text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
                {title}
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
                {description}
              </p>

              {children ? <div className="mt-8 w-full">{children}</div> : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FinalPage() {
  const t = useTranslations('TutorProfile.EntryStatus');
  const router = useRouter();
  const { data, isLoading, refetch: fetchProfile, isFetching } = useGetMyProfile();
  
  const setAbout = useSetAtom(tutorProfileAboutAtom);
  const setPhoto = useSetAtom(tutorProfilePhotoAtom);
  const setCertification = useSetAtom(tutorProfileCertificationAtom);
  const setVideo = useSetAtom(tutorProfileVideoAtom);
  const setAvailability = useSetAtom(tutorProfileAvailabilityAtom);
  const setIsEditingRejected = useSetAtom(isEditingRejectedProfileAtom);
  const resetAfterSubmit = useSetAtom(resetTutorProfileAfterSubmitAtom);

  useEffect(() => {
    if (sessionStorage.getItem('become-tutor:clear-draft') !== '1') return;
    sessionStorage.removeItem('become-tutor:clear-draft');
    resetAfterSubmit();
  }, [resetAfterSubmit]);

  const handleLoadProfile = async () => {
    const { data: result } = await fetchProfile();
    if (!result?.profile) return;

    const profile = result.profile;
    setIsEditingRejected(true);

    const languages = profile.languages.map((l: any) => l.languageCode).join(', ');
    const proficiencies = profile.languages.map((l: any) => l.proficiency).join(', ');

    const cvDoc = profile.professionalDocuments?.find((d: any) => d.type === PROFESSIONAL_DOCUMENT_TYPE.CV);

    setAbout({
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.email,
      country: profile.country,
      phone: profile.phone,
      subject: profile.subject,
      languages,
      proficiencies,
      cv: {
        uploadedUrl: null,
        publicId: cvDoc?.hasFile ? EXISTING_SECURE_FILE : null,
        dataUrl: '',
        fileName: cvDoc?.hasFile ? cvDoc.name || 'CV' : '',
      },
    });

    const teachingCertDoc = profile.professionalDocuments?.find((d: any) => d.type === PROFESSIONAL_DOCUMENT_TYPE.CERTIFICATE);
    const educationDoc = profile.professionalDocuments?.find((d: any) => d.type === PROFESSIONAL_DOCUMENT_TYPE.DEGREE);

    setPhoto({
      photo: { uploadedUrl: profile.avatar, dataUrl: '', publicId: '', fileName: '' },
      identity: {
        uploadedUrl: null,
        publicId: profile.identityVerification?.hasFile ? EXISTING_SECURE_FILE : null,
        dataUrl: '',
        fileName: profile.identityVerification?.hasFile ? 'uploaded-document' : '',
      },
      headline: profile.headline,
      introduce: profile.introduce,
    });

    setCertification({
      teachingCertificate: {
        name: teachingCertDoc?.name || '',
        year: teachingCertDoc?.yearOfComplete ? String(teachingCertDoc.yearOfComplete) : '',
        file: {
          uploadedUrl: null,
          publicId: teachingCertDoc?.hasFile ? EXISTING_SECURE_FILE : null,
          dataUrl: '',
          fileName: teachingCertDoc?.hasFile ? teachingCertDoc.name || 'uploaded-document' : '',
        },
      },
      higherEducation: {
        university: educationDoc?.institution || '',
        degree: educationDoc?.name || '',
        specialization: educationDoc?.specialization || '',
        file: {
          uploadedUrl: null,
          publicId: educationDoc?.hasFile ? EXISTING_SECURE_FILE : null,
          dataUrl: '',
          fileName: educationDoc?.hasFile ? educationDoc.name || 'uploaded-document' : '',
        },
      },
    });

    setVideo({
      videoLink: profile.videoUrl,
      videoId: resolveVideoIdFromUrl(profile.videoUrl ?? ''),
    });

    const baseCurrency = profile.trialLessonPrice?.baseCurrency || 'VND';
    let hourlyRate = '';
    
    if (profile.trialLessonPrice) {
      switch (baseCurrency) {
        case 'USD':
          hourlyRate = String(profile.trialLessonPrice.usd);
          break;
        case 'PHP':
          hourlyRate = String(profile.trialLessonPrice.php);
          break;
        case 'VND':
        default:
          hourlyRate = String(profile.trialLessonPrice.vnd);
          break;
      }
    }

    setAvailability({
      hourlyRate,
      currency: baseCurrency,
      utcAvailability: normalizeUtcAvailabilityRows(profile.availability ?? []),
      selectedDayIndex: 0,
    });

    router.push('/become-tutor/about');
  };

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-background">
        <div className="min-h-[70vh] flex items-center justify-center px-4 md:px-6">
          <Spinner className="h-8 w-8 text-primary" />
        </div>
      </div>
    );
  }

  if (!data?.hasProfile) {
    router.replace('/become-tutor');
  }

  const status = data?.verificationStatus;
  const statusMeta =
    status === VerificationStatus.PENDING
      ? {
          icon: Clock3,
          badge: 'bg-amber-100 text-amber-700 border-amber-200',
        }
      : status === VerificationStatus.APPROVED
        ? {
            icon: CheckCircle2,
            badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
          }
        : {
            icon: RefreshCw,
            badge: 'bg-rose-100 text-rose-700 border-rose-200',
          };

  if (status === VerificationStatus.PENDING) {
    return (
      <StatusLayout
        statusMeta={statusMeta}
        statusLabel={t('pending.status')}
        title={t('pending.title')}
        description={t('pending.description')}
      />
    );
  }

  if (status === VerificationStatus.APPROVED) {
    return (
      <StatusLayout
        statusMeta={statusMeta}
        statusLabel={t('approved.status')}
        title={t('approved.title')}
        description={t('approved.description')}
      >
        <div className="flex flex-col items-stretch gap-2.5 sm:flex-row sm:items-center sm:justify-center sm:flex-wrap">
          <Button
            size="lg"
            className="h-11 rounded-full bg-[linear-gradient(110deg,#7c3aed_0%,#9333ea_50%,#db2777_100%)] px-6 text-sm font-semibold text-white shadow-md shadow-violet-300/40 hover:shadow-lg hover:shadow-violet-400/50"
            onClick={() => router.push(ROUTES.DASHBOARD.TRIAL_BOOKING)}
          >
            {t('approved.bookingRequests')}
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-11 rounded-full border-slate-200 px-6 text-sm font-semibold text-slate-700 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
            onClick={() => router.push(ROUTES.DASHBOARD.MY_SCHEDULE)}
          >
            {t('approved.mySchedule')}
          </Button>
        </div>
      </StatusLayout>
    );
  }

  if (status === VerificationStatus.REJECTED) {
    return (
      <StatusLayout
        statusMeta={statusMeta}
        statusLabel={t('rejected.status')}
        title={t('rejected.title')}
        description={t('rejected.description')}
      >
        <Button
          size="lg"
          className="h-11 rounded-full bg-[linear-gradient(110deg,#7c3aed_0%,#9333ea_50%,#db2777_100%)] px-6 text-sm font-semibold text-white shadow-md shadow-violet-300/40 hover:shadow-lg hover:shadow-violet-400/50"
          onClick={handleLoadProfile}
          disabled={isFetching}
        >
          {isFetching ? <Spinner className="h-4 w-4" /> : t('rejected.restart')}
        </Button>
      </StatusLayout>
    );
  }

  return null;
}
