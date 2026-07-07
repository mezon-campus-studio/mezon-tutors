'use client';

import { CLOUDINARY_FOLDER, type CommunityExerciseType } from '@mezon-tutors/shared';
import { Check, Loader2, Plus, Scissors, Trash2, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useRef, useState } from 'react';
import { Button, Input, Label, Textarea } from '@/components/ui';
import { cn } from '@/lib/utils';
import { cloudinaryService } from '@/services';

type McqOptionDraft = { id: string; text: string };

type FillBlankSegment =
  | { type: 'text'; text: string }
  | { type: 'blank'; id: string; answers: string[] };

type FillBlankDef = {
  id: string;
  start: number;
  end: number;
  answers: string[];
};

type PassageQuestionDraft = {
  id: string;
  prompt: string;
  options: McqOptionDraft[];
  correctOptionId: string | null;
};

export type ExerciseDraftData = {
  multipleChoice: {
    options: McqOptionDraft[];
    correctOptionId: string | null;
  };
  fillInBlank: {
    text: string;
    blanks: FillBlankDef[];
  };
  reading: {
    passage: string;
    questions: PassageQuestionDraft[];
  };
  listening: {
    audioUrl: string | null;
    questions: PassageQuestionDraft[];
  };
};

export type ExerciseBuildResult = {
  payload: Record<string, unknown>;
  correctAnswer: Record<string, unknown>;
} | null;

type CommunityExerciseBuilderProps = {
  exerciseType: CommunityExerciseType;
  draft: ExerciseDraftData;
  onChange: (draft: ExerciseDraftData) => void;
  disabled?: boolean;
  showErrors?: boolean;
};

function uid() {
  return crypto.randomUUID();
}

function createOption(text = ''): McqOptionDraft {
  return { id: uid(), text };
}

function createQuestion(): PassageQuestionDraft {
  const first = createOption('');
  return {
    id: uid(),
    prompt: '',
    options: [first, createOption('')],
    correctOptionId: first.id,
  };
}

export function createEmptyExerciseDraft(): ExerciseDraftData {
  const firstOption = createOption('');
  return {
    multipleChoice: {
      options: [firstOption, createOption('')],
      correctOptionId: firstOption.id,
    },
    fillInBlank: {
      text: '',
      blanks: [],
    },
    reading: {
      passage: '',
      questions: [createQuestion()],
    },
    listening: {
      audioUrl: null,
      questions: [createQuestion()],
    },
  };
}

function areMcqOptionsValid(options: McqOptionDraft[], correctOptionId: string | null) {
  const filled = options.filter((o) => o.text.trim());
  if (filled.length < 2 || !correctOptionId || !filled.some((o) => o.id === correctOptionId)) return false;
  const texts = filled.map((o) => o.text.trim().toLowerCase());
  return new Set(texts).size === texts.length;
}

function areQuestionsValid(questions: PassageQuestionDraft[]) {
  if (questions.length === 0) return false;
  return questions.every(
    (q) =>
      q.prompt.trim() && areMcqOptionsValid(q.options, q.correctOptionId),
  );
}

export function isExerciseDraftValid(
  exerciseType: CommunityExerciseType,
  draft: ExerciseDraftData,
) {
  if (exerciseType === 'MULTIPLE_CHOICE') {
    return areMcqOptionsValid(draft.multipleChoice.options, draft.multipleChoice.correctOptionId);
  }

  if (exerciseType === 'FILL_IN_BLANK') {
    const { text, blanks } = draft.fillInBlank;
    if (blanks.length === 0) return false;
    if (blanks.some((b) => b.answers.every((a) => !a.trim()))) return false;
    if (!text.trim()) return false;
    return true;
  }

  if (exerciseType === 'READING') {
    if (!draft.reading.passage.trim()) return false;
    return areQuestionsValid(draft.reading.questions);
  }

  if (exerciseType === 'LISTENING') {
    if (!draft.listening.audioUrl) return false;
    return areQuestionsValid(draft.listening.questions);
  }

  return false;
}

export function buildExercisePayload(
  exerciseType: CommunityExerciseType,
  draft: ExerciseDraftData,
): ExerciseBuildResult {
  if (exerciseType === 'MULTIPLE_CHOICE') {
    const { options, correctOptionId } = draft.multipleChoice;
    const filled = options.filter((o) => o.text.trim());
    if (filled.length < 2 || !correctOptionId || !filled.some((o) => o.id === correctOptionId)) {
      return null;
    }
    return {
      payload: { options: filled.map(({ id, text }) => ({ id, text: text.trim() })) },
      correctAnswer: { optionIds: [correctOptionId] },
    };
  }

  if (exerciseType === 'FILL_IN_BLANK') {
    const { text, blanks } = draft.fillInBlank;
    if (blanks.length === 0) return null;
    if (blanks.some((b) => b.answers.every((a) => !a.trim()))) return null;
    if (!text.trim()) return null;

    const sorted = [...blanks].sort((a, b) => a.start - b.start);
    const segments: FillBlankSegment[] = [];
    let cursor = 0;
    for (const blank of sorted) {
      if (blank.start > cursor) {
        segments.push({ type: 'text', text: text.slice(cursor, blank.start) });
      }
      segments.push({ type: 'blank', id: blank.id, answers: [] });
      cursor = blank.end;
    }
    if (cursor < text.length) {
      segments.push({ type: 'text', text: text.slice(cursor) });
    }

    return {
      payload: { segments },
      correctAnswer: {
        blanks: blanks.map((b) => ({
          id: b.id,
          answers: b.answers.map((a) => a.trim()).filter(Boolean),
        })),
      },
    };
  }

  if (exerciseType === 'READING') {
    const { passage, questions } = draft.reading;
    if (!passage.trim()) return null;
    const built = buildPassageQuestions(questions);
    if (!built) return null;
    return {
      payload: { passage: passage.trim(), questions: built.payloadQuestions },
      correctAnswer: { questions: built.correctQuestions },
    };
  }

  if (exerciseType === 'LISTENING') {
    const { audioUrl, questions } = draft.listening;
    if (!audioUrl) return null;
    const built = buildPassageQuestions(questions);
    if (!built) return null;
    return {
      payload: { audioUrl, questions: built.payloadQuestions },
      correctAnswer: { questions: built.correctQuestions },
    };
  }

  return null;
}

function buildPassageQuestions(questions: PassageQuestionDraft[]) {
  const payloadQuestions: {
    id: string;
    prompt: string;
    options: { id: string; text: string }[];
  }[] = [];
  const correctQuestions: { id: string; optionIds: string[] }[] = [];

  for (const question of questions) {
    const filled = question.options.filter((o) => o.text.trim());
    if (!question.prompt.trim() || filled.length < 2) return null;
    if (!question.correctOptionId || !filled.some((o) => o.id === question.correctOptionId)) {
      return null;
    }
    payloadQuestions.push({
      id: question.id,
      prompt: question.prompt.trim(),
      options: filled.map(({ id, text }) => ({ id, text: text.trim() })),
    });
    correctQuestions.push({ id: question.id, optionIds: [question.correctOptionId] });
  }

  if (payloadQuestions.length === 0) return null;
  return { payloadQuestions, correctQuestions };
}

function McqOptionsEditor({
  options,
  correctOptionId,
  onChange,
  disabled,
  showErrors,
}: {
  options: McqOptionDraft[];
  correctOptionId: string | null;
  onChange: (options: McqOptionDraft[], correctOptionId: string | null) => void;
  disabled?: boolean;
  showErrors?: boolean;
}) {
  const t = useTranslations('Community.create.exercise');

  const errors = useMemo(() => {
    const filled = options.filter((o) => o.text.trim());
    const emptyIds = options.filter((o) => !o.text.trim()).map((o) => o.id);

    const textToIds = new Map<string, string[]>();
    for (const opt of options) {
      const key = opt.text.trim().toLowerCase();
      if (!key) continue;
      const ids = textToIds.get(key) ?? [];
      ids.push(opt.id);
      textToIds.set(key, ids);
    }
    const duplicateIds = new Set<string>();
    for (const ids of textToIds.values()) {
      if (ids.length > 1) ids.forEach((id) => duplicateIds.add(id));
    }

    return {
      emptyIds,
      duplicateIds,
      noCorrectAnswer: !correctOptionId || !filled.some((o) => o.id === correctOptionId),
      insufficientOptions: filled.length < 2,
    };
  }, [options, correctOptionId]);

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-neutral-500">{t('options')}</Label>
      {options.map((option, index) => {
        const isEmpty = errors.emptyIds.includes(option.id);
        const isDuplicate = errors.duplicateIds.has(option.id);
        return (
          <div key={option.id}>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(options, option.id)}
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-full border transition-colors',
                  correctOptionId === option.id
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : 'border-neutral-300 text-neutral-400 hover:border-emerald-400',
                )}
                aria-label={t('correctOption')}
              >
                {correctOptionId === option.id ? <Check className="size-3.5" /> : null}
              </button>
              <Input
                value={option.text}
                onChange={(e) => {
                  const next = options.map((o) =>
                    o.id === option.id ? { ...o, text: e.target.value } : o,
                  );
                  onChange(next, correctOptionId);
                }}
                placeholder={`${t('options')} ${index + 1}`}
                disabled={disabled}
                className={cn(
                  'flex-1',
                  showErrors && (isEmpty || isDuplicate) && 'border-red-300 focus-visible:ring-red-400',
                )}
              />
              {options.length > 2 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={disabled}
                  onClick={() => {
                    const next = options.filter((o) => o.id !== option.id);
                    const nextCorrect =
                      correctOptionId === option.id ? (next[0]?.id ?? null) : correctOptionId;
                    onChange(next, nextCorrect);
                  }}
                >
                  <Trash2 className="size-4 text-neutral-400" />
                </Button>
              ) : (
                <span className="size-8 shrink-0" />
              )}
            </div>
            {showErrors && isEmpty && (
              <p className="mt-1 pl-9 text-xs text-red-500">{t('optionRequired')}</p>
            )}
            {showErrors && isDuplicate && (
              <p className="mt-1 pl-9 text-xs text-red-500">{t('optionDuplicate')}</p>
            )}
          </div>
        );
      })}
      {showErrors && errors.noCorrectAnswer && (
        <p className="text-xs text-red-500">{t('correctAnswerRequired')}</p>
      )}
      {showErrors && errors.insufficientOptions && (
        <p className="text-xs text-red-500">{t('minimumOptions')}</p>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => onChange([...options, createOption('')], correctOptionId)}
        className="rounded-full"
      >
        <Plus className="mr-1 size-3.5" />
        {t('addOption')}
      </Button>
    </div>
  );
}

function FillInBlankEditor({
  text,
  blanks,
  onChange,
  disabled,
  showErrors,
}: {
  text: string;
  blanks: FillBlankDef[];
  onChange: (text: string, blanks: FillBlankDef[]) => void;
  disabled?: boolean;
  showErrors?: boolean;
}) {
  const t = useTranslations('Community.create.exercise');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selectionError, setSelectionError] = useState(false);

  const sortedBlanks = useMemo(
    () => [...blanks].sort((a, b) => a.start - b.start),
    [blanks],
  );

  const errors = useMemo(() => ({
    noBlanks: blanks.length === 0,
    emptyBlankIds: blanks.filter((b) => b.answers.every((a) => !a.trim())).map((b) => b.id),
    noTextContent: !text.trim(),
  }), [blanks, text]);

  const handleMakeBlank = () => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    if (start >= end) {
      setSelectionError(true);
      return;
    }
    const selected = text.slice(start, end).trim();
    if (!selected) {
      setSelectionError(true);
      return;
    }
    setSelectionError(false);

    const overlap = blanks.some((b) => start < b.end && end > b.start);
    if (overlap) return;

    const next = [
      ...blanks,
      { id: uid(), start, end, answers: [selected] },
    ];
    onChange(text, next);
  };

  const removeBlank = (blankId: string) => {
    onChange(text, blanks.filter((b) => b.id !== blankId));
  };

  const updateBlankAnswer = (blankId: string, answers: string[]) => {
    onChange(
      text,
      blanks.map((b) => (b.id === blankId ? { ...b, answers } : b)),
    );
  };

  const renderPreview = () => {
    if (blanks.length === 0) {
      return <span>{text}</span>;
    }

    const parts: React.ReactNode[] = [];
    let cursor = 0;
    for (const blank of sortedBlanks) {
      if (blank.start > cursor) {
        parts.push(<span key={`text-${cursor}`}>{text.slice(cursor, blank.start)}</span>);
      }
      const blankIndex = blanks.findIndex((b) => b.id === blank.id);
      parts.push(
        <span
          key={blank.id}
          className="mx-0.5 inline-block min-w-16 border-b-2 border-violet-400 px-1 text-violet-600"
        >
          {blank.answers[0] || '___'}
        </span>,
      );
      if (blankIndex !== -1) {
        cursor = blank.end;
      }
    }
    if (cursor < text.length) {
      parts.push(<span key={`text-end`}>{text.slice(cursor)}</span>);
    }
    return parts;
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-medium text-neutral-500">{t('passageText')}</Label>
        <Textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => onChange(e.target.value, blanks)}
          rows={4}
          disabled={disabled}
          placeholder={t('passageTextPlaceholder')}
          className={cn('mt-1.5', showErrors && errors.noTextContent && 'border-red-300 focus-visible:ring-red-400')}
        />
        <p className="mt-1 text-xs text-neutral-400">{t('selectTextHint')}</p>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={handleMakeBlank}
        className="rounded-full"
      >
        <Scissors className="mr-1 size-3.5" />
        {t('makeBlank')}
      </Button>
      {selectionError ? (
        <p className="text-xs text-red-500">{t('selectTextError')}</p>
      ) : null}

      {blanks.length > 0 ? (
        <>
          <div className="space-y-2 rounded-xl border border-neutral-200 bg-neutral-50/60 p-3">
            <Label className="text-xs font-medium text-neutral-500">{t('blanks')}</Label>
            {sortedBlanks.map((blank, index) => {
              const isEmpty = errors.emptyBlankIds.includes(blank.id);
              return (
                <div key={blank.id}>
                  <div className="flex items-start gap-2">
                    <span className="mt-2 text-xs font-medium text-violet-600">#{index + 1}</span>
                    <Input
                      value={blank.answers.join(', ')}
                      onChange={(e) =>
                        updateBlankAnswer(
                          blank.id,
                          e.target.value.split(',').map((a) => a.trim()),
                        )
                      }
                      placeholder={t('blankAnswers')}
                      disabled={disabled}
                      className={cn('flex-1', showErrors && isEmpty && 'border-red-300 focus-visible:ring-red-400')}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={disabled}
                      onClick={() => removeBlank(blank.id)}
                    >
                      <Trash2 className="size-4 text-neutral-400" />
                    </Button>
                  </div>
                  {showErrors && isEmpty && (
                    <p className="mt-1 pl-7 text-xs text-red-500">{t('blankAnswersRequired')}</p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border border-dashed border-violet-200 bg-violet-50/40 p-3 text-sm leading-7 text-neutral-700">
            {renderPreview()}
          </div>
        </>
      ) : null}

      {showErrors && errors.noBlanks && (
        <p className="text-xs text-red-500">{t('selectTextError')}</p>
      )}
    </div>
  );
}

function PassageQuestionsEditor({
  passage,
  onPassageChange,
  showPassage,
  audioUrl,
  onAudioChange,
  questions,
  onQuestionsChange,
  disabled,
  showErrors,
}: {
  passage?: string;
  onPassageChange?: (value: string) => void;
  showPassage: boolean;
  audioUrl?: string | null;
  onAudioChange?: (url: string | null) => void;
  questions: PassageQuestionDraft[];
  onQuestionsChange: (questions: PassageQuestionDraft[]) => void;
  disabled?: boolean;
  showErrors?: boolean;
}) {
  const t = useTranslations('Community.create.exercise');
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const errors = useMemo(() => {
    const passageRequired = showPassage && !passage?.trim();
    const audioRequired = !showPassage && !audioUrl;
    const questionErrors = questions.map((q) => ({
      id: q.id,
      emptyPrompt: !q.prompt.trim(),
    }));
    return { passageRequired, audioRequired, questionErrors };
  }, [passage, showPassage, audioUrl, questions]);

  const hasSourceError = errors.passageRequired || errors.audioRequired;

  const handleAudioUpload = async (file: File) => {
    setUploading(true);
    try {
      const result = await cloudinaryService.uploadFileWithSignature(
        file,
        CLOUDINARY_FOLDER.BLOG,
        'auto',
      );
      onAudioChange?.(result.secureUrl);
    } finally {
      setUploading(false);
      if (audioInputRef.current) audioInputRef.current.value = '';
    }
  };

  const updateQuestion = (questionId: string, patch: Partial<PassageQuestionDraft>) => {
    onQuestionsChange(questions.map((q) => (q.id === questionId ? { ...q, ...patch } : q)));
  };

  return (
    <div className="space-y-4">
      {showPassage ? (
        <div>
          <Label className="text-xs font-medium text-neutral-500">{t('prompt')}</Label>
          <Textarea
            value={passage ?? ''}
            onChange={(e) => onPassageChange?.(e.target.value)}
            rows={5}
            disabled={disabled}
            placeholder={t('readingPassagePlaceholder')}
            className={cn(
              'mt-1.5',
              showErrors && errors.passageRequired && 'border-red-300 focus-visible:ring-red-400',
            )}
          />
          {showErrors && errors.passageRequired && (
            <p className="mt-1 text-xs text-red-500">{t('passageRequired')}</p>
          )}
        </div>
      ) : (
        <div>
          <Label className="text-xs font-medium text-neutral-500">{t('audioSource')}</Label>
          <input
            ref={audioInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleAudioUpload(file);
            }}
          />
          {audioUrl ? (
            <div className="mt-1.5 space-y-2">
              <audio controls src={audioUrl} className="w-full" />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled || uploading}
                onClick={() => onAudioChange?.(null)}
                className="rounded-full"
              >
                {t('removeAudio')}
              </Button>
            </div>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled || uploading}
                onClick={() => audioInputRef.current?.click()}
                className={cn('mt-1.5 rounded-full', showErrors && errors.audioRequired && 'border-red-300 text-red-500')}
              >
                {uploading ? (
                  <Loader2 className="mr-1 size-3.5 animate-spin" />
                ) : (
                  <Upload className="mr-1 size-3.5" />
                )}
                {t('uploadAudio')}
              </Button>
              {showErrors && errors.audioRequired && (
                <p className="mt-1 text-xs text-red-500">{t('audioRequired')}</p>
              )}
            </>
          )}
        </div>
      )}

      <div className="space-y-4">
        <Label className="text-xs font-medium text-neutral-500">{t('questions')}</Label>
        {questions.map((question, qIndex) => {
          const qErr = errors.questionErrors.find((e) => e.id === question.id);
          return (
            <div key={question.id} className="rounded-xl border border-neutral-200 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-neutral-500">
                  {t('questionNumber', { number: qIndex + 1 })}
                </span>
                {questions.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={disabled}
                    onClick={() => onQuestionsChange(questions.filter((q) => q.id !== question.id))}
                  >
                    <Trash2 className="size-4 text-neutral-400" />
                  </Button>
                ) : null}
              </div>
              <Input
                value={question.prompt}
                onChange={(e) => updateQuestion(question.id, { prompt: e.target.value })}
                placeholder={t('questionPrompt')}
                disabled={disabled}
                className={cn(
                  'mb-3',
                  showErrors && qErr?.emptyPrompt && 'border-red-300 focus-visible:ring-red-400',
                )}
              />
              {showErrors && qErr?.emptyPrompt && (
                <p className="-mt-2 mb-3 text-xs text-red-500">{t('questionRequired')}</p>
              )}
              <McqOptionsEditor
                options={question.options}
                correctOptionId={question.correctOptionId}
                onChange={(options, correctOptionId) =>
                  updateQuestion(question.id, { options, correctOptionId })
                }
                disabled={disabled}
                showErrors={showErrors}
              />
            </div>
          );
        })}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => onQuestionsChange([...questions, createQuestion()])}
          className="rounded-full"
        >
          <Plus className="mr-1 size-3.5" />
          {t('addQuestion')}
        </Button>
      </div>
    </div>
  );
}

export function CommunityExerciseBuilder({
  exerciseType,
  draft,
  onChange,
  disabled,
  showErrors,
}: CommunityExerciseBuilderProps) {
  if (exerciseType === 'MULTIPLE_CHOICE') {
    return (
      <McqOptionsEditor
        options={draft.multipleChoice.options}
        correctOptionId={draft.multipleChoice.correctOptionId}
        onChange={(options, correctOptionId) =>
          onChange({ ...draft, multipleChoice: { options, correctOptionId } })
        }
        disabled={disabled}
        showErrors={showErrors}
      />
    );
  }

  if (exerciseType === 'FILL_IN_BLANK') {
    return (
      <FillInBlankEditor
        text={draft.fillInBlank.text}
        blanks={draft.fillInBlank.blanks}
        onChange={(text, blanks) => onChange({ ...draft, fillInBlank: { text, blanks } })}
        disabled={disabled}
        showErrors={showErrors}
      />
    );
  }

  if (exerciseType === 'READING') {
    return (
      <PassageQuestionsEditor
        showPassage
        passage={draft.reading.passage}
        onPassageChange={(passage) => onChange({ ...draft, reading: { ...draft.reading, passage } })}
        questions={draft.reading.questions}
        onQuestionsChange={(questions) =>
          onChange({ ...draft, reading: { ...draft.reading, questions } })
        }
        disabled={disabled}
        showErrors={showErrors}
      />
    );
  }

  if (exerciseType === 'LISTENING') {
    return (
      <PassageQuestionsEditor
        showPassage={false}
        audioUrl={draft.listening.audioUrl}
        onAudioChange={(audioUrl) =>
          onChange({ ...draft, listening: { ...draft.listening, audioUrl } })
        }
        questions={draft.listening.questions}
        onQuestionsChange={(questions) =>
          onChange({ ...draft, listening: { ...draft.listening, questions } })
        }
        disabled={disabled}
        showErrors={showErrors}
      />
    );
  }

  return null;
}
