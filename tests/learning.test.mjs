import test from 'node:test';
import assert from 'node:assert/strict';
import legacy from '../src/vocabulary-data.json' with { type: 'json' };
import {
  themes,
  vocabulary,
  allWords,
  wordsForTheme,
} from '../src/catalogue.mjs';
import {
  createQuestion,
  reconcileProgress,
  recordCompletedTest,
} from '../src/learning.mjs';

test('41 topics, fixed educational sets, every legacy word retained', () => {
  assert.equal(themes.length, 41);
  for (const [id, count] of [
    ['alphabet', 26],
    ['numbers', 20],
    ['days', 7],
    ['months', 12],
    ['seasons', 4],
  ])
    assert.equal(wordsForTheme(id).length, count);
  assert.equal(new Set(allWords.map((w) => w.id)).size, allWords.length);
  for (const word of legacy.words)
    assert.ok(vocabulary.some((w) => w.id === word.id));
});
test('every topic has complete nonrepeating tests and four distinct answers', () => {
  for (const theme of themes) {
    const excluded = [];
    for (let round = 0; round < Math.min(10, theme.wordIds.length); round++) {
      const q = createQuestion(theme.id, [], excluded);
      assert.ok(!excluded.includes(q.target.id));
      assert.equal(q.options.length, 4);
      assert.equal(new Set(q.options.map((w) => w.id)).size, 4);
      assert.equal(q.options.filter((w) => w.id === q.target.id).length, 1);
      excluded.push(q.target.id);
    }
  }
});
test('phonics choices never contain equivalent sounds, including distractors', () => {
  const excluded = [];
  for (let i = 0; i < 26; i++) {
    const q = createQuestion('alphabet', [], excluded, 'sound');
    assert.equal(new Set(q.options.map((w) => w.phoneme)).size, 4);
    excluded.push(q.target.id);
  }
});
test('migration preserves stars and words but recomputes changed badges', () => {
  const old = {
    stars: 120,
    learnedIds: legacy.words.map((w) => w.id),
    badges: legacy.themes.map((t) => t.id),
  };
  const migrated = reconcileProgress(old);
  assert.equal(migrated.stars, 120);
  assert.equal(migrated.learnedIds.length, 120);
  assert.ok(migrated.badges.includes('bedroom'));
  assert.ok(!migrated.badges.includes('school'));
  assert.ok(!migrated.badges.includes('food'));
});
test('shared words count once; invalid stored progress cannot corrupt totals', () => {
  assert.ok(wordsForTheme('animals').some((w) => w.id === 'cat'));
  assert.ok(wordsForTheme('domestic').some((w) => w.id === 'cat'));
  assert.equal(
    reconcileProgress({
      learnedIds: ['cat', 'cat', 'unknown', null],
      stars: Infinity,
    }).learnedIds.length,
    1,
  );
  assert.equal(reconcileProgress({ stars: -10 }).stars, 0);
  assert.deepEqual(reconcileProgress(null), {
    stars: 0,
    learnedIds: [],
    badges: [],
    history: [],
  });
});

function completed(themeId = 'bedroom', id = 'test-1', mode = 'name') {
  return {
    id,
    themeId,
    mode,
    completedAt: '2026-09-10T08:00:00.000Z',
    answers: wordsForTheme(themeId)
      .slice(0, 10)
      .map((word, index) => ({ wordId: word.id, firstTryCorrect: index < 7 })),
  };
}

test('history migration, completion, replay and reload retain exactly one result per session', () => {
  const old = reconcileProgress({ stars: 8, learnedIds: ['cat'] });
  assert.deepEqual(old.history, []);
  const first = recordCompletedTest(old, completed());
  assert.equal(first.history[0].score, 70);
  assert.equal(first.history[0].correct, 7);
  assert.equal(
    first.history[0].answers.filter((a) => !a.firstTryCorrect).length,
    3,
  );
  assert.equal(recordCompletedTest(first, completed()).history.length, 1);
  const replay = recordCompletedTest(first, {
    ...completed('bedroom', 'test-2'),
    completedAt: '2026-09-11T08:00:00Z',
  });
  assert.equal(replay.history[0].id, 'test-2');
  assert.deepEqual(
    reconcileProgress(JSON.parse(JSON.stringify(replay))),
    replay,
  );
  assert.equal(replay.stars, 8);
  assert.deepEqual(replay.learnedIds, ['cat']);
  assert.deepEqual(reconcileProgress(null).history, []);
});

test('short tests normalize to 100 and alphabet modes stay distinct', () => {
  const short = completed('seasons');
  short.answers[0].firstTryCorrect = false;
  assert.equal(recordCompletedTest({}, short).history[0].score, 75);
  const names = recordCompletedTest({}, completed('alphabet', 'names', 'name'));
  const sounds = recordCompletedTest(
    names,
    completed('alphabet', 'sounds', 'sound'),
  );
  assert.deepEqual(
    new Set(sounds.history.map((item) => item.mode)),
    new Set(['name', 'sound']),
  );
});

test('invalid, incomplete and duplicate-word results are not presented as completed tests', () => {
  for (const entry of [
    null,
    {},
    { ...completed(), completedAt: 'bad' },
    { ...completed(), answers: completed().answers.slice(1) },
    { ...completed(), answers: Array(10).fill(completed().answers[0]) },
    completed('bedroom', 'bad-mode', 'sound'),
  ]) {
    assert.deepEqual(recordCompletedTest({}, entry).history, []);
  }
  assert.deepEqual(reconcileProgress({ history: {} }).history, []);
  let progress = reconcileProgress(null);
  for (let i = 0; i < 25; i++)
    progress = recordCompletedTest(
      progress,
      completed('bedroom', `session-${i}`),
    );
  assert.equal(progress.history.length, 25);
});
