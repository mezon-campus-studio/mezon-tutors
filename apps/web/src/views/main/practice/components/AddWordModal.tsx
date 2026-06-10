"use client";

import type { VocabularyWordItem } from "@mezon-tutors/shared";
import { Pencil, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  Spinner,
  toast,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import {
  VocabularyAlreadyAddedError,
  vocabularyApi,
} from "@/services/vocabulary/vocabulary.api";
import { vocabularyQueryKey } from "@/services/vocabulary/vocabulary.qkey";

type DictionaryPhonetic = {
  text?: string;
  audio?: string;
};

type DictionaryDefinition = {
  definition: string;
  example?: string;
};

type DictionaryMeaning = {
  partOfSpeech: string;
  definitions: DictionaryDefinition[];
};

type DictionaryEntry = {
  word: string;
  phonetic?: string;
  phonetics: DictionaryPhonetic[];
  meanings: DictionaryMeaning[];
};

type MeaningItem = {
  key: string;
  word: string;
  partOfSpeech: string;
  definition: string;
  example?: string;
};

type AddWordModalProps = {
  isOpen: boolean;
  onClose: () => void;
  existingWords: VocabularyWordItem[];
};

type AddedState = Record<string, boolean>;

export default function AddWordModal({
  isOpen,
  onClose,
  existingWords,
}: AddWordModalProps) {
  const t = useTranslations("Practice.addWord");
  const queryClient = useQueryClient();
  const [step, setStep] = useState<1 | 2>(1);
  const [query, setQuery] = useState("");
  const [searchedWord, setSearchedWord] = useState("");
  const [entries, setEntries] = useState<DictionaryEntry[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [addedKeys, setAddedKeys] = useState<AddedState>({});
  const searchInputRef = useRef<HTMLInputElement>(null);

  const existingKeys = useMemo(() => {
    const set = new Set<string>();
    for (const w of existingWords) {
      set.add(`${w.word}::${w.definition}`);
    }
    return set;
  }, [existingWords]);

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setQuery("");
      setSearchedWord("");
      setEntries(null);
      setNotFound(false);
      setSavingKey(null);
      setAddedKeys({});
    }
  }, [isOpen]);

  const resetToSearch = useCallback(() => {
    setStep(1);
    setQuery("");
    setSearchedWord("");
    setEntries(null);
    setNotFound(false);
    setAddedKeys({});
  }, []);

  useEffect(() => {
    if (isOpen && step === 1) {
      searchInputRef.current?.focus();
    }
  }, [isOpen, step]);

  const searchWord = useCallback(async (word: string) => {
    const trimmed = word.trim();
    if (!trimmed) return;

    setIsSearching(true);
    setNotFound(false);
    setEntries(null);
    setQuery(trimmed);

    try {
      const res = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(trimmed)}`,
      );
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (!res.ok) {
        setNotFound(true);
        return;
      }
      const data = (await res.json()) as DictionaryEntry[];
      setEntries(data);
      setSearchedWord(trimmed);
      setStep(2);
    } catch {
      setNotFound(true);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const suggestions = useMemo(() => {
    if (!query.trim() || step !== 1) return [];
    const base = query.trim();
    const variants = new Set<string>([
      base.toLowerCase(),
      base.charAt(0).toUpperCase() + base.slice(1).toLowerCase(),
    ]);
    return Array.from(variants).slice(0, 5);
  }, [query, step]);

  const meanings = useMemo((): MeaningItem[] => {
    if (!entries) return [];
    const items: MeaningItem[] = [];
    for (const entry of entries) {
      for (const meaning of entry.meanings) {
        const def = meaning.definitions[0];
        if (!def) continue;
        const key = `${entry.word}::${meaning.partOfSpeech}::${def.definition}`;
        items.push({
          key,
          word: entry.word,
          partOfSpeech: meaning.partOfSpeech,
          definition: def.definition,
          example: def.example,
        });
      }
    }
    return items;
  }, [entries]);

  const getPhonetic = useCallback((data: DictionaryEntry[]) => {
    const first = data[0];
    if (!first) return undefined;
    return (
      first.phonetic ??
      first.phonetics.find((p) => p.text)?.text
    );
  }, []);

  const getAudioUrl = useCallback((data: DictionaryEntry[]) => {
    const first = data[0];
    if (!first) return undefined;
    return first.phonetics.find((p) => p.audio)?.audio;
  }, []);

  const isMeaningAdded = (item: MeaningItem) => {
    const dupKey = `${item.word}::${item.definition}`;
    return (
      addedKeys[item.key] ||
      existingKeys.has(dupKey)
    );
  };

  const handleAdd = async (item: MeaningItem) => {
    if (!entries || isMeaningAdded(item)) return;
    setSavingKey(item.key);
    try {
      await vocabularyApi.addWord({
        word: item.word,
        phonetic: getPhonetic(entries),
        partOfSpeech: item.partOfSpeech,
        definition: item.definition,
        example: item.example,
        audioUrl: getAudioUrl(entries),
      });
      void queryClient.invalidateQueries({ queryKey: vocabularyQueryKey.all });
      resetToSearch();
    } catch (error) {
      if (error instanceof VocabularyAlreadyAddedError) {
        resetToSearch();
      } else {
        toast.error(t("error"));
      }
    } finally {
      setSavingKey(null);
    }
  };

  const handleBackToSearch = () => {
    const word = searchedWord;
    resetToSearch();
    setQuery(word);
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="gap-0 overflow-hidden rounded-2xl border-violet-100 p-0 sm:max-w-lg"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-900">{t("title")}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="size-4" />
          </button>
        </div>

        {step === 1 ? (
          <div className="px-5 py-8">
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setNotFound(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void searchWord(query);
                }
              }}
              placeholder={t("placeholder")}
              className="w-full border-0 bg-transparent text-center text-2xl font-medium text-slate-900 outline-none placeholder:text-slate-300"
            />
            <p className="mt-2 text-center text-sm text-slate-400">
              {t("hint")}
            </p>

            {isSearching && (
              <div className="mt-6 flex justify-center">
                <Spinner className="size-6 text-violet-600" />
              </div>
            )}

            {notFound && !isSearching && (
              <p className="mt-6 text-center text-sm text-red-500">
                {t("notFound")}
              </p>
            )}

            {suggestions.length > 0 && !isSearching && (
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => void searchWord(suggestion)}
                    className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:border-violet-200 hover:bg-violet-50"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="max-h-[min(70vh,520px)] overflow-y-auto px-5 py-5">
            <div className="mb-4 flex items-center justify-center gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-800">
                {searchedWord}
              </span>
              <button
                type="button"
                onClick={handleBackToSearch}
                className="flex size-7 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100"
              >
                <Pencil className="size-3.5" />
              </button>
            </div>
            <p className="mb-4 text-center text-sm text-slate-500">
              {t("chooseMeaning")}
            </p>

            <ul className="space-y-3">
              {meanings.map((item) => {
                const added = isMeaningAdded(item);
                const saving = savingKey === item.key;
                return (
                  <li
                    key={item.key}
                    className={cn(
                      "flex items-start justify-between gap-3 rounded-xl border p-4",
                      added
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-slate-200 bg-white",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-slate-500">
                          {item.word}
                        </span>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-slate-500">
                          {item.partOfSpeech}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed text-slate-800">
                        {item.definition}
                      </p>
                    </div>
                    {added ? (
                      <span className="shrink-0 rounded-full px-2 py-1 text-xs font-semibold text-emerald-600">
                        {t("added")}
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void handleAdd(item)}
                        className="shrink-0 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                      >
                        {saving ? (
                          <Spinner className="size-4" />
                        ) : (
                          `+ ${t("add")}`
                        )}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
