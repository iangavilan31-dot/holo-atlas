/**
 * Visual verification harness. Launches real Chromium (hardware WebGL via ANGLE),
 * drives the app through a named scenario with REAL clicks, saves stills to shots/.
 *
 * Usage: node scripts/shots.mjs [scenario ...]
 * Scenarios: map, detail-off, hud-off, scan, hologram, tour  (default: map)
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const BASE = process.env.HOLO_URL ?? 'http://localhost:5110';
const OUT = fileURLToPath(new URL('../shots/', import.meta.url));
mkdirSync(OUT, { recursive: true });

const scenarios = process.argv.slice(2).length ? process.argv.slice(2) : ['map'];

const clickButton = async (page, label) => {
  const btn = page.getByRole('button', { name: label, exact: false }).first();
  await btn.waitFor({ state: 'visible', timeout: 15000 });
  await btn.click(); // real click — hit-testing on, per QA rules
};

for (const scenario of scenarios) {
  const browser = await chromium.launch(); // fresh browser per shot: TDR resilience
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
    const errors = [];
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    switch (scenario) {
      case 'map':
        await page.waitForTimeout(7000); // satellite tiles settle
        break;
      case 'detail-off':
        await page.waitForTimeout(6000);
        await clickButton(page, 'MAP DETAIL');
        await page.waitForTimeout(1500);
        break;
      case 'hud-off':
        await page.waitForTimeout(5000);
        await clickButton(page, 'HUD');
        await page.waitForTimeout(800);
        break;
      case 'scan':
        await page.waitForTimeout(6000);
        await clickButton(page, 'SCAN AREA');
        await page.waitForTimeout(2600); // sweep + pulses visible
        break;
      case 'hologram':
        await page.waitForTimeout(6000);
        await clickButton(page, 'SCAN AREA');
        await page.waitForTimeout(2000);
        await page.locator('.listing-card').first().click();
        await page.waitForTimeout(3500); // bloom-in + footprint resolve
        break;
      case 'tour':
        await page.waitForTimeout(6000);
        await clickButton(page, 'SCAN AREA');
        await page.waitForTimeout(1800);
        await page.locator('.listing-card').first().click();
        await page.waitForTimeout(3000);
        await clickButton(page, 'PLAY TOUR');
        await page.waitForTimeout(4000); // mid-flight
        break;
      default:
        console.error(`unknown scenario: ${scenario}`);
        continue;
    }

    await page.screenshot({ path: `${OUT}${scenario}.png` });
    console.log(`shot: shots/${scenario}.png${errors.length ? ` — CONSOLE ERRORS: ${errors.join(' | ')}` : ' — console clean'}`);
  } finally {
    await browser.close();
  }
}
