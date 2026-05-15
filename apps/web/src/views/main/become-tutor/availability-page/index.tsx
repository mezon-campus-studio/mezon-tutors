'use client';

import { useEffect, useRef, useState } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Input,
  TimePicker,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from '@/components/ui';
import { Wallet, Calendar, Plus, Trash2, ArrowRight, AlertCircle } from 'lucide-react';
import { BecomeTutorSection, BecomeTutorShell } from '../_shared/BecomeTutorShell';
import {
  tutorProfileAvailabilityAtom,
  resetTutorProfileAfterSubmitAtom,
  tutorProfileAboutAtom,
  tutorProfilePhotoAtom,
  tutorProfileCertificationAtom,
  tutorProfileVideoAtom,
  tutorProfileLastSavedAtAtom,
  markStepCompletedAtom,
} from '@/store';
import {
  DAY_KEYS,
  formatLastSavedTime,
  HOURLY_RATE_REGEX,
  DEFAULT_AVAILABILITY_SLOT,
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
} from '@mezon-tutors/shared';
import {
  useSubmitTutorProfileMutation,
  tutorProfileQueryKey,
  useGetCurrencyRates,
} from '@/services';
import type { SubmitTutorProfileDto, TimeSlot } from '@mezon-tutors/shared';

const CURRENT_STEP = BECOME_TUTOR_STEPS.AVAILABILITY;
const PROGRESS_PERCENT = calculateStepProgress(CURRENT_STEP);

type AvailabilityFormValues = {
  hourlyRate: string;
  currency: ECurrency;
  slotsByDay: Record<string, TimeSlot[]>;
};

export default function AvailabilityPage() {
  const t = useTranslations('TutorProfile.Availability');
  const router = useRouter();
  const about = useAtomValue(tutorProfileAboutAtom);
  const photo = useAtomValue(tutorProfilePhotoAtom);
  const certification = useAtomValue(tutorProfileCertificationAtom);
  const video = useAtomValue(tutorProfileVideoAtom);
  const [tutorProfileAvailability, setTutorProfileAvailability] = useAtom(
    tutorProfileAvailabilityAtom
  );
  const submitMutation = useSubmitTutorProfileMutation();
  const queryClient = useQueryClient();
  const resetAfterSubmit = useSetAtom(resetTutorProfileAfterSubmitAtom);
  const lastSavedAt = useAtomValue(tutorProfileLastSavedAtAtom);
  const setLastSavedAt = useSetAtom(tutorProfileLastSavedAtAtom);
  const [, markStepCompleted] = useAtom(markStepCompletedAtom);
  const availabilityCardRef = useRef<HTMLDivElement>(null);

  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  const form = useForm<AvailabilityFormValues>({
    defaultValues: {
      hourlyRate: tutorProfileAvailability.hourlyRate ?? '',
      currency: tutorProfileAvailability.currency ?? ECurrency.VND,
      slotsByDay:
        tutorProfileAvailability.slotsByDay ?? Object.fromEntries(DAY_KEYS.map((d) => [d, []])),
    },
    mode: 'onChange',
  });

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    setError,
    clearErrors,
    formState: { errors },
  } = form;

  useEffect(() => {
    reset({
      hourlyRate: tutorProfileAvailability.hourlyRate ?? '',
      currency: tutorProfileAvailability.currency ?? ECurrency.VND,
      slotsByDay:
        tutorProfileAvailability.slotsByDay ?? Object.fromEntries(DAY_KEYS.map((d) => [d, []])),
    });
  }, [
    tutorProfileAvailability.hourlyRate,
    tutorProfileAvailability.currency,
    tutorProfileAvailability.slotsByDay,
    reset,
  ]);

  const handleHourlyRateChange = (value: string) => {
    setValue('hourlyRate', value);
    setTutorProfileAvailability((prev) => ({ ...prev, hourlyRate: value }));
    setLastSavedAt(new Date().toISOString());
  };

  const handleAvailabilityChange = (slotsByDay: Record<string, TimeSlot[]>) => {
    setValue('slotsByDay', slotsByDay);
    setTutorProfileAvailability((prev) => ({ ...prev, slotsByDay }));
    setLastSavedAt(new Date().toISOString());
  };

  const handleCurrencyChange = (currency: ECurrency) => {
    setValue('currency', currency);
    setTutorProfileAvailability((prev) => ({ ...prev, currency }));
    setLastSavedAt(new Date().toISOString());
    form.trigger('hourlyRate');
  };

  const draftSavedLabel =
    lastSavedAt && formatLastSavedTime(lastSavedAt)
      ? t('draftSaved', { time: formatLastSavedTime(lastSavedAt) })
      : '';

  const dayKey = DAY_KEYS[selectedDayIndex];
  const slotsByDayForm = watch('slotsByDay');
  const selectedCurrency = watch('currency') ?? ECurrency.VND;
  const { data: currentRates } = useGetCurrencyRates(selectedCurrency);
  const daySlots = slotsByDayForm?.[dayKey] ?? [];

  const formatRecommendedAmount = (amount: number) => {
    return formatToCurrency(selectedCurrency, amount);
  };

  const addSlot = () => {
    const current = form.getValues('slotsByDay') ?? {};
    const currentDaySlots = current[dayKey] ?? [];
    const nextSlotsByDay = {
      ...current,
      [dayKey]: [...currentDaySlots, { ...DEFAULT_AVAILABILITY_SLOT }],
    };
    handleAvailabilityChange(nextSlotsByDay);
    clearErrors('slotsByDay');
  };

  const removeSlot = (index: number) => {
    const current = form.getValues('slotsByDay') ?? {};
    const currentDaySlots = (current[dayKey] ?? []).filter((_, i) => i !== index);
    const nextSlotsByDay = { ...current, [dayKey]: currentDaySlots };
    handleAvailabilityChange(nextSlotsByDay);
  };

  const updateSlot = (index: number, patch: Partial<TimeSlot>) => {
    const current = form.getValues('slotsByDay') ?? {};
    const list = [...(current[dayKey] ?? [])];
    list[index] = { ...list[index], ...patch };
    const nextSlotsByDay = { ...current, [dayKey]: list };
    handleAvailabilityChange(nextSlotsByDay);
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

    const availability: SubmitTutorProfileDto['availability'] = [];
    Object.entries(slotsByDay).forEach(([dayKey, slots]) => {
      const dayIndex = DAY_KEYS.indexOf(dayKey as (typeof DAY_KEYS)[number]);
      if (dayIndex === -1) return;
      for (const slot of slots) {
        availability.push({
          dayOfWeek: dayIndex,
          startTime: slot.startTime,
          endTime: slot.endTime,
        });
      }
    });

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

      markStepCompleted(CURRENT_STEP);

      await submitMutation.mutateAsync(payload);
      queryClient.setQueryData(tutorProfileQueryKey.myTutorProfile(), {
        hasProfile: true,
        verificationStatus: VerificationStatus.PENDING,
        profile: null, // Will be fetched when needed
      });
      queryClient.invalidateQueries({ queryKey: tutorProfileQueryKey.myTutorProfile() });
      resetAfterSubmit();
      router.push('/become-tutor/final');
    } catch (error) {
      toast.error(t('validation.currencyConversionFailed'));
    }
  };

  const dayTabs = t.raw('availability.tabs') as string[];

  return (
    <BecomeTutorShell
      headerTitle={t('title')}
      saveExitLabel={t('back')}
      draftSavedLabel={draftSavedLabel || undefined}
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
                    const minPrice = MIN_PRICE[selectedCurrency];
                    if (numValue < minPrice) {
                      return t('validation.hourlyRateTooLow', {
                        min: formatToCurrency(selectedCurrency, minPrice),
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
                    {Object.values(ECurrency).map((currency) => (
                      <SelectItem
                        key={currency}
                        value={currency}
                      >
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
        <div className="mb-5 flex flex-wrap gap-1.5 rounded-full border border-violet-100 bg-violet-50/40 p-1">
          {dayTabs.map((label, index) => {
            const isActive = selectedDayIndex === index;
            return (
              <button
                key={label}
                type="button"
                onClick={() => setSelectedDayIndex(index)}
                className={`flex-1 min-w-fit rounded-full px-3 py-1.5 text-xs font-semibold transition-all sm:text-sm ${
                  isActive
                    ? 'bg-[linear-gradient(110deg,#7c3aed_0%,#9333ea_50%,#db2777_100%)] text-white shadow-sm shadow-violet-300/40'
                    : 'text-slate-600 hover:bg-white hover:text-violet-700'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="space-y-3">
          {daySlots.map((slot, index) => (
            <div
              key={index}
              className="flex flex-wrap items-end gap-3 rounded-2xl border border-violet-100 bg-violet-50/30 p-3"
            >
              <div className="min-w-[120px] flex-1 space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {t('availability.from')}
                </label>
                <TimePicker
                  value={slot.startTime}
                  onChange={(v) => updateSlot(index, { startTime: v })}
                  placeholder={DEFAULT_AVAILABILITY_SLOT.startTime}
                />
              </div>
              <div className="flex items-center justify-center pb-2">
                <ArrowRight className="size-4 text-violet-400" />
              </div>
              <div className="min-w-[120px] flex-1 space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {t('availability.to')}
                </label>
                <TimePicker
                  value={slot.endTime}
                  onChange={(v) => updateSlot(index, { endTime: v })}
                  placeholder={DEFAULT_AVAILABILITY_SLOT.endTime}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => removeSlot(index)}
                className="h-10 rounded-xl border-rose-200 text-rose-600 hover:border-rose-300 hover:bg-rose-50"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}

          <Button
            type="button"
            onClick={addSlot}
            variant="outline"
            className="h-11 w-full rounded-full border-dashed border-violet-300 bg-white text-violet-700 hover:bg-violet-50"
          >
            <Plus className="mr-1 size-4" />
            {t('availability.addSlot')}
          </Button>

          {errors.slotsByDay?.message && typeof errors.slotsByDay.message === 'string' && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-rose-500" />
              <span>{errors.slotsByDay.message}</span>
            </div>
          )}
        </div>
      </BecomeTutorSection>
    </BecomeTutorShell>
  );
}
