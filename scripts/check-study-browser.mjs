// Isolated browser QA: no access to the user's browser profile or learning data.
// Pass an installed playwright module file URL as argument 2; no project dependency needed.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const { chromium } = await import(process.argv[2]);
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const directory = new URL('../outputs/study-qa/', import.meta.url);
await mkdir(directory, { recursive: true });
const errors = [];
try {
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = function () {
      window.__playedAudio = this.src;
      return Promise.resolve();
    };
  });
  const url = process.env.STUDY_QA_URL || 'http://127.0.0.1:5173/';
  await page.goto(url);
  await page.getByRole('button', { name: 'Học Làm quen từng chút' }).waitFor();
  for (const [width, height] of [
    [1366, 768],
    [1280, 720],
    [390, 844],
    [320, 740],
  ]) {
    await page.setViewportSize({ width, height });
    await page.screenshot({
      path: new URL(`home-${width}.png`, directory).pathname.replace(
        /^\/(.:)/,
        '$1',
      ),
      fullPage: true,
    });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `home overflow ${width}`,
    );
    const cta = await page
      .getByRole('button', { name: 'Học Làm quen từng chút' })
      .boundingBox();
    assert.ok(cta.width >= 44 && cta.height >= 44);
  }
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.getByRole('button', { name: 'Học Làm quen từng chút' }).click();
  await page.getByRole('button', { name: '▶ Bắt đầu học' }).click();
  await page.getByRole('button', { name: 'Tiếp →', exact: true }).click();
  await page
    .getByRole('button', { name: 'Quá trình học', exact: true })
    .click();
  await page.getByRole('button', { name: 'Quay lại học', exact: true }).click();
  assert.equal(
    await page.locator('.study-intro-card strong').innerText(),
    'pillow',
  );
  await page
    .getByRole('button', { name: '⌂ Trang chính', exact: true })
    .click();
  await page.getByRole('button', { name: 'Làm tiếp', exact: true }).click();
  assert.equal(
    await page.locator('.study-intro-card strong').innerText(),
    'pillow',
  );
  for (let i = 0; i < 3; i++)
    await page.getByRole('button', { name: 'Tiếp →', exact: true }).click();
  await page.getByRole('button', { name: 'Cùng chơi →', exact: true }).click();
  for (const [i, word] of [
    'bed',
    'pillow',
    'blanket',
    'lamp',
    'wardrobe',
  ].entries()) {
    const right = page
      .locator('.study-choice')
      .filter({ has: page.locator(`img[src$="/${word}.png"]`) });
    assert.equal(await right.count(), 1);
    if (i === 0)
      await page
        .locator('.study-choice')
        .filter({ hasNot: page.locator(`img[src$="/${word}.png"]`) })
        .click();
    await right.click();
    await page
      .getByRole('button', {
        name: i === 4 ? 'Hoàn thành ★' : 'Tiếp →',
        exact: true,
      })
      .click();
  }
  await page
    .getByRole('heading', { name: 'Con đã luyện xong 5 từ!' })
    .waitFor();
  let stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('english-garden.learning-progress.v2')),
  );
  assert.equal(stored.history.length, 1);
  assert.equal(stored.history[0].activity, 'learn');
  assert.equal(stored.history[0].correct, 4);
  await page.reload();
  stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('english-garden.learning-progress.v2')),
  );
  assert.equal(stored.history.length, 1);
  await page.getByRole('button', { name: 'Học Làm quen từng chút' }).click();
  await page
    .getByRole('button', { name: 'Khám phá căn phòng', exact: true })
    .click();
  for (const [width, height] of [
    [1366, 768],
    [1280, 720],
    [390, 844],
    [320, 740],
  ]) {
    await page.setViewportSize({ width, height });
    for (const label of [
      'Phòng ngủ',
      'Phòng khách',
      'Phòng bếp',
      'Phòng tắm',
    ]) {
      await page.getByRole('button', { name: label, exact: true }).click();
      const boxes = await page
        .locator('.room-hotspot')
        .evaluateAll((elements) =>
          elements.map((el) => {
            const r = el.getBoundingClientRect();
            return { width: r.width, height: r.height };
          }),
        );
      assert.ok(
        boxes.every((box) => box.width >= 44 && box.height >= 44),
        `small touch ${width} ${label}`,
      );
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `room overflow ${width}`,
      );
    }
    await page.screenshot({
      path: new URL(`room-${width}.png`, directory).pathname.replace(
        /^\/(.:)/,
        '$1',
      ),
      fullPage: true,
    });
  }
  await page.getByRole('button', { name: 'Nghe và tìm', exact: true }).click();
  await page.locator('.room-hotspot').nth(1).click();
  await page.locator('.room-hotspot').first().click();
  await page.getByRole('button', { name: 'Tìm đồ vật tiếp →' }).waitFor();
  assert.equal(
    (
      await page.evaluate(() =>
        JSON.parse(localStorage.getItem('english-garden.learning-progress.v2')),
      )
    ).history.length,
    1,
  );
  await page
    .getByRole('button', { name: '⌂ Trang chính', exact: true })
    .click();
  await page.setViewportSize({ width: 1280, height: 720 });
  await page
    .getByRole('button', { name: 'Kiểm tra Thử tài nghe của bé' })
    .click();
  await page.waitForFunction(
    () =>
      document.querySelector('.voice-note')?.textContent?.includes('Coral') ||
      document.body.textContent.includes('OpenAI · Coral'),
  );
  for (let i = 0; i < 10; i++) {
    await page.getByRole('button', { name: 'Nghe từ', exact: true }).click();
    const source = await page.evaluate(() => window.__playedAudio);
    const word = source.split('/').pop().replace('.mp3', '');
    const right = page
      .locator('.quiz-card')
      .filter({ has: page.locator(`img[src$="/${word}.png"]`) });
    assert.equal(await right.count(), 1);
    if (i === 0)
      await page
        .locator('.quiz-card')
        .filter({ hasNot: page.locator(`img[src$="/${word}.png"]`) })
        .first()
        .click();
    await right.click();
    await page
      .getByRole('button', {
        name: i === 9 ? 'Xem điểm' : 'Câu mới',
        exact: false,
      })
      .click();
  }
  assert.equal(await page.locator('.score-number strong').innerText(), '90');
  assert.ok((await page.locator('.score-card').innerText()).includes('90'));
  stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('english-garden.learning-progress.v2')),
  );
  assert.equal(stored.history.length, 2);
  assert.equal(stored.history[0].activity, 'test');
  assert.equal(stored.history[0].score, 90);
  await page
    .getByRole('button', { name: '⌂ Trang chính', exact: true })
    .click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('.home-rabbit').waitFor({ state: 'visible' });
  assert.deepEqual(errors, []);
  // Deliberately reject storage in a second clean profile: surface warning, never claim saved.
  const blocked = await browser.newContext();
  const blockedPage = await blocked.newPage();
  await blockedPage.addInitScript(() => {
    Storage.prototype.setItem = function () {
      throw new DOMException('Blocked', 'QuotaExceededError');
    };
  });
  await blockedPage.goto(url);
  await blockedPage.locator('.storage-error').waitFor();
  await blocked.close();
  console.log(
    'PASS: isolated home/lesson/rooms/test, first mistake, journey return, leave cancel, history reload, touch targets, reduced motion, storage failure.',
  );
  await context.close();
} finally {
  await browser.close();
}
