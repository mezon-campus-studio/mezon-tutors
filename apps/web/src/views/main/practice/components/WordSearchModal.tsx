"use client";

import type { VocabularyWordItem } from "@mezon-tutors/shared";
import { Check, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import MezonlyLogo from "@/public/images/Mezonly-logo.png";
import {
  buildWordSearchPuzzle,
  constrainSelectionEnd,
  getCellKey,
  getCellsBetween,
  getPlacementCells,
  getSelectedWordId,
  type GridCell,
  type WordSearchPuzzle,
  type WordSearchSessionResult,
  WORD_SEARCH_GRID_SIZE,
} from "../utils/word-search-utils";

export type { WordSearchSessionResult };

type WordSearchModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSessionComplete?: (result: WordSearchSessionResult) => void;
  words: VocabularyWordItem[];
};

export default function WordSearchModal({
  isOpen,
  onClose,
  onSessionComplete,
  words,
}: WordSearchModalProps) {
  const t = useTranslations("Practice.wordSearch");
  const [puzzle, setPuzzle] = useState<WordSearchPuzzle | null>(null);
  const [foundWordIds, setFoundWordIds] = useState<Set<string>>(new Set());
  const [foundCellKeys, setFoundCellKeys] = useState<Set<string>>(new Set());
  const [selectionStart, setSelectionStart] = useState<GridCell | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<GridCell | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const completedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      setPuzzle(null);
      setFoundWordIds(new Set());
      setFoundCellKeys(new Set());
      setSelectionStart(null);
      setSelectionEnd(null);
      setIsSelecting(false);
      completedRef.current = false;
      return;
    }

    setPuzzle(buildWordSearchPuzzle(words));
    setFoundWordIds(new Set());
    setFoundCellKeys(new Set());
    setSelectionStart(null);
    setSelectionEnd(null);
    setIsSelecting(false);
    completedRef.current = false;
  }, [isOpen, words]);

  const selectedCells = useMemo(() => {
    if (!selectionStart || !selectionEnd) {
      return [];
    }
    return getCellsBetween(selectionStart, selectionEnd);
  }, [selectionStart, selectionEnd]);

  const selectedCellKeys = useMemo(
    () => new Set(selectedCells.map(getCellKey)),
    [selectedCells],
  );

  const totalWords = puzzle?.words.length ?? 0;
  const foundCount = foundWordIds.size;
  const isComplete = totalWords > 0 && foundCount === totalWords;

  const clearSelection = useCallback(() => {
    setSelectionStart(null);
    setSelectionEnd(null);
    setIsSelecting(false);
  }, []);

  const handleSelectionComplete = useCallback(() => {
    if (!puzzle || selectedCells.length === 0) {
      clearSelection();
      return;
    }

    const matchedWordId = getSelectedWordId(
      selectedCells,
      puzzle.placements,
    );

    if (matchedWordId && !foundWordIds.has(matchedWordId)) {
      const placement = puzzle.placements.find(
        (item) => item.wordId === matchedWordId,
      );

      setFoundWordIds((prev) => {
        const next = new Set(prev);
        next.add(matchedWordId);
        return next;
      });

      if (placement) {
        const cells = getPlacementCells(placement);
        setFoundCellKeys((prev) => {
          const next = new Set(prev);
          cells.forEach((cell) => next.add(getCellKey(cell)));
          return next;
        });
      }
    }

    clearSelection();
  }, [clearSelection, foundWordIds, puzzle, selectedCells]);

  useEffect(() => {
    if (!isComplete || completedRef.current || !puzzle) {
      return;
    }

    completedRef.current = true;
    onSessionComplete?.({
      foundCount: puzzle.words.length,
      totalCount: puzzle.words.length,
    });
  }, [isComplete, onSessionComplete, puzzle]);

  const handlePointerDown = (cell: GridCell) => {
    setIsSelecting(true);
    setSelectionStart(cell);
    setSelectionEnd(cell);
  };

  const handlePointerEnter = (cell: GridCell) => {
    if (!isSelecting || !selectionStart) {
      return;
    }

    setSelectionEnd(constrainSelectionEnd(selectionStart, cell));
  };

  const handlePointerUp = () => {
    if (!isSelecting) {
      return;
    }
    handleSelectionComplete();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-white"
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
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
              <span className="text-brand-gradient text-xl font-extrabold tracking-tight">
                Mezonly
              </span>
              <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Tutor Matching
              </span>
            </div>
          </Link>
          {puzzle && (
            <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700">
              {t("progress", { found: foundCount, total: totalWords })}
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

      {!puzzle ? (
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
        <div className="flex min-h-0 flex-1 flex-col overflow-auto px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">
            <div className="min-w-0 flex-1">
              <p className="mb-4 text-sm text-slate-500">{t("hint")}</p>
              <div
                className="mx-auto w-full max-w-[min(100%,560px)] select-none touch-none border border-slate-200"
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${WORD_SEARCH_GRID_SIZE}, minmax(0, 1fr))`,
                }}
              >
                {puzzle.grid.map((row, rowIndex) =>
                  row.map((letter, colIndex) => {
                    const cell = { row: rowIndex, col: colIndex };
                    const cellKey = getCellKey(cell);
                    const isSelected = selectedCellKeys.has(cellKey);
                    const isFound = foundCellKeys.has(cellKey);

                    return (
                      <button
                        key={cellKey}
                        type="button"
                        className={cn(
                          "aspect-square border border-slate-200 text-sm font-bold text-slate-900 transition-colors sm:text-base",
                          isFound && "bg-emerald-400 text-white",
                          isSelected && !isFound && "bg-violet-200",
                          !isFound && !isSelected && "bg-white hover:bg-slate-50",
                        )}
                        onPointerDown={(event) => {
                          event.preventDefault();
                          handlePointerDown(cell);
                        }}
                        onPointerEnter={() => handlePointerEnter(cell)}
                      >
                        {letter}
                      </button>
                    );
                  }),
                )}
              </div>
            </div>

            <aside className="w-full shrink-0 lg:w-56">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                {t("wordListTitle")}
              </h2>
              <ul className="mt-3 space-y-2">
                {puzzle.words.map((word) => {
                  const isFound = foundWordIds.has(word.id);

                  return (
                    <li
                      key={word.id}
                      className={cn(
                        "flex items-center gap-2 text-sm font-bold tracking-wide text-slate-900 transition sm:text-base",
                        isFound && "text-emerald-600 line-through decoration-2",
                      )}
                    >
                      {isFound && (
                        <Check
                          className="size-4 shrink-0 text-emerald-600"
                          strokeWidth={2.5}
                        />
                      )}
                      {word.displayWord}
                    </li>
                  );
                })}
              </ul>
            </aside>
          </div>
        </div>
      )}
    </div>
  );
}
