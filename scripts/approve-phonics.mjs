// Run only AFTER a human has listened to BOTH recordings and checked the isolated sound.
import { readFile, writeFile, stat } from 'node:fs/promises';
import { wordById } from '../src/catalogue.mjs';
const ids = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!process.argv.includes('--listened-to-both') || !ids.length) {
  console.error(
    'After listening to both normal and slow files: node scripts/approve-phonics.mjs letter-a --listened-to-both',
  );
  process.exit(1);
}
const manifestPath = 'public/audio/openai-coral/manifest.json';
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const id of ids) {
  if (wordById(id)?.kind !== 'letter') throw new Error(`Not a letter: ${id}`);
  for (const suffix of ['-sound', '-sound-slow']) {
    if ((await stat(`public/audio/openai-coral/${id}${suffix}.mp3`)).size === 0)
      throw new Error(`Empty audio: ${id}${suffix}`);
  }
}
manifest.phonicsApproved = [
  ...new Set([...(manifest.phonicsApproved ?? []), ...ids]),
];
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Approved ${ids.length} reviewed letters.`);
