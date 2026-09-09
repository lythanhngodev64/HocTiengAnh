import {
  access,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';

function normalizeApiKey(value = '') {
  return value
    .trim()
    .replace(/^Bearer\s+/i, '')
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/[\s\u200B-\u200D\u2060\uFEFF]/g, '');
}

const apiKey = normalizeApiKey(process.env.OPENAI_API_KEY);
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

if (!apiKey) {
  console.error(
    'Chưa có OPENAI_API_KEY. Hãy đặt khóa trong cửa sổ dòng lệnh hiện tại rồi chạy lại.',
  );
  process.exit(1);
}

if (!/^sk-[A-Za-z0-9_-]{20,}$/.test(apiKey)) {
  console.error(
    'OpenAI API key không đúng định dạng. Chỉ dán chính khóa bắt đầu bằng sk-, không dán chữ Bearer, dấu ngoặc hoặc liên kết trang web.',
  );
  process.exit(1);
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
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
    });
  } catch (error) {
    const reason = error?.cause?.message ?? error?.message ?? 'unknown error';
    throw new Error(`Không thể kết nối tới OpenAI API: ${reason}`);
  }

  if (!response.ok) {
    const details = (await response.text()).slice(0, 500);
    throw new Error(`OpenAI trả về ${response.status}: ${details}`);
  }

  const temporaryPath = `${outputPath}.part`;
  await writeFile(temporaryPath, Buffer.from(await response.arrayBuffer()));
  if (force) {
    await rm(outputPath, { force: true });
  }
  await rename(temporaryPath, outputPath);
  console.log(`Đã tạo: ${path.basename(outputPath)}`);
}

const vocabularyData = JSON.parse(
  await readFile(
    path.join(projectRoot, 'src', 'vocabulary-data.json'),
    'utf8',
  ),
);
const words = Array.isArray(vocabularyData.words)
  ? vocabularyData.words.filter(
      (entry) =>
        entry &&
        typeof entry.id === 'string' &&
        typeof entry.word === 'string',
    )
  : [];

const sampleWordIds = new Set(['cat', 'turtle', 'garden', 'backpack']);
const selectedWords = sampleMode
  ? words.filter((entry) => sampleWordIds.has(entry.id))
  : words;

if (selectedWords.length === 0) {
  throw new Error('Không tìm thấy từ vựng trong src/vocabulary-data.json.');
}

await mkdir(outputDirectory, { recursive: true });
const completedWordIds = [];
let generationError = null;

try {
  for (const entry of selectedWords) {
    const normalPath = path.join(outputDirectory, `${entry.id}.mp3`);
    const slowPath = path.join(outputDirectory, `${entry.id}-slow.mp3`);

    await createSpeech({
      input: entry.word,
      outputPath: normalPath,
      speed: clearMode ? 0.9 : 1,
      instructions: clearMode
        ? 'Give a highly intelligible pronunciation for an elementary-school English listening exercise. Use a clean, neutral American accent, steady volume, and moderate teaching pace. Say only the supplied word once. Make its initial consonant, vowel, and final consonant fully audible while keeping the pronunciation fluent and natural. Avoid breathiness, whispering, dramatic emotion, sing-song delivery, and exaggerated stretching. Do not spell the word or add any other speech or sound.'
        : cedarSample
          ? 'Speak like a warm, friendly elementary English teacher. Use a natural neutral American accent and a relaxed conversational pace. Say only the supplied English word once. Keep the pronunciation clear but never exaggerated, robotic, sing-song, or overly slow. Do not spell the word or add commentary, music, or sound effects.'
          : 'Pronounce only this English vocabulary word once for a young Vietnamese child learning English. Use a clear, warm, neutral American accent and a calm teaching pace. Articulate naturally. Do not spell the word or add commentary, music, or sound effects.',
    });
    await createSpeech({
      input: `${entry.word}. ${entry.word}.`,
      outputPath: slowPath,
      speed: clearMode ? 0.8 : 1,
      instructions: clearMode
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
  clearSample
    ? `Hoàn tất ${completedWordIds.length} từ mẫu ưu tiên nghe rõ với giọng Coral, mỗi từ có 2 tệp âm thanh.`
    : cedarSample
      ? `Hoàn tất ${completedWordIds.length} từ mẫu với giọng Cedar, mỗi từ có 2 tệp âm thanh.`
      : `Hoàn tất ${completedWordIds.length} từ với giọng Coral, mỗi từ có 2 tệp âm thanh.`,
);
