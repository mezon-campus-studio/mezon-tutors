"use client";

import type { VocabularyWordItem } from "@mezon-tutors/shared";
import { ArrowLeft, ArrowRight, Layers, Volume2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Button, Kbd } from "@/components/ui";
import { useUpdateWordStatusMutation } from "@/services/vocabulary/vocabulary.api";

type FlashcardPhase = "ready" | "learning";

export type ReadySessionCompleteResult = {
  percent: number;
  completedCount: number;
  totalCount: number;
};

type FlashcardModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onReadySessionComplete?: (result: ReadySessionCompleteResult) => void;
  words: VocabularyWordItem[];
};

function hasRemainingReadyWords(
  words: VocabularyWordItem[],
  sessionLearning: VocabularyWordItem[],
): boolean {
  const movedToLearningIds = new Set(sessionLearning.map((w) => w.id));
  return words.some(
    (w) => w.status === "ready" && !movedToLearningIds.has(w.id),
  );
}

function KeyHint({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-slate-400">
      {label}
      <Kbd className="h-6 min-w-6 rounded-md border border-slate-200 bg-slate-50 px-1.5 text-slate-600 shadow-[0_1px_0_0_rgba(15,23,42,0.08)]">
        {children}
      </Kbd>
    </span>
  );
}

function buildLearningDeck(
  words: VocabularyWordItem[],
  sessionLearning: VocabularyWordItem[],
): VocabularyWordItem[] {
  const apiLearning = words.filter((w) => w.status === "learning");
  const sessionOnly = sessionLearning.filter(
    (w) => !apiLearning.some((item) => item.id === w.id),
  );
  return [...apiLearning, ...sessionOnly];
}

export default function FlashcardModal({
  isOpen,
  onClose,
  onReadySessionComplete,
  words,
}: FlashcardModalProps) {
  const t = useTranslations("Practice.flashcards");
  const updateStatus = useUpdateWordStatusMutation();
  const [phase, setPhase] = useState<FlashcardPhase>("ready");
  const [deck, setDeck] = useState<VocabularyWordItem[]>([]);
  const [index, setIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const readyWords = useMemo(
    () => words.filter((w) => w.status === "ready"),
    [words],
  );
  const learningWords = useMemo(
    () => words.filter((w) => w.status === "learning"),
    [words],
  );

  const sessionStartedRef = useRef(false);
  const sessionLearningRef = useRef<VocabularyWordItem[]>([]);
  const initialReadyDeckSizeRef = useRef(0);

  useEffect(() => {
    if (!isOpen) {
      sessionStartedRef.current = false;
      sessionLearningRef.current = [];
      initialReadyDeckSizeRef.current = 0;
      return;
    }
    if (sessionStartedRef.current) return;

    if (hasRemainingReadyWords(words, [])) {
      setPhase("ready");
      setDeck([...readyWords]);
      initialReadyDeckSizeRef.current = readyWords.length;
    } else if (learningWords.length > 0) {
      setPhase("learning");
      setDeck(buildLearningDeck(words, sessionLearningRef.current));
    } else {
      setDeck([]);
    }
    setIndex(0);
    setIsFlipped(false);
    sessionStartedRef.current = true;
  }, [isOpen, readyWords, learningWords]);

  const current = deck[index];
  const isComplete = deck.length === 0 || index >= deck.length;

  const leftLabel =
    phase === "ready" ? t("knowWord") : t("markAsLearned");
  const phaseLabel =
    phase === "ready" ? t("phaseReady") : t("phaseLearning");

  const advanceCard = useCallback(() => {
    setIsFlipped(false);
    const nextIndex = index + 1;

    if (nextIndex < deck.length) {
      setIndex(nextIndex);
      return;
    }

    if (phase === "ready") {
      const totalCount = initialReadyDeckSizeRef.current;
      const completedCount = sessionLearningRef.current.length;
      const percent =
        totalCount > 0
          ? Math.round((completedCount / totalCount) * 100)
          : 0;
      onReadySessionComplete?.({ percent, completedCount, totalCount });
      return;
    }

    setIndex(nextIndex);
  }, [index, deck.length, phase, onReadySessionComplete]);

  const handleLeft = useCallback(() => {
    if (!current || !isFlipped) return;
    if (phase === "ready") {
      sessionLearningRef.current.push({ ...current, status: "learning" });
      updateStatus.mutate({ id: current.id, status: "learning" });
    } else {
      updateStatus.mutate({ id: current.id, status: "learned" });
    }
    advanceCard();
  }, [current, isFlipped, phase, updateStatus, advanceCard]);

  const handleRight = useCallback(() => {
    if (!current || !isFlipped) return;
    advanceCard();
  }, [current, isFlipped, advanceCard]);

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (isFlipped) handleLeft();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (isFlipped) handleRight();
      } else if (e.key === "Enter") {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, isFlipped, handleLeft, handleRight]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <header className="flex items-center justify-between border-b border-slate-100 px-4 py-4 md:px-6">
        <div className="flex items-center gap-2 text-slate-800">
          <Layers className="size-5" />
          <span className="font-semibold">{t("title")}</span>
          {!isComplete && deck.length > 0 && (
            <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700">
              {phaseLabel}
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

      <div className="flex flex-1 flex-col items-center justify-center px-4 py-8">
        {deck.length === 0 ? (
          <div className="text-center">
            <p className="text-slate-600">{t("noCards")}</p>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="mt-4 rounded-full"
            >
              {t("backToVocabulary")}
            </Button>
          </div>
        ) : isComplete ? (
          <div className="text-center">
            <p className="text-lg font-semibold text-slate-800">
              {t("complete")}
            </p>
            <Button
              type="button"
              onClick={onClose}
              className="mt-6 rounded-full bg-violet-600 px-6 hover:bg-violet-700"
            >
              {t("backToVocabulary")}
            </Button>
          </div>
        ) : (
          <div className="flex w-full max-w-3xl items-center justify-center gap-4 md:gap-8">
            <div className="hidden flex-col items-center gap-2 sm:flex">
              <Button
                type="button"
                variant="outline"
                onClick={handleLeft}
                disabled={!isFlipped}
                className="rounded-full px-4"
              >
                ← {leftLabel}
              </Button>
              <KeyHint label={t("pressKey")}>
                <ArrowLeft className="size-3.5" aria-hidden />
              </KeyHint>
            </div>

            <div
              className="relative w-full max-w-md"
              style={{ perspective: "1200px" }}
            >
              {[2, 1].map((offset) => (
                <div
                  key={offset}
                  className="absolute inset-x-0 top-2 mx-auto h-[280px] w-[92%] rounded-2xl border border-slate-100 bg-white shadow-sm"
                  style={{
                    transform: `translateY(${offset * 6}px) scale(${1 - offset * 0.02})`,
                    zIndex: 10 - offset,
                  }}
                />
              ))}
              <div
                role="button"
                tabIndex={0}
                onClick={handleFlip}
                onKeyDown={(e) => {
                  if (e.key === " ") {
                    e.preventDefault();
                    handleFlip();
                  }
                }}
                className="relative z-20 mx-auto block h-[280px] w-full max-w-md cursor-pointer"
                style={{ perspective: "1200px" }}
              >
                <div
                  className="relative size-full transition-transform duration-500"
                  style={{
                    transformStyle: "preserve-3d",
                    transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                  }}
                >
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 shadow-lg"
                    style={{ backfaceVisibility: "hidden" }}
                  >
                    <p className="text-4xl font-bold text-slate-900">
                      {current?.word}
                    </p>
                    <p className="absolute bottom-6 text-xs text-slate-400">
                      {t("flipHint")}
                    </p>
                  </div>
                  <div
                    className="absolute inset-0 flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-lg"
                    style={{
                      backfaceVisibility: "hidden",
                      transform: "rotateY(180deg)",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-xl font-bold text-slate-900">
                        {current?.word}
                      </span>
                      {current?.audioUrl && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const audio = new Audio(current.audioUrl!);
                            void audio.play();
                          }}
                          className="text-slate-500 hover:text-violet-600"
                        >
                          <Volume2 className="size-4" />
                        </button>
                      )}
                      <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">
                        {current?.partOfSpeech}
                      </span>
                    </div>
                    <div className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
                      <p className="text-base font-semibold leading-relaxed text-slate-800">
                        {current?.definition}
                      </p>
                      {current?.example && (
                        <ul className="mt-3 list-disc pl-5 text-sm text-slate-600">
                          <li>{current.example}</li>
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="hidden flex-col items-center gap-2 sm:flex">
              <Button
                type="button"
                variant="outline"
                onClick={handleRight}
                disabled={!isFlipped}
                className="rounded-full px-4"
              >
                {t("keepPracticing")} →
              </Button>
              <KeyHint label={t("pressKey")}>
                <ArrowRight className="size-3.5" aria-hidden />
              </KeyHint>
            </div>
          </div>
        )}

        {!isComplete && deck.length > 0 && (
          <div className="mt-8 flex w-full max-w-md gap-3 sm:hidden">
            <Button
              type="button"
              variant="outline"
              onClick={handleLeft}
              disabled={!isFlipped}
              className="flex-1 rounded-full text-xs"
            >
              ← {leftLabel}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleRight}
              disabled={!isFlipped}
              className="flex-1 rounded-full text-xs"
            >
              {t("keepPracticing")} →
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
