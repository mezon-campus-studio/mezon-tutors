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
import { cn } from "@/lib/utils";
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

// ─── Swipe config ────────────────────────────────────────────────────────────
const SWIPE_THRESHOLD = 80; // px — minimum drag distance to trigger action
const ROTATE_FACTOR = 0.12; // deg per px dragged
const EXIT_TRANSITION_MS = 400;

function getExitDistance() {
  return typeof window !== "undefined" ? window.innerWidth * 1.1 : 500;
}

type SwipeTint = "none" | "emerald-300" | "emerald-600" | "blue-500";

const SWIPE_TINT_START = 20;

const FLASHCARD_ACTION_BTN =
  "inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-violet-200 bg-white px-4 text-sm font-semibold text-violet-700 shadow-sm shadow-violet-100/50 transition hover:border-violet-300 hover:bg-violet-50 disabled:pointer-events-none disabled:opacity-50 sm:h-10";

function getSwipeTint(
  dragX: number,
  phase: FlashcardPhase,
  exitDirection: "left" | "right" | null,
): SwipeTint {
  const direction =
    exitDirection ??
    (dragX < -SWIPE_TINT_START
      ? "left"
      : dragX > SWIPE_TINT_START
        ? "right"
        : null);

  if (!direction) return "none";

  if (direction === "left") {
    return phase === "ready" ? "emerald-300" : "emerald-600";
  }

  return phase === "ready" ? "blue-500" : "emerald-300";
}

function getSwipeCardClasses(tint: SwipeTint) {
  switch (tint) {
    case "emerald-300":
      return {
        bg: "bg-emerald-300 border-emerald-300",
        word: "text-slate-900",
        muted: "text-slate-600",
        hint: "text-slate-600",
        badge: "bg-emerald-100 text-emerald-800",
      };
    case "emerald-600":
      return {
        bg: "bg-emerald-600 border-emerald-600",
        word: "text-white",
        muted: "text-emerald-50",
        hint: "text-emerald-100",
        badge: "bg-emerald-500 text-white",
      };
    case "blue-500":
      return {
        bg: "bg-blue-500 border-blue-500",
        word: "text-white",
        muted: "text-blue-50",
        hint: "text-blue-100",
        badge: "bg-blue-400 text-white",
      };
    default:
      return {
        bg: "bg-white border-slate-200",
        word: "text-slate-900",
        muted: "text-slate-600",
        hint: "text-slate-400",
        badge: "bg-violet-50 text-violet-700",
      };
  }
}

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
  const [flipAnimated, setFlipAnimated] = useState(true);

  // ─── Swipe state ────────────────────────────────────────────────────────────
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [exitDirection, setExitDirection] = useState<"left" | "right" | null>(
    null,
  );
  const [cardMoveAnimated, setCardMoveAnimated] = useState(true);
  const dragStartX = useRef<number | null>(null);
  const pendingDismissRef = useRef<(() => void) | null>(null);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

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
      pendingDismissRef.current = null;
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
      setIsExiting(false);
      setExitDirection(null);
      setDragX(0);
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

  // ─── Card advance logic (shared by buttons + swipe) ─────────────────────────
  const advanceCard = useCallback(() => {
    setFlipAnimated(false);
    setIsFlipped(false);
    setDragX(0);
    const nextIndex = index + 1;

    if (nextIndex < deck.length) {
      setIndex(nextIndex);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setFlipAnimated(true));
      });
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
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setFlipAnimated(true));
    });
  }, [index, deck.length, phase, onReadySessionComplete]);

  const handleLeft = useCallback(() => {
    if (!current) return;
    if (phase === "ready") {
      sessionLearningRef.current.push({ ...current, status: "learning" });
      updateStatus.mutate({ id: current.id, status: "learning" });
    } else {
      updateStatus.mutate({ id: current.id, status: "learned" });
    }
    advanceCard();
  }, [current, phase, updateStatus, advanceCard]);

  const handleRight = useCallback(() => {
    if (!current) return;
    advanceCard();
  }, [current, advanceCard]);

  const handleFlip = useCallback(() => {
    if (isExiting) return;
    setIsFlipped((prev) => !prev);
  }, [isExiting]);

  const completeDismiss = useCallback(() => {
    if (!pendingDismissRef.current) return;
    const action = pendingDismissRef.current;
    pendingDismissRef.current = null;
    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
    setIsExiting(false);
    setExitDirection(null);
    setCardMoveAnimated(false);
    setDragX(0);
    action();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setCardMoveAnimated(true));
    });
  }, []);

  const dismissCard = useCallback(
    (direction: "left" | "right", action: () => void) => {
      if (isExiting) return;
      setIsDragging(false);
      dragStartX.current = null;
      pendingDismissRef.current = action;
      setExitDirection(direction);
      setIsExiting(true);
      setDragX(direction === "left" ? -getExitDistance() : getExitDistance());
      exitTimerRef.current = setTimeout(
        completeDismiss,
        EXIT_TRANSITION_MS + 50,
      );
    },
    [isExiting, completeDismiss],
  );

  const handleCardTransitionEnd = useCallback(
    (e: React.TransitionEvent<HTMLDivElement>) => {
      if (e.propertyName !== "transform" || !isExiting) return;
      completeDismiss();
    },
    [isExiting, completeDismiss],
  );

  // ─── Keyboard ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handleLeft();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleRight();
      } else if (e.key === "Enter") {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, handleLeft, handleRight]);

  // ─── Pointer / touch drag handlers ─────────────────────────────────────────
  const onDragStart = useCallback(
    (clientX: number) => {
      if (isExiting) return;
      dragStartX.current = clientX;
      setIsDragging(true);
    },
    [isExiting],
  );

  const onDragMove = useCallback(
    (clientX: number) => {
      if (dragStartX.current === null || !isDragging) return;
      setDragX(clientX - dragStartX.current);
    },
    [isDragging],
  );

  const onDragEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    dragStartX.current = null;

    if (dragX <= -SWIPE_THRESHOLD) {
      dismissCard("left", handleLeft);
    } else if (dragX >= SWIPE_THRESHOLD) {
      dismissCard("right", handleRight);
    } else {
      setDragX(0);
    }
  }, [isDragging, dragX, dismissCard, handleLeft, handleRight]);

  // Mouse events
  const onMouseDown = (e: React.MouseEvent) => onDragStart(e.clientX);
  const onMouseMove = (e: React.MouseEvent) => {
    if (isDragging) onDragMove(e.clientX);
  };
  const onMouseUp = () => onDragEnd();
  const onMouseLeave = () => { if (isDragging) onDragEnd(); };

  // Touch events
  const onTouchStart = (e: React.TouchEvent) =>
    onDragStart(e.touches[0].clientX);
  const onTouchMove = (e: React.TouchEvent) =>
    onDragMove(e.touches[0].clientX);
  const onTouchEnd = () => onDragEnd();

  const rotate = dragX * ROTATE_FACTOR;
  const swipeTint = getSwipeTint(
    dragX,
    phase,
    isExiting ? exitDirection : null,
  );
  const swipeStyles = getSwipeCardClasses(swipeTint);

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
            {/* ── Left button (desktop) ─────────────────────────────────────── */}
            <div className="hidden flex-col items-center gap-2 sm:flex">
              <button
                type="button"
                onClick={handleLeft}
                disabled={!isFlipped}
                className={cn(FLASHCARD_ACTION_BTN, "sm:w-auto")}
              >
                <ArrowLeft className="size-4 shrink-0" aria-hidden />
                <span className="whitespace-nowrap">{leftLabel}</span>
              </button>
              <KeyHint label={t("pressKey")}>
                <ArrowLeft className="size-3.5" aria-hidden />
              </KeyHint>
            </div>

            {/* ── Card stack ───────────────────────────────────────────────── */}
            <div
              className="relative w-full max-w-md select-none"
              style={{ perspective: "1200px" }}
            >
              {/* Background stacked cards — next words visible underneath */}
              {[2, 1].map((offset) => {
                const stacked = deck[index + offset];
                if (!stacked) return null;

                return (
                  <div
                    key={`${stacked.id}-${offset}`}
                    className="absolute inset-x-0 top-2 mx-auto flex h-[280px] w-[92%] items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                    style={{
                      transform: `translateY(${offset * 6}px) scale(${1 - offset * 0.02})`,
                      zIndex: 10 - offset,
                    }}
                  >
                    <p
                      className={`font-bold text-slate-900 ${
                        offset === 1 ? "text-4xl" : "text-3xl text-slate-500"
                      }`}
                    >
                      {stacked.word}
                    </p>
                  </div>
                );
              })}

              {/* Active draggable card */}
              <div
                ref={cardRef}
                className="relative z-20 mx-auto block h-[280px] w-full max-w-md"
                style={{
                  transform: `translateX(${dragX}px) rotate(${rotate}deg)`,
                  transition:
                    isDragging || !cardMoveAnimated
                      ? "none"
                      : `transform ${EXIT_TRANSITION_MS}ms cubic-bezier(0.25,0.46,0.45,0.94)`,
                  cursor: isExiting
                    ? "default"
                    : isDragging
                      ? "grabbing"
                      : "grab",
                  touchAction: "none",
                  pointerEvents: isExiting ? "none" : "auto",
                }}
                onTransitionEnd={handleCardTransitionEnd}
                // Mouse
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseLeave}
                // Touch
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
                // Click to flip (only when not dragging)
                onClick={() => {
                  if (!isExiting && Math.abs(dragX) < 5) handleFlip();
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === " ") { e.preventDefault(); handleFlip(); }
                }}
              >
                {/* 3D flip inner — key resets face when advancing to next card */}
                <div
                  key={current?.id}
                  className={`relative size-full ${flipAnimated ? "transition-transform duration-500" : ""}`}
                  style={{
                    transformStyle: "preserve-3d",
                    transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                  }}
                >
                  {/* ── Front face ─────────────────────────────────────────── */}
                  <div
                    className={cn(
                      "absolute inset-0 flex flex-col items-center justify-center overflow-hidden rounded-2xl border p-8 shadow-lg transition-colors duration-150",
                      swipeStyles.bg,
                    )}
                    style={{ backfaceVisibility: "hidden" }}
                  >
                    <p className={cn("text-4xl font-bold", swipeStyles.word)}>
                      {current?.word}
                    </p>
                  </div>

                  {/* ── Back face ──────────────────────────────────────────── */}
                  <div
                    className={cn(
                      "absolute inset-0 flex flex-col overflow-hidden rounded-2xl border p-6 shadow-lg transition-colors duration-150",
                      swipeStyles.bg,
                    )}
                    style={{
                      backfaceVisibility: "hidden",
                      transform: "rotateY(180deg)",
                    }}
                  >
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={cn("text-xl font-bold", swipeStyles.word)}>
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
                          className={cn(
                            "hover:opacity-80",
                            swipeTint === "none"
                              ? "text-slate-500 hover:text-violet-600"
                              : "text-white/80",
                          )}
                        >
                          <Volume2 className="size-4" />
                        </button>
                      )}
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          swipeStyles.badge,
                        )}
                      >
                        {current?.partOfSpeech}
                      </span>
                    </div>
                    <div className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
                      <p
                        className={cn(
                          "text-base font-semibold leading-relaxed",
                          swipeStyles.word,
                        )}
                      >
                        {current?.definition}
                      </p>
                      {current?.example && (
                        <ul
                          className={cn(
                            "mt-3 list-disc pl-5 text-sm",
                            swipeStyles.muted,
                          )}
                        >
                          <li>{current.example}</li>
                        </ul>
                      )}
                    </div>
                  </div>
                </div>

              </div>

              <p className="mt-8 text-center text-xs text-slate-400 ">
                {t("flipHint")}
              </p>
              <p className="mt-1 text-center text-xs text-slate-400">
                {t("swipeHint")}
              </p>
            </div>

            {/* ── Right button (desktop) ────────────────────────────────────── */}
            <div className="hidden flex-col items-center gap-2 sm:flex">
              <button
                type="button"
                onClick={handleRight}
                disabled={!isFlipped}
                className={cn(FLASHCARD_ACTION_BTN, "sm:w-auto")}
              >
                <span className="whitespace-nowrap">{t("keepPracticing")}</span>
                <ArrowRight className="size-4 shrink-0" aria-hidden />
              </button>
              <KeyHint label={t("pressKey")}>
                <ArrowRight className="size-3.5" aria-hidden />
              </KeyHint>
            </div>
          </div>
        )}

        {/* ── Mobile buttons ──────────────────────────────────────────────────── */}
        {!isComplete && deck.length > 0 && (
          <div className="mt-8 flex w-full max-w-md gap-3 sm:hidden">
            <button
              type="button"
              onClick={handleLeft}
              disabled={!isFlipped}
              className={cn(FLASHCARD_ACTION_BTN, "flex-1")}
            >
              <ArrowLeft className="size-4 shrink-0" aria-hidden />
              <span className="whitespace-nowrap">{leftLabel}</span>
            </button>
            <button
              type="button"
              onClick={handleRight}
              disabled={!isFlipped}
              className={cn(FLASHCARD_ACTION_BTN, "flex-1")}
            >
              <span className="whitespace-nowrap">{t("keepPracticing")}</span>
              <ArrowRight className="size-4 shrink-0" aria-hidden />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}