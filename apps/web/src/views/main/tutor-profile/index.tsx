'use client';

import {
  convertToAllCurrencies,
  ECountry,
  ECurrency,
  ELanguage,
  EProficiencyLevel,
  ESubject,
  formatToCurrency,
  formatCurrencyAmountInputDisplay,
  getCurrencySymbol,
  MIN_PRICE,
  ROUTES,
  toCanonicalCurrencyAmountInput,
  DAY_KEYS,
  VerificationStatus,
} from '@mezon-tutors/shared';
import { TutorAvailabilitySelection } from '@/components/common/TutorAvailabilitySelection';
import {
  AlertCircle,
  Award,
  BookOpen,
  Calendar,
  Globe,
  Pencil,
  Star,
  Trash2,
  User,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  Textarea,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui';
import { useUnsavedChangesGuard, useUserTimezone } from '@/hooks';
import { cn } from '@/lib/utils';
import {
  useGetCurrencyRates,
  useGetMyProfile,
  useUpdateMyTutorProfileMutation,
} from '@/services';
import {
  availabilityToSlotsByDay,
  emptySlotsByDay,
  slotsByDayToUtcAvailability,
} from '@mezon-tutors/shared';
import ProfileTabs, { PROFILE_TAB, type ProfileTabNumber } from './components/ProfileTabs';
import ProfileVideoEmbed from './components/ProfileVideoEmbed';
import { createTabAwareResolver, type ProfileFormMessages } from './profile-form-schema';
import {
  buildUpdateMyProfilePayload,
  getPriceFromTrialLessonPrice,
  profileToFormValues,
  type MyTutorProfileRecord,
  type TutorProfileFormValues,
} from './utils';

const VERIFICATION_BADGE: Record<string, string> = {
  PENDING: 'border-amber-200 bg-amber-50 text-amber-800',
  APPROVED: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  REJECTED: 'border-rose-200 bg-rose-50 text-rose-800',
};

function ProfileField({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1', className)}>
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="text-sm font-medium text-slate-900">{value || '—'}</p>
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  return (
    <p className="min-h-5 text-xs leading-5 text-rose-600" role="alert" aria-live="polite">
      {message ?? ''}
    </p>
  );
}

function SectionCard({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm shadow-violet-100/30 sm:p-6">
      {action ? (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">{title}</h2>
            {description ? (
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{description}</p>
            ) : null}
          </div>
          {action}
        </div>
      ) : (
        <div className="mb-4">
          <h2 className="text-sm font-extrabold text-slate-900">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm leading-relaxed text-slate-600">{description}</p>
          ) : null}
        </div>
      )}
      {children}
    </section>
  );
}

function TabEditActions({
  isEditing,
  isSaving,
  onEdit,
  onSave,
  onCancel,
  editLabel,
  saveLabel,
  savingLabel,
  cancelLabel,
}: {
  isEditing: boolean;
  isSaving: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  editLabel: string;
  saveLabel: string;
  savingLabel: string;
  cancelLabel: string;
}) {
  if (isEditing) {
    return (
      <div className="flex shrink-0 gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-9 rounded-full border-slate-200 px-4 text-xs font-semibold text-slate-700 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
          onClick={onCancel}
          disabled={isSaving}
        >
          {cancelLabel}
        </Button>
        <Button
          type="button"
          variant="gradient"
          className="h-9 rounded-full px-4 text-xs font-semibold"
          onClick={onSave}
          disabled={isSaving}
        >
          {isSaving ? savingLabel : saveLabel}
        </Button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="gradient"
      size="lg"
      className="gap-1.5 rounded-full"
      onClick={onEdit}
    >
      <Pencil className="size-3.5" />
      {editLabel}
    </Button>
  );
}

export default function TutorProfileView() {
  const t = useTranslations('Dashboard.profile');
  const tAbout = useTranslations('BecomeTutor.about');
  const tp = useTranslations('BecomeTutor.about.placeholders');
  const tPhoto = useTranslations('BecomeTutor.photo');
  const tVideo = useTranslations('BecomeTutor.video');
  const tAv = useTranslations('BecomeTutor.availability');
  const tCountry = useTranslations('Tutors.Filter.Country');
  const tSubject = useTranslations('Tutors.Filter.Subject');
  const tLanguage = useTranslations('Tutors.Filter.Language');
  const tProficiency = useTranslations('Tutors.Filter.Proficiency');

  const router = useRouter();
  const { data, isLoading, refetch } = useGetMyProfile();
  const profile = data?.profile as MyTutorProfileRecord | null | undefined;
  const userTimezone = useUserTimezone();
  const updateProfileMutation = useUpdateMyTutorProfileMutation();
  const [editingTab, setEditingTab] = useState<ProfileTabNumber | null>(null);
  const editingTabRef = useRef<ProfileTabNumber | null>(null);
  editingTabRef.current = editingTab;
  const [activeTab, setActiveTab] = useState<ProfileTabNumber>(PROFILE_TAB.GENERAL);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const pendingLeaveActionRef = useRef<(() => void) | null>(null);
  const availabilityCardRef = useRef<HTMLDivElement>(null);

  const hasProfile = Boolean(data?.hasProfile && profile);

  const formMessages = useMemo<ProfileFormMessages>(
    () => ({
      about: tAbout,
      photo: tPhoto,
      video: tVideo,
      availability: (key, values) => tAv(key, values),
    }),
    [tAbout, tPhoto, tVideo, tAv]
  );

  const dayTabLabels = tAv.raw('availability.tabs') as string[];
  const availabilityDayLabel = useCallback(
    (dayIndex: number) => dayTabLabels[dayIndex] ?? DAY_KEYS[dayIndex] ?? '',
    [dayTabLabels]
  );

  const formResolver = useMemo(
    () =>
      createTabAwareResolver(
        formMessages,
        () => editingTabRef.current,
        availabilityDayLabel
      ),
    [formMessages, availabilityDayLabel]
  );

  const emptyFormValues: TutorProfileFormValues = {
    firstName: '',
    lastName: '',
    email: '',
    country: '',
    phone: '',
    subject: '',
    headline: '',
    motivate: '',
    introduce: '',
    videoUrl: '',
    hourlyRate: '',
    currency: ECurrency.VND,
    languageEntries: [{ language: '', proficiency: '' }],
    slotsByDay: emptySlotsByDay(),
  };

  const form = useForm<TutorProfileFormValues>({
    resolver: formResolver,
    mode: 'onChange',
    reValidateMode: 'onChange',
    shouldUnregister: false,
    defaultValues: profile
      ? {
          ...profileToFormValues(profile),
          slotsByDay: availabilityToSlotsByDay(profile.availability ?? [], userTimezone),
        }
      : emptyFormValues,
  });

  const { setValue } = form;
  const slotsByDay = form.watch('slotsByDay') ?? emptySlotsByDay();

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'languageEntries',
  });

  const selectedCurrency =
    form.watch('currency') ?? form.getValues('currency') ?? ECurrency.VND;
  const watchedVideoUrl = form.watch('videoUrl');
  const { errors, isDirty } = form.formState;
  const { data: currentRates } = useGetCurrencyRates(selectedCurrency, editingTab !== null);

  const hasUnsavedEdits = editingTab !== null && isDirty;

  const requestLeave = useCallback(
    (action: () => void) => {
      if (!hasUnsavedEdits) {
        action();
        return;
      }
      pendingLeaveActionRef.current = action;
      setDiscardDialogOpen(true);
    },
    [hasUnsavedEdits]
  );

  const confirmDiscardLeave = useCallback(() => {
    setDiscardDialogOpen(false);
    const action = pendingLeaveActionRef.current;
    pendingLeaveActionRef.current = null;
    action?.();
  }, []);

  const cancelDiscardLeave = useCallback(() => {
    setDiscardDialogOpen(false);
    pendingLeaveActionRef.current = null;
  }, []);

  useUnsavedChangesGuard(hasUnsavedEdits, {
    onLeaveAttempt: requestLeave,
    navigate: (href) => router.push(href),
  });

  const resetDraftFromProfile = useCallback(() => {
    if (!profile) return;
    form.reset({
      ...profileToFormValues(profile),
      slotsByDay: availabilityToSlotsByDay(profile.availability ?? [], userTimezone),
    });
  }, [form, profile, userTimezone]);

  const startEditingTab = useCallback(
    (tab: ProfileTabNumber) => {
      if (!profile) return;
      resetDraftFromProfile();
      setEditingTab(tab);
    },
    [profile, resetDraftFromProfile]
  );

  const cancelEditingTab = useCallback(() => {
    setEditingTab(null);
    resetDraftFromProfile();
  }, [resetDraftFromProfile]);

  const handleTabChange = useCallback(
    (tab: ProfileTabNumber) => {
      if (tab === activeTab) return;

      const applyTabChange = () => {
        if (editingTab !== null) {
          setEditingTab(null);
          resetDraftFromProfile();
        }
        setActiveTab(tab);
      };

      if (hasUnsavedEdits) {
        requestLeave(applyTabChange);
        return;
      }

      applyTabChange();
    },
    [activeTab, editingTab, hasUnsavedEdits, requestLeave, resetDraftFromProfile]
  );

  const tabEditActions = (tab: ProfileTabNumber) => (
    <TabEditActions
      isEditing={editingTab === tab}
      isSaving={updateProfileMutation.isPending}
      onEdit={() => startEditingTab(tab)}
      onSave={() => void saveTab(tab)}
      onCancel={() => requestLeave(cancelEditingTab)}
      editLabel={t('edit')}
      saveLabel={t('save')}
      savingLabel={t('saving')}
      cancelLabel={t('cancel')}
    />
  );

  const saveTab = async (tab: ProfileTabNumber) => {
    if (!profile) return;

    const fieldsToValidate =
      tab === PROFILE_TAB.GENERAL
        ? (['firstName', 'lastName', 'country', 'phone', 'subject', 'languageEntries'] as const)
        : tab === PROFILE_TAB.TUTOR_INFO
          ? (['headline', 'motivate', 'introduce', 'videoUrl'] as const)
          : (['hourlyRate', 'currency', 'slotsByDay'] as const);

    const isValid = await form.trigger([...fieldsToValidate]);
    if (!isValid) {
      if (tab === PROFILE_TAB.SCHEDULE) {
        availabilityCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    const values = form.getValues();

    let prices: { usd: number; vnd: number; php: number };
    if (tab === PROFILE_TAB.SCHEDULE) {
      const pricePerHour = Number.parseFloat(values.hourlyRate.trim());
      try {
        const converted = convertToAllCurrencies(pricePerHour, values.currency, currentRates);
        prices = {
          usd: Number(converted.usd.toFixed(2)),
          vnd: Math.round(converted.vnd),
          php: Number(converted.php.toFixed(2)),
        };
      } catch {
        toast.error(t('toast.errorTitle'), { description: t('toast.errorDescription') });
        return;
      }
    } else {
      prices = { usd: 0, vnd: 0, php: 0 };
    }

    const utcAvailability =
      tab === PROFILE_TAB.SCHEDULE
        ? slotsByDayToUtcAvailability(values.slotsByDay, userTimezone)
        : [];

    const payload = buildUpdateMyProfilePayload(tab, values, prices, utcAvailability);

    try {
      await updateProfileMutation.mutateAsync(payload);
      toast.success(t('toast.savedTitle'), { description: t('toast.savedDescription') });
      setEditingTab(null);
      await refetch();
    } catch {
      toast.error(t('toast.errorTitle'), { description: t('toast.errorDescription') });
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <Spinner className="size-8 text-violet-600" />
          <p className="text-sm font-medium">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (!hasProfile || !profile) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
          <User className="size-7" />
        </div>
        <h1 className="text-xl font-extrabold text-slate-900">{t('noProfile.title')}</h1>
        <p className="mt-2 text-sm text-slate-600">{t('noProfile.description')}</p>
        <Link
          href={ROUTES.BECOME_TUTOR.INDEX}
          className="mt-6 inline-flex h-10 items-center justify-center rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-700"
        >
          {t('noProfile.cta')}
        </Link>
      </div>
    );
  }

  const verificationKey = profile.verificationStatus as keyof typeof VERIFICATION_BADGE;
  const badgeClass = VERIFICATION_BADGE[verificationKey] ?? VERIFICATION_BADGE.PENDING;
  const { amount, currency } = getPriceFromTrialLessonPrice(profile.trialLessonPrice);
  const fullName = `${profile.firstName} ${profile.lastName}`.trim();
  const initials =
    `${profile.firstName?.[0] ?? ''}${profile.lastName?.[0] ?? ''}`.toUpperCase() || 'T';

  const viewSlotsByDay = availabilityToSlotsByDay(profile.availability ?? [], userTimezone);

  const availabilityView = DAY_KEYS.every((day) => (viewSlotsByDay[day] ?? []).length === 0) ? (
    <p className="text-sm text-slate-500">{t('availability.empty')}</p>
  ) : (
    <div className="space-y-3">
      {DAY_KEYS.map((day, index) => {
        const slots = viewSlotsByDay[day] ?? [];
        if (slots.length === 0) return null;
        return (
          <div
            key={day}
            className="rounded-xl border border-violet-50 bg-violet-50/40 px-3 py-2.5"
          >
            <p className="text-xs font-bold uppercase tracking-wider text-violet-700">
              {dayTabLabels[index] ?? day}
            </p>
            <ul className="mt-2 space-y-1">
              {slots.map((slot, slotIndex) => (
                <li
                  key={`${day}-${slotIndex}`}
                  className="flex items-center gap-2 text-sm font-medium text-slate-800"
                >
                  <Calendar className="size-3.5 shrink-0 text-violet-500" />
                  {tAv('availability.from')} {slot.startTime} – {tAv('availability.to')}{' '}
                  {slot.endTime}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-600">
            {t('eyebrow')}
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            {t('title')}
          </h1>
          <p className="mt-1 text-sm text-slate-600">{t('subtitle')}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-violet-100 bg-[linear-gradient(135deg,#faf5ff,#fdf2f8)] p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar className="size-20 rounded-full border-2 border-white ring-2 ring-violet-100 sm:size-24">
            {profile.avatar ? (
              <AvatarImage
                src={profile.avatar}
                alt={fullName}
                className="object-cover"
              />
            ) : null}
            <AvatarFallback className="rounded-2xl bg-violet-600 text-lg font-bold text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-extrabold text-slate-900">{fullName}</h2>
              <span
                className={cn(
                  'inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                  badgeClass
                )}
              >
                {t(`verification.${profile.verificationStatus as VerificationStatus}`)}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-600">{profile.headline}</p>
            <p className="mt-0.5 text-sm font-medium text-violet-700">
              {tSubject(profile.subject as ESubject)}
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { icon: BookOpen, label: t('stats.lessons'), value: profile.totalLessonsTaught },
            { icon: Users, label: t('stats.students'), value: profile.totalStudents },
            {
              icon: Star,
              label: t('stats.rating'),
              value: Number(profile.ratingAverage).toFixed(1),
            },
            { icon: Award, label: t('stats.reviews'), value: profile.ratingCount },
          ].map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="rounded-xl border border-white/80 bg-white/70 px-3 py-2.5 backdrop-blur"
            >
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <Icon className="size-3.5 text-violet-600" />
                {label}
              </div>
              <p className="mt-1 text-lg font-extrabold text-slate-900">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <ProfileTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      <div className="flex justify-end">{tabEditActions(activeTab)}</div>

      <div className="space-y-5">
        {activeTab === PROFILE_TAB.GENERAL && editingTab === PROFILE_TAB.GENERAL && (
          <SectionCard
            title={tAbout('title')}
            description={tAbout('subtitle')}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  {tAbout('fields.firstNameLabel')}
                </Label>
                <Input
                  className="h-11 rounded-xl border-slate-200 bg-slate-50/60"
                  placeholder={tp('firstName')}
                  {...form.register('firstName')}
                />
                <FieldError message={errors.firstName?.message} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  {tAbout('fields.lastNameLabel')}
                </Label>
                <Input
                  className="h-11 rounded-xl border-slate-200 bg-slate-50/60"
                  placeholder={tp('lastName')}
                  {...form.register('lastName')}
                />
                <FieldError message={errors.lastName?.message} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  {tAbout('fields.countryLabel')}
                </Label>
                <Controller
                  name="country"
                  control={form.control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger className="h-11! w-full rounded-xl border-slate-200 bg-slate-50/60 text-sm">
                        <SelectValue placeholder={tp('country')}>
                          {(value) => (value ? tCountry(value) : tp('country'))}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(ECountry)
                          .slice(1)
                          .map((c) => (
                            <SelectItem
                              key={c}
                              value={c}
                            >
                              {tCountry(c)}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError message={errors.country?.message} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  {tAbout('fields.phoneLabel')}
                </Label>
                <Input
                  className="h-11 rounded-xl border-slate-200 bg-slate-50/60"
                  placeholder={tp('phone')}
                  {...form.register('phone')}
                />
                <FieldError message={errors.phone?.message} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-semibold text-slate-700">
                  {tAbout('fields.subjectLabel')}
                </Label>
                <Controller
                  name="subject"
                  control={form.control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger className="h-11! w-full rounded-xl border-slate-200 bg-slate-50/60 text-sm">
                        <SelectValue placeholder={tp('subject')}>
                          {(value) => (value ? tSubject(value) : tp('subject'))}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(ESubject)
                          .slice(1)
                          .map((s) => (
                            <SelectItem
                              key={s}
                              value={s}
                            >
                              {tSubject(s)}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError message={errors.subject?.message} />
              </div>
            </div>
          </SectionCard>
        )}

        {activeTab === PROFILE_TAB.GENERAL && editingTab === PROFILE_TAB.GENERAL && (
          <SectionCard title={tAbout('fields.languagesLabel')}>
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto] md:items-start"
                >
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      {tAbout('fields.languageLabel')}
                    </Label>
                    <Controller
                      name={`languageEntries.${index}.language`}
                      control={form.control}
                      render={({ field: f }) => (
                        <Select
                          value={f.value}
                          onValueChange={f.onChange}
                        >
                          <SelectTrigger className="h-11! w-full rounded-xl border-slate-200 bg-slate-50/60 text-sm">
                            <SelectValue placeholder={tp('language')}>
                              {(value) => (value ? tLanguage(value) : tp('language'))}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {Object.values(ELanguage)
                              .slice(1)
                              .map((lang) => (
                                <SelectItem
                                  key={lang}
                                  value={lang}
                                >
                                  {tLanguage(lang)}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <FieldError message={errors.languageEntries?.[index]?.language?.message} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      {tAbout('fields.proficiencyLabel')}
                    </Label>
                    <Controller
                      name={`languageEntries.${index}.proficiency`}
                      control={form.control}
                      render={({ field: f }) => (
                        <Select
                          value={f.value}
                          onValueChange={f.onChange}
                        >
                          <SelectTrigger className="h-11! w-full rounded-xl border-slate-200 bg-slate-50/60 text-sm">
                            <SelectValue placeholder={tp('proficiency')}>
                              {(value) => (value ? tProficiency(value) : tp('proficiency'))}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {Object.values(EProficiencyLevel).map((level) => (
                              <SelectItem
                                key={level}
                                value={level}
                              >
                                {tProficiency(level)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <FieldError message={errors.languageEntries?.[index]?.proficiency?.message} />
                  </div>
                  {fields.length > 1 ? (
                    <div className="space-y-1.5">
                      <span
                        className="block text-xs font-semibold opacity-0"
                        aria-hidden="true"
                      >
                        &nbsp;
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => remove(index)}
                        className="h-11 rounded-xl border-rose-200 px-3 text-rose-600 hover:border-rose-300 hover:bg-rose-50"
                        aria-label={tAbout('removeLanguage')}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                      <div className="min-h-5" aria-hidden="true" />
                    </div>
                  ) : null}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => append({ language: '', proficiency: '' })}
              >
                {tAbout('addAnotherLanguage')}
              </Button>
            </div>
          </SectionCard>
        )}

        {activeTab === PROFILE_TAB.TUTOR_INFO && editingTab === PROFILE_TAB.TUTOR_INFO && (
          <>
            <SectionCard
              title={tPhoto('cardTitle')}
              description={tPhoto('cardSubtitle')}
            >
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    {tPhoto('fields.headlineLabel')}
                  </Label>
                  <Input
                    className="h-11 rounded-xl border-slate-200 bg-slate-50/60"
                    placeholder={tPhoto('fields.headlinePlaceholder')}
                    {...form.register('headline')}
                  />
                  <FieldError message={errors.headline?.message} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    {tPhoto('fields.motivateLabel')}
                  </Label>
                  <Textarea
                    className="min-h-24 rounded-xl border-slate-200 bg-slate-50/60"
                    placeholder={tPhoto('fields.motivatePlaceholder')}
                    {...form.register('motivate')}
                  />
                  <FieldError message={errors.motivate?.message} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    {tPhoto('fields.introduceLabel')}
                  </Label>
                  <Textarea
                    className="min-h-32 rounded-xl border-slate-200 bg-slate-50/60"
                    placeholder={tPhoto('fields.introducePlaceholder')}
                    {...form.register('introduce')}
                  />
                  <FieldError message={errors.introduce?.message} />
                </div>
              </div>
            </SectionCard>
            <SectionCard
              title={tVideo('title')}
              description={tVideo('subtitle')}
            >
              <div className="space-y-4">
                <ProfileVideoEmbed
                  url={watchedVideoUrl ?? ''}
                  placeholder={tVideo('previewPlaceholder')}
                />
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    {tVideo('link.label')}
                  </Label>
                  <Input
                    className="h-11 rounded-xl border-slate-200 bg-slate-50/60"
                    placeholder={tVideo('link.placeholder')}
                    {...form.register('videoUrl')}
                  />
                  <FieldError message={errors.videoUrl?.message} />
                </div>
              </div>
            </SectionCard>
          </>
        )}

        {activeTab === PROFILE_TAB.SCHEDULE && editingTab === PROFILE_TAB.SCHEDULE && (
          <>
            <SectionCard
              title={tAv('rateCardTitle')}
              description={tAv('rate.question')}
            >
              <div className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="flex h-12 flex-1 items-center rounded-xl border border-slate-200 bg-slate-50/60 px-4 transition-colors focus-within:border-violet-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-violet-200/60">
                    <span className="mr-2 text-base font-bold text-violet-600">
                      {getCurrencySymbol(selectedCurrency)}
                    </span>
                    <Controller
                      control={form.control}
                      name="hourlyRate"
                      render={({ field: { value, onChange } }) => (
                        <Input
                          className="flex-1 border-0 bg-transparent p-0 text-base font-bold focus-visible:ring-0"
                          placeholder={formatCurrencyAmountInputDisplay(selectedCurrency, '0')}
                          inputMode="decimal"
                          value={formatCurrencyAmountInputDisplay(selectedCurrency, value)}
                          onChange={(e) => {
                            onChange(
                              toCanonicalCurrencyAmountInput(e.target.value, selectedCurrency)
                            );
                          }}
                        />
                      )}
                    />
                  </div>
                  <Controller
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value as ECurrency);
                          form.clearErrors(['hourlyRate', 'currency']);
                          void form.trigger(['currency', 'hourlyRate']);
                        }}
                      >
                        <SelectTrigger className="h-12! min-w-[120px] rounded-xl border-slate-200 bg-slate-50/60 text-sm">
                          <SelectValue placeholder={tAv('rate.currencyLabel')} />
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
                    {tAv('rate.recommended', {
                      min: formatToCurrency(selectedCurrency, MIN_PRICE[selectedCurrency]),
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
            </SectionCard>

            <SectionCard title={tAv('availabilityCardTitle')}>
              <TutorAvailabilitySelection
                utcAvailability={profile.availability ?? []}
                slotsByDay={slotsByDay}
                onSlotsByDayChange={(next) =>
                  setValue('slotsByDay', next, { shouldValidate: true, shouldDirty: true })
                }
                slotsError={
                  typeof errors.slotsByDay?.message === 'string'
                    ? errors.slotsByDay.message
                    : null
                }
                contentRef={availabilityCardRef}
              />
            </SectionCard>
          </>
        )}

        {activeTab === PROFILE_TAB.GENERAL && editingTab !== PROFILE_TAB.GENERAL && (
          <>
            <SectionCard
              title={tAbout('title')}
              description={tAbout('subtitle')}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <ProfileField
                  label={tAbout('fields.firstNameLabel')}
                  value={profile.firstName}
                />
                <ProfileField
                  label={tAbout('fields.lastNameLabel')}
                  value={profile.lastName}
                />
                <ProfileField
                  label={tAbout('fields.phoneLabel')}
                  value={profile.phone}
                />
                <ProfileField
                  label={tAbout('fields.countryLabel')}
                  value={tCountry(profile.country as ECountry)}
                />
                <ProfileField
                  label={tAbout('fields.subjectLabel')}
                  value={tSubject(profile.subject as ESubject)}
                />
              </div>
            </SectionCard>
            <SectionCard title={tAbout('fields.languagesLabel')}>
              {profile.languages.length === 0 ? (
                <p className="text-sm text-slate-500">—</p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {profile.languages.map((lang) => (
                    <li
                      key={`${lang.languageCode}-${lang.proficiency}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-violet-100 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-800"
                    >
                      <Globe className="size-3.5" />
                      {tLanguage(lang.languageCode as ELanguage)} ·{' '}
                      {tProficiency(lang.proficiency as EProficiencyLevel)}
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </>
        )}

        {activeTab === PROFILE_TAB.TUTOR_INFO && editingTab !== PROFILE_TAB.TUTOR_INFO && (
          <>
            <SectionCard
              title={tPhoto('cardTitle')}
              description={tPhoto('cardSubtitle')}
            >
              <div className="space-y-4">
                <ProfileField
                  label={tPhoto('fields.headlineLabel')}
                  value={profile.headline}
                />
                <ProfileField
                  label={tPhoto('fields.motivateLabel')}
                  value={profile.motivate}
                />
                <ProfileField
                  label={tPhoto('fields.introduceLabel')}
                  value={
                    <span className="whitespace-pre-wrap leading-relaxed">{profile.introduce}</span>
                  }
                />
              </div>
            </SectionCard>
            <SectionCard
              title={tVideo('title')}
              description={tVideo('subtitle')}
            >
              {profile.videoUrl ? (
                <ProfileVideoEmbed url={profile.videoUrl} />
              ) : (
                <p className="text-sm text-slate-500">—</p>
              )}
            </SectionCard>
          </>
        )}

        {activeTab === PROFILE_TAB.SCHEDULE && editingTab !== PROFILE_TAB.SCHEDULE && (
          <>
            <SectionCard
              title={tAv('rateCardTitle')}
              description={tAv('rate.question')}
            >
              <ProfileField
                label={tAv('rate.question')}
                value={amount > 0 ? formatToCurrency(currency, amount) : '—'}
              />
            </SectionCard>
            <SectionCard title={tAv('availabilityCardTitle')}>{availabilityView}</SectionCard>
          </>
        )}
      </div>

      <Dialog
        open={discardDialogOpen}
        onOpenChange={(open) => {
          if (!open) cancelDiscardLeave();
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t('unsavedChanges.title')}</DialogTitle>
            <DialogDescription>{t('unsavedChanges.description')}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-full border-slate-200 px-4 text-xs font-semibold text-slate-700 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
              onClick={cancelDiscardLeave}
            >
              {t('unsavedChanges.stay')}
            </Button>
            <Button
              type="button"
              variant="gradient"
              className="h-9 rounded-full px-4 text-xs font-semibold"
              onClick={confirmDiscardLeave}
            >
              {t('unsavedChanges.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
