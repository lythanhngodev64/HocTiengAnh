import * as catalogue from './catalogue.mjs';

export type ThemeId = string;

export type Theme = {
  id: ThemeId;
  label: string;
  shortLabel: string;
  icon: string;
  color: string;
  description: string;
  groupId: string;
  wordIds: string[];
};

export type VocabularyWord = {
  id: string;
  word: string;
  meaning: string;
  imageFile: string;
  kind: 'picture' | 'letter' | 'number' | 'color' | 'shape' | 'day' | 'month';
  value?: string;
  phoneme?: string;
  exampleId?: string;
  spriteIndex?: number;
};

export const groups = catalogue.groups;
export const themes = catalogue.themes as Theme[];
export const vocabulary = catalogue.vocabulary as VocabularyWord[];

export const totalWords = vocabulary.length;

export const wordsForTheme = catalogue.wordsForTheme as (
  id: ThemeId,
) => VocabularyWord[];
export const wordById = catalogue.wordById as (
  id: string,
) => VocabularyWord | undefined;
