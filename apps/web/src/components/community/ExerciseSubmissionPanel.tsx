'use client';

import type { CommunityExerciseDto, CommunityExerciseSubmissionDto } from '@mezon-tutors/shared';
import { useAtomValue } from 'jotai';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { LoginButton } from '@/components/auth/LoginButton';
import { Button, Input, Label } from '@/components/ui';
import { cn } from '@/lib/utils';
import {
  useMyCommunitySubmissions,
  useSubmitCommunityExercise,
} from '@/services/community/community.api';
import { isAuthenticatedAtom, isLoadingAtom, userAtom } from '@/store';

type ExerciseSubmissionPanelProps = {
  postId: string;
  exercise: CommunityExerciseDto;
};

type McqOption = { id: string; text: string };

type PassageQuestion = {
  id: string;
  prompt: string;
  options: McqOption[];
};

type FillBlankSegment =
  | { type: 'text'; text: string }
  | { type: 'blank'; id: string };

function getCorrectAnswerIds(exercise: CommunityExerciseDto): Record<string, string[]> {
  const ca = exercise.correctAnswer as Record<string, unknown> | undefined;
  if (!ca) return {};
  if (exercise.exerciseType === 'MULTIPLE_CHOICE') {
    return { _root: (ca.optionIds as string[]) ?? [] };
  }
  if (exercise.exerciseType === 'FILL_IN_BLANK') {
    const blanks = ca.blanks as { id: string; answers: string[] }[] | undefined;
    if (!blanks) return {};
    const map: Record<string, string[]> = {};
    for (const b of blanks) map[b.id] = b.answers.map((a) => a.toLowerCase().trim());
    return map;
  }
  if (exercise.exerciseType === 'READING' || exercise.exerciseType === 'LISTENING') {
    const questions = ca.questions as { id: string; optionIds: string[] }[] | undefined;
    if (!questions) return {};
    const map: Record<string, string[]> = {};
    for (const q of questions) map[q.id] = q.optionIds;
    return map;
  }
  return {};
}

function isAnswerCorrect(submission: CommunityExerciseSubmissionDto, exercise: CommunityExerciseDto): boolean {
  if (submission.isCorrect != null) return submission.isCorrect;
  if (submission.score != null) return submission.score === 100;
  return false;
}

function MultipleChoiceResult({ options, submission, correctAnswerIds, selectedOptionId }: {
  options: McqOption[];
  submission: CommunityExerciseSubmissionDto | undefined;
  correctAnswerIds: string[];
  selectedOptionId?: string | null;
}) {
  const t = useTranslations('Community.detail.exercise');
  const submittedIds = (submission?.answer.optionIds as string[]) ?? [];
  const answeredId = selectedOptionId ?? submittedIds[0];

  return (
    <div className="space-y-2">
      <Label>{t('selectOption')}</Label>
      {options.map((opt) => {
        const isCorrectAnswer = correctAnswerIds.includes(opt.id);
        const isSelected = answeredId === opt.id;
        const isSubmitted = !!submission;

        return (
          <div
            key={opt.id}
            className={cn(
              'flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors',
              isSubmitted && isCorrectAnswer && 'border-emerald-400 bg-emerald-50 text-emerald-900',
              isSubmitted && isSelected && !isCorrectAnswer && 'border-red-400 bg-red-50 text-red-900',
              !isSubmitted && isSelected && 'border-violet-400 bg-violet-50 text-violet-900',
              !isSubmitted && !isSelected && 'border-slate-200 bg-white',
            )}
          >
            <span className="flex-1">{opt.text}</span>
            {isSubmitted && isCorrectAnswer ? (
              <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
            ) : isSubmitted && isSelected ? (
              <XCircle className="size-5 shrink-0 text-red-600" />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function FillInBlankResult({ segments, submission, correctAnswers }: {
  segments: FillBlankSegment[];
  submission: CommunityExerciseSubmissionDto | undefined;
  correctAnswers: Record<string, string[]>;
}) {
  const blanksPayload = (submission?.answer.blanks as { id: string; value: string }[]) ?? [];

  const getBlankValue = (id: string) => {
    const found = blanksPayload.find((b) => b.id === id);
    return found?.value ?? '';
  };

  if (!submission) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm leading-8 text-slate-800">
        {segments.map((segment, index) =>
          segment.type === 'text' ? (
            <span key={`text-${index}`}>{segment.text}</span>
          ) : (
            <span
              key={segment.id}
              className="mx-1 inline-block min-w-16 border-b-2 border-dashed border-slate-300 px-1 text-slate-400"
            >
              ___
            </span>
          ),
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm leading-8 text-slate-800">
      {segments.map((segment, index) =>
        segment.type === 'text' ? (
          <span key={`text-${index}`}>{segment.text}</span>
        ) : (
          <span key={segment.id} className="mx-1 inline-flex items-center gap-1.5">
            <span
              className={cn(
                'inline-block min-w-16 rounded px-1',
                correctAnswers[segment.id]?.includes(getBlankValue(segment.id).toLowerCase().trim())
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-red-100 text-red-800',
              )}
            >
              {getBlankValue(segment.id) || '___'}
            </span>
            {!correctAnswers[segment.id]?.includes(getBlankValue(segment.id).toLowerCase().trim()) ? (
              <span className="inline-block rounded bg-emerald-100 px-1 text-emerald-800">
                {correctAnswers[segment.id]?.join(', ')}
              </span>
            ) : null}
          </span>
        ),
      )}
    </div>
  );
}

export function ExerciseSubmissionPanel({ postId, exercise }: ExerciseSubmissionPanelProps) {
  const t = useTranslations('Community.detail.exercise');
  const isAuthLoading = useAtomValue(isLoadingAtom);
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const user = useAtomValue(userAtom);
  const isLoggedIn = isAuthenticated || Boolean(user);

  const submit = useSubmitCommunityExercise(postId);
  const { data: submissions = [] } = useMyCommunitySubmissions(postId, isLoggedIn);

  const latestSubmission = submissions.length > 0 ? submissions[submissions.length - 1] : undefined;
  const displaySubmission = submit.data ?? latestSubmission;
  const hasSubmitted = !!displaySubmission;
  const isCorrect = displaySubmission ? isAnswerCorrect(displaySubmission, exercise) : false;

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [blankValues, setBlankValues] = useState<Record<string, string>>({});
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});

  const options = useMemo(() => {
    const payload = exercise.payload as { options?: McqOption[] };
    return payload.options ?? [];
  }, [exercise.payload]);

  const segments = useMemo(() => {
    const payload = exercise.payload as { segments?: FillBlankSegment[] };
    return payload.segments ?? [];
  }, [exercise.payload]);

  const passage = useMemo(() => {
    const payload = exercise.payload as { passage?: string };
    return payload.passage ?? '';
  }, [exercise.payload]);

  const audioUrl = useMemo(() => {
    const payload = exercise.payload as { audioUrl?: string };
    return payload.audioUrl ?? null;
  }, [exercise.payload]);

  const passageQuestions = useMemo(() => {
    const payload = exercise.payload as { questions?: PassageQuestion[] };
    return payload.questions ?? [];
  }, [exercise.payload]);

  const correctAnswerIds = useMemo(() => getCorrectAnswerIds(exercise), [exercise]);

  const handleSubmit = () => {
    if (!isLoggedIn || hasSubmitted) return;

    let answer: Record<string, unknown>;
    if (exercise.exerciseType === 'MULTIPLE_CHOICE') {
      if (!selectedOption) return;
      answer = { optionIds: [selectedOption] };
    } else if (exercise.exerciseType === 'FILL_IN_BLANK') {
      const blankIds = segments.filter((s) => s.type === 'blank').map((s) => s.id);
      if (blankIds.some((id) => !blankValues[id]?.trim())) return;
      answer = {
        blanks: blankIds.map((id) => ({ id, value: blankValues[id]?.trim() ?? '' })),
      };
    } else if (exercise.exerciseType === 'READING' || exercise.exerciseType === 'LISTENING') {
      if (passageQuestions.some((q) => !questionAnswers[q.id])) return;
      answer = {
        questions: passageQuestions.map((q) => ({
          id: q.id,
          optionIds: [questionAnswers[q.id]],
        })),
      };
    } else {
      return;
    }

    submit.mutate(
      { answer },
      {
        onSuccess: () => {
          toast.success(t('submitted'));
        },
        onError: (error) => {
          if ((error as { status?: number })?.status === 409) {
            toast.error(t('alreadySubmitted'));
          } else {
            toast.error(t('submitFailed'));
          }
        },
      },
    );
  };

  const isSubmitted = hasSubmitted || submit.isSuccess;

  return (
    <section
      className={cn(
        'mt-8 rounded-2xl border p-6',
        isSubmitted
          ? isCorrect
            ? 'border-emerald-200 bg-emerald-50/40'
            : 'border-red-200 bg-red-50/40'
          : 'border-amber-200 bg-amber-50/40',
      )}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-slate-900">
            {exercise.exerciseType === 'MULTIPLE_CHOICE' ? 'Multiple Choice' :
             exercise.exerciseType === 'FILL_IN_BLANK' ? 'Fill in the Blank' :
             exercise.exerciseType === 'READING' ? 'Reading' : 'Listening'}
          </h2>
          {isSubmitted ? (
            isCorrect ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-0.5 text-sm font-medium text-emerald-700">
                <CheckCircle2 className="size-4" />
                {t('correct')}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-0.5 text-sm font-medium text-red-700">
                <XCircle className="size-4" />
                {t('incorrect')}
              </span>
            )
          ) : null}
        </div>
        <span className="text-sm text-slate-500">
          {t('submissions', { count: exercise.submissionCount })}
        </span>
      </div>

      {isSubmitted && exercise.explanation ? (
        <div className="mt-4 rounded-xl bg-white/80 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            {t('explanation')}
          </p>
          <p className="mt-1 text-sm text-slate-700">{exercise.explanation}</p>
        </div>
      ) : null}

      {isAuthLoading ? null : !isLoggedIn ? (
        <div className="mt-6 rounded-xl border border-dashed border-amber-200 bg-white px-4 py-6 text-center">
          <LoginButton label={t('submit')} />
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {exercise.exerciseType === 'MULTIPLE_CHOICE' ? (
            isSubmitted ? (
              <MultipleChoiceResult
                options={options}
                submission={displaySubmission}
                correctAnswerIds={correctAnswerIds._root ?? []}
              />
            ) : (
              <div className="space-y-2">
                <Label>{t('selectOption')}</Label>
                {options.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedOption(opt.id)}
                    className={cn(
                      'flex w-full rounded-xl border px-4 py-3 text-left text-sm transition-colors',
                      selectedOption === opt.id
                        ? 'border-violet-400 bg-violet-50 text-violet-900'
                        : 'border-slate-200 bg-white hover:border-violet-200',
                    )}
                  >
                    {opt.text}
                  </button>
                ))}
              </div>
            )
          ) : null}

          {exercise.exerciseType === 'FILL_IN_BLANK' ? (
            isSubmitted ? (
              <div className="space-y-3">
                <Label>{t('fillBlank')}</Label>
                <FillInBlankResult
                  segments={segments}
                  submission={displaySubmission}
                  correctAnswers={correctAnswerIds}
                />
              </div>
            ) : (
              <div className="space-y-3">
                <Label>{t('fillBlank')}</Label>
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm leading-8 text-slate-800">
                  {segments.map((segment, index) =>
                    segment.type === 'text' ? (
                      <span key={`text-${index}`}>{segment.text}</span>
                    ) : (
                      <Input
                        key={segment.id}
                        value={blankValues[segment.id] ?? ''}
                        onChange={(e) =>
                          setBlankValues((prev) => ({ ...prev, [segment.id]: e.target.value }))
                        }
                        className="mx-1 inline-block h-8 w-28 align-middle text-sm"
                        placeholder="..."
                      />
                    ),
                  )}
                </div>
              </div>
            )
          ) : null}

          {exercise.exerciseType === 'READING' ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <Label className="mb-2 block">{t('readingPrompt')}</Label>
                <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{passage}</p>
              </div>
              {passageQuestions.map((question, index) => {
                const questionAnswer = (displaySubmission?.answer?.questions as { id: string; optionIds: string[] }[] | undefined)
                  ?.find((q) => q.id === question.id);
                return (
                isSubmitted ? (
                  <MultipleChoiceResult
                    key={question.id}
                    options={question.options}
                    submission={displaySubmission}
                    correctAnswerIds={correctAnswerIds[question.id] ?? []}
                    selectedOptionId={questionAnswer?.optionIds?.[0]}
                  />
                ) : (
                  <div key={question.id} className="space-y-2">
                    <Label>
                      {index + 1}. {question.prompt}
                    </Label>
                    {question.options.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          setQuestionAnswers((prev) => ({ ...prev, [question.id]: opt.id }))
                        }
                        className={cn(
                          'flex w-full rounded-xl border px-4 py-3 text-left text-sm transition-colors',
                          questionAnswers[question.id] === opt.id
                            ? 'border-violet-400 bg-violet-50 text-violet-900'
                            : 'border-slate-200 bg-white hover:border-violet-200',
                        )}
                      >
                        {opt.text}
                      </button>
                    ))}
                  </div>
                )
              );
              })}
            </div>
          ) : null}

          {exercise.exerciseType === 'LISTENING' ? (
            <div className="space-y-4">
              {audioUrl ? (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <Label className="mb-2 block">{t('listeningPrompt')}</Label>
                  <audio controls src={audioUrl} className="w-full" />
                </div>
              ) : null}
              {passageQuestions.map((question, index) => {
                const questionAnswer = (displaySubmission?.answer?.questions as { id: string; optionIds: string[] }[] | undefined)
                  ?.find((q) => q.id === question.id);
                return (
                isSubmitted ? (
                  <MultipleChoiceResult
                    key={question.id}
                    options={question.options}
                    submission={displaySubmission}
                    correctAnswerIds={correctAnswerIds[question.id] ?? []}
                    selectedOptionId={questionAnswer?.optionIds?.[0]}
                  />
                ) : (
                  <div key={question.id} className="space-y-2">
                    <Label>
                      {index + 1}. {question.prompt}
                    </Label>
                    {question.options.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          setQuestionAnswers((prev) => ({ ...prev, [question.id]: opt.id }))
                        }
                        className={cn(
                          'flex w-full rounded-xl border px-4 py-3 text-left text-sm transition-colors',
                          questionAnswers[question.id] === opt.id
                            ? 'border-violet-400 bg-violet-50 text-violet-900'
                            : 'border-slate-200 bg-white hover:border-violet-200',
                        )}
                      >
                        {opt.text}
                      </button>
                    ))}
                  </div>
                )
              );
              })}
            </div>
          ) : null}

          {!isSubmitted ? (
            <Button
              type="button"
              variant="gradient"
              className="rounded-full"
              disabled={submit.isPending}
              onClick={handleSubmit}
            >
              {submit.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  {t('submitting')}
                </>
              ) : (
                t('submit')
              )}
            </Button>
          ) : null}
        </div>
      )}
    </section>
  );
}
