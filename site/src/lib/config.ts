import path from 'node:path';

const root = path.resolve(process.cwd(), '..');

export const PAGES_DIR =
  process.env.PAGES_DIR ?? path.join(root, 'transcription', 'pages');

export const IMAGES_DIR =
  process.env.IMAGES_DIR ?? path.join(root, 'jpg_pages');

export const TILES_DIR = process.env.TILES_DIR ?? path.join(root, 'tiles');

export const CONTEXTE_MD_PATH =
  process.env.CONTEXTE_MD_PATH ?? path.join(root, 'contexte.md');
