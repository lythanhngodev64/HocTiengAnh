import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { themes, wordsForTheme, wordById } from '../src/catalogue.mjs';
import {
  reconcileProgress,
  selectLessonWords,
  lessonOptions,
  recordPracticeAnswer,
  recordCompletedTest,
} from '../src/learning.mjs';
import { rooms } from '../src/room-scenes.mjs';

test('every short lesson uses at most five known, unique words and 2–4 introduced choices', () => {
  for (const theme of themes) {
    for (const mode of theme.id === 'alphabet' ? ['name', 'sound'] : ['name']) {
      const words = selectLessonWords(theme.id, reconcileProgress(null), mode);
      assert.equal(words.length, Math.min(5, theme.wordIds.length));
      assert.equal(new Set(words.map((w) => w.id)).size, words.length);
      if (mode === 'sound')
        assert.equal(new Set(words.map((w) => w.phoneme)).size, words.length);
      for (const word of words)
        for (const count of [2, 3, 4]) {
          const options = lessonOptions(words, word, count, mode);
          assert.equal(options.length, Math.min(count, words.length));
          assert.ok(options.includes(word));
          assert.ok(options.every((option) => words.includes(option)));
          assert.equal(
            new Set(options.map((w) => (mode === 'sound' ? w.phoneme : w.id)))
              .size,
            options.length,
          );
        }
    }
  }
});

test('review prefers last mistakes then oldest practice, reserving three new words', () => {
  let progress = reconcileProgress(null);
  progress = recordPracticeAnswer(
    progress,
    'bed',
    'name',
    true,
    '2026-01-01T00:00:00Z',
  );
  progress = recordPracticeAnswer(
    progress,
    'pillow',
    'name',
    true,
    '2026-02-01T00:00:00Z',
  );
  progress = recordPracticeAnswer(
    progress,
    'wardrobe',
    'name',
    false,
    '2026-03-01T00:00:00Z',
  );
  const selected = selectLessonWords('bedroom', progress).map((w) => w.id);
  assert.deepEqual(selected.slice(0, 2), ['wardrobe', 'bed']);
  assert.equal(
    selected.filter((id) => !progress.learnedIds.includes(id)).length,
    3,
  );
  progress = recordPracticeAnswer(
    progress,
    'wardrobe',
    'name',
    true,
    '2026-04-01T00:00:00Z',
  );
  assert.deepEqual(
    selectLessonWords('bedroom', progress)
      .slice(0, 2)
      .map((w) => w.id),
    ['bed', 'pillow'],
  );
  assert.equal(progress.stars, 3);
});

test('all-known and short topics remain playable; phonics progress stays separate', () => {
  const words = wordsForTheme('bedroom');
  const old = reconcileProgress({
    stars: 30,
    learnedIds: words.map((w) => w.id),
  });
  assert.equal(selectLessonWords('bedroom', old).length, 5);
  assert.equal(selectLessonWords('seasons', old).length, 4);
  const named = recordPracticeAnswer(
    old,
    'letter-a',
    'name',
    false,
    '2026-09-01T00:00:00Z',
  );
  assert.equal(named.practice['letter-a:sound'], undefined);
  assert.equal(named.practice['letter-a:name'].firstTryCorrect, false);
});

test('legacy tests and short learning histories roundtrip without losing scores, stars or records', () => {
  const legacy = {
    id: 'old',
    themeId: 'bedroom',
    mode: 'name',
    completedAt: '2026-09-01T00:00:00Z',
    answers: wordsForTheme('bedroom')
      .slice(0, 10)
      .map((w, i) => ({ wordId: w.id, firstTryCorrect: i < 7 })),
  };
  let progress = reconcileProgress({
    stars: 8,
    learnedIds: ['bed'],
    history: [legacy],
  });
  assert.equal(progress.history[0].activity, 'test');
  assert.equal(progress.history[0].score, 70);
  const learn = {
    ...legacy,
    id: 'learn',
    activity: 'learn',
    completedAt: '2026-09-02T00:00:00Z',
    answers: legacy.answers.slice(0, 5),
  };
  progress = recordCompletedTest(progress, learn);
  progress = recordCompletedTest(progress, learn);
  assert.equal(progress.history.length, 2);
  assert.equal(progress.history[0].activity, 'learn');
  assert.equal(progress.practice['bed:name'].at, learn.completedAt);
  assert.equal(progress.stars, 8);
  assert.deepEqual(
    reconcileProgress(JSON.parse(JSON.stringify(progress))),
    progress,
  );
  assert.equal(
    recordCompletedTest(progress, {
      ...learn,
      id: 'partial',
      answers: learn.answers.slice(0, 2),
    }).history.length,
    2,
  );
  assert.deepEqual(reconcileProgress(null).practice, {});
});

test('all four scene assets and audio targets exist; touch boxes stay separated and large on phones', () => {
  assert.equal(rooms.length, 4);
  for (const room of rooms) {
    assert.ok(existsSync(`public/${room.image}`));
    const bytes = readFileSync(`public/${room.image}`);
    assert.equal(bytes.readUInt32BE(16), bytes.readUInt32BE(20));
    assert.equal(room.targets.length, 5);
    assert.equal(new Set(room.targets.map((t) => t.wordId)).size, 5);
    for (const target of room.targets) {
      assert.ok(wordById(target.wordId));
      assert.ok(existsSync(`public/audio/openai-coral/${target.wordId}.mp3`));
      assert.ok(
        existsSync(`public/audio/openai-coral/${target.wordId}-slow.mp3`),
      );
      const [x, y, w, h] = target.box;
      assert.ok(x >= 0 && y >= 0 && x + w <= 100 && y + h <= 100);
      assert.ok(w * 2.8 >= 44 && h * 2.8 >= 44);
      for (const other of room.targets.filter((t) => t !== target)) {
        const [ox, oy, ow, oh] = other.box;
        assert.ok(x + w <= ox || ox + ow <= x || y + h <= oy || oy + oh <= y);
      }
    }
  }
});
