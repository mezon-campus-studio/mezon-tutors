'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useSetAtom } from 'jotai';
import { Button } from '@/components/ui';
import { CheckCircle2, Clock3, RefreshCw, type LucideIcon } from 'lucide-react';
import { Spinner } from '@/components/ui';
import { ROUTES, VerificationStatus, DAY_KEYS, PROFESSIONAL_DOCUMENT_TYPE } from '@mezon-tutors/shared';
import { useGetMyProfile } from '@/services';
import {
  tutorProfileAboutAtom,
  tutorProfilePhotoAtom,
  tutorProfileCertificationAtom,
  tutorProfileVideoAtom,
  tutorProfileAvailabilityAtom,
  isEditingRejectedProfileAtom,
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
    <div className="min-h-screen bg-background">
      <div className="min-h-[70vh] flex items-center px-4 md:px-6">
        <div className="max-w-[1200px] w-full mx-auto">
          <div className="py-8 md:py-10 flex flex-col items-center text-center">
            <div className="mb-4 flex items-center justify-center gap-2.5">
              <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border ${statusMeta.badge}`}>
                <StatusIcon className="h-4 w-4" />
              </span>
              <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${statusMeta.badge}`}>
                {statusLabel}
              </span>
            </div>
            <h1 className="text-[34px] md:text-[40px] font-bold tracking-tight text-slate-900 md:whitespace-nowrap">
              {title}
            </h1>
            <p className="mt-2.5 max-w-[1050px] text-lg md:text-2xl leading-8 md:leading-[1.35] text-slate-600">
              {description}
            </p>
            {children && <div className="mt-6">{children}</div>}
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

  const handleLoadProfile = async () => {
    const { data: result } = await fetchProfile();
    if (!result?.profile) return;

    const profile = result.profile;
    setIsEditingRejected(true);

    const extractFileName = (url: string) => {
      if (!url) return '';
      try {
        const parts = url.split('/');
        const lastPart = parts[parts.length - 1];
        const fileNameWithExt = lastPart.split('?')[0];
        return decodeURIComponent(fileNameWithExt);
      } catch {
        return 'uploaded-file';
      }
    };

    const languages = profile.languages.map((l: any) => l.languageCode).join(', ');
    const proficiencies = profile.languages.map((l: any) => l.proficiency).join(', ');

    setAbout({
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.email,
      country: profile.country,
      phone: profile.phone,
      subject: profile.subject,
      languages,
      proficiencies,
    });

    const teachingCertDoc = profile.professionalDocuments?.find((d: any) => d.type === PROFESSIONAL_DOCUMENT_TYPE.CERTIFICATE);
    const educationDoc = profile.professionalDocuments?.find((d: any) => d.type === PROFESSIONAL_DOCUMENT_TYPE.DEGREE);

    setPhoto({
      photo: { uploadedUrl: profile.avatar, dataUrl: '', publicId: '', fileName: '' },
      identity: { 
        uploadedUrl: profile.identityVerification?.fileKey || '', 
        dataUrl: '', 
        publicId: '', 
        fileName: extractFileName(profile.identityVerification?.fileKey || '')
      },
      headline: profile.headline,
      motivate: profile.motivate,
      introduce: profile.introduce,
    });

    setCertification({
      teachingCertificate: {
        name: teachingCertDoc?.name || '',
        year: teachingCertDoc?.yearOfComplete ? String(teachingCertDoc.yearOfComplete) : '',
        file: { 
          uploadedUrl: teachingCertDoc?.fileKey || '', 
          dataUrl: '', 
          publicId: '', 
          fileName: extractFileName(teachingCertDoc?.fileKey || '')
        },
      },
      higherEducation: {
        university: educationDoc?.institution || '',
        degree: educationDoc?.name || '',
        specialization: educationDoc?.specialization || '',
        file: { 
          uploadedUrl: educationDoc?.fileKey || '', 
          dataUrl: '', 
          publicId: '', 
          fileName: extractFileName(educationDoc?.fileKey || '')
        },
      },
    });

    setVideo({
      videoLink: profile.videoUrl,
      videoId: null,
    });

    const slotsByDay: Record<string, any[]> = Object.fromEntries(DAY_KEYS.map(d => [d, []]));
    profile.availability.forEach((slot: any) => {
      const dayKey = DAY_KEYS[slot.dayOfWeek];
      if (dayKey) {
        slotsByDay[dayKey].push({
          startTime: slot.startTime,
          endTime: slot.endTime,
        });
      }
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
      slotsByDay,
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
    return null;
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
        <div className="flex flex-col items-center gap-2.5 sm:flex-row sm:justify-center sm:flex-wrap">
          <Button
            size="lg"
            className="h-10 rounded-xl bg-indigo-600 px-6 text-sm text-white hover:bg-indigo-700"
            onClick={() => router.push(ROUTES.DASHBOARD.BOOKING_REQUESTS)}
          >
            {t('approved.bookingRequests')}
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-10 rounded-xl border-slate-300 bg-white/70 px-6 text-sm text-slate-800 hover:bg-white"
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
          className="h-10 rounded-xl bg-indigo-600 px-6 text-sm text-white hover:bg-indigo-700"
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
