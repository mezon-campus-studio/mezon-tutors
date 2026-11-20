'use client';

import type { LearningNeedsAnswersV1, LearningNeedsContextDto } from '@mezon-tutors/shared';
import {
  LEARNING_CURRENT_LEVELS,
  LEARNING_FOCUS_AREAS,
  LEARNING_GOALS,
  LEARNING_INTERESTS,
  LEARNING_LANGUAGES,
  LEARNING_TIME_WINDOWS,
  LEARNING_USAGE_SITUATIONS,
  LEARNING_WEEKDAYS,
  getLearningNeedsSubjectCategory,
  isLanguageLearningSubject,
} from '@mezon-tutors/shared';
import {
  AlertCircle,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  GraduationCap,
  Loader2,
  LockKeyhole,
  Minus,
  Pencil,
  Pin,
  Plane,
  Plus,
  Sparkles,
  Video,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAtomValue } from 'jotai';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  toast,
} from '@/components/ui';
import { ensureMezonDmChannel } from '@/lib/ensure-mezon-dm-channel';
import {
  MezonSendMessageError,
  isMezonSendMessageError,
} from '@/lib/mezon-send-message-errors';
import { redirectToMezonOAuthSync } from '@/lib/mezon-oauth-redirect';
import { cn } from '@/lib/utils';
import { useMezonLight } from '@/providers';
import { useCreateDmChannelMutation, useGetDmChannel } from '@/services/dm-channel/dm-channel.api';
import {
  learningNeedsApi,
  useLearningNeedsForBooking,
  useSaveLearningNeedsDraft,
  useShareLearningNeeds,
} from '@/services/learning-needs/learning-needs.api';
import {
  type TrialLessonBookingDetail,
  useGetTrialLessonBookingDetail,
} from '@/services/trial-lesson-booking/trial-lesson-booking.api';
import { userAtom } from '@/store/auth.atom';

type View = 'edit' | 'summary';
type ValidationField = 'learningGoal' | 'lessonsPerMonth' | 'otherLanguages' | 'timezone';
type FieldErrors = Partial<Record<ValidationField, string>>;
type Props = {
  bookingId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialView?: View;
  presentation?: 'dialog' | 'page';
  onEdit?: () => void;
};

function emptyAnswers(): LearningNeedsAnswersV1 {
  let timezone = 'UTC';
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    /* use UTC */
  }
  return {
    schemaVersion: 1,
    learningGoal: null,
    usageSituations: [],
    focusAreas: [],
    currentLevel: null,
    workContext: null,
    industryKnowledgeRequired: null,
    industryContext: null,
    lessonsPerMonth: null,
    preferredWeekdays: [],
    preferredTimeWindows: [],
    timezone,
    nativeLanguage: null,
    otherLanguages: [],
    interests: [],
  };
}

function displayDate(value: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(value)
    );
  } catch {
    return value;
  }
}

export function LearningNeedsDialog({
  bookingId,
  open,
  onOpenChange,
  initialView,
  presentation = 'dialog',
  onEdit,
}: Props) {
  const t = useTranslations('LearningNeeds');
  const locale = useLocale();
  const currentUser = useAtomValue(userAtom);
  const { lightClient, setLightClient, ensureLightClient } = useMezonLight();
  const { data: trialBooking } = useGetTrialLessonBookingDetail(
    bookingId,
    open && presentation === 'page'
  );
  const {
    data,
    isPending,
    isError,
    refetch: refetchLearningNeeds,
  } = useLearningNeedsForBooking(bookingId, open);
  const { refetch: refetchDmChannel } = useGetDmChannel(
    currentUser?.id ?? '',
    data?.chatPeer.userId ?? '',
    false
  );
  const createDmChannel = useCreateDmChannelMutation();
  const saveDraft = useSaveLearningNeedsDraft();
  const share = useShareLearningNeeds();
  const [answers, setAnswers] = useState<LearningNeedsAnswersV1>(emptyAnswers);
  const [step, setStep] = useState(1);
  const contentScrollRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>('edit');
  const [loadedKey, setLoadedKey] = useState('');
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [chatSyncError, setChatSyncError] = useState('');
  const [chatNeedsMezonReconnect, setChatNeedsMezonReconnect] = useState(false);
  const [isRetryingSync, setIsRetryingSync] = useState(false);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const fieldIds = useMemo(() => {
    const prefix = `learning-needs-${encodeURIComponent(bookingId)}`;
    return {
      learningGoal: `${prefix}-learning-goal`,
      lessonsPerMonth: `${prefix}-lessons-per-month`,
      otherLanguages: `${prefix}-other-languages`,
      timezone: `${prefix}-timezone`,
    } satisfies Record<ValidationField, string>;
  }, [bookingId]);

  useEffect(() => {
    if (!open) {
      setLoadedKey('');
      setDiscardDialogOpen(false);
    }
  }, [open]);

  useEffect(() => {
    if (!data) return;
    const nextLoadedKey = `${bookingId}:${data.draft?.revision ?? 0}:${data.shared?.revision ?? 0}`;
    if (loadedKey === nextLoadedKey) return;
    const isFirstLoadForBooking = !loadedKey.startsWith(`${bookingId}:`);

    setAnswers(data.draft?.answers ?? data.shared?.answers ?? data.prefill ?? emptyAnswers());
    if (isFirstLoadForBooking) {
      setView(initialView ?? (data.shared ? 'summary' : 'edit'));
      setStep(1);
      setFormError('');
      setFieldErrors({});
      setChatSyncError('');
    }
    setLoadedKey(nextLoadedKey);
  }, [bookingId, data, initialView, loadedKey]);

  const busy =
    saveDraft.isPending || share.isPending || createDmChannel.isPending || isRetryingSync;
  const tutorName = data?.context.tutor.displayName ?? '';
  const persistedAnswers = data?.draft?.answers ?? data?.shared?.answers ?? data?.prefill;
  const hasUnsavedChanges = Boolean(
    data &&
      view === 'edit' &&
      JSON.stringify(answers) !== JSON.stringify(persistedAnswers ?? emptyAnswers())
  );

  const requestClose = () => {
    if (busy) return;
    if (hasUnsavedChanges) {
      setDiscardDialogOpen(true);
      return;
    }
    onOpenChange(false);
  };

  const setField = <K extends keyof LearningNeedsAnswersV1>(
    key: K,
    value: LearningNeedsAnswersV1[K]
  ) => {
    setAnswers((current) => ({ ...current, [key]: value }));
    setFormError('');
    if (
      key === 'learningGoal' ||
      key === 'lessonsPerMonth' ||
      key === 'otherLanguages' ||
      key === 'timezone'
    ) {
      setFieldErrors((current) => ({ ...current, [key]: undefined }));
    }
  };

  const focusInvalidField = (field: ValidationField, targetStep: 1 | 2) => {
    setView('edit');
    setStep(targetStep);
    window.setTimeout(() => {
      const element = document.getElementById(fieldIds[field]);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element?.focus({ preventScroll: true });
    }, 0);
  };

  const toggle = <
    K extends
      | 'usageSituations'
      | 'focusAreas'
      | 'preferredWeekdays'
      | 'preferredTimeWindows'
      | 'interests',
  >(
    key: K,
    value: LearningNeedsAnswersV1[K][number]
  ) => {
    const values = answers[key] as readonly string[];
    setField(
      key,
      (values.includes(value)
        ? values.filter((item) => item !== value)
        : [...values, value]) as LearningNeedsAnswersV1[K]
    );
  };

  const validateStepOne = () => {
    if (!answers.learningGoal) {
      setFieldErrors((current) => ({ ...current, learningGoal: t('validation.goalRequired') }));
      focusInvalidField('learningGoal', 1);
      return false;
    }
    return true;
  };

  const validateStepTwo = () => {
    const errors: FieldErrors = {};
    if (
      answers.lessonsPerMonth != null &&
      (!Number.isInteger(answers.lessonsPerMonth) ||
        answers.lessonsPerMonth <= 0 ||
        answers.lessonsPerMonth > 100)
    ) {
      errors.lessonsPerMonth = t('validation.lessonsRange');
    }
    if (answers.otherLanguages.length > 10) {
      errors.otherLanguages = t('validation.languagesMax', { max: 10 });
    }
    if (answers.timezone) {
      try {
        new Intl.DateTimeFormat(locale, { timeZone: answers.timezone }).format();
      } catch {
        errors.timezone = t('validation.timezoneInvalid');
      }
    }
    setFieldErrors((current) => ({
      ...current,
      lessonsPerMonth: errors.lessonsPerMonth,
      otherLanguages: errors.otherLanguages,
      timezone: errors.timezone,
    }));
    const firstInvalidField = (['lessonsPerMonth', 'otherLanguages', 'timezone'] as const).find(
      (field) => errors[field]
    );
    if (firstInvalidField) {
      focusInvalidField(firstInvalidField, 2);
      return false;
    }
    return true;
  };

  const handleContinue = () => {
    if (step === 1 && !validateStepOne()) {
      return;
    }
    if (step === 2 && !validateStepTwo()) {
      return;
    }
    setFormError('');
    setStep((value) => value + 1);
    requestAnimationFrame(() => {
      if (presentation === 'page') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      contentScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };

  const handleSaveDraft = async () => {
    if (!validateStepTwo()) {
      return;
    }
    try {
      setFormError('');
      await saveDraft.mutateAsync({
        bookingId,
        answers,
        expectedDraftRevision: data?.draft?.revision,
      });
      toast.success(t('toasts.draftSaved'));
    } catch (error) {
      console.error('[LearningNeedsDialog] draft save failed', error);
      setFormError(t('errors.save'));
    }
  };

  const handleShare = async () => {
    if (!validateStepOne()) {
      return;
    }
    if (!validateStepTwo()) {
      return;
    }
    try {
      setFormError('');
      const saved = await saveDraft.mutateAsync({
        bookingId,
        answers,
        expectedDraftRevision: data?.draft?.revision,
      });
      const shared = await share.mutateAsync({
        bookingId,
        expectedDraftRevision: saved.draft?.revision ?? 0,
      });
      setView('summary');
      if (!shared.channelId) {
        try {
          await ensureChatAssociation(shared.context.id, shared.chatPeer);
          await refetchLearningNeeds();
        } catch (error) {
          console.warn('[LearningNeedsDialog] chat association deferred');
          setChatNeedsMezonReconnect(
            isMezonSendMessageError(error) && error.code === 'MEZON_AUTH_EXPIRED'
          );
          setChatSyncError(t('errors.chatSync'));
          try {
            await learningNeedsApi.recordSyncFailure(shared.context.id, 'MEZON_SYNC_FAILED');
            await refetchLearningNeeds();
          } catch (recordError) {
            console.error('[LearningNeedsDialog] failed to persist sync error', recordError);
          }
        }
      }
    } catch (error) {
      console.error('[LearningNeedsDialog] save and share failed', error);
      setFormError(t('errors.save'));
    }
  };

  const ensureChatAssociation = async (
    recordId: string,
    chatPeer: { userId: string; mezonUserId: string }
  ) => {
    if (!currentUser?.id || !currentUser.mezonUserId) {
      throw new Error('Missing current user chat identity');
    }
    const readyClient = lightClient ?? (await ensureLightClient());
    if (!readyClient) {
      throw new MezonSendMessageError('RESTORE_SESSION_FAILED');
    }
    const existingChannelId = (await refetchDmChannel()).data?.channelId;
    const channelId = await ensureMezonDmChannel({
      lightClient: readyClient,
      setLightClient,
      senderId: currentUser.id,
      senderMezonUserId: currentUser.mezonUserId,
      recipientId: chatPeer.userId,
      recipientMezonUserId: chatPeer.mezonUserId,
      existingChannelId,
      createDmChannelMutation: createDmChannel,
    });
    await learningNeedsApi.associateChannel(recordId, channelId);
    setChatSyncError('');
    setChatNeedsMezonReconnect(false);
  };

  const retryChatAssociation = async () => {
    if (!data) return;
    try {
      setIsRetryingSync(true);
      setChatSyncError('');
      await ensureChatAssociation(data.context.id, data.chatPeer);
      await refetchLearningNeeds();
    } catch (error) {
      console.warn('[LearningNeedsDialog] chat association retry deferred');
      setChatNeedsMezonReconnect(
        isMezonSendMessageError(error) && error.code === 'MEZON_AUTH_EXPIRED'
      );
      setChatSyncError(t('errors.chatSync'));
      try {
        await learningNeedsApi.recordSyncFailure(data.context.id, 'MEZON_SYNC_FAILED');
        await refetchLearningNeeds();
      } catch (recordError) {
        console.error('[LearningNeedsDialog] failed to persist retry error', recordError);
      }
    } finally {
      setIsRetryingSync(false);
    }
  };

  const syncMessage =
    data?.sync.status === 'PENDING'
      ? t('errors.chatSyncPending')
      : data?.sync.status === 'FAILED'
        ? t('errors.chatSyncFailed')
        : chatSyncError || t('errors.chatSync');
  const stepTitle = t(`page.step${step}.title`);
  const stepDescription = t(`page.step${step}.description`);

  const content = (
    <>
      <header className="flex shrink-0 items-start justify-between gap-4 px-5 pt-6 sm:px-8 sm:pt-8">
        <div>
          <h2 className="text-lg font-bold text-[#332b7b] sm:text-xl">
            {view === 'summary' ? t('titleFallback') : stepTitle}
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
            {view === 'summary' ? data?.context.subject : stepDescription}
          </p>
        </div>
        {view === 'edit' ? (
          <span className="shrink-0 pt-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">
            {t('page.stepCount', { step })}
          </span>
        ) : null}
      </header>

      <div
        ref={contentScrollRef}
        className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-8 sm:py-6"
      >
        {isPending ? (
          <StateMessage
            icon={<Loader2 className="size-6 animate-spin" />}
            text={t('loading')}
          />
        ) : null}
        {isError ? (
          <StateMessage
            icon={<AlertCircle className="size-6 text-rose-500" />}
            text={t('errors.load')}
            action={
              <Button
                variant="outline"
                onClick={() => void refetchLearningNeeds()}
              >
                {t('actions.retry')}
              </Button>
            }
          />
        ) : null}
        {data && view === 'summary' && data.shared ? (
          <Summary
            answers={data.shared.answers}
            subject={data.context.subject}
            tutor={data.context.tutor}
            updatedAt={data.shared.updatedAt}
            locale={locale}
            t={t}
          />
        ) : null}
        {data && view === 'edit' ? (
          <>
            {step === 1 ? (
              <GoalsStep
                answers={answers}
                setField={setField}
                toggle={toggle}
                subject={data.context.subject}
                fieldErrors={fieldErrors}
                fieldIds={fieldIds}
                t={t}
              />
            ) : null}
            {step === 2 ? (
              <PreferencesStep
                answers={answers}
                setField={setField}
                toggle={toggle}
                subject={data.context.subject}
                fieldErrors={fieldErrors}
                fieldIds={fieldIds}
                t={t}
              />
            ) : null}
            {step === 3 ? (
              <Summary
                answers={answers}
                subject={data.context.subject}
                tutor={data.context.tutor}
                locale={locale}
                t={t}
                review
                onEdit={() => {
                  setStep(1);
                  requestAnimationFrame(() => {
                    if (presentation === 'page') {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                      return;
                    }
                    contentScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                  });
                }}
              />
            ) : null}
          </>
        ) : null}
        {formError ? (
          <div
            role="alert"
            className="mt-5 flex gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            {formError}
          </div>
        ) : null}
        {data?.shared && !data.channelId ? (
          <div
            role={data.sync.status === 'FAILED' ? 'alert' : 'status'}
            aria-live="polite"
            className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
          >
            <AlertCircle className="size-4 shrink-0" />
            <span className="min-w-0 flex-1">{syncMessage}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isRetryingSync}
              onClick={() => {
                if (chatNeedsMezonReconnect) {
                  redirectToMezonOAuthSync();
                  return;
                }
                void retryChatAssociation();
              }}
            >
              {isRetryingSync ? <Loader2 className="size-4 animate-spin" /> : null}
              {t(chatNeedsMezonReconnect ? 'actions.reconnectMezon' : 'actions.retryChatSync')}
            </Button>
          </div>
        ) : null}
      </div>

      {data ? (
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:px-8">
          {view === 'summary' ? (
            <Button
              variant="ghost"
              disabled={busy}
              onClick={requestClose}
            >
              {presentation === 'page' && !data.shared ? t('entry.skip') : t('actions.close')}
            </Button>
          ) : null}
          {view === 'summary' ? (
            data.canEdit ? (
              <Button
                onClick={() => {
                  if (onEdit) {
                    onEdit();
                    return;
                  }
                  setAnswers(
                    data.draft?.answers ?? data.shared?.answers ?? data.prefill ?? emptyAnswers()
                  );
                  setView('edit');
                  setStep(1);
                }}
              >
                <Pencil className="size-4" />
                {t('actions.edit')}
              </Button>
            ) : null
          ) : (
            <div className="flex w-full flex-wrap items-center justify-between gap-2">
              <Button
                variant="outline"
                className="h-11 border-[#ddd4ea] bg-white px-4 text-[#332b7b] hover:bg-[#f7f3ff]"
                disabled={busy}
                onClick={() => void handleSaveDraft()}
              >
                {saveDraft.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                {t('actions.saveDraft')}
              </Button>
              <div className="flex items-center gap-2">
                {step > 1 ? (
                  <Button
                    variant="ghost"
                    className="h-11 px-4 text-[#332b7b] hover:bg-[#f7f3ff]"
                    disabled={busy}
                    onClick={() => {
                      setFormError('');
                      setStep((value) => value - 1);
                    }}
                  >
                    <ChevronLeft className="size-4" />
                    {t('actions.back')}
                  </Button>
                ) : null}
                {step < 3 ? (
                  <Button
                    className="h-11 bg-[#8332ff] px-5 text-white hover:bg-[#7024e8]"
                    onClick={handleContinue}
                  >
                    {t('actions.continue')}
                  </Button>
                ) : (
                  <Button
                    className="h-11 bg-[#8332ff] px-5 text-white hover:bg-[#7024e8]"
                    disabled={busy}
                    onClick={() => void handleShare()}
                  >
                    {busy ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Check className="size-4" />
                    )}
                    {presentation === 'page'
                      ? t('actions.saveAndShare')
                      : t('actions.share', { tutor: tutorName })}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </>
  );

  return (
    <>
      {presentation === 'page' ? (
        <main className="min-h-[calc(100dvh-4rem)] bg-[#faf9fe] px-4 py-5 sm:px-6 sm:py-8">
          <div className="mx-auto w-full max-w-[1160px]">
            <div className="mb-6 flex items-center gap-2 text-xs text-slate-500">
              <span>{t('page.breadcrumbBooking')}</span>
              <ChevronRight className="size-3.5" />
              <strong className="font-medium text-[#332b7b]">{t('page.breadcrumbNeeds')}</strong>
            </div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="size-4" />
              {t('page.bookingSuccess')}
            </div>
            <div className="mb-6 flex items-start justify-between gap-5">
              <div>
                <h1 className="max-w-3xl text-2xl font-bold tracking-tight text-[#332b7b] sm:text-3xl">
                  {t('page.heroTitle', { tutor: tutorName })}
                </h1>
                <p className="mt-2 text-sm leading-6 text-slate-500 sm:text-base">
                  {t('page.heroDescription')}
                </p>
              </div>
              <button
                type="button"
                onClick={requestClose}
                className="hidden shrink-0 text-xs text-slate-500 underline underline-offset-4 hover:text-[#332b7b] sm:block"
              >
                {t('entry.skip')}
              </button>
            </div>

            <ProgressSteps
              step={step}
              t={t}
            />

            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_282px]">
              <section className="flex min-h-[620px] min-w-0 flex-col overflow-hidden rounded-2xl border border-[#e8e2ef] bg-white shadow-[0_3px_10px_rgba(51,43,123,0.03)]">
                {content}
              </section>
              <BookingSidebar
                booking={trialBooking}
                tutor={data?.context.tutor}
                subject={data?.context.subject}
                locale={locale}
                t={t}
              />
            </div>
            <p className="mt-4 flex items-start gap-2 text-[11px] leading-5 text-slate-500">
              <LockKeyhole className="mt-0.5 size-3.5 shrink-0" />
              {t('page.privacy')}
            </p>
          </div>
        </main>
      ) : (
        <Dialog
          open={open}
          onOpenChange={(next) => {
            if (next) onOpenChange(true);
            else requestClose();
          }}
        >
          <DialogContent
            overlayClassName="bg-[#21182e]/40 backdrop-blur-[1px]"
            className="!top-0 !right-0 !bottom-0 !left-auto flex h-[100dvh] max-h-none w-screen max-w-none !translate-x-0 !translate-y-0 flex-col gap-0 overflow-hidden rounded-none p-0 sm:!top-6 sm:!right-6 sm:!bottom-auto sm:h-[852px] sm:max-h-[calc(100dvh-3rem)] sm:w-[484px] sm:rounded-2xl"
          >
            <DialogTitle className="sr-only">
              {data ? t('title', { subject: data.context.subject }) : t('titleFallback')}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {data ? t('sharedWith', { tutor: tutorName }) : t('description')}
            </DialogDescription>
            {content}
          </DialogContent>
        </Dialog>
      )}

      <Dialog
        open={discardDialogOpen}
        onOpenChange={(next) => setDiscardDialogOpen(next)}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t('unsaved.title')}</DialogTitle>
            <DialogDescription>{t('unsaved.description')}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => setDiscardDialogOpen(false)}
            >
              {t('actions.keepEditing')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="min-h-11"
              onClick={() => {
                setDiscardDialogOpen(false);
                onOpenChange(false);
              }}
            >
              {t('actions.discard')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

type Translator = ReturnType<typeof useTranslations>;

function ProgressSteps({ step, t }: { step: number; t: Translator }) {
  return (
    <div
      className="mb-7 flex max-w-[760px] items-start"
      role="progressbar"
      aria-label={t('progressLabel')}
      aria-valuemin={1}
      aria-valuemax={3}
      aria-valuenow={step}
      tabIndex={0}
    >
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className={cn('flex min-w-0 items-center', item < 3 && 'flex-1')}
        >
          <div
            className={cn(
              'flex min-w-0 items-start gap-2 text-[10px] text-slate-400 sm:items-center sm:text-xs',
              item === step && 'font-semibold text-[#332b7b]',
              item < step && 'text-[#8332ff]'
            )}
          >
            <span
              className={cn(
                'flex size-6 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 font-bold sm:size-7',
                item === step && 'border-[#8332ff] bg-[#8332ff] text-white',
                item < step && 'border-violet-200 bg-violet-100 text-[#8332ff]'
              )}
            >
              {item < step ? <Check className="size-3.5" /> : item}
            </span>
            <span className="max-w-24 leading-4 sm:max-w-none">{t(`page.step${item}.label`)}</span>
          </div>
          {item < 3 ? (
            <span className="mx-2 mt-3 h-px min-w-2 flex-1 bg-[#dfd8eb] sm:mx-4" />
          ) : null}
        </div>
      ))}
    </div>
  );
}

function BookingSidebar({
  booking,
  tutor,
  subject,
  locale,
  t,
}: {
  booking?: TrialLessonBookingDetail;
  tutor?: LearningNeedsContextDto['tutor'];
  subject?: string;
  locale: string;
  t: Translator;
}) {
  const start = booking ? new Date(booking.startAt) : null;
  const end =
    start && booking ? new Date(start.getTime() + booking.durationMinutes * 60_000) : null;
  const timezone = booking?.tutor.timezone || 'UTC';
  const date = start
    ? new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeZone: timezone }).format(start)
    : t('page.bookingDateFallback');
  const time =
    start && end
      ? `${new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', timeZone: timezone }).format(start)} – ${new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', timeZone: timezone }).format(end)}`
      : t('page.bookingTimeFallback');

  return (
    <aside className="sticky top-6 hidden flex-col gap-4 lg:flex">
      <div className="rounded-2xl border border-[#e8e2ef] bg-white p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
          {t('page.trialCardTitle')}
        </p>
        <div className="my-4 flex items-center gap-3">
          <Avatar className="size-12">
            {tutor?.avatarUrl ? (
              <AvatarImage
                src={tutor.avatarUrl}
                alt=""
              />
            ) : null}
            <AvatarFallback className="bg-violet-100 font-semibold text-[#332b7b]">
              {tutor?.displayName
                .split(/\s+/)
                .filter(Boolean)
                .slice(-2)
                .map((part) => part[0]?.toUpperCase())
                .join('') || '?'}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-[#332b7b]">{tutor?.displayName}</p>
            <p className="mt-1 truncate text-[11px] text-slate-500">{subject}</p>
          </div>
        </div>
        <div className="space-y-3 border-t border-slate-100 pt-4 text-[11px] text-slate-600">
          <p className="flex gap-2">
            <CalendarDays className="size-4 shrink-0" />
            {date}
          </p>
          <p className="flex gap-2">
            <Clock3 className="size-4 shrink-0" />
            {time} · {timezone}
          </p>
          <p className="flex gap-2">
            <Video className="size-4 shrink-0" />
            {t('page.onlineLesson')}
          </p>
        </div>
      </div>
      <div className="rounded-2xl border border-violet-200 bg-[#f3edff] p-5 text-[#332b7b]">
        <span className="inline-flex rounded-lg bg-[#e7d8ff] p-2 text-[#8332ff]">
          <Sparkles className="size-5" />
        </span>
        <h3 className="mt-4 text-sm font-bold leading-5">{t('page.helpTitle')}</h3>
        <p className="mt-2 text-xs leading-5 text-[#75688c]">{t('page.helpDescription')}</p>
        <p className="mt-4 flex items-center gap-2 border-t border-violet-200 pt-4 text-[11px] leading-5 text-[#66557d]">
          <Pin className="size-4 shrink-0 text-[#8332ff]" />
          {t('page.pinExplainer', { tutor: tutor?.displayName ?? '' })}
        </p>
      </div>
      <p className="px-1 text-[10px] leading-4 text-slate-400">{t('page.sidebarNote')}</p>
    </aside>
  );
}

function subjectOptionNamespace(subject: string) {
  const category = getLearningNeedsSubjectCategory(subject);
  if (category === 'language') return 'options';
  if (category === 'stem') return 'optionsStem';
  if (category === 'creative') return 'optionsCreative';
  return 'optionsGeneral';
}

function languageLabel(t: Translator, language: string): string {
  return LEARNING_LANGUAGES.includes(language as (typeof LEARNING_LANGUAGES)[number])
    ? t(`options.languages.${language}`)
    : language;
}

type FormProps = {
  answers: LearningNeedsAnswersV1;
  setField: <K extends keyof LearningNeedsAnswersV1>(
    key: K,
    value: LearningNeedsAnswersV1[K]
  ) => void;
  toggle: <
    K extends
      | 'usageSituations'
      | 'focusAreas'
      | 'preferredWeekdays'
      | 'preferredTimeWindows'
      | 'interests',
  >(
    key: K,
    value: LearningNeedsAnswersV1[K][number]
  ) => void;
  t: Translator;
  subject: string;
  fieldErrors: FieldErrors;
  fieldIds: Record<ValidationField, string>;
};

function GoalsStep({ answers, setField, toggle, t, subject, fieldErrors, fieldIds }: FormProps) {
  const subjectOptions = subjectOptionNamespace(subject);
  return (
    <div className="space-y-7">
      <GoalCardField
        id={fieldIds.learningGoal}
        title={t('fields.goal')}
        error={fieldErrors.learningGoal}
        selected={answers.learningGoal ? [answers.learningGoal] : []}
        label={(v) => t(`${subjectOptions}.goals.${v}`)}
        onToggle={(v) => setField('learningGoal', answers.learningGoal === v ? null : v)}
      />
      <ChipField
        title={t(isLanguageLearningSubject(subject) ? 'fields.usageLanguage' : 'fields.usage')}
        values={LEARNING_USAGE_SITUATIONS}
        selected={answers.usageSituations}
        label={(v) => t(`${subjectOptions}.usage.${v}`)}
        onToggle={(v) => toggle('usageSituations', v)}
      />
      <ChipField
        title={t(isLanguageLearningSubject(subject) ? 'fields.focusLanguage' : 'fields.focus')}
        values={LEARNING_FOCUS_AREAS}
        selected={answers.focusAreas}
        label={(v) => t(`${subjectOptions}.focus.${v}`)}
        onToggle={(v) => toggle('focusAreas', v)}
      />
      <LevelCardField
        title={t('fields.level')}
        hint={t('fields.selfAssessed')}
        selected={answers.currentLevel ? [answers.currentLevel] : []}
        label={(v) => t(`${subjectOptions}.levels.${v}`)}
        description={(v) => t(`page.levelDescriptions.${v}`)}
        onToggle={(v) => setField('currentLevel', answers.currentLevel === v ? null : v)}
      />
      <Field label={t('fields.workContext')}>
        <Textarea
          maxLength={2000}
          value={answers.workContext ?? ''}
          onChange={(e) => setField('workContext', e.target.value || null)}
          placeholder={t('placeholders.workContext')}
        />
      </Field>
      <div className="rounded-xl border border-[#e4dee9] bg-white px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">{t('fields.industryRequired')}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">{t('page.industryHint')}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={Boolean(answers.industryKnowledgeRequired)}
            aria-label={t('fields.industryRequired')}
            onClick={() =>
              setField('industryKnowledgeRequired', !answers.industryKnowledgeRequired)
            }
            className={cn(
              'relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2',
              answers.industryKnowledgeRequired ? 'bg-[#8332ff]' : 'bg-slate-200'
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-sm transition-transform',
                answers.industryKnowledgeRequired && 'translate-x-5'
              )}
            />
          </button>
        </div>
      </div>
      {answers.industryKnowledgeRequired ? (
        <Field label={t('fields.industryContext')}>
          <Input
            maxLength={1000}
            value={answers.industryContext ?? ''}
            onChange={(e) => setField('industryContext', e.target.value || null)}
          />
        </Field>
      ) : null}
    </div>
  );
}

const GOAL_ICONS = {
  CAREER_BUSINESS: BriefcaseBusiness,
  EXAMS_CERTIFICATIONS: GraduationCap,
  TRAVEL: Plane,
  PERSONAL_DEVELOPMENT: BookOpen,
} as const;

function GoalCardField({
  id,
  title,
  error,
  selected,
  label,
  onToggle,
}: {
  id: string;
  title: string;
  error?: string;
  selected: readonly string[];
  label: (value: (typeof LEARNING_GOALS)[number]) => string;
  onToggle: (value: (typeof LEARNING_GOALS)[number]) => void;
}) {
  return (
    <fieldset
      id={id}
      tabIndex={-1}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? `${id}-error` : undefined}
      className="space-y-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
    >
      <legend className="text-sm font-semibold text-slate-900">
        {title}
        <span className="ml-1 text-[#8332ff]">*</span>
      </legend>
      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        {LEARNING_GOALS.map((value) => {
          const active = selected.includes(value);
          const Icon = GOAL_ICONS[value];
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(value)}
              className={cn(
                'relative flex min-h-24 flex-col items-start gap-3 rounded-xl border border-[#e4dee9] bg-white p-3 text-left text-xs font-medium leading-5 text-slate-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 sm:p-4',
                active && 'border-[#8332ff] bg-[#faf7ff] text-[#332b7b] shadow-[0_0_0_1px_#8332ff]'
              )}
            >
              <Icon className={cn('size-5 text-slate-400', active && 'text-[#8332ff]')} />
              <span>{label(value)}</span>
              {active ? (
                <span className="absolute top-2 right-2 flex size-4 items-center justify-center rounded-full bg-[#8332ff] text-white">
                  <Check className="size-2.5" />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {error ? (
        <p
          id={`${id}-error`}
          className="text-xs text-rose-600"
        >
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

function LevelCardField({
  title,
  hint,
  selected,
  label,
  description,
  onToggle,
}: {
  title: string;
  hint: string;
  selected: readonly string[];
  label: (value: (typeof LEARNING_CURRENT_LEVELS)[number]) => string;
  description: (value: (typeof LEARNING_CURRENT_LEVELS)[number]) => string;
  onToggle: (value: (typeof LEARNING_CURRENT_LEVELS)[number]) => void;
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold text-slate-900">{title}</legend>
      <p className="text-right text-[11px] text-slate-400">{hint}</p>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {LEARNING_CURRENT_LEVELS.map((value) => {
          const active = selected.includes(value);
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(value)}
              className={cn(
                'flex min-h-16 flex-col items-center justify-center rounded-lg border border-[#e4dee9] bg-white px-2 py-2 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400',
                active && 'border-violet-400 bg-[#faf7ff] text-[#332b7b]'
              )}
            >
              <strong className="text-[11px] font-semibold sm:text-xs">{label(value)}</strong>
              <span className="mt-1 text-[10px] text-slate-400">{description(value)}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function PreferencesStep({
  answers,
  setField,
  toggle,
  t,
  subject,
  fieldErrors,
  fieldIds,
}: FormProps) {
  const isLanguageSubject = isLanguageLearningSubject(subject);
  const languageOptions: readonly string[] =
    answers.nativeLanguage &&
    !LEARNING_LANGUAGES.includes(answers.nativeLanguage as (typeof LEARNING_LANGUAGES)[number])
      ? [answers.nativeLanguage, ...LEARNING_LANGUAGES]
      : LEARNING_LANGUAGES;
  return (
    <div className="space-y-7">
      <Field
        label={t('fields.lessonsPerMonth')}
        error={fieldErrors.lessonsPerMonth}
        errorId={`${fieldIds.lessonsPerMonth}-error`}
      >
        <div className="flex items-center justify-between rounded-xl border border-[#e4dee9] px-4 py-3">
          <div>
            <p className="text-xs font-semibold text-slate-800">{t('page.lessonsUnit')}</p>
            <p className="mt-1 text-[10px] text-slate-400">{t('fields.preferenceOnly')}</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              aria-label={t('page.decreaseLessons')}
              onClick={() =>
                setField('lessonsPerMonth', Math.max(1, (answers.lessonsPerMonth ?? 1) - 1))
              }
              className="flex size-8 items-center justify-center rounded-lg border border-[#e4dee9] text-slate-500 hover:bg-slate-50"
            >
              <Minus className="size-4" />
            </button>
            <Input
              id={fieldIds.lessonsPerMonth}
              type="number"
              min={1}
              max={100}
              aria-invalid={Boolean(fieldErrors.lessonsPerMonth)}
              aria-describedby={
                fieldErrors.lessonsPerMonth ? `${fieldIds.lessonsPerMonth}-error` : undefined
              }
              value={answers.lessonsPerMonth ?? ''}
              onChange={(e) =>
                setField('lessonsPerMonth', e.target.value ? Number(e.target.value) : null)
              }
              className="h-9 w-12 border-0 bg-transparent px-1 text-center text-xl font-semibold text-[#332b7b] shadow-none focus-visible:ring-0"
            />
            <button
              type="button"
              aria-label={t('page.increaseLessons')}
              onClick={() =>
                setField('lessonsPerMonth', Math.min(100, (answers.lessonsPerMonth ?? 0) + 1))
              }
              className="flex size-8 items-center justify-center rounded-lg border border-[#e4dee9] text-slate-500 hover:bg-slate-50"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </div>
      </Field>
      <ChipField
        title={t('fields.weekdays')}
        values={LEARNING_WEEKDAYS}
        selected={answers.preferredWeekdays}
        label={(v) => t(`options.weekdays.${v}`)}
        onToggle={(v) => toggle('preferredWeekdays', v)}
        gridClassName="grid grid-cols-4 gap-2 sm:grid-cols-7 sm:gap-1.5 [&>button]:min-h-10 [&>button]:px-2 sm:[&>button]:px-1"
      />
      <ChipField
        title={t('fields.times')}
        hint={answers.timezone ?? 'UTC'}
        values={LEARNING_TIME_WINDOWS}
        selected={answers.preferredTimeWindows}
        label={(v) => t(`options.times.${v}`)}
        onToggle={(v) => toggle('preferredTimeWindows', v)}
        gridClassName="grid grid-cols-2 gap-2 sm:grid-cols-4 [&>button]:min-h-14 [&>button]:px-2"
      />
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold text-slate-900">{t('fields.timezone')}</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-violet-600 hover:text-violet-700"
            onClick={() => {
              try {
                const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
                setField('timezone', tz);
              } catch {
                setField('timezone', 'UTC');
              }
            }}
          >
            {t('fields.useCurrentTimezone')}
          </Button>
        </div>
        <Input
          id={fieldIds.timezone}
          value={answers.timezone ?? ''}
          onChange={(e) => setField('timezone', e.target.value || null)}
          placeholder="Asia/Ho_Chi_Minh"
          aria-invalid={Boolean(fieldErrors.timezone)}
          aria-describedby={fieldErrors.timezone ? `${fieldIds.timezone}-error` : undefined}
        />
        {fieldErrors.timezone ? (
          <p
            id={`${fieldIds.timezone}-error`}
            className="text-xs text-rose-600"
          >
            {fieldErrors.timezone}
          </p>
        ) : null}
      </div>
      <Field label={t(isLanguageSubject ? 'fields.nativeLanguage' : 'fields.instructionLanguage')}>
        <div className="flex gap-2">
          <Select
            value={answers.nativeLanguage}
            onValueChange={(value) => setField('nativeLanguage', value || null)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('fields.selectLanguage')} />
            </SelectTrigger>
            <SelectContent align="start">
              {languageOptions.map((language) => (
                <SelectItem
                  key={language}
                  value={language}
                >
                  {languageLabel(t, language)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {answers.nativeLanguage ? (
            <Button
              type="button"
              variant="outline"
              className="shrink-0"
              onClick={() => setField('nativeLanguage', null)}
            >
              {t('actions.clear')}
            </Button>
          ) : null}
        </div>
      </Field>
      <OtherLanguagesField
        id={fieldIds.otherLanguages}
        languages={answers.otherLanguages}
        onChange={(languages) => setField('otherLanguages', languages)}
        externalError={fieldErrors.otherLanguages}
        t={t}
      />
      <ChipField
        title={t('fields.interests')}
        values={LEARNING_INTERESTS}
        selected={answers.interests}
        label={(v) => t(`options.interests.${v}`)}
        onToggle={(v) => toggle('interests', v)}
      />
    </div>
  );
}

function OtherLanguagesField({
  id,
  languages,
  onChange,
  externalError,
  t,
}: {
  id: string;
  languages: string[];
  onChange: (languages: string[]) => void;
  externalError?: string;
  t: Translator;
}) {
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState('');

  const addLanguage = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const items = trimmed
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    const updated = Array.from(new Set([...languages, ...items]));
    if (updated.length > 10) {
      setInputError(t('validation.languagesMax', { max: 10 }));
      return;
    }
    onChange(updated);
    setInputValue('');
    setInputError('');
  };

  const removeLanguage = (toRemove: string) => {
    onChange(languages.filter((l) => l !== toRemove));
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold text-slate-900">{t('fields.otherLanguages')}</Label>
      <p className="text-xs text-slate-500">{t('fields.commaSeparated')}</p>
      <div className="flex gap-2">
        <Input
          id={id}
          maxLength={64}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addLanguage(inputValue);
            }
          }}
          placeholder={t('fields.languagePlaceholder')}
          aria-invalid={Boolean(inputError || externalError)}
          aria-describedby={inputError || externalError ? `${id}-error` : undefined}
        />
        <Button
          type="button"
          variant="outline"
          className="shrink-0"
          onClick={() => addLanguage(inputValue)}
        >
          {t('fields.addLanguage')}
        </Button>
      </div>
      {languages.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {languages.map((lang) => (
            <span
              key={lang}
              className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-800"
            >
              {lang}
              <button
                type="button"
                onClick={() => removeLanguage(lang)}
                className="ml-1 text-violet-500 hover:text-violet-800"
                aria-label={t('fields.removeLanguage', { language: lang })}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}
      {inputError || externalError ? (
        <p
          id={`${id}-error`}
          className="text-xs text-rose-600"
        >
          {inputError || externalError}
        </p>
      ) : null}
    </div>
  );
}

function Field({
  label,
  hint,
  error,
  errorId,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  errorId?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold text-slate-900">{label}</Label>
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
      {children}
      {error ? (
        <p
          id={errorId}
          className="text-xs text-rose-600"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

function ChipField<T extends string>({
  id,
  title,
  hint,
  required,
  error,
  values,
  selected,
  label,
  onToggle,
  gridClassName,
}: {
  id?: string;
  title: string;
  hint?: string;
  required?: boolean;
  error?: string;
  values: readonly T[];
  selected: readonly T[];
  label: (value: T) => string;
  onToggle: (value: T) => void;
  gridClassName?: string;
}) {
  return (
    <fieldset
      id={id}
      tabIndex={id ? -1 : undefined}
      aria-invalid={Boolean(error)}
      aria-describedby={error && id ? `${id}-error` : undefined}
      className="space-y-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
    >
      <legend className="text-sm font-semibold text-slate-900">
        {title}
        {required ? <span className="ml-1 text-rose-500">*</span> : null}
      </legend>
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
      <div className={cn('flex flex-wrap gap-2', gridClassName)}>
        {values.map((value) => {
          const active = selected.includes(value);
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(value)}
              className={cn(
                'inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400',
                active
                  ? 'border-violet-400 bg-[#faf7ff] font-semibold text-[#332b7b]'
                  : 'border-[#e4dee9] bg-white text-slate-600 hover:bg-violet-50'
              )}
            >
              {active ? <Check className="size-3 shrink-0 text-[#8332ff]" /> : null}
              <span>{label(value)}</span>
            </button>
          );
        })}
      </div>
      {error ? (
        <p
          id={id ? `${id}-error` : undefined}
          className="text-xs text-rose-600"
        >
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

function Summary({
  answers,
  subject,
  tutor,
  updatedAt,
  locale,
  review,
  onEdit,
  t,
}: {
  answers: LearningNeedsAnswersV1;
  subject: string;
  tutor: LearningNeedsContextDto['tutor'];
  updatedAt?: string;
  locale: string;
  review?: boolean;
  onEdit?: () => void;
  t: Translator;
}) {
  const subjectOptions = subjectOptionNamespace(subject);
  const rows = useMemo(() => {
    const subjectOptionList = (group: string, values: readonly string[]) =>
      values.map((v) => t(`${subjectOptions}.${group}.${v}`));
    const optionList = (group: string, values: readonly string[]) =>
      values.map((v) => t(`options.${group}.${v}`)).join(', ');
    return [
      {
        key: 'goal',
        label: t('fields.goal'),
        value: answers.learningGoal ? t(`${subjectOptions}.goals.${answers.learningGoal}`) : '',
      },
      {
        key: 'usage',
        label: t(isLanguageLearningSubject(subject) ? 'fields.usageLanguage' : 'fields.usage'),
        chips: subjectOptionList('usage', answers.usageSituations),
      },
      {
        key: 'focus',
        label: t(isLanguageLearningSubject(subject) ? 'fields.focusLanguage' : 'fields.focus'),
        chips: subjectOptionList('focus', answers.focusAreas),
      },
      {
        key: 'level',
        label: t('fields.level'),
        value: answers.currentLevel ? t(`${subjectOptions}.levels.${answers.currentLevel}`) : '',
      },
      { key: 'workContext', label: t('fields.workContext'), value: answers.workContext ?? '' },
      {
        key: 'industryRequired',
        label: t('fields.industryRequired'),
        value:
          answers.industryKnowledgeRequired == null
            ? ''
            : t(`options.yesNo.${answers.industryKnowledgeRequired ? 'YES' : 'NO'}`),
      },
      {
        key: 'industryContext',
        label: t('fields.industryContext'),
        value: answers.industryContext ?? '',
      },
      {
        key: 'lessonsPerMonth',
        label: t('fields.lessonsPerMonth'),
        value: answers.lessonsPerMonth?.toString() ?? '',
      },
      {
        key: 'weekdays',
        label: t('fields.weekdays'),
        value: optionList('weekdays', answers.preferredWeekdays),
      },
      {
        key: 'times',
        label: t('fields.times'),
        value: optionList('times', answers.preferredTimeWindows),
      },
      { key: 'timezone', label: t('fields.timezone'), value: answers.timezone ?? '' },
      {
        key: 'nativeLanguage',
        label: t(
          isLanguageLearningSubject(subject)
            ? 'fields.nativeLanguage'
            : 'fields.instructionLanguage'
        ),
        value: answers.nativeLanguage ? languageLabel(t, answers.nativeLanguage) : '',
      },
      {
        key: 'otherLanguages',
        label: t('fields.otherLanguages'),
        value: answers.otherLanguages.join(', '),
      },
      {
        key: 'interests',
        label: t('fields.interests'),
        chips: answers.interests.map((value) => t(`options.interests.${value}`)),
      },
    ].filter((row) => row.value || row.chips?.length);
  }, [answers, subject, subjectOptions, t]);
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-violet-200 bg-[#f7f3ff] p-4">
        {!review ? (
          <p className="text-xs font-bold uppercase tracking-wide text-violet-600">
            {t('summary.title')}
          </p>
        ) : null}
        <div className={cn('flex items-center gap-3', !review && 'mt-3')}>
          <Avatar className="size-10 shrink-0">
            {tutor.avatarUrl ? (
              <AvatarImage
                src={tutor.avatarUrl}
                alt=""
              />
            ) : null}
            <AvatarFallback className="bg-violet-100 font-semibold text-violet-700">
              {tutor.displayName
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0]?.toUpperCase())
                .join('') || '?'}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">
              {review ? t('review.shareWith', { tutor: tutor.displayName }) : tutor.displayName}
            </p>
            <p className="truncate text-xs text-slate-500">
              {review
                ? t('review.onlyTutorReceives')
                : t('summary.sharedWith', { tutor: tutor.displayName })}
            </p>
          </div>
        </div>
        {!review ? (
          <>
            <p className="mt-3 font-semibold text-slate-900">{subject}</p>
            {updatedAt ? (
              <p className="mt-1 text-xs text-slate-500">
                {t('summary.updated', { date: displayDate(updatedAt, locale) })}
              </p>
            ) : null}
          </>
        ) : null}
      </div>
      {review ? (
        <div className="flex items-center justify-between gap-4 pt-1">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
            {t('review.learningNeedsTitle')}
          </h3>
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6f39c5] hover:text-[#8332ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
          >
            <Pencil className="size-3.5" />
            {t('actions.edit')}
          </button>
        </div>
      ) : null}
      {rows.length ? (
        <dl className="divide-y divide-slate-100 border-y border-slate-100">
          {rows.map((row) => (
            <div
              key={row.key}
              className="py-4"
            >
              <dt className="text-[11px] font-medium text-slate-400">{row.label}</dt>
              <dd className="mt-2 text-sm leading-6 text-slate-800">
                {row.chips ? (
                  <span className="flex flex-wrap gap-2">
                    {row.chips.map((chip) => (
                      <span
                        key={chip}
                        className="inline-flex min-h-7 items-center rounded-md bg-[#f5f2f8] px-2.5 py-1 text-xs font-medium text-[#4b4163]"
                      >
                        {chip}
                      </span>
                    ))}
                  </span>
                ) : (
                  <span className="whitespace-pre-wrap">{row.value}</span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-sm text-slate-500">{t('summary.empty')}</p>
      )}
      {review ? (
        <div className="flex gap-2 rounded-xl bg-amber-50 px-4 py-3 text-[11px] leading-5 text-amber-800">
          <Pin className="mt-0.5 size-4 shrink-0" />
          {t('page.reviewPinNotice')}
        </div>
      ) : null}
    </div>
  );
}

function StateMessage({
  icon,
  text,
  action,
}: { icon: React.ReactNode; text: string; action?: React.ReactNode }) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center gap-3 text-center text-slate-600">
      {icon}
      <p>{text}</p>
      {action}
    </div>
  );
}
