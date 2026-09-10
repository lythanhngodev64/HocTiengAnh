import { existsSync, readFileSync, statSync } from 'node:fs';
import {
  allWords,
  vocabulary,
  themes,
  groups,
  wordById,
} from '../src/catalogue.mjs';

const issues = [];
const requireCondition = (condition, message) => {
  if (!condition) issues.push(message);
};
requireCondition(themes.length === 41, 'Expected 41 themes');
requireCondition(
  new Set(allWords.map((w) => w.id)).size === allWords.length,
  'Duplicate word IDs',
);
requireCondition(
  new Set(themes.map((t) => t.id)).size === themes.length,
  'Duplicate themes',
);
for (const theme of themes) {
  requireCondition(
    groups.some((g) => g.id === theme.groupId),
    `Unknown group: ${theme.id}`,
  );
  requireCondition(theme.wordIds.length >= 4, `Too few choices: ${theme.id}`);
  requireCondition(
    new Set(theme.wordIds).size === theme.wordIds.length,
    `Repeated membership: ${theme.id}`,
  );
  for (const id of theme.wordIds)
    requireCondition(Boolean(wordById(id)), `Missing word: ${id}`);
}
for (const [id, count] of [
  ['alphabet', 26],
  ['numbers', 20],
  ['days', 7],
  ['months', 12],
  ['seasons', 4],
]) {
  requireCondition(
    themes.find((t) => t.id === id)?.wordIds.length === count,
    `Incorrect fixed count: ${id}`,
  );
}
const validFile = (file) => existsSync(file) && statSync(file).size > 0;
const missingImages = allWords
  .filter((w) => w.kind === 'picture' && !validFile(`public/${w.imageFile}`))
  .map((w) => w.id);
const missingAudio = allWords
  .filter(
    (w) =>
      !['', '-slow'].every((suffix) =>
        validFile(`public/audio/openai-coral/${w.id}${suffix}.mp3`),
      ),
  )
  .map((w) => w.id);
let manifest = {};
try {
  manifest = JSON.parse(
    readFileSync('public/audio/openai-coral/manifest.json', 'utf8'),
  );
} catch {
  issues.push('Missing or malformed audio manifest');
}
const missingManifest = allWords
  .filter(
    (w) => !missingAudio.includes(w.id) && !manifest.words?.includes(w.id),
  )
  .map((w) => w.id);
for (const id of manifest.phonicsApproved ?? []) {
  requireCondition(
    wordById(id)?.kind === 'letter',
    `Invalid phonics approval: ${id}`,
  );
  requireCondition(
    ['-sound', '-sound-slow'].every((s) =>
      validFile(`public/audio/openai-coral/${id}${s}.mp3`),
    ),
    `Approved phonics file missing: ${id}`,
  );
}
const pendingPhonics = allWords
  .filter(
    (w) => w.kind === 'letter' && !manifest.phonicsApproved?.includes(w.id),
  )
  .map((w) => w.id);
console.log(
  JSON.stringify(
    {
      themes: themes.length,
      uniqueLearningItems: vocabulary.length,
      topicMemberships: themes.reduce((n, t) => n + t.wordIds.length, 0),
      illustrations: allWords.filter((w) => w.kind === 'picture').length,
      missingImages,
      missingAudio,
      missingManifest,
      pendingPhonics,
      issues,
    },
    null,
    2,
  ),
);
if (
  issues.length ||
  missingImages.length ||
  missingAudio.length ||
  missingManifest.length ||
  pendingPhonics.length
)
  process.exitCode = 1;
