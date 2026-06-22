"use client";

import type { VocabularyWordItem, VocabularyWordStatus } from "@mezon-tutors/shared";
import {
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Grid3x3,
  Layers,
  List,
  Plus,
  Trash2,
  Volume2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import DashboardViewTabs from "@/components/dashboard/DashboardViewTabs";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Skeleton,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  useDeleteWordMutation,
  useUpdateWordStatusMutation,
} from "@/services/vocabulary/vocabulary.api";

type TabKey = VocabularyWordStatus;

type MyVocabularyProps = {
  words: VocabularyWordItem[];
  isLoading: boolean;
  onAddWord: () => void;
  onOpenFlashcards: () => void;
  onOpenQuiz: () => void;
  onOpenWordSearch: () => void;
};

const STATUS_DOT: Record<VocabularyWordStatus, string> = {
  ready: "bg-blue-500",
  learning: "bg-emerald-300",
  learned: "bg-emerald-600",
};

export default function MyVocabulary({
  words,
  isLoading,
  onAddWord,
  onOpenFlashcards,
  onOpenQuiz,
  onOpenWordSearch,
}: MyVocabularyProps) {
  const t = useTranslations("Practice");
  const [activeTab, setActiveTab] = useState<TabKey>("ready");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [wordToDelete, setWordToDelete] = useState<VocabularyWordItem | null>(
    null,
  );
  const updateStatus = useUpdateWordStatusMutation();
  const deleteWord = useDeleteWordMutation();

  const tabs: TabKey[] = ["ready", "learning", "learned"];
  const tabIcons = {
    ready: BookOpen,
    learning: Clock,
    learned: CheckCircle2,
  };

  const filteredWords = useMemo(
    () => words.filter((w) => w.status === activeTab),
    [words, activeTab],
  );

  const readyCount = words.filter((w) => w.status === "ready").length;

  const handlePlayAudio = (audioUrl: string) => {
    const audio = new Audio(audioUrl);
    void audio.play();
  };

  const handleMarkAsLearned = (id: string) => {
    updateStatus.mutate({ id, status: "learned" });
  };

  const handleConfirmDelete = () => {
    if (!wordToDelete) return;
    deleteWord.mutate(wordToDelete.id, {
      onSuccess: () => {
        if (expandedId === wordToDelete.id) {
          setExpandedId(null);
        }
        setWordToDelete(null);
      },
    });
  };

  return (
    <div className="rounded-2xl border border-violet-100 bg-white shadow-sm shadow-violet-100/40">
      <div className="border-b border-violet-50 px-4 py-4 md:px-6">
        <DashboardViewTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          getLabel={(tab) => t(`tabs.${tab}`)}
          tabIcons={tabIcons}
        />
      </div>

      <div className="border-b border-violet-50 px-4 py-5 md:px-6">
        <h2 className="text-base font-bold text-slate-900">
          {t("exercises.title")}
        </h2>
        <p className="mt-0.5 text-sm text-slate-500">
          {t("exercises.subtitle")}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <button
            type="button"
            onClick={onAddWord}
            className="relative flex min-h-[88px] flex-col items-start justify-between rounded-xl border border-violet-100 bg-violet-50/50 p-3 text-left transition hover:border-violet-200 hover:bg-violet-50"
          >
            <Plus className="size-5 text-violet-600" />
            <span className="text-xs font-semibold leading-snug text-slate-800">
              {t("exercises.addFromLesson")}
            </span>
            {readyCount > 0 && (
              <span className="absolute right-2 top-2 rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-bold text-white">
                {readyCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onOpenFlashcards}
            className="flex min-h-[88px] flex-col items-start justify-between rounded-xl border border-sky-100 bg-sky-50/60 p-3 text-left transition hover:border-sky-200 hover:bg-sky-50"
          >
            <Layers className="size-5 text-sky-600" />
            <span className="text-xs font-semibold leading-snug text-slate-800">
              {t("exercises.flashcards")}
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenQuiz}
            className="flex min-h-[88px] flex-col items-start justify-between rounded-xl border border-amber-100 bg-amber-50/60 p-3 text-left transition hover:border-amber-200 hover:bg-amber-50"
          >
            <List className="size-5 text-amber-600" />
            <span className="text-xs font-semibold leading-snug text-slate-800">
              {t("exercises.quizzes")}
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenWordSearch}
            className="flex min-h-[88px] flex-col items-start justify-between rounded-xl border border-teal-100 bg-teal-50/60 p-3 text-left transition hover:border-teal-200 hover:bg-teal-50"
          >
            <Grid3x3 className="size-5 text-teal-600" />
            <span className="text-xs font-semibold leading-snug text-slate-800">
              {t("exercises.crosswords")}
            </span>
          </button>
        </div>
      </div>

      <div className="px-4 py-2 md:px-6">
        {isLoading ? (
          <div className="space-y-2 py-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : filteredWords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex size-20 items-center justify-center rounded-full bg-violet-50">
              <BookOpen className="size-10 text-violet-300" />
            </div>
            <p className="text-base font-semibold text-slate-800">
              {t("wordList.emptyTitle")}
            </p>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              {t("wordList.emptyDescription")}
            </p>
            <Button
              type="button"
              variant="gradient"
              onClick={onAddWord}
              className="mt-5 h-11 rounded-full px-6 font-semibold shadow-md shadow-violet-300/30"
            >
              {t("wordList.addFirstWord")}
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filteredWords.map((word) => {
              const isExpanded = expandedId === word.id;
              return (
                <li key={word.id}>
                  <div className="flex items-center gap-3 py-3">
                    {word.audioUrl ? (
                      <button
                        type="button"
                        onClick={() => handlePlayAudio(word.audioUrl!)}
                        className="flex size-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-violet-50 hover:text-violet-600"
                        aria-label="Play audio"
                      >
                        <Volume2 className="size-4" />
                      </button>
                    ) : (
                      <div className="size-8 shrink-0" />
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedId(isExpanded ? null : word.id)
                      }
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <span className="truncate font-medium text-slate-900">
                        {word.word}
                      </span>
                      <span
                        className={cn(
                          "size-2 shrink-0 rounded-full",
                          STATUS_DOT[word.status],
                        )}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedId(isExpanded ? null : word.id)
                      }
                      className="flex size-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-50"
                      aria-label="Toggle details"
                    >
                      <ChevronDown
                        className={cn(
                          "size-4 transition-transform",
                          isExpanded && "rotate-180",
                        )}
                      />
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="mb-4 rounded-xl border border-violet-50 bg-violet-50/30 p-4">
                      {word.phonetic && (
                        <p className="text-sm text-slate-500">{word.phonetic}</p>
                      )}
                      <span className="mt-2 inline-block rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-violet-700 ring-1 ring-violet-100">
                        {word.partOfSpeech}
                      </span>
                      <p className="mt-3 text-sm leading-relaxed text-slate-800">
                        {word.definition}
                      </p>
                      {word.example && (
                        <p className="mt-2 text-sm italic text-slate-600">
                          &ldquo;{word.example}&rdquo;
                        </p>
                      )}
                      <p className="mt-3 text-xs text-slate-400">
                        {t("wordList.sourceNote")}
                      </p>
                      <div className="mt-4 flex items-center gap-2">
                        {word.status !== "learned" && (
                          <Button
                            type="button"
                            variant="gradient"
                            onClick={() => handleMarkAsLearned(word.id)}
                            disabled={updateStatus.isPending}
                            className="h-10 flex-1 rounded-full font-semibold shadow-md shadow-violet-300/30"
                          >
                            <Check className="size-4" />
                            {t("wordList.markAsLearned")}
                          </Button>
                        )}
                        <button
                          type="button"
                          onClick={() => setWordToDelete(word)}
                          className="flex size-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-red-500 transition hover:bg-red-50"
                          aria-label="Delete word"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Dialog
        open={wordToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setWordToDelete(null);
        }}
      >
        <DialogContent className="gap-4 rounded-2xl border-violet-100 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              {t("wordList.deleteDialog.title")}
            </DialogTitle>
          </DialogHeader>

          <p className="text-sm text-slate-600">
            {t("wordList.deleteDialog.description", {
              word: wordToDelete?.word ?? "",
            })}
          </p>

          <DialogFooter className="gap-2 bg-transparent sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setWordToDelete(null)}
              disabled={deleteWord.isPending}
              className="h-10 min-w-[5.5rem] rounded-full px-5"
            >
              {t("wordList.deleteDialog.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteWord.isPending}
              className="h-10 min-w-[5.5rem] rounded-full px-5"
            >
              {t("wordList.deleteDialog.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
