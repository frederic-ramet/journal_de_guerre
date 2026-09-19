#!/usr/bin/env node
// Capture des écrans clés du site, en desktop (1440px) et mobile (390px),
// pour montrer l'avancement sans que Fred ait à lancer le serveur.
//
// Usage: npm run captures  (le serveur de dev doit tourner sur localhost:4321)

import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';

const BASE_URL = process.env.CAPTURES_BASE_URL ?? 'http://localhost:4321';
const OUT_DIR = path.resolve(import.meta.dirname, '..', 'docs', 'captures');

const ROUTES = [
  { path: '/lire/25' },
  { path: '/lire/1' },
  { path: '/' },
  { path: '/lire' },
  { path: '/ernest' },
  { path: '/documents' },
  { path: '/documents/declaration-1940' },
  { path: '/contexte', fullPage: true },
];
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  try {
    for (const viewport of VIEWPORTS) {
      const page = await browser.newPage({
        viewport: { width: viewport.width, height: viewport.height },
      });

      for (const route of ROUTES) {
        const url = `${BASE_URL}${route.path}`;
        await page.goto(url, { waitUntil: 'networkidle' });

        const slug = route.path === '/' ? 'accueil' : route.path.replace(/^\//, '').replace(/\//g, '-');
        const filename = `${slug}-${viewport.name}.png`;
        const outPath = path.join(OUT_DIR, filename);

        await page.screenshot({ path: outPath, fullPage: Boolean(route.fullPage) });
        console.log(`✓ ${filename}`);
      }

      await page.close();
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
