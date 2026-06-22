"use client";

import type { VocabularyWordItem } from "@mezon-tutors/shared";
import { Check, Circle, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import MezonlyLogo from "@/public/images/Mezonly-logo.png";
import {
  buildQuizQuestions,
  calculateQuizScore,
  type QuizQuestion,
  type QuizSessionResult,
} from "../utils/quiz-utils";

export type { QuizSessionResult };

type QuizModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSessionComplete?: (result: QuizSessionResult) => void;
  words: VocabularyWordItem[];
};

type AnswerState = {
  selectedId: string;
  isCorrect: boolean;
};

export default function QuizModal({
  isOpen,
  onClose,
  onSessionComplete,
  words,
}: QuizModalProps) {
  const t = useTranslations("Practice.quiz");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [answer, setAnswer] = useState<AnswerState | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setQuestions([]);
      setQuestionIndex(0);
      setCorrectCount(0);
      setAnswer(null);
      return;
    }

    const deck = buildQuizQuestions(words);
    setQuestions(deck);
    setQuestionIndex(0);
    setCorrectCount(0);
    setAnswer(null);
  }, [isOpen, words]);

  const currentQuestion = questions[questionIndex];
  const totalQuestions = questions.length;
  const hasEnoughWords = totalQuestions > 0;

  const handleSelect = (wordId: string) => {
    if (!currentQuestion || answer) return;

    const isCorrect = wordId === currentQuestion.target.id;
    setAnswer({ selectedId: wordId, isCorrect });
    if (isCorrect) {
      setCorrectCount((prev) => prev + 1);
    }
  };

  const handleContinue = () => {
    if (!answer) return;

    const nextIndex = questionIndex + 1;
    if (nextIndex >= totalQuestions) {
      onSessionComplete?.({
        score: calculateQuizScore(correctCount, totalQuestions),
        correctCount,
        totalCount: totalQuestions,
      });
      return;
    }

    setQuestionIndex(nextIndex);
    setAnswer(null);
  };
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-white">
      <header className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3 sm:py-4 md:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
          >
            <Image
              src={MezonlyLogo}
              alt="Mezonly"
              width={40}
              height={40}
              className="drop-shadow-[0_6px_16px_rgba(124,58,237,0.28)]"
            />
            <div className="flex flex-col leading-none">
              <span className="bg-[linear-gradient(110deg,#7c3aed_0%,#a855f7_50%,#ec4899_100%)] bg-clip-text text-xl font-extrabold tracking-tight text-transparent">
                Mezonly
              </span>
              <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Tutor Matching
              </span>
            </div>
          </Link>
          {hasEnoughWords && (
            <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700">
              {t("progress", {
                current: questionIndex + 1,
                total: totalQuestions,
              })}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex size-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100"
        >
          <X className="size-5" />
        </button>
      </header>

      {!hasEnoughWords ? (
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 text-center">
          <p className="text-slate-600">{t("notEnoughWords")}</p>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="mt-4 inline-flex h-11 rounded-full border border-violet-200 px-6 text-sm font-semibold text-violet-700 hover:bg-violet-50"
          >
            {t("backToVocabulary")}
          </Button>
        </div>
      ) : (
        <div className="relative flex min-h-0 flex-1 flex-col">
          <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-8 md:px-6 md:py-12">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 md:text-2xl">
              {t("prompt")}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-700 md:text-lg">
              {currentQuestion?.target.definition}
            </p>

            <div className="mt-8 space-y-3">
              {currentQuestion?.options.map((option) => {
                const isSelected = answer?.selectedId === option.id;
                const isCorrectOption =
                  option.id === currentQuestion.target.id;
                const showResult = answer !== null;

                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={answer !== null}
                    onClick={() => handleSelect(option.id)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl border bg-white px-4 py-4 text-left transition",
                      !showResult &&
                        (isSelected
                          ? "border-slate-900 ring-1 ring-slate-900"
                          : "border-slate-200 hover:border-slate-300"),
                      showResult &&
                        isCorrectOption &&
                        "border-emerald-600 bg-emerald-50/50",
                      showResult &&
                        isSelected &&
                        !isCorrectOption &&
                        "border-red-400 bg-red-50/50",
                      showResult &&
                        !isSelected &&
                        !isCorrectOption &&
                        "border-slate-200 opacity-60",
                    )}
                  >
                    <span className="text-base font-medium text-slate-900">
                      {option.word}
                    </span>
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                        isSelected && !showResult
                          ? "border-slate-900"
                          : "border-slate-300",
                        showResult &&
                          isCorrectOption &&
                          "border-emerald-600 bg-emerald-600",
                        showResult &&
                          isSelected &&
                          !isCorrectOption &&
                          "border-red-500 bg-red-500",
                      )}
                    >
                      {isSelected && !showResult && (
                        <span className="size-2.5 rounded-full bg-slate-900" />
                      )}
                      {showResult && isCorrectOption && (
                        <Check className="size-3 text-white" strokeWidth={3} />
                      )}
                      {showResult &&
                        isSelected &&
                        !isCorrectOption && (
                          <X className="size-3 text-white" strokeWidth={3} />
                        )}
                      {!isSelected && !showResult && (
                        <Circle className="size-5 text-transparent" />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {answer && (
            <div
              className={cn(
                "shrink-0 px-4 py-4 md:px-6",
                answer.isCorrect ? "bg-emerald-800" : "bg-red-700",
              )}
            >
              <div className="mx-auto flex w-full max-w-lg items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-white">
                  {answer.isCorrect ? (
                    <Check className="size-5 shrink-0" strokeWidth={2.5} />
                  ) : (
                    <X className="size-5 shrink-0" strokeWidth={2.5} />
                  )}
                  <span className="text-sm font-semibold md:text-base">
                    {answer.isCorrect
                      ? t("feedback.correct")
                      : t("feedback.incorrect", {
                          word: currentQuestion?.target.word ?? "",
                        })}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleContinue}
                  className="shrink-0 rounded-lg border border-white/80 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  {t("continue")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
