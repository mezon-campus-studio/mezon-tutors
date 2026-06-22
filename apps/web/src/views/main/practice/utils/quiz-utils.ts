import type { VocabularyWordItem } from "@mezon-tutors/shared";

export type QuizQuestion = {
  target: VocabularyWordItem;
  options: VocabularyWordItem[];
};

export type QuizSessionResult = {
  score: number;
  correctCount: number;
  totalCount: number;
};

const MIN_OPTIONS = 4;

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function buildQuizOptionPool(
  words: VocabularyWordItem[],
): VocabularyWordItem[] {
  const learned = words.filter((w) => w.status === "learned");

  if (learned.length >= MIN_OPTIONS) {
    return learned;
  }

  const pool = [...learned];
  const seen = new Set(pool.map((w) => w.id));

  for (const word of words) {
    if (pool.length >= MIN_OPTIONS) break;
    if (word.status !== "learning" && word.status !== "ready") continue;
    if (seen.has(word.id)) continue;
    seen.add(word.id);
    pool.push(word);
  }

  return pool;
}

export function buildQuizQuestions(
  words: VocabularyWordItem[],
): QuizQuestion[] {
  const optionPool = buildQuizOptionPool(words);
  if (optionPool.length < MIN_OPTIONS) {
    return [];
  }

  const learned = words.filter((w) => w.status === "learned");
  const questionWords =
    learned.length > 0
      ? learned
      : optionPool.filter((w) => w.status !== "learned");

  return shuffle(questionWords).map((target) => {
    const distractors = shuffle(
      optionPool.filter((w) => w.id !== target.id),
    ).slice(0, MIN_OPTIONS - 1);

    return {
      target,
      options: shuffle([target, ...distractors]),
    };
  });
}

export function calculateQuizScore(
  correctCount: number,
  totalCount: number,
): number {
  if (totalCount <= 0) return 0;
  return Math.round((correctCount / totalCount) * 10 * 100) / 100;
}
