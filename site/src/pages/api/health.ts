import type { APIRoute } from 'astro';
import fs from 'node:fs';
import { index } from '../../lib/index-store';
import { PAGES_DIR, IMAGES_DIR, TILES_DIR } from '../../lib/config';

export const prerender = false;

// Route de santé pour le healthcheck Docker Compose et un moniteur externe
// (Uptime Kuma). Ne renvoie jamais 200 si les pages ne sont pas chargées :
// un site qui répond mais sert 0 page est cassé, pas sain, même si le
// process Node tourne.
export const GET: APIRoute = async () => {
  const pagesDirExists = fs.existsSync(PAGES_DIR);
  const imagesDirExists = fs.existsSync(IMAGES_DIR);
  const tilesDirExists = fs.existsSync(TILES_DIR);
  const pageCount = index.size;

  const problems: string[] = [];
  if (!pagesDirExists) {
    problems.push(`PAGES_DIR introuvable (${PAGES_DIR})`);
  } else if (pageCount === 0) {
    problems.push(`PAGES_DIR existe mais aucune page indexée (${PAGES_DIR})`);
  }
  if (!imagesDirExists) {
    problems.push(`IMAGES_DIR introuvable (${IMAGES_DIR})`);
  }
  // Les tuiles sont un accessoire (repli sur <img> si absentes, voir
  // src/lib/tiles.ts) : leur absence est signalée mais ne rend pas le site
  // "pas sain", contrairement aux pages et aux images.
  if (!tilesDirExists) {
    problems.push(`TILES_DIR introuvable (${TILES_DIR}) — repli sur l'image simple, non bloquant`);
  }

  const healthy = pagesDirExists && pageCount > 0 && imagesDirExists;

  const body = {
    status: healthy ? 'ok' : 'error',
    pageCount,
    pagesDir: PAGES_DIR,
    imagesDir: IMAGES_DIR,
    tilesDir: TILES_DIR,
    problems,
  };

  return new Response(JSON.stringify(body, null, 2), {
    status: healthy ? 200 : 503,
    headers: { 'Content-Type': 'application/json' },
  });
};
