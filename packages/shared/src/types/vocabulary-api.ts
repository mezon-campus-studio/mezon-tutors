export type VocabularyWordStatus = 'ready' | 'learning' | 'learned';

export type VocabularyWordItem = {
  id: string;
  studentId: string;
  word: string;
  phonetic: string | null;
  partOfSpeech: string;
  definition: string;
  example: string | null;
  audioUrl: string | null;
  status: VocabularyWordStatus;
  createdAt: string;
  updatedAt: string;
};

export type CreateVocabularyWordBody = {
  word: string;
  phonetic?: string;
  partOfSpeech: string;
  definition: string;
  example?: string;
  audioUrl?: string;
};

export type UpdateVocabularyWordStatusBody = {
  status: VocabularyWordStatus;
};
