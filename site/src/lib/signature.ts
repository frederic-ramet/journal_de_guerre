import fs from 'node:fs';
import path from 'node:path';

// Deux emplacements possibles selon le mode, tous deux résolus depuis
// process.cwd() (racine du projet Astro, `site/` en dev comme en prod — voir
// WORKDIR /app du Dockerfile), jamais depuis import.meta.dirname : ce fichier
// compile dans dist/server/chunks/, un chemin relatif à sa propre position
// ne retomberait sur rien de valide.
// - En dev (`astro dev`), public/ est servi tel quel, dist/ n'existe pas encore.
// - Une fois buildé, Astro copie public/ dans dist/client/ ; l'image Docker
//   ne contient que dist/ (voir Dockerfile), public/ n'y est jamais copié.
const CANDIDATE_PATHS = [
  path.resolve(process.cwd(), 'public', 'signature.svg'),
  path.resolve(process.cwd(), 'dist', 'client', 'signature.svg'),
];

let cached: string | null = null;

/** Contenu du SVG de la signature R.E., pour inline (hérite de currentColor). */
export function signatureSvg(): string {
  if (cached === null) {
    const svgPath = CANDIDATE_PATHS.find((candidate) => fs.existsSync(candidate));
    if (!svgPath) {
      throw new Error(
        `signature.svg introuvable (essayé : ${CANDIDATE_PATHS.join(', ')})`,
      );
    }
    cached = fs.readFileSync(svgPath, 'utf-8');
  }
  return cached;
}
