import { stat, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { allWords } from '../src/catalogue.mjs';

function normalizeApiKey(value = '') {
  return value
    .trim()
    .replace(/^Bearer\s+/i, '')
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/[\s\u200B-\u200D\u2060\uFEFF]/g, '');
}

const apiKey = normalizeApiKey(process.env.OPENAI_API_KEY);
const auditOnly = process.argv.includes('--audit');
const phonicsMode = process.argv.includes('--phonics');
const topicArgument = process.argv
  .find((argument) => argument.startsWith('--theme='))
  ?.slice(8);
const force = process.argv.includes('--force');
const cedarSample = process.argv.includes('--cedar-sample');
const clearSample = process.argv.includes('--clear-sample');
const sampleMode = cedarSample || clearSample;
const clearMode = !cedarSample;
const projectRoot = process.cwd();
const voice = cedarSample ? 'cedar' : 'coral';
const outputDirectory = path.join(
  projectRoot,
  'public',
  'audio',
  clearSample
    ? 'openai-coral-clear-sample'
    : cedarSample
      ? 'openai-cedar-sample'
      : 'openai-coral',
);
const manifestPath = path.join(outputDirectory, 'manifest.json');

if (!apiKey && !auditOnly) {
  console.error(
    'Chưa có OPENAI_API_KEY. Hãy đặt khóa trong cửa sổ dòng lệnh hiện tại rồi chạy lại.',
  );
  process.exit(1);
}

if (!auditOnly && !/^sk-[A-Za-z0-9_-]{20,}$/.test(apiKey)) {
  console.error(
    'OpenAI API key không đúng định dạng. Chỉ dán chính khóa bắt đầu bằng sk-, không dán chữ Bearer, dấu ngoặc hoặc liên kết trang web.',
  );
  process.exit(1);
}

async function exists(filePath) {
  try {
    return (await stat(filePath)).size > 0;
  } catch {
    return false;
  }
}

async function createSpeech({ input, instructions, outputPath, speed = 1 }) {
  if (!force && (await exists(outputPath))) {
    console.log(`Giữ tệp đã có: ${path.basename(outputPath)}`);
    return;
  }

  let response;
  try {
    response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini-tts',
        voice,
        input,
        instructions,
        speed,
        response_format: 'mp3',
      }),
      signal: AbortSignal.timeout(90000),
    });
  } catch (error) {
    const reason = error?.cause?.message ?? error?.message ?? 'unknown error';
    throw new Error(`Không thể kết nối tới OpenAI API: ${reason}`);
  }

  if (!response.ok) {
    throw new Error(
      `OpenAI trả về HTTP ${response.status}. Kiểm tra kết nối, quyền truy cập và hạn mức API rồi chạy lại.`,
    );
  }

  const temporaryPath = `${outputPath}.part`;
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length)
    throw new Error('OpenAI returned an empty audio file. Run again to retry.');
  await writeFile(temporaryPath, bytes);
  if (force) {
    await rm(outputPath, { force: true });
  }
  await rename(temporaryPath, outputPath);
  console.log(`Đã tạo: ${path.basename(outputPath)}`);
}

const words = allWords;

const sampleWordIds = new Set(['cat', 'turtle', 'garden', 'backpack']);
let selectedWords = sampleMode
  ? words.filter((entry) => sampleWordIds.has(entry.id))
  : words;
if (topicArgument) {
  const { themes } = await import('../src/catalogue.mjs');
  const selectedTheme = themes.find((theme) => theme.id === topicArgument);
  if (!selectedTheme) throw new Error(`Unknown theme: ${topicArgument}`);
  selectedWords = selectedWords.filter((word) =>
    selectedTheme.wordIds.includes(word.id),
  );
}
if (phonicsMode)
  selectedWords = selectedWords.filter((word) => word.kind === 'letter');
if (auditOnly) {
  let missing = 0;
  for (const entry of selectedWords) {
    for (const suffix of phonicsMode
      ? ['-sound', '-sound-slow']
      : ['', '-slow']) {
      if (
        !(await exists(path.join(outputDirectory, `${entry.id}${suffix}.mp3`)))
      )
        missing++;
    }
  }
  console.log(
    JSON.stringify({
      voice,
      items: selectedWords.length,
      missingFiles: missing,
      phonicsMode,
    }),
  );
  process.exit(0);
}

if (selectedWords.length === 0) {
  throw new Error('Không tìm thấy từ vựng trong src/vocabulary-data.json.');
}

await mkdir(outputDirectory, { recursive: true });
const completedWordIds = [];
let previousManifest = {};
try {
  previousManifest = JSON.parse(await readFile(manifestPath, 'utf8'));
} catch {
  /* first run */
}
const approvedPhonics = new Set(previousManifest.phonicsApproved ?? []);
let generationError = null;

try {
  for (const entry of selectedWords) {
    if (phonicsMode) {
      if (force) approvedPhonics.delete(entry.id);
      for (const [suffix, repeat] of [
        ['-sound', false],
        ['-sound-slow', true],
      ]) {
        await createSpeech({
          input: repeat
            ? `/${entry.phoneme}/. /${entry.phoneme}/.`
            : `/${entry.phoneme}/`,
          outputPath: path.join(outputDirectory, `${entry.id}${suffix}.mp3`),
          speed: 1,
          instructions: `Produce only the isolated American English phoneme /${entry.phoneme}/, ${repeat ? 'twice with a short silence between' : 'once'}. This is the sound associated with letter ${entry.word}, as in ${entry.exampleId === 'box' ? 'the END of box' : entry.exampleId}. Never say the letter name, the example word, slash, or IPA symbols. No added schwa or other vowel after consonants. For stop consonants give a clean brief release, not a stretched syllable. No music or commentary.`,
        });
      }
      continue;
    }
    const normalPath = path.join(outputDirectory, `${entry.id}.mp3`);
    const slowPath = path.join(outputDirectory, `${entry.id}-slow.mp3`);

    await createSpeech({
      input: entry.word,
      outputPath: normalPath,
      speed: clearMode ? 0.9 : 1,
      instructions:
        entry.kind === 'letter'
          ? 'Say only the English NAME of this single alphabet letter once in a clear neutral American accent. Do not produce its phonics sound, add examples, or commentary. For Z say zee.'
          : clearMode
            ? 'Give a highly intelligible pronunciation for an elementary-school English listening exercise. Use a clean, neutral American accent, steady volume, and moderate teaching pace. Say only the supplied word once. Make its initial consonant, vowel, and final consonant fully audible while keeping the pronunciation fluent and natural. Avoid breathiness, whispering, dramatic emotion, sing-song delivery, and exaggerated stretching. Do not spell the word or add any other speech or sound.'
            : cedarSample
              ? 'Speak like a warm, friendly elementary English teacher. Use a natural neutral American accent and a relaxed conversational pace. Say only the supplied English word once. Keep the pronunciation clear but never exaggerated, robotic, sing-song, or overly slow. Do not spell the word or add commentary, music, or sound effects.'
              : 'Pronounce only this English vocabulary word once for a young Vietnamese child learning English. Use a clear, warm, neutral American accent and a calm teaching pace. Articulate naturally. Do not spell the word or add commentary, music, or sound effects.',
    });
    await createSpeech({
      input: `${entry.word}. ${entry.word}.`,
      outputPath: slowPath,
      speed: clearMode ? 0.8 : 1,
      instructions:
        entry.kind === 'letter'
          ? 'Say only the English NAME of this single alphabet letter twice with a short pause, in a clear neutral American accent. Do not give the phonics sound or examples. For Z say zee.'
          : clearMode
            ? 'Give a highly intelligible pronunciation for an elementary-school English listening exercise. Use a clean, neutral American accent and steady volume. Say only the supplied word two times, with one short pause between repetitions. Make the initial consonant, vowel, and final consonant fully audible. Each repetition must remain a complete natural word; never stretch it into separate sounds or syllables. Do not spell the word or add any other speech or sound.'
            : cedarSample
              ? 'Speak like a warm, patient elementary English teacher. Use a natural neutral American accent. Say only the supplied English word two times at a slightly slower-than-normal pace, with a short natural pause between repetitions. Keep each repetition fluent and clear; do not stretch individual sounds or sound robotic. Do not spell the word or add commentary, music, or sound effects.'
              : 'Say only the supplied English vocabulary word two times, slowly and very clearly, for a young Vietnamese child. Use a warm, neutral American accent and leave a noticeable pause between repetitions. Do not spell the word or add commentary, music, or sound effects.',
    });

    if ((await exists(normalPath)) && (await exists(slowPath))) {
      completedWordIds.push(entry.id);
    }
  }
} catch (error) {
  generationError = error;
  console.error(`\nKhông thể tạo tiếp âm thanh: ${error.message}`);
} finally {
  // Re-scan the whole library: a partial or filtered run must not hide older audio.
  completedWordIds.length = 0;
  for (const entry of sampleMode ? selectedWords : words) {
    if (
      (await exists(path.join(outputDirectory, `${entry.id}.mp3`))) &&
      (await exists(path.join(outputDirectory, `${entry.id}-slow.mp3`)))
    )
      completedWordIds.push(entry.id);
  }
  await writeFile(
    manifestPath,
    `${JSON.stringify(
      {
        provider: 'OpenAI',
        model: 'gpt-4o-mini-tts',
        voice,
        purpose: sampleMode ? 'listening-sample' : 'website-audio',
        disclosure: 'Giọng đọc AI do OpenAI tạo, không phải giọng người thật.',
        words: completedWordIds,
        phonicsApproved: [...approvedPhonics],
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
}

if (generationError) {
  console.error(
    'Hãy sửa lỗi ở trên rồi chạy lại. Những tệp đã tạo thành công sẽ được giữ lại.',
  );
  process.exit(1);
}

console.log(
  phonicsMode
    ? 'Đã tạo âm chữ ứng viên. Cần nghe kiểm tra từng tệp trước khi duyệt; website chưa bật các âm chưa duyệt.'
    : clearSample
      ? `Hoàn tất ${completedWordIds.length} từ mẫu ưu tiên nghe rõ với giọng Coral, mỗi từ có 2 tệp âm thanh.`
      : cedarSample
        ? `Hoàn tất ${completedWordIds.length} từ mẫu với giọng Cedar, mỗi từ có 2 tệp âm thanh.`
        : `Hoàn tất ${completedWordIds.length} từ với giọng Coral, mỗi từ có 2 tệp âm thanh.`,
);
