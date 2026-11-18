#!/usr/bin/env node
/* Look at a built page the way the Fold will show it, before anyone else has to.

   node scripts/shots.mjs dist/probe.html            -> .shots/probe-{cover,open,flex}.png

   Sizes are CSS pixels and they are ESTIMATES: a screenshot from the phone came in at the
   1968 x 2184 aspect of a Fold 7-class inner screen, and these assume a 2.625 pixel ratio.
   Replace them with the real readout from the Fold Calibration page once it has been run. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); }

const POSTURES = {
  cover: { width: 411, height: 960 },
  open: { width: 750, height: 832 },
  flex: { width: 832, height: 750, folded: true },
  narrow: { width: 344, height: 882 },   // older Fold cover screens; nothing may break here
};

const src = process.argv[2];
if (!src) { console.error('usage: node scripts/shots.mjs <built-page.html>'); process.exit(1); }
const scale = Number(process.env.SCALE || 2);
const name = basename(src, '.html');
mkdirSync('.shots', { recursive: true });

/* The Artifact viewer wraps a page in this skeleton; do the same so local and published agree. */
const wrapped = resolve('.shots', `${name}.wrapped.html`);
writeFileSync(wrapped, `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<style>body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style>
</head><body>${readFileSync(src, 'utf8')}</body></html>`);

const browser = await chromium.launch();
for (const [posture, v] of Object.entries(POSTURES)) {
  const ctx = await browser.newContext({
    viewport: { width: v.width, height: v.height },
    deviceScaleFactor: scale, isMobile: true, hasTouch: true,
  });
  const page = await ctx.newPage();
  const problems = [];
  page.on('console', (m) => m.type() === 'error' && problems.push(m.text()));
  page.on('pageerror', (e) => problems.push(e.message));
  if (v.folded) {
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setDevicePostureOverride', { posture: { type: 'folded' } })
      .catch((e) => problems.push(`posture override unavailable: ${e.message}`));
  }
  await page.goto(pathToFileURL(wrapped).href);
  await page.waitForTimeout(400);
  const sideways = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  if (sideways) problems.push('page scrolls sideways');
  const out = `.shots/${name}-${posture}.png`;
  await page.screenshot({ path: out });
  console.log(`${out}  ${v.width}x${v.height}${problems.length ? '  ! ' + problems.join(' | ') : ''}`);
  await ctx.close();
}
await browser.close();
