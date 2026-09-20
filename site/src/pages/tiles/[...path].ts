import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';
import { TILES_DIR } from '../../lib/config';

export const prerender = false;

const CONTENT_TYPES: Record<string, string> = {
  '.dzi': 'application/xml',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
};

// Sert tiles/<id>/image.dzi et tiles/<id>/image_files/<niveau>/<x>_<y>.jpeg.
// Chemin contrôlé strictement : pas de ".." ni de segments hors de TILES_DIR.
export const GET: APIRoute = async ({ params }) => {
  const rawPath = params.path;
  if (!rawPath) {
    return new Response('Not found', { status: 404 });
  }

  const segments = rawPath.split('/');
  if (segments.some((seg) => seg === '..' || seg === '' || /[\\]/.test(seg))) {
    return new Response('Not found', { status: 404 });
  }

  const ext = path.extname(rawPath).toLowerCase();
  const contentType = CONTENT_TYPES[ext];
  if (!contentType) {
    return new Response('Not found', { status: 404 });
  }

  const filePath = path.join(TILES_DIR, ...segments);
  // Vérifie que le chemin résolu reste bien sous TILES_DIR (défense en profondeur).
  if (!filePath.startsWith(path.resolve(TILES_DIR))) {
    return new Response('Not found', { status: 404 });
  }

  if (!fs.existsSync(filePath)) {
    return new Response('Not found', { status: 404 });
  }

  const body = fs.readFileSync(filePath);
  return new Response(body, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
