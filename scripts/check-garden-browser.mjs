// Isolated browser profile: never reads or changes the family's saved progress.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const { chromium } = await import(process.argv[2]);
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const output = new URL('../outputs/garden-qa/', import.meta.url);
await mkdir(output, { recursive: true });
const errors = [];
const url = process.env.GARDEN_QA_URL || 'http://127.0.0.1:5173/';
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url);
  await page.getByRole('button', { name: 'Tạm dừng chuyển động' }).waitFor();
  await page.getByRole('button', { name: 'Tạm dừng chuyển động' }).click();
  const storage = await page.evaluate(() => JSON.stringify(localStorage));
  for (const [width, height] of [
    [1366, 768],
    [1280, 720],
    [390, 844],
    [320, 740],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(150);
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `overflow ${width}`,
    );
    const animals = page.locator('.garden-animal-hit:visible');
    assert.equal(await animals.count(), width <= 600 ? 2 : 3);
    for (const animal of await animals.all()) {
      const box = await animal.boundingBox();
      assert.ok(box.width >= 44 && box.height >= 44);
      await animal.click({ trial: true });
    }
    await page
      .getByRole('button', { name: 'Học Làm quen từng chút' })
      .click({ trial: true });
    await page
      .getByRole('button', { name: 'Kiểm tra Thử tài nghe của bé' })
      .click({ trial: true });
    await page.screenshot({
      path: new URL(`home-${width}.png`, output).pathname.replace(
        /^\/(.:)/,
        '$1',
      ),
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.waitForTimeout(200);
  const snapshot = () =>
    page.locator('.home-canvas').evaluate((c) => c.toDataURL());
  const still = await snapshot();
  await page.waitForTimeout(200);
  assert.equal(await snapshot(), still, 'paused frame stays still');
  const rabbit = page.getByRole('button', {
    name: 'Chạm thỏ để vẫy tay',
    exact: true,
  });
  await rabbit.focus();
  await page.keyboard.press('Enter');
  assert.notEqual(
    await snapshot(),
    still,
    'keyboard changes static rabbit pose',
  );
  await page.getByRole('button', { name: 'Bật chuyển động' }).click();
  await rabbit.click({ clickCount: 5, delay: 10, force: true });
  await page
    .getByRole('button', { name: 'Chạm bướm 1 để bay một vòng' })
    .click({ force: true });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Bật chuyển động' }).waitFor();
  const reduced = await snapshot();
  await page.waitForTimeout(200);
  assert.equal(await snapshot(), reduced, 'reduced motion stays still');
  assert.equal(
    await page.evaluate(() => JSON.stringify(localStorage)),
    storage,
    'decorations do not write progress',
  );
  await page.getByRole('button', { name: 'Học Làm quen từng chút' }).click();
  assert.equal(
    await page.locator('.home-canvas').count(),
    0,
    'canvas removed on navigation',
  );
  assert.deepEqual(errors, []);
  await context.close();
  const fallback = await browser.newContext();
  const fallbackPage = await fallback.newPage();
  await fallbackPage.route('**/motion-atlas.png', (route) => route.abort());
  await fallbackPage.goto(url);
  await fallbackPage.locator('.home-rabbit').waitFor();
  await fallbackPage
    .getByRole('button', { name: 'Học Làm quen từng chút' })
    .click();
  await fallback.close();
  console.log(
    'PASS: viewport layout, target sizes, CTA access, keyboard, pause, reduced motion, rapid touches, navigation, unchanged storage, failed-artwork fallback.',
  );
  console.log(
    'NOT_RUN: physical touch-device performance and native hidden-tab lifecycle.',
  );
} finally {
  await browser.close();
}
