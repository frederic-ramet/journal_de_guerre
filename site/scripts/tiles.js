#!/usr/bin/env node
// Génère les tuiles DZI (Deep Zoom) des 196 pages, via sharp (libvips embarqué).
//
// Usage:
//   npm run tiles              # toutes les pages de jpg_pages/
//   npm run tiles -- --limit 3 # seulement les 3 premières (test avant de lancer sur tout)
//
// Idempotent : si tiles/<id>/image.dzi existe déjà et que l'image source
// n'a pas changé depuis (mtime), la page est sautée.

import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const TILE_SIZE = 254;
const TILE_OVERLAP = 1;
const JPEG_QUALITY = 80;

// Même valeur par défaut que site/src/lib/config.ts (IMAGES_DIR) : ce script
// tourne en JS pur (pas de transpilation TS hors du serveur Astro), donc la
// constante est dupliquée ici plutôt qu'importée.
const REPO_ROOT = path.resolve(import.meta.dirname, '..', '..');
const IMAGES_DIR = process.env.IMAGES_DIR ?? path.join(REPO_ROOT, 'jpg_pages');
const TILES_DIR = process.env.TILES_DIR ?? path.join(REPO_ROOT, 'tiles');

// Estimation empirique (mesurée sur un test de 3 pages : ~8 Mo -> ~2.7 Mo/page).
// À ajuster si le ratio réel diverge une fois le carnet entier généré.
const ESTIMATED_MB_PER_PAGE = 2.7;
const MIN_FREE_MB_MARGIN = 500; // marge de sécurité au-delà de l'estimation

function parseArgs() {
  const args = process.argv.slice(2);
  const limitIndex = args.indexOf('--limit');
  const limit = limitIndex !== -1 ? Number.parseInt(args[limitIndex + 1], 10) : null;
  return { limit };
}

function listSourceImages() {
  return fs
    .readdirSync(IMAGES_DIR)
    .filter((f) => /\.jpe?g$/i.test(f))
    .sort((a, b) => a.localeCompare(b, 'en'));
}

function idFromFilename(filename) {
  return filename.replace(/\.jpe?g$/i, '');
}

function dirSizeBytes(dir) {
  if (!fs.existsSync(dir)) return 0;
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      total += dirSizeBytes(full);
    } else {
      total += fs.statSync(full).size;
    }
  }
  return total;
}

function freeDiskMB(dir) {
  // statfs n'est pas exposé simplement en Node sans dépendance native ; on
  // passe par `df` qui est disponible sur macOS/Linux (les deux cibles ici).
  const out = execSync(`df -m "${dir}"`).toString();
  const lines = out.trim().split('\n');
  const cols = lines[lines.length - 1].split(/\s+/);
  // Sortie df -m : Filesystem 1M-blocks Used Available Capacity Mounted-on
  return Number.parseInt(cols[3], 10);
}

function needsRegeneration(sourcePath, dziPath) {
  if (!fs.existsSync(dziPath)) return true;
  const sourceMtime = fs.statSync(sourcePath).mtimeMs;
  const dziMtime = fs.statSync(dziPath).mtimeMs;
  return sourceMtime > dziMtime;
}

async function generateTile(sourcePath, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const basePath = path.join(outDir, 'image');
  await sharp(sourcePath).jpeg({ quality: JPEG_QUALITY }).tile({
    size: TILE_SIZE,
    overlap: TILE_OVERLAP,
    layout: 'dz',
  }).toFile(basePath);
}

async function main() {
  const { limit } = parseArgs();

  if (!fs.existsSync(IMAGES_DIR)) {
    console.error(`Dossier source introuvable : ${IMAGES_DIR}`);
    process.exit(1);
  }

  let images = listSourceImages();
  if (limit) {
    images = images.slice(0, limit);
    console.log(`Mode test : limité aux ${limit} première(s) page(s).`);
  }

  console.log(`${images.length} image(s) à traiter depuis ${IMAGES_DIR}.`);

  // Vérification d'espace disque avant de lancer.
  const estimatedMB = images.length * ESTIMATED_MB_PER_PAGE;
  fs.mkdirSync(TILES_DIR, { recursive: true });
  const freeMB = freeDiskMB(TILES_DIR);
  console.log(
    `Estimation : ~${estimatedMB.toFixed(0)} Mo pour ${images.length} page(s) ` +
      `(~${ESTIMATED_MB_PER_PAGE} Mo/page). Espace disponible : ${freeMB} Mo.`,
  );
  if (freeMB < estimatedMB + MIN_FREE_MB_MARGIN) {
    console.error(
      `Espace disque insuffisant : ${freeMB} Mo libres, ${estimatedMB.toFixed(0)} Mo estimés ` +
        `+ ${MIN_FREE_MB_MARGIN} Mo de marge requise. Arrêt sans rien générer.`,
    );
    process.exit(1);
  }

  let generated = 0;
  let skipped = 0;

  for (const filename of images) {
    const id = idFromFilename(filename);
    const sourcePath = path.join(IMAGES_DIR, filename);
    const outDir = path.join(TILES_DIR, id);
    const dziPath = path.join(outDir, 'image.dzi');

    if (!needsRegeneration(sourcePath, dziPath)) {
      skipped++;
      continue;
    }

    process.stdout.write(`${id}... `);
    const start = Date.now();
    try {
      await generateTile(sourcePath, outDir);
      const duration = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`ok (${duration}s)`);
      generated++;
    } catch (err) {
      console.log(`ÉCHEC : ${err.message}`);
    }
  }

  const totalBytes = dirSizeBytes(TILES_DIR);
  const totalMB = totalBytes / (1024 * 1024);

  console.log('');
  console.log(`Terminé : ${generated} générée(s), ${skipped} déjà à jour (sautée(s)).`);
  console.log(`Taille totale de ${TILES_DIR} : ${totalMB.toFixed(1)} Mo.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
