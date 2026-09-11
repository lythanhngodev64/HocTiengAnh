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
  return questionForTarget(words, target, mode);
}

function questionForTarget(words, target, mode, random = Math.random) {
  // C and K share /k/. Never put both in one phonics question, even as distractors.
  const seen = new Set([mode === 'sound' ? target.phoneme : target.id]);
  const distractors = shuffle(
    words.filter((w) => w.id !== target.id),
    random,
  )
    .filter((word) => {
      const key = mode === 'sound' ? word.phoneme : word.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 3);
  return { target, options: shuffle([target, ...distractors], random) };
}

export function wordsForTestPart(themeId, testPart) {
  if (![1, 2].includes(testPart)) throw new Error('Invalid test part');
  const words = wordsForTheme(themeId);
  const middle = Math.ceil(words.length / 2);
  return testPart === 1 ? words.slice(0, middle) : words.slice(middle);
}

export function createTestSession(
  themeId,
  testPart,
  progress,
  mode = 'name',
  random = Math.random,
) {
  if (
    !['name', 'sound'].includes(mode) ||
    (mode === 'sound' && themeId !== 'alphabet')
  )
    throw new Error('Invalid test mode');
  const words = wordsForTheme(themeId);
  const pool = wordsForTestPart(themeId, testPart);
  if (!pool.length) throw new Error('Empty test part');
  const practice = reconcileProgress(progress).practice;
  const last = (word) => practice[`${word.id}:${mode}`];
  // Shuffle ties first, then prioritize never-practised and least-recent words.
  const targets = shuffle(pool, random)
    .sort((a, b) => {
      const aLast = last(a);
      const bLast = last(b);
      if (!aLast || !bLast) return Number(!!aLast) - Number(!!bLast);
      return Date.parse(aLast.at) - Date.parse(bLast.at);
    })
    .slice(0, 5);
  return {
    id: crypto.randomUUID(),
    themeId,
    testPart,
    mode,
    questions: targets.map((target) =>
      questionForTarget(words, target, mode, random),
    ),
    index: 0,
    answers: [],
    wrongOptionIds: [],
    started: false,
    completed: false,
  };
}

// Session/word guards also reject events queued before a restart or next question.
export function answerTestSession(session, sessionId, wordId, optionId) {
  const question = session.questions[session.index];
  if (
    session.id !== sessionId ||
    session.completed ||
    question.target.id !== wordId ||
    session.answers.length > session.index ||
    !question.options.some((word) => word.id === optionId)
  )
    return session;
  if (optionId !== wordId) {
    if (session.wrongOptionIds.includes(optionId)) return session;
    return {
      ...session,
      started: true,
      wrongOptionIds: [...session.wrongOptionIds, optionId],
    };
  }
  return {
    ...session,
    started: true,
    answers: [
      ...session.answers,
      { wordId, firstTryCorrect: session.wrongOptionIds.length === 0 },
    ],
  };
}

export function advanceTestSession(session, sessionId, wordId) {
  if (
    session.id !== sessionId ||
    session.completed ||
    session.questions[session.index].target.id !== wordId ||
    session.answers.length !== session.index + 1
  )
    return session;
  if (session.answers.length === session.questions.length)
    return { ...session, completed: true };
  return { ...session, index: session.index + 1, wrongOptionIds: [] };
}

export function isTestInProgress(session) {
  return session.started && !session.completed;
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
  const history = reconcileHistory(value?.history);
  const practice = reconcilePractice(value?.practice);
  for (const entry of history) {
    for (const answer of entry.answers) {
      const key = `${answer.wordId}:${entry.mode}`;
      if (
        !practice[key] ||
        Date.parse(practice[key].at) < Date.parse(entry.completedAt)
      )
        practice[key] = {
          at: entry.completedAt,
          firstTryCorrect: answer.firstTryCorrect,
        };
    }
  }
  return {
    stars,
    learnedIds,
    history,
    practice,
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
      const activity = entry?.activity ?? 'test';
      const hasPart = entry?.testPart !== undefined;
      if (hasPart && (activity !== 'test' || ![1, 2].includes(entry.testPart)))
        return [];
      const pool =
        theme && hasPart
          ? wordsForTestPart(theme.id, entry.testPart).map((word) => word.id)
          : theme?.wordIds;
      if (
        !theme ||
        typeof entry.id !== 'string' ||
        !entry.id ||
        seen.has(entry.id) ||
        typeof entry.completedAt !== 'string' ||
        !Number.isFinite(Date.parse(entry.completedAt)) ||
        !['name', 'sound'].includes(entry.mode) ||
        !['test', 'learn'].includes(activity) ||
        (entry.mode === 'sound' && theme.id !== 'alphabet') ||
        !Array.isArray(entry.answers) ||
        entry.answers.length !==
          Math.min(activity === 'learn' || hasPart ? 5 : 10, pool.length)
      )
        return [];
      const ids = new Set();
      for (const answer of entry.answers) {
        if (
          !answer ||
          !pool.includes(answer.wordId) ||
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
          activity,
          ...(hasPart ? { testPart: entry.testPart } : {}),
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

export function reconcilePractice(value) {
  /** @type {Record<string, {at: string, firstTryCorrect: boolean}>} */
  const result = {};
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return result;
  const ids = new Map(vocabulary.map((word) => [word.id, word]));
  for (const [key, item] of Object.entries(value)) {
    const [id, mode] = key.split(':');
    if (
      !ids.has(id) ||
      !['name', 'sound'].includes(mode) ||
      (mode === 'sound' && ids.get(id).kind !== 'letter') ||
      typeof item?.at !== 'string' ||
      !Number.isFinite(Date.parse(item.at)) ||
      typeof item.firstTryCorrect !== 'boolean'
    )
      continue;
    result[key] = { at: item.at, firstTryCorrect: item.firstTryCorrect };
  }
  return result;
}

export function recordPracticeAnswer(
  progress,
  wordId,
  mode,
  firstTryCorrect,
  at,
  markLearned = true,
) {
  const learnedIds = progress.learnedIds ?? [];
  return reconcileProgress({
    ...progress,
    learnedIds: markLearned
      ? [...new Set([...learnedIds, wordId])]
      : learnedIds,
    stars:
      (progress.stars ?? 0) +
      (!markLearned || learnedIds.includes(wordId) ? 0 : 1),
    practice: {
      ...progress.practice,
      [`${wordId}:${mode}`]: { at, firstTryCorrect },
    },
  });
}

export function selectLessonWords(themeId, progress, mode = 'name') {
  const words = wordsForTheme(themeId);
  const practice = reconcileProgress(progress).practice;
  const learned = new Set(progress?.learnedIds ?? []);
  const previous = words.filter(
    (word) =>
      practice[`${word.id}:${mode}`] ||
      (mode === 'name' && learned.has(word.id)),
  );
  const last = (word) => practice[`${word.id}:${mode}`];
  previous.sort(
    (a, b) =>
      Number(last(a)?.firstTryCorrect !== false) -
        Number(last(b)?.firstTryCorrect !== false) ||
      Date.parse(last(a)?.at ?? '1970-01-01') -
        Date.parse(last(b)?.at ?? '1970-01-01'),
  );
  const chosen = [];
  const seen = new Set();
  const add = (word) => {
    const key = mode === 'sound' ? word.phoneme : word.id;
    if (chosen.length < Math.min(5, words.length) && !seen.has(key)) {
      chosen.push(word);
      seen.add(key);
    }
  };
  for (const word of previous) {
    if (chosen.length >= 2) break;
    add(word);
  }
  words.filter((word) => !previous.includes(word)).forEach(add);
  previous.forEach(add);
  return chosen;
}

export function lessonOptions(
  words,
  target,
  count = 2,
  mode = 'name',
  random = Math.random,
) {
  const seen = new Set([mode === 'sound' ? target.phoneme : target.id]);
  const others = shuffle(
    words.filter((word) => word.id !== target.id),
    random,
  ).filter((word) => {
    const key = mode === 'sound' ? word.phoneme : word.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return shuffle(
    [target, ...others.slice(0, Math.max(1, Math.min(4, count) - 1))],
    random,
  );
}
