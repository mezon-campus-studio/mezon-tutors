"use client";

import type { VocabularyWordItem } from "@mezon-tutors/shared";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";
import { cn } from "@/lib/utils";

type VocabularyStatsProps = {
  words: VocabularyWordItem[];
  onAddWord: () => void;
};

export default function VocabularyStats({
  words,
  onAddWord,
}: VocabularyStatsProps) {
  const t = useTranslations("Practice.stats");
  const [isHowToOpen, setIsHowToOpen] = useState(false);

  const counts = useMemo(
    () => ({
      ready: words.filter((w) => w.status === "ready").length,
      learning: words.filter((w) => w.status === "learning").length,
      learned: words.filter((w) => w.status === "learned").length,
    }),
    [words],
  );

  const total = words.length;
  const segments = useMemo(() => {
    if (total === 0) {
      return { ready: 0, learning: 0, learned: 0 };
    }
    return {
      ready: (counts.ready / total) * 100,
      learning: (counts.learning / total) * 100,
      learned: (counts.learned / total) * 100,
    };
  }, [counts, total]);

  return (
    <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm shadow-violet-100/40">
      <div className="mb-4">
        <p className="text-4xl font-extrabold tracking-tight text-slate-900">
          {total}
        </p>
        <p className="mt-1 text-sm text-slate-500">{t("wordsPracticed")}</p>
      </div>

      <div className="mb-4 flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        {segments.ready > 0 && (
          <div
            className="bg-blue-500 transition-all"
            style={{ width: `${segments.ready}%` }}
          />
        )}
        {segments.learning > 0 && (
          <div
            className="bg-emerald-300 transition-all"
            style={{ width: `${segments.learning}%` }}
          />
        )}
        {segments.learned > 0 && (
          <div
            className="bg-emerald-600 transition-all"
            style={{ width: `${segments.learned}%` }}
          />
        )}
      </div>

      <ul className="mb-6 space-y-2 text-sm text-slate-600">
        <li className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-blue-500" />
          {t("readyToPractice", { count: counts.ready })}
        </li>
        <li className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-emerald-300" />
          {t("upNext", { count: counts.learning })}
        </li>
        <li className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-emerald-600" />
          {t("learned", { count: counts.learned })}
        </li>
      </ul>

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          onClick={onAddWord}
          className={cn(
            "h-11 rounded-full border-2 border-slate-900 bg-white font-semibold text-slate-900 hover:bg-slate-50",
          )}
        >
          {t("addNewWords")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsHowToOpen(true)}
          className="h-11 rounded-full border-slate-200 font-medium text-slate-700"
        >
          {t("howToLearn")}
        </Button>
      </div>

      <Dialog open={isHowToOpen} onOpenChange={setIsHowToOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("howToLearnTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm leading-relaxed text-slate-600">
            {t("howToLearnDescription")}
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
