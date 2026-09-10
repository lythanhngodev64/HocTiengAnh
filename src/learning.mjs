import { themes, vocabulary, wordsForTheme } from './catalogue.mjs';

export function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function createQuestion(
  themeId,
  learnedIds = [],
  excludedIds = [],
  mode = 'name',
) {
  const words = wordsForTheme(themeId);
  const available = words.filter((word) => !excludedIds.includes(word.id));
  if (!available.length) throw new Error('No unasked words left in this test');
  const unlearned = available.filter((word) => !learnedIds.includes(word.id));
  const target = shuffle(unlearned.length ? unlearned : available)[0];
  // C and K share /k/. Never put both in one phonics question, even as distractors.
  const seen = new Set([mode === 'sound' ? target.phoneme : target.id]);
  const distractors = shuffle(words.filter((w) => w.id !== target.id))
    .filter((word) => {
      const key = mode === 'sound' ? word.phoneme : word.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 3);
  return { target, options: shuffle([target, ...distractors]) };
}

export function reconcileProgress(value) {
  const validIds = new Set(vocabulary.map((word) => word.id));
  const learnedIds = [
    ...new Set(
      (Array.isArray(value?.learnedIds) ? value.learnedIds : []).filter(
        (id) => typeof id === 'string' && validIds.has(id),
      ),
    ),
  ];
  const stars =
    typeof value?.stars === 'number' && Number.isFinite(value.stars)
      ? Math.max(0, Math.floor(value.stars))
      : 0;
  return {
    stars,
    learnedIds,
    history: reconcileHistory(value?.history),
    badges: themes
      .filter((theme) => theme.wordIds.every((id) => learnedIds.includes(id)))
      .map((theme) => theme.id),
  };
}

export function reconcileHistory(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value
    .flatMap((entry) => {
      const theme = themes.find((item) => item.id === entry?.themeId);
      if (
        !theme ||
        typeof entry.id !== 'string' ||
        !entry.id ||
        seen.has(entry.id) ||
        typeof entry.completedAt !== 'string' ||
        !Number.isFinite(Date.parse(entry.completedAt)) ||
        !['name', 'sound'].includes(entry.mode) ||
        (entry.mode === 'sound' && theme.id !== 'alphabet') ||
        !Array.isArray(entry.answers) ||
        entry.answers.length !== Math.min(10, theme.wordIds.length)
      )
        return [];
      const ids = new Set();
      for (const answer of entry.answers) {
        if (
          !answer ||
          !theme.wordIds.includes(answer.wordId) ||
          ids.has(answer.wordId) ||
          typeof answer.firstTryCorrect !== 'boolean'
        )
          return [];
        ids.add(answer.wordId);
      }
      seen.add(entry.id);
      const answers = entry.answers.map(({ wordId, firstTryCorrect }) => ({
        wordId,
        firstTryCorrect,
      }));
      const correct = answers.filter((answer) => answer.firstTryCorrect).length;
      return [
        {
          id: entry.id,
          completedAt: entry.completedAt,
          themeId: theme.id,
          mode: entry.mode,
          answers,
          correct,
          score: Math.round((correct / answers.length) * 100),
        },
      ];
    })
    .sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt));
}

export function recordCompletedTest(progress, entry) {
  return reconcileProgress({
    ...progress,
    history: [...(progress.history ?? []), entry],
  });
}
