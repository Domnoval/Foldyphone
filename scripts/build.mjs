#!/usr/bin/env node
/* Inline a page's local stylesheets and scripts into one self-contained file.
   Remote URLs (fonts, CDN libraries) are left alone.

   node scripts/build.mjs kit/probe.html                 -> dist/probe.html
   node scripts/build.mjs projects/loveseat/plan.html    -> dist/loveseat.html */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve, basename } from 'node:path';

const src = process.argv[2];
if (!src) { console.error('usage: node scripts/build.mjs <page.html> [out.html]'); process.exit(1); }

const dir = dirname(resolve(src));
const local = (href) => !/^(https?:)?\/\//.test(href) && !href.startsWith('data:');
const read = (href) => readFileSync(resolve(dir, href), 'utf8');

const html = readFileSync(src, 'utf8')
  .replace(/<link\s+rel="stylesheet"\s+href="([^"]+)"\s*\/?>/g, (tag, href) =>
    local(href) ? `<style>\n/* ${href} */\n${read(href)}</style>` : tag)
  .replace(/<script\s+src="([^"]+)"><\/script>/g, (tag, href) =>
    local(href) ? `<script>\n/* ${href} */\n${read(href).replaceAll('</script', '<\\/script')}</script>` : tag);

const name = basename(src) === 'plan.html' ? basename(dir) + '.html' : basename(src);
const out = process.argv[3] || resolve('dist', name);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
console.log(`${out}  ${(html.length / 1024).toFixed(1)} KB`);
