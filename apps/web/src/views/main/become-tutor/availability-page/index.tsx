'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from '@/components/ui';
import { AlertCircle } from 'lucide-react';
import { BecomeTutorSection, BecomeTutorShell } from '../_shared/BecomeTutorShell';
import {
  tutorProfileAvailabilityAtom,
  tutorProfileAboutAtom,
  tutorProfilePhotoAtom,
  tutorProfileCertificationAtom,
  tutorProfileVideoAtom,
  tutorProfileLastSavedAtAtom,
  markStepCompletedAtom,
} from '@/store';
import {
  DAY_KEYS,
  HOURLY_RATE_REGEX,
  DEFAULT_AVATAR_URL,
  timeToMinutes,
  BECOME_TUTOR_STEPS,
  calculateStepProgress,
  ECurrency,
  formatToCurrency,
  formatCurrencyAmountInputDisplay,
  getCurrencySymbol,
  toCanonicalCurrencyAmountInput,
  MIN_PRICE,
  VerificationStatus,
  convertToAllCurrencies,
  emptySlotsByDay,
  readAvailabilityDraftToLocalSlots,
  writeLocalSlotsToAvailabilityDraftUtc,
} from '@mezon-tutors/shared';
import {
  useSubmitTutorProfileMutation,
  tutorProfileQueryKey,
  useGetCurrencyRates,
} from '@/services';
import { useUserTimezone } from '@/hooks';
import { TutorAvailabilitySelection } from '@/components/common/TutorAvailabilitySelection';
import type { SubmitTutorProfileDto, TimeSlot } from '@mezon-tutors/shared';

const CURRENT_STEP = BECOME_TUTOR_STEPS.AVAILABILITY;
const PROGRESS_PERCENT = calculateStepProgress(CURRENT_STEP);

type AvailabilityFormValues = {
  hourlyRate: string;
  currency: ECurrency;
  slotsByDay: Record<string, TimeSlot[]>;
};

export default function AvailabilityPage() {
  const t = useTranslations('BecomeTutor.availability');
  const router = useRouter();
  const tutorTimezone = useUserTimezone();
  const about = useAtomValue(tutorProfileAboutAtom);
  const photo = useAtomValue(tutorProfilePhotoAtom);
  const certification = useAtomValue(tutorProfileCertificationAtom);
  const video = useAtomValue(tutorProfileVideoAtom);
  const [tutorProfileAvailability, setTutorProfileAvailability] = useAtom(
    tutorProfileAvailabilityAtom
  );
  const submitMutation = useSubmitTutorProfileMutation();
  const queryClient = useQueryClient();
  const setLastSavedAt = useSetAtom(tutorProfileLastSavedAtAtom);
  const [, markStepCompleted] = useAtom(markStepCompletedAtom);
  const availabilityCardRef = useRef<HTMLDivElement>(null);

  const draftLocalSlots = useMemo(
    () => readAvailabilityDraftToLocalSlots(tutorProfileAvailability, tutorTimezone),
    [tutorProfileAvailability, tutorTimezone]
  );

  const form = useForm<AvailabilityFormValues>({
    defaultValues: {
      hourlyRate: tutorProfileAvailability.hourlyRate ?? '',
      currency: tutorProfileAvailability.currency ?? ECurrency.VND,
      slotsByDay: draftLocalSlots,
    },
    mode: 'onChange',
  });

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    getValues,
    setError,
    clearErrors,
    trigger,
    formState: { errors },
  } = form;

  const draftSyncKey = useMemo(
    () =>
      JSON.stringify({
        utc: tutorProfileAvailability.utcAvailability ?? [],
        legacy: tutorProfileAvailability.slotsByDay,
        rate: tutorProfileAvailability.hourlyRate,
        currency: tutorProfileAvailability.currency,
        tz: tutorTimezone,
      }),
    [
      tutorProfileAvailability.utcAvailability,
      tutorProfileAvailability.slotsByDay,
      tutorProfileAvailability.hourlyRate,
      tutorProfileAvailability.currency,
      tutorTimezone,
    ]
  );

  const lastDraftSyncKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (lastDraftSyncKeyRef.current === draftSyncKey) return;
    lastDraftSyncKeyRef.current = draftSyncKey;
    reset({
      hourlyRate: tutorProfileAvailability.hourlyRate ?? '',
      currency: tutorProfileAvailability.currency ?? ECurrency.VND,
      slotsByDay: readAvailabilityDraftToLocalSlots(tutorProfileAvailability, tutorTimezone),
    });
  }, [draftSyncKey, reset, tutorProfileAvailability, tutorTimezone]);

  const persistLocalSlotsToDraft = useCallback(
    (localSlots: Record<string, TimeSlot[]>) => {
      const utcAvailability = writeLocalSlotsToAvailabilityDraftUtc(localSlots, tutorTimezone);
      setTutorProfileAvailability((prev) => {
        const { slotsByDay: _legacy, ...rest } = prev;
        return { ...rest, utcAvailability };
      });
      return utcAvailability;
    },
    [setTutorProfileAvailability, tutorTimezone]
  );

  const handleHourlyRateChange = (value: string) => {
    setValue('hourlyRate', value);
    setTutorProfileAvailability((prev) => ({ ...prev, hourlyRate: value }));
    setLastSavedAt(new Date().toISOString());
  };

  const handleAvailabilityChange = (slotsByDay: Record<string, TimeSlot[]>) => {
    setValue('slotsByDay', slotsByDay);
    persistLocalSlotsToDraft(slotsByDay);
    setLastSavedAt(new Date().toISOString());
  };

  const handleCurrencyChange = (currency: ECurrency) => {
    setValue('currency', currency);
    setTutorProfileAvailability((prev) => ({ ...prev, currency }));
    setLastSavedAt(new Date().toISOString());
    clearErrors('hourlyRate');
    void trigger('hourlyRate');
  };

  const handleSaveExit = useCallback(() => {
    const v = getValues();
    persistLocalSlotsToDraft(v.slotsByDay ?? emptySlotsByDay());
    setTutorProfileAvailability((prev) => ({
      ...prev,
      hourlyRate: v.hourlyRate,
      currency: v.currency,
    }));
    setLastSavedAt(new Date().toISOString());
  }, [getValues, persistLocalSlotsToDraft, setLastSavedAt, setTutorProfileAvailability]);

  const slotsByDayForm = watch('slotsByDay') ?? emptySlotsByDay();
  const selectedCurrency = watch('currency') ?? ECurrency.VND;
  const { data: currentRates } = useGetCurrencyRates(selectedCurrency);

  const formatRecommendedAmount = (amount: number) => {
    return formatToCurrency(selectedCurrency, amount);
  };

  const validateWeeklySlots = (values: AvailabilityFormValues): boolean => {
    const slotsByDay = values.slotsByDay ?? {};
    const hasAnySlot = DAY_KEYS.some((day) => (slotsByDay[day] ?? []).length > 0);

    if (!hasAnySlot) {
      setError('slotsByDay', { type: 'manual', message: t('validation.weeklySlotsRequired') });
      availabilityCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }

    for (const day of DAY_KEYS) {
      const daySlots = slotsByDay[day] ?? [];

      for (let i = 0; i < daySlots.length; i++) {
        const slot = daySlots[i];

        if (!slot.startTime || !slot.endTime) {
          setError('slotsByDay', { type: 'manual', message: t('validation.timeRequired') });
          availabilityCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return false;
        }

        const startMinutes = timeToMinutes(slot.startTime);
        const endMinutes = timeToMinutes(slot.endTime);
        const [, startMinute = ''] = slot.startTime.split(':');
        const [, endMinute = ''] = slot.endTime.split(':');

        if (!['00', '30'].includes(startMinute) || !['00', '30'].includes(endMinute)) {
          setError('slotsByDay', {
            type: 'manual',
            message: t('validation.minuteStepInvalid'),
          });
          availabilityCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return false;
        }

        if (startMinutes >= endMinutes) {
          setError('slotsByDay', {
            type: 'manual',
            message: t('validation.endTimeMustBeAfterStartTime'),
          });
          availabilityCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return false;
        }

        for (let j = i + 1; j < daySlots.length; j++) {
          const otherSlot = daySlots[j];
          const otherStartMinutes = timeToMinutes(otherSlot.startTime);
          const otherEndMinutes = timeToMinutes(otherSlot.endTime);

          if (slot.startTime === otherSlot.startTime && slot.endTime === otherSlot.endTime) {
            setError('slotsByDay', {
              type: 'manual',
              message: t('validation.duplicateSlot', {
                day: t(`availability.tabs.${DAY_KEYS.indexOf(day)}`),
              }),
            });
            availabilityCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return false;
          }

          const isOverlapping = startMinutes < otherEndMinutes && endMinutes > otherStartMinutes;

          if (isOverlapping) {
            setError('slotsByDay', {
              type: 'manual',
              message: t('validation.overlappingSlot', {
                day: t(`availability.tabs.${DAY_KEYS.indexOf(day)}`),
              }),
            });
            availabilityCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return false;
          }
        }
      }
    }

    clearErrors('slotsByDay');
    return true;
  };

  const handleContinue = async () => {
    const hourlyRate = form.getValues('hourlyRate');
    const currency = form.getValues('currency');
    const slotsByDay = form.getValues('slotsByDay') ?? {};

    if (!hourlyRate || !HOURLY_RATE_REGEX.test(hourlyRate.trim()) || Number(hourlyRate) <= 0) {
      return;
    }

    if (!validateWeeklySlots({ hourlyRate, currency, slotsByDay })) {
      return;
    }

    const availability = persistLocalSlotsToDraft(slotsByDay);

    const proficiencies = (about.proficiencies || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const languages = (about.languages || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((languageCode, i) => ({
        languageCode,
        proficiency: proficiencies[i] ?? '',
      }));

    const payload: SubmitTutorProfileDto = {
      firstName: about.firstName,
      lastName: about.lastName,
      email: about.email,
      country: about.country as SubmitTutorProfileDto['country'],
      phone: about.phone,
      subject: about.subject,
      languages,
      avatar: photo.photo?.uploadedUrl || DEFAULT_AVATAR_URL,
      identityPhotoUrl: photo.identity?.uploadedUrl ?? '',
      headline: photo.headline,
      motivate: photo.motivate,
      introduce: photo.introduce,
      teachingCertificateName: certification.teachingCertificate.name,
      teachingYear: certification.teachingCertificate.year,
      teachingCertificateFileUrl: certification.teachingCertificate.file?.uploadedUrl ?? '',
      university: certification.higherEducation.university,
      degree: certification.higherEducation.degree,
      specialization: certification.higherEducation.specialization,
      educationFileUrl: certification.higherEducation.file?.uploadedUrl ?? '',
      videoUrl: video.videoLink,
      pricePerHour: Number.parseFloat(hourlyRate) || 0,
      currency,
      availability,
    };

    try {
      const convertedPrices = convertToAllCurrencies(payload.pricePerHour, currency, currentRates);
      payload.prices = {
        usd: Number(convertedPrices.usd.toFixed(2)),
        vnd: Math.round(convertedPrices.vnd),
        php: Number(convertedPrices.php.toFixed(2)),
      };
    } catch {
      toast.error(t('validation.currencyConversionFailed'));
      return;
    }

    try {
      await submitMutation.mutateAsync(payload);
    } catch {
      toast.error(t('validation.submitFailed'));
      return;
    }

    markStepCompleted(CURRENT_STEP);
    queryClient.setQueryData(tutorProfileQueryKey.myTutorProfile(), {
      hasProfile: true,
      verificationStatus: VerificationStatus.PENDING,
      profile: null,
    });
    queryClient.invalidateQueries({ queryKey: tutorProfileQueryKey.myTutorProfile() });
    sessionStorage.setItem('become-tutor:clear-draft', '1');
    router.replace('/become-tutor/final');
  };

  return (
    <BecomeTutorShell
      headerTitle={t('title')}
      onSaveExit={handleSaveExit}
      stepLabel={t('stepLabel')}
      progressPercent={PROGRESS_PERCENT}
      progressLabel={t('progressPercentLabel', { percent: PROGRESS_PERCENT })}
      nextLabel={t('subtitle')}
      backLabel={t('back')}
      continueLabel={t('continue')}
      currentStep={CURRENT_STEP}
      onBack={() => router.push('/become-tutor/video')}
      onContinue={handleSubmit(handleContinue)}
      continueDisabled={submitMutation.isPending}
    >
      <BecomeTutorSection
        eyebrow="Pricing"
        title={t('rateCardTitle')}
        description={t('rate.question')}
      >
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex h-12 flex-1 items-center rounded-xl border border-slate-200 bg-slate-50/60 px-4 transition-colors focus-within:border-violet-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-violet-200/60">
              <span className="mr-2 text-base font-bold text-violet-600">
                {getCurrencySymbol(selectedCurrency)}
              </span>
              <Controller
                control={control}
                name="hourlyRate"
                rules={{
                  validate: (value) => {
                    const currency = getValues('currency') ?? ECurrency.VND;
                    const trimmed = value.trim();
                    if (!trimmed) {
                      return t('validation.hourlyRateRequired');
                    }
                    if (!HOURLY_RATE_REGEX.test(trimmed)) {
                      return t('validation.hourlyRateInvalidFormat');
                    }
                    const numValue = Number(trimmed);
                    if (numValue <= 0) {
                      return t('validation.hourlyRateGreaterThanZero');
                    }
                    const minPrice = MIN_PRICE[currency];
                    if (numValue < minPrice) {
                      return t('validation.hourlyRateTooLow', {
                        min: formatToCurrency(currency, minPrice),
                      });
                    }
                    return true;
                  },
                }}
                render={({ field: { value, onChange } }) => (
                  <Input
                    className="flex-1 border-0 bg-transparent p-0 text-base font-bold focus-visible:ring-0"
                    placeholder={formatCurrencyAmountInputDisplay(selectedCurrency, '0')}
                    inputMode="decimal"
                    value={formatCurrencyAmountInputDisplay(selectedCurrency, value)}
                    onChange={(e) => {
                      const next = toCanonicalCurrencyAmountInput(e.target.value, selectedCurrency);
                      onChange(next);
                      handleHourlyRateChange(next);
                    }}
                  />
                )}
              />
            </div>
            <Controller
              control={control}
              name="currency"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(value) => {
                    const next = value as ECurrency;
                    field.onChange(next);
                    handleCurrencyChange(next);
                  }}
                >
                  <SelectTrigger className="h-12! min-w-[120px] rounded-xl border-slate-200 bg-slate-50/60 text-sm">
                    <SelectValue placeholder={t('rate.currencyLabel')} />
                  </SelectTrigger>
                 <SelectContent>
                  {Object.values(ECurrency)
                    .filter((c) => c === ECurrency.VND)
                    .map((currency) => (
                      <SelectItem key={currency} value={currency}>
                        {currency}
                      </SelectItem>
                    ))}
                </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="rounded-xl border border-violet-100 bg-[linear-gradient(110deg,#faf5ff,#fdf2f8)] px-3 py-2">
            <p className="text-xs text-violet-700">
              {t('rate.recommended', {
                min: formatRecommendedAmount(MIN_PRICE[selectedCurrency]),
              })}
            </p>
          </div>
          {errors.hourlyRate?.message && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-rose-500" />
              <span>{errors.hourlyRate.message}</span>
            </div>
          )}
        </div>
      </BecomeTutorSection>

      <BecomeTutorSection
        eyebrow="Availability"
        title={t('availabilityCardTitle')}
        contentRef={availabilityCardRef}
      >
        <TutorAvailabilitySelection
          slotsByDay={slotsByDayForm}
          onSlotsByDayChange={handleAvailabilityChange}
          syncFromUtc={false}
          onSlotAdded={() => clearErrors('slotsByDay')}
          slotsError={
            typeof errors.slotsByDay?.message === 'string' ? errors.slotsByDay.message : null
          }
          contentRef={availabilityCardRef}
          showTimezoneLabel
        />
      </BecomeTutorSection>
    </BecomeTutorShell>
  );
}
