// Offline-only generation and explicit human approval; never imported by the browser.
import { readFile, writeFile, mkdir, stat, rename } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { guidance } from '../src/guidance.mjs';

const sampleA = process.argv.includes('--sample-a');
const teacherSample = process.argv.includes('--teacher-sample');
if (sampleA && teacherSample) throw new Error('Choose one sample at a time.');
const isSample = sampleA || teacherSample;
const voice = sampleA ? 'coral' : 'marin';
const speechSettings = {
  model: 'gpt-4o-mini-tts',
  voice,
  response_format: 'mp3',
  speed: 1.0,
  instructions: sampleA
    ? 'Speak Vietnamese with the relaxed, natural rhythm of a friendly preschool teacher in everyday conversation. Normal conversational pace. Keep connected words flowing; pause naturally between sentences, not between individual words. No drawn-out syllables, word-by-word delivery, singsong tone, exaggerated baby voice or background sound. Speak only the supplied text.'
    : 'Speak Vietnamese as a warm, friendly adult female preschool teacher talking naturally to one child. Use a clear, conversational Vietnamese voice with natural tones and connected phrasing. Sound relaxed and encouraging, not like a narrator reading a lesson. Normal everyday speaking pace; no stretched syllables, pauses between individual words, sing-song delivery, baby voice, or background sound. Speak only the supplied text.',
};
const entries = isSample
  ? { intro: 'Chạm vào hình để nghe nhé. Sẵn sàng rồi thì bấm Tiếp.' }
  : guidance;
const directory = new URL(
  teacherSample
    ? '../public/audio/guidance/samples/marin-teacher/'
    : sampleA
      ? '../public/audio/guidance/samples/coral-natural-a/'
      : '../public/audio/guidance/',
  import.meta.url,
);
const manifestFile = new URL('manifest.json', directory);
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const signature = (id) =>
  hash(JSON.stringify({ ...speechSettings, input: entries[id] }));
const ids = Object.keys(entries);
let manifest = { voice, model: 'gpt-4o-mini-tts', approved: {} };
try {
  manifest = JSON.parse(await readFile(manifestFile, 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
manifest.approved ??= {};
manifest.generated ??= {};
const current = (id) => manifest.generated[id] === signature(id);
async function valid(id) {
  try {
    return (await stat(new URL(`${id}.mp3`, directory))).size > 0;
  } catch {
    return false;
  }
}
if (process.argv.includes('--audit')) {
  const missing = [],
    outdated = [],
    pending = [];
  for (const id of ids) {
    if (!isSample && !current(id)) outdated.push(id);
    if (!(await valid(id))) missing.push(id);
    else if (
      manifest.approved?.[id] !==
      hash(await readFile(new URL(`${id}.mp3`, directory)))
    )
      pending.push(id);
  }
  console.log(
    JSON.stringify(
      {
        missing,
        pending,
        outdated,
        ready: !missing.length && !pending.length && !outdated.length,
      },
      null,
      2,
    ),
  );
  process.exitCode =
    missing.length || pending.length || outdated.length ? 1 : 0;
} else if (process.argv.includes('--approve-all')) {
  if (isSample)
    throw new Error(
      'This is a comparison sample only. Do not approve it as the full guidance set.',
    );
  if (!process.argv.includes('--listened'))
    throw new Error(
      'Listen to every guidance recording first, then pass --listened.',
    );
  const approved = {};
  for (const id of ids) {
    if (!current(id))
      throw new Error(
        `Regenerate with the selected voice before approval: ${id}`,
      );
    if (!(await valid(id))) throw new Error(`Missing audio: ${id}`);
    approved[id] = hash(await readFile(new URL(`${id}.mp3`, directory)));
  }
  await writeFile(
    manifestFile,
    JSON.stringify({ ...manifest, approved }, null, 2) + '\n',
  );
  console.log('Approved all human-reviewed guidance recordings.');
} else {
  const key = (process.env.OPENAI_API_KEY ?? '')
    .trim()
    .replace(/^Bearer\s+/i, '')
    .replace(/[\s\u200B-\u200D\uFEFF]/g, '');
  if (!/^sk-[A-Za-z0-9_-]{20,}$/.test(key))
    throw new Error(
      'Set a valid OPENAI_API_KEY locally. Never put the key in the website.',
    );
  await mkdir(directory, { recursive: true });
  // Unreviewed or outdated clips must never retain approval during a partial migration.
  for (const id of ids) {
    if (!current(id)) delete manifest.approved[id];
  }
  for (const [id, input] of Object.entries(entries)) {
    if (
      (await valid(id)) &&
      (isSample || current(id)) &&
      !process.argv.includes('--force')
    )
      continue;
    // Revoke approval before replacing audio so interrupted regeneration cannot leave stale approval.
    delete manifest.approved[id];
    delete manifest.generated[id];
    await writeFile(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...speechSettings, input }),
      signal: AbortSignal.timeout(90000),
    });
    if (!response.ok)
      throw new Error(
        `OpenAI HTTP ${response.status}; check API access and quota.`,
      );
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.length) throw new Error(`Empty audio: ${id}`);
    await writeFile(new URL(`${id}.mp3.part`, directory), bytes);
    await rename(
      new URL(`${id}.mp3.part`, directory),
      new URL(`${id}.mp3`, directory),
    );
    manifest.voice = voice;
    manifest.model = speechSettings.model;
    manifest.generated[id] = signature(id);
    await writeFile(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
    console.log(`Created ${id}.mp3 (not approved).`);
  }
  console.log(
    teacherSample
      ? 'Teacher sample ready: samples/marin-teacher/intro.mp3. Original recordings and approvals were not changed.'
      : sampleA
        ? 'Sample A ready: samples/coral-natural-a/intro.mp3. Original seven recordings and their approvals were not changed.'
        : 'Listen to all seven recordings before approval. Website will not play unapproved guidance.',
  );
}
