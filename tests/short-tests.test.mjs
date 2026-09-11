import test from 'node:test';
import assert from 'node:assert/strict';
import { themes, wordsForTheme } from '../src/catalogue.mjs';
import {
  wordsForTestPart,
  createTestSession,
  answerTestSession,
  advanceTestSession,
  isTestInProgress,
  reconcileProgress,
  recordPracticeAnswer,
  recordCompletedTest,
} from '../src/learning.mjs';

const ids = (words) => words.map((word) => word.id);
const targets = (session) => session.questions.map((q) => q.target.id);
const modes = (themeId) =>
  themeId === 'alphabet' ? ['name', 'sound'] : ['name'];
function result(session, completedAt = '2026-09-11T08:00:00Z') {
  return {
    id: session.id,
    activity: 'test',
    themeId: session.themeId,
    testPart: session.testPart,
    mode: session.mode,
    answers: session.answers,
    completedAt,
  };
}

function finish(session, mistakes = 0) {
  while (!session.completed) {
    const q = session.questions[session.index];
    if (session.index < mistakes) {
      const wrong = q.options.find((word) => word.id !== q.target.id);
      session = answerTestSession(session, session.id, q.target.id, wrong.id);
    }
    session = answerTestSession(session, session.id, q.target.id, q.target.id);
    session = advanceTestSession(session, session.id, q.target.id);
  }
  return session;
}

test('all 41 topics split into two balanced, disjoint pools covering every word, with 2–5 questions and four choices', () => {
  for (const theme of themes) {
    const first = ids(wordsForTestPart(theme.id, 1));
    const second = ids(wordsForTestPart(theme.id, 2));
    assert.deepEqual([...first, ...second], theme.wordIds);
    assert.ok(
      first.length - second.length >= 0 && first.length - second.length <= 1,
    );
    assert.ok(!first.some((id) => second.includes(id)));
    for (const mode of modes(theme.id)) {
      for (const part of [1, 2]) {
        const pool = part === 1 ? first : second;
        const session = createTestSession(theme.id, part, {}, mode);
        assert.equal(session.questions.length, Math.min(5, pool.length));
        assert.equal(new Set(targets(session)).size, session.questions.length);
        for (const q of session.questions) {
          assert.ok(pool.includes(q.target.id));
          assert.equal(q.options.length, 4);
          assert.equal(new Set(ids(q.options)).size, 4);
          assert.equal(
            q.options.filter((word) => word.id === q.target.id).length,
            1,
          );
          assert.ok(q.options.every((word) => theme.wordIds.includes(word.id)));
          if (mode === 'sound')
            assert.equal(new Set(q.options.map((w) => w.phoneme)).size, 4);
        }
        const recorded = recordCompletedTest({}, result(finish(session)));
        assert.equal(recorded.history.length, 1);
        assert.equal(recorded.history[0].testPart, part);
        assert.equal(recorded.history[0].score, 100);
      }
    }
  }
});

test('selection prioritizes unpractised then oldest in the chosen mode; equal priorities are shuffled', () => {
  const pool = wordsForTestPart('bedroom', 1);
  const practice = Object.fromEntries(
    pool.map((word, i) => [
      `${word.id}:name`,
      { at: `2026-09-0${i + 1}T00:00:00Z`, firstTryCorrect: true },
    ]),
  );
  delete practice[`${pool[5].id}:name`];
  const selected = createTestSession('bedroom', 1, { practice });
  assert.deepEqual(targets(selected), [pool[5].id, ...ids(pool.slice(0, 4))]);
  const identityShuffle = () => 0.999999;
  const shuffled = createTestSession('alphabet', 1, {}, 'name', () => 0);
  const ordered = createTestSession('alphabet', 1, {}, 'name', identityShuffle);
  assert.notDeepEqual(targets(shuffled), targets(ordered));
  const names = Object.fromEntries(
    wordsForTestPart('alphabet', 1)
      .slice(0, 5)
      .map((word) => [
        `${word.id}:name`,
        { at: '2026-09-10T00:00:00Z', firstTryCorrect: true },
      ]),
  );
  assert.deepEqual(
    targets(
      createTestSession(
        'alphabet',
        1,
        { practice: names },
        'sound',
        identityShuffle,
      ),
    ),
    targets(ordered),
  );
  assert.ok(
    targets(
      createTestSession(
        'alphabet',
        1,
        { practice: names },
        'name',
        identityShuffle,
      ),
    ).every((id) => !names[`${id}:name`]),
  );
});

test('repeated completed parts rotate through the whole pool, including all-known words, without mutating a running quiz', () => {
  for (const themeId of ['bedroom', 'alphabet']) {
    for (const part of [1, 2]) {
      for (const mode of modes(themeId)) {
        let progress = reconcileProgress({
          learnedIds: ids(wordsForTheme(themeId)),
          stars: 70,
        });
        const seen = new Set();
        const pool = wordsForTestPart(themeId, part);
        for (let i = 0; i < Math.ceil(pool.length / 5); i++) {
          const session = createTestSession(themeId, part, progress, mode);
          const snapshot = JSON.stringify(session.questions);
          for (const q of session.questions) {
            seen.add(q.target.id);
            progress = recordPracticeAnswer(
              progress,
              q.target.id,
              mode,
              true,
              `2026-09-${11 + i}T08:00:00Z`,
            );
          }
          assert.equal(JSON.stringify(session.questions), snapshot);
          progress = recordCompletedTest(
            progress,
            result(finish(session), `2026-09-${11 + i}T08:00:00Z`),
          );
        }
        assert.deepEqual(seen, new Set(ids(pool)));
        assert.equal(progress.stars, 70);
      }
    }
  }
});

test('wrong then correct, rapid answers/next, stale events and completion are guarded for 2/3/4/5-question sessions', () => {
  for (const [themeId, part, count, score] of [
    ['seasons', 1, 2, 50],
    ['days', 2, 3, 67],
    ['days', 1, 4, 75],
    ['bedroom', 2, 5, 80],
  ]) {
    let session = createTestSession(themeId, part, {});
    assert.equal(session.questions.length, count);
    assert.equal(isTestInProgress(session), false);
    assert.equal(isTestInProgress({ ...session, started: true }), true);
    const first = session.questions[0];
    assert.equal(
      advanceTestSession(session, session.id, first.target.id),
      session,
    );
    const wrong = first.options.find((w) => w.id !== first.target.id);
    session = answerTestSession(session, session.id, first.target.id, wrong.id);
    assert.equal(isTestInProgress(session), true);
    assert.equal(
      answerTestSession(session, session.id, first.target.id, wrong.id),
      session,
    );
    session = answerTestSession(
      session,
      session.id,
      first.target.id,
      first.target.id,
    );
    assert.equal(session.answers[0].firstTryCorrect, false);
    assert.equal(
      answerTestSession(session, session.id, first.target.id, first.target.id),
      session,
    );
    session = advanceTestSession(session, session.id, first.target.id);
    assert.equal(session.index, 1);
    assert.equal(
      advanceTestSession(session, session.id, first.target.id),
      session,
    );
    assert.equal(
      answerTestSession(session, session.id, first.target.id, first.target.id),
      session,
    );
    const second = session.questions[1];
    assert.equal(
      answerTestSession(
        session,
        'old-session',
        second.target.id,
        second.target.id,
      ),
      session,
    );
    const unfinished = recordCompletedTest({}, result(session));
    assert.equal(unfinished.history.length, 0);
    session = finish(session);
    assert.equal(isTestInProgress(session), false);
    assert.equal(
      advanceTestSession(
        session,
        session.id,
        session.questions.at(-1).target.id,
      ),
      session,
    );
    let progress = recordCompletedTest({}, result(session));
    progress = recordCompletedTest(progress, result(session));
    assert.equal(progress.history.length, 1);
    assert.equal(progress.history[0].score, score);
    assert.equal(progress.history[0].correct, count - 1);
    const replay = finish(createTestSession(themeId, part, progress));
    assert.notEqual(replay.id, session.id);
    progress = recordCompletedTest(
      progress,
      result(replay, '2026-09-11T09:00:00Z'),
    );
    assert.equal(progress.history.length, 2);
    assert.equal(progress.history[0].id, replay.id);
    assert.deepEqual(
      reconcileProgress(JSON.parse(JSON.stringify(progress))),
      progress,
    );
  }
});

test('legacy tests and lessons coexist with both new parts and both alphabet modes through reload and reset', () => {
  const legacyTest = {
    id: 'legacy-test',
    themeId: 'bedroom',
    mode: 'name',
    completedAt: '2026-09-01T00:00:00Z',
    answers: wordsForTheme('bedroom')
      .slice(0, 10)
      .map((w, i) => ({ wordId: w.id, firstTryCorrect: i < 7 })),
  };
  const legacyLesson = {
    ...legacyTest,
    id: 'legacy-lesson',
    activity: 'learn',
    answers: legacyTest.answers.slice(0, 5),
  };
  let progress = reconcileProgress({
    stars: 120,
    learnedIds: ['cat', 'cat'],
    history: [legacyTest, legacyLesson],
  });
  for (const mode of ['name', 'sound']) {
    for (const part of [1, 2]) {
      progress = recordCompletedTest(
        progress,
        result(finish(createTestSession('alphabet', part, progress, mode))),
      );
    }
  }
  assert.equal(progress.history.length, 6);
  const old = progress.history.find((entry) => entry.id === legacyTest.id);
  assert.equal(old.score, 70);
  assert.equal(old.answers.length, 10);
  assert.equal('testPart' in old, false);
  assert.equal(
    'testPart' in progress.history.find((entry) => entry.activity === 'learn'),
    false,
  );
  assert.equal(progress.stars, 120);
  assert.deepEqual(progress.learnedIds, ['cat']);
  assert.deepEqual(
    reconcileProgress(JSON.parse(JSON.stringify(progress))),
    progress,
  );
  assert.deepEqual(reconcileProgress(null), {
    stars: 0,
    learnedIds: [],
    badges: [],
    history: [],
    practice: {},
  });
});

test('invalid part metadata, foreign-pool answers, wrong lengths and duplicate words cannot become completed records', () => {
  const valid = result(finish(createTestSession('bedroom', 1, {})));
  for (const entry of [
    ...[null, 0, 3, '1'].map((testPart) => ({ ...valid, testPart })),
    { ...valid, testPart: 2 },
    { ...valid, activity: 'learn' },
    { ...valid, mode: 'sound' },
    { ...valid, answers: valid.answers.slice(1) },
    { ...valid, answers: [...valid.answers, valid.answers[0]] },
    { ...valid, answers: valid.answers.map(() => valid.answers[0]) },
  ])
    assert.equal(recordCompletedTest({}, entry).history.length, 0);
  for (const invalid of [null, {}, 'broken'])
    assert.deepEqual(reconcileProgress(invalid), reconcileProgress(null));
  assert.throws(() => wordsForTestPart('bedroom', 3));
  assert.throws(() => createTestSession('bedroom', 1, {}, 'sound'));
});
