import test from 'node:test';
import assert from 'node:assert/strict';
import legacy from '../src/vocabulary-data.json' with { type: 'json' };
import {
  themes,
  vocabulary,
  allWords,
  wordsForTheme,
} from '../src/catalogue.mjs';
import { createQuestion, reconcileProgress } from '../src/learning.mjs';

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
  });
});
