'use client';

import { useEffect, useRef, useState } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Input, Card, CardContent, Badge, TimePicker, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, toast } from '@/components/ui';
import { 
  Wallet, 
  Calendar, 
  Plus, 
  Trash2, 
  ArrowRight,
  AlertCircle 
} from 'lucide-react';
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
  getCurrencySymbol,
  MIN_PRICE,
  MAX_PRICE,
  VerificationStatus,
  convertToAllCurrencies,
} from '@mezon-tutors/shared';
import { useSubmitTutorProfileMutation, tutorProfileQueryKey, useGetCurrencyRates } from '@/services';
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
  const [tutorProfileAvailability, setTutorProfileAvailability] = useAtom(tutorProfileAvailabilityAtom);
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
      slotsByDay: tutorProfileAvailability.slotsByDay ?? Object.fromEntries(DAY_KEYS.map((d) => [d, []])),
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
      slotsByDay: tutorProfileAvailability.slotsByDay ?? Object.fromEntries(DAY_KEYS.map((d) => [d, []])),
    });
  }, [tutorProfileAvailability.hourlyRate, tutorProfileAvailability.currency, tutorProfileAvailability.slotsByDay, reset]);

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
            message: t('validation.endTimeMustBeAfterStartTime') 
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
              message: t('validation.duplicateSlot', { day: t(`availability.tabs.${DAY_KEYS.indexOf(day)}`) }),
            });
            availabilityCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return false;
          }

          const isOverlapping = 
            (startMinutes < otherEndMinutes && endMinutes > otherStartMinutes);

          if (isOverlapping) {
            setError('slotsByDay', {
              type: 'manual',
              message: t('validation.overlappingSlot', { day: t(`availability.tabs.${DAY_KEYS.indexOf(day)}`) }),
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
      const convertedPrices = convertToAllCurrencies(
        payload.pricePerHour,
        currency,
        currentRates
      );

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
    <div className="min-h-screen become-tutor-shell pb-20 md:pb-24">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8">
        <div className="mb-4 sm:mb-6 md:mb-8">
          <div className="flex items-center justify-between mb-4 sm:mb-5 md:mb-6 gap-2 flex-wrap">
            <div>
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">{t('title')}</h1>
              <p className="text-gray-600 mt-0.5 sm:mt-1 text-xs sm:text-sm md:text-base">{t('subtitle')}</p>
            </div>
            {draftSavedLabel && (
              <Badge variant="secondary" className="text-xs sm:text-sm">
                {draftSavedLabel}
              </Badge>
            )}
          </div>

          <div className="mb-4 sm:mb-5 md:mb-6">
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <span className="text-xs sm:text-sm font-medium text-gray-700">{t('stepLabel')}</span>
              <span className="text-xs sm:text-sm text-gray-500">
                {t('progressPercentLabel', { percent: PROGRESS_PERCENT })}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
              <div
                className="bg-[#6c5ce7] h-1.5 sm:h-2 rounded-full transition-all duration-300"
                style={{ width: `${PROGRESS_PERCENT}%` }}
              />
            </div>
          </div>
        </div>

        <Card className="mb-8 become-tutor-card rounded-xl shadow-sm border">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Wallet size={24} className="text-blue-600" />
              <h3 className="font-bold text-lg">{t('rateCardTitle')}</h3>
            </div>
            <p className="text-gray-600 text-sm mb-4">{t('rate.question')}</p>
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="flex-1 flex items-center !h-12 rounded-lg border border-gray-300 bg-muted/60 px-4">
                  <span className="text-gray-500 mr-2">{getCurrencySymbol(selectedCurrency)}</span>
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
                        const maxPrice = MAX_PRICE[selectedCurrency];
                        if (numValue < minPrice) {
                          return t('validation.hourlyRateTooLow', { 
                            min: formatToCurrency(selectedCurrency, minPrice) 
                          });
                        }
                        if (numValue > maxPrice) {
                          return t('validation.hourlyRateTooHigh', { 
                            max: formatToCurrency(selectedCurrency, maxPrice) 
                          });
                        }
                        return true;
                      },
                    }}
                    render={({ field: { value, onChange } }) => (
                      <Input
                        className="flex-1 border-0 bg-transparent p-0 focus-visible:ring-0"
                        placeholder="0.00"
                        value={value}
                        onChange={(e) => {
                          onChange(e.target.value);
                          handleHourlyRateChange(e.target.value);
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
                      <SelectTrigger className="!h-12 min-w-[120px] bg-muted/60 border-gray-300">
                        <SelectValue placeholder={t('rate.currencyLabel')} />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(ECurrency).map((currency) => (
                          <SelectItem key={currency} value={currency}>
                            {currency}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <p className="text-sm text-gray-500">
                {t('rate.recommended', {
                  min: formatRecommendedAmount(MIN_PRICE[selectedCurrency]),
                  max: formatRecommendedAmount(MAX_PRICE[selectedCurrency]),
                })}
              </p>
              {errors.hourlyRate?.message && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle size={16} />
                  <span>{errors.hourlyRate.message}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8 become-tutor-card rounded-xl shadow-sm border overflow-visible" ref={availabilityCardRef}>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Calendar size={24} className="text-blue-600" />
              <h3 className="font-bold text-lg">{t('availabilityCardTitle')}</h3>
            </div>

            <div className="flex gap-2 mb-6 flex-wrap">
              {dayTabs.map((label, index) => (
                <Button
                  key={label}
                  type="button"
                  variant={selectedDayIndex === index ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedDayIndex(index)}
                  className={selectedDayIndex === index ? 'bg-[#6c5ce7] hover:bg-[#5a4fcf]' : ''}
                >
                  {label}
                </Button>
              ))}
            </div>

            <div className="space-y-4">
              {daySlots.map((slot, index) => (
                <div key={index} className="flex items-end gap-3 flex-wrap">
                  <div className="flex-1 min-w-[120px]">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">
                      {t('availability.from')}
                    </label>
                    <TimePicker
                      value={slot.startTime}
                      onChange={(v) => updateSlot(index, { startTime: v })}
                      placeholder={DEFAULT_AVAILABILITY_SLOT.startTime}
                    />
                  </div>
                  <div className="flex items-center justify-center pb-2">
                    <ArrowRight size={20} className="text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-[120px]">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">
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
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSlot(index)}
                    className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 size={18} />
                  </Button>
                </div>
              ))}

              <Button
                type="button"
                onClick={addSlot}
                className="w-full bg-[#6c5ce7] hover:bg-[#5a4fcf] text-white rounded-lg p-3 mt-4"
              >
                <Plus size={20} className="mr-2" />
                {t('availability.addSlot')}
              </Button>

              {errors.slotsByDay?.message && typeof errors.slotsByDay.message === 'string' && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle size={16} />
                  <span>{errors.slotsByDay.message}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t border-gray-200 p-4 shadow-sm">
          <div className="max-w-4xl mx-auto flex justify-between">
            <Button
              variant="outline"
              onClick={() => router.push('/become-tutor/video')}
            >
              {t('back')}
            </Button>
            <Button
              onClick={handleSubmit(handleContinue)}
              disabled={submitMutation.isPending}
              className="bg-[#6c5ce7] hover:bg-[#5a4fcf]"
            >
              {t('continue')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
