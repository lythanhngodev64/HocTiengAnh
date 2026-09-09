import vocabularyData from './vocabulary-data.json';

export type ThemeId =
  | 'bedroom'
  | 'living'
  | 'garden'
  | 'hygiene'
  | 'kitchen'
  | 'family'
  | 'body'
  | 'clothes'
  | 'animals'
  | 'food'
  | 'school'
  | 'toys';

export type Theme = {
  id: ThemeId;
  label: string;
  shortLabel: string;
  icon: string;
  color: string;
  description: string;
};

export type VocabularyWord = {
  id: string;
  themeId: ThemeId;
  word: string;
  meaning: string;
  imageFile: string;
  columns: 5;
  index: number;
};

export const themes = vocabularyData.themes as Theme[];

export const vocabulary = vocabularyData.words.map((word) => ({
  ...word,
  themeId: word.themeId as ThemeId,
  columns: 5 as const,
})) satisfies VocabularyWord[];

export const totalWords = vocabulary.length;

export function wordsForTheme(themeId: ThemeId) {
  return vocabulary.filter((word) => word.themeId === themeId);
}
