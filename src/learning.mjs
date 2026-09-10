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
    badges: themes
      .filter((theme) => theme.wordIds.every((id) => learnedIds.includes(id)))
      .map((theme) => theme.id),
  };
}
