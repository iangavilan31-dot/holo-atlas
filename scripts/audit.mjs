/**
 * Master audit: walks every app state with real clicks, captures stills to
 * shots/audit/, collects EVERY console message level, samples fps, and runs
 * the 10-cycle hologram leak test. One browser per viewport.
 *
 * Usage: node scripts/audit.mjs
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const BASE = process.env.HOLO_URL ?? 'http://localhost:5110';
const OUT = fileURLToPath(new URL('../shots/audit/', import.meta.url));
mkdirSync(OUT, { recursive: true });

const report = { console: [], fps: {}, heapsMB: [], states: [] };

async function fps(page, label, ms = 2000) {
  const v = await page.evaluate(
    (ms) =>
      new Promise((res) => {
        let n = 0;
        const t0 = performance.now();
        const tick = () => {
          n++;
          if (performance.now() - t0 < ms) requestAnimationFrame(tick);
          else res(Math.round((n * 1000) / ms));
        };
        requestAnimationFrame(tick);
      }),
    ms,
  );
  report.fps[label] = v;
}

async function shot(page, name) {
  await page.screenshot({ path: `${OUT}${name}.png` });
  report.states.push(name);
}

async function run(viewport, tag, full) {
  const browser = await chromium.launch({ args: ['--use-angle=d3d11'] });
  const page = await browser.newPage({ viewport });
  page.on('console', (m) => {
    if (m.type() !== 'debug' && !m.text().includes('React DevTools')) {
      report.console.push(`[${tag}] ${m.type()}: ${m.text().slice(0, 140)}`);
    }
  });
  page.on('pageerror', (e) => report.console.push(`[${tag}] PAGEERROR: ${String(e).slice(0, 140)}`));

  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(7000);
  await shot(page, `${tag}-prescan`);
  if (full) await fps(page, 'map');

  await page.getByRole('button', { name: 'SCAN AREA' }).click();
  await page.waitForTimeout(5000);
  await shot(page, `${tag}-scan`);
  if (full) await fps(page, 'scan');

  if (full) {
    // detail + hud toggles
    await page.getByRole('button', { name: 'MAP DETAIL' }).click();
    await page.waitForTimeout(1200);
    await shot(page, `${tag}-detail-off`);
    await page.getByRole('button', { name: 'MAP DETAIL' }).click();
    await page.getByRole('button', { name: 'HUD ON' }).click();
    await page.waitForTimeout(600);
    await shot(page, `${tag}-hud-off`);
    await page.getByRole('button', { name: 'HUD OFF' }).click();
    await page.waitForTimeout(400);

    // hover tooltip on a footprint
    const pt = await page.evaluate(() => window.__map.project([-73.9705, 40.8903]));
    await page.mouse.move(pt.x, pt.y, { steps: 5 });
    await page.waitForTimeout(600);
    await shot(page, `${tag}-tooltip`);

    // procedural hologram
    await page.locator('.listing-card').first().click();
    await page.waitForTimeout(3200);
    await shot(page, `${tag}-holo-procedural`);
    await fps(page, 'hologram');
    await page.getByRole('button', { name: 'CLOSE' }).click();
    await page.waitForTimeout(1400);

    // GLB hologram + tour
    await page.locator('.listing-card').nth(2).click();
    await page.waitForTimeout(3200);
    await shot(page, `${tag}-holo-glb`);
    await page.getByRole('button', { name: 'PLAY TOUR' }).click();
    await page.waitForTimeout(2200);
    await fps(page, 'tour');
    await page.waitForTimeout(3000);
    await shot(page, `${tag}-tour-mid`);
    await page.getByRole('button', { name: 'PAUSE' }).click();
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: 'RESET VIEW' }).click();
    await page.waitForTimeout(1400);
    await shot(page, `${tag}-tour-reset`);
    await page.keyboard.press('Escape'); // Esc close path
    await page.waitForTimeout(1400);
    const back = await page.evaluate(() => !!document.querySelector('.listing-card'));
    report.states.push(`esc-close-back-on-map:${back}`);

    // 10-cycle leak
    for (let i = 0; i < 10; i++) {
      await page.locator('.listing-card').nth(i % 12).click();
      await page.waitForTimeout(1900);
      await page.getByRole('button', { name: 'CLOSE' }).click();
      await page.waitForTimeout(1000);
      report.heapsMB.push(
        await page.evaluate(() => Math.round(performance.memory.usedJSHeapSize / 1048576)),
      );
    }
  } else {
    // small screens: open one hologram, confirm controls visible
    await page.locator('.listing-card').first().click();
    await page.waitForTimeout(3200);
    await shot(page, `${tag}-holo`);
    await page.getByRole('button', { name: 'CLOSE' }).click();
    await page.waitForTimeout(1200);
  }

  await browser.close();
}

await run({ width: 1600, height: 1000 }, 'desktop', true);
await run({ width: 834, height: 1112 }, 'tablet', false);
await run({ width: 390, height: 844 }, 'mobile', false);

console.log(JSON.stringify(report, null, 1));
