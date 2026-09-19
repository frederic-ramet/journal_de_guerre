import fs from 'node:fs';
import path from 'node:path';

const SVG_PATH = path.resolve(import.meta.dirname, '..', '..', 'public', 'signature.svg');

let cached: string | null = null;

/** Contenu du SVG de la signature R.E., pour inline (hérite de currentColor). */
export function signatureSvg(): string {
  if (cached === null) {
    cached = fs.readFileSync(SVG_PATH, 'utf-8');
  }
  return cached;
}
