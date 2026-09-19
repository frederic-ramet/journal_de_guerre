import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';
import { IMAGES_DIR } from '../../lib/config';

export const prerender = false;

// Sert les images de jpg_pages/ en statique. jpg_source/ n'est jamais exposé
// ici : seul IMAGES_DIR (jpg_pages/) est accessible, et uniquement les noms
// de fichier exacts (pas de traversée de chemin).
export const GET: APIRoute = async ({ params }) => {
  const filename = params.filename;
  if (!filename || /[\\/]/.test(filename) || !/^[\w.-]+\.jpe?g$/i.test(filename)) {
    return new Response('Not found', { status: 404 });
  }

  const filePath = path.join(IMAGES_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return new Response('Not found', { status: 404 });
  }

  const body = fs.readFileSync(filePath);
  return new Response(body, {
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
