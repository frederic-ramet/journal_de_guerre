import fs from 'node:fs';
import path from 'node:path';
import { TILES_DIR } from './config';

/** Vrai si les tuiles DZI de cette page existent (image.dzi présent). */
export function tilesExist(pageId: string): boolean {
  const dziPath = path.join(TILES_DIR, pageId, 'image.dzi');
  return fs.existsSync(dziPath);
}

export function dziUrl(pageId: string): string {
  return `/tiles/${pageId}/image.dzi`;
}
