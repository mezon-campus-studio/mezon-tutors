"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { DashboardLayout } from "@/components/dashboard";
import { RoleGuard } from "@/components/guards/RoleGuard";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";
import { useGetVocabulary } from "@/services/vocabulary/vocabulary.api";
import AddWordModal from "./components/AddWordModal";
import FlashcardModal, {
  type ReadySessionCompleteResult,
} from "./components/FlashcardModal";
import QuizModal, { type QuizSessionResult } from "./components/QuizModal";
import WordSearchModal, {
  type WordSearchSessionResult,
} from "./components/WordSearchModal";
import MyVocabulary from "./components/MyVocabulary";
import VocabularyStats from "./components/VocabularyStats";

export default function PracticePage() {
  const t = useTranslations("Practice");
  const tFlashcards = useTranslations("Practice.flashcards");
  const tQuiz = useTranslations("Practice.quiz");
  const tWordSearch = useTranslations("Practice.wordSearch");
  const { data: words = [], isLoading } = useGetVocabulary();
  const [isAddWordOpen, setIsAddWordOpen] = useState(false);
  const [isFlashcardOpen, setIsFlashcardOpen] = useState(false);
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [isWordSearchOpen, setIsWordSearchOpen] = useState(false);
  const [isReadyCompleteOpen, setIsReadyCompleteOpen] = useState(false);
  const [isQuizCompleteOpen, setIsQuizCompleteOpen] = useState(false);
  const [isWordSearchCompleteOpen, setIsWordSearchCompleteOpen] =
    useState(false);
  const [readySessionResult, setReadySessionResult] =
    useState<ReadySessionCompleteResult | null>(null);
  const [quizSessionResult, setQuizSessionResult] =
    useState<QuizSessionResult | null>(null);
  const [wordSearchSessionResult, setWordSearchSessionResult] =
    useState<WordSearchSessionResult | null>(null);

  return (
    <RoleGuard allowedRoles={["STUDENT", "ADMIN"]}>
      <DashboardLayout>
        <div className="min-h-screen w-full max-w-full overflow-x-hidden">
          <div className="mx-auto w-full max-w-[1320px] px-4 py-6 md:px-6 md:py-8 lg:px-8">
            <div className="mb-6">
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
                {t("title")}
              </h1>
              <p className="mt-1 text-sm text-slate-500">{t("subtitle")}</p>
            </div>

            <div className="flex flex-col-reverse gap-6 lg:flex-row">
              <div className="min-w-0 flex-1">
                <MyVocabulary
                  words={words}
                  isLoading={isLoading}
                  onAddWord={() => setIsAddWordOpen(true)}
                  onOpenFlashcards={() => setIsFlashcardOpen(true)}
                  onOpenQuiz={() => setIsQuizOpen(true)}
                  onOpenWordSearch={() => setIsWordSearchOpen(true)}
                />
              </div>
              <div className="w-full shrink-0 lg:w-72">
                <VocabularyStats
                  words={words}
                  onAddWord={() => setIsAddWordOpen(true)}
                />
              </div>
            </div>
          </div>
        </div>

        <AddWordModal
          isOpen={isAddWordOpen}
          onClose={() => setIsAddWordOpen(false)}
          existingWords={words}
        />
        <FlashcardModal
          isOpen={isFlashcardOpen}
          onClose={() => setIsFlashcardOpen(false)}
          onReadySessionComplete={(result) => {
            setIsFlashcardOpen(false);
            setReadySessionResult(result);
            setIsReadyCompleteOpen(true);
          }}
          words={words}
        />
        <QuizModal
          isOpen={isQuizOpen}
          onClose={() => setIsQuizOpen(false)}
          onSessionComplete={(result) => {
            setIsQuizOpen(false);
            setQuizSessionResult(result);
            setIsQuizCompleteOpen(true);
          }}
          words={words}
        />
        <WordSearchModal
          isOpen={isWordSearchOpen}
          onClose={() => setIsWordSearchOpen(false)}
          onSessionComplete={(result) => {
            setIsWordSearchOpen(false);
            setWordSearchSessionResult(result);
            setIsWordSearchCompleteOpen(true);
          }}
          words={words}
        />

        <Dialog
          open={isWordSearchCompleteOpen}
          onOpenChange={setIsWordSearchCompleteOpen}
        >
          <DialogContent className="gap-4 rounded-2xl border-violet-100 sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900">
                {tWordSearch("sessionComplete.title")}
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm leading-relaxed text-slate-600">
              {tWordSearch("sessionComplete.description", {
                found: wordSearchSessionResult?.foundCount ?? 0,
                total: wordSearchSessionResult?.totalCount ?? 0,
              })}
            </p>
            <DialogFooter className="mx-0 mb-0 bg-transparent sm:justify-end">
              <Button
                type="button"
                onClick={() => setIsWordSearchCompleteOpen(false)}
                className="h-10 rounded-full bg-violet-600 px-6 hover:bg-violet-700"
              >
                {tWordSearch("sessionComplete.confirm")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={isQuizCompleteOpen}
          onOpenChange={setIsQuizCompleteOpen}
        >
          <DialogContent className="gap-4 rounded-2xl border-violet-100 sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900">
                {tQuiz("sessionComplete.title")}
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm leading-relaxed text-slate-600">
              {tQuiz("sessionComplete.description", {
                score: quizSessionResult?.score ?? 0,
                correct: quizSessionResult?.correctCount ?? 0,
                total: quizSessionResult?.totalCount ?? 0,
              })}
            </p>
            <DialogFooter className="mx-0 mb-0 bg-transparent sm:justify-end">
              <Button
                type="button"
                onClick={() => setIsQuizCompleteOpen(false)}
                className="h-10 rounded-full bg-violet-600 px-6 hover:bg-violet-700"
              >
                {tQuiz("sessionComplete.confirm")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={isReadyCompleteOpen}
          onOpenChange={setIsReadyCompleteOpen}
        >
          <DialogContent className="gap-4 rounded-2xl border-violet-100 sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900">
                {tFlashcards("readySessionComplete.title")}
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm leading-relaxed text-slate-600">
              {tFlashcards("readySessionComplete.description", {
                percent: readySessionResult?.percent ?? 0,
              })}
            </p>
            <DialogFooter className="mx-0 mb-0 bg-transparent sm:justify-end">
              <Button
                type="button"
                onClick={() => setIsReadyCompleteOpen(false)}
                className="h-10 rounded-full bg-violet-600 px-6 hover:bg-violet-700"
              >
                {tFlashcards("readySessionComplete.confirm")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </RoleGuard>
  );
}
