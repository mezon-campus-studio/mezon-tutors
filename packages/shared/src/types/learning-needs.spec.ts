import { describe, expect, it } from 'vitest';
import { getLearningNeedsSubjectCategory, isLanguageLearningSubject } from './learning-needs';

describe('isLanguageLearningSubject', () => {
  it.each(['English', 'Tiếng Anh', 'Japanese language', 'French'])(
    '%s is language learning',
    (subject) => {
      expect(isLanguageLearningSubject(subject)).toBe(true);
    }
  );

  it.each(['Mathematics', 'Physics', 'Computer Science', 'Piano'])(
    '%s uses general learning labels',
    (subject) => {
      expect(isLanguageLearningSubject(subject)).toBe(false);
    }
  );
});

describe('getLearningNeedsSubjectCategory', () => {
  it.each([
    ['English', 'language'],
    ['Mathematics', 'stem'],
    ['Computer Science', 'stem'],
    ['Piano', 'creative'],
    ['Art and design', 'creative'],
    ['Public speaking', 'general'],
  ] as const)('classifies %s as %s', (subject, category) => {
    expect(getLearningNeedsSubjectCategory(subject)).toBe(category);
  });
});
