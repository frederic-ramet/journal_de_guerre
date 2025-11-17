const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const Database = require('better-sqlite3');

const distDir = path.join(__dirname, '..', 'dist');
const viewsDir = path.join(__dirname, '..', 'src', 'views');
const publicDir = path.join(__dirname, '..', 'src', 'public');
const dbPath = path.join(__dirname, '..', 'data', 'journal.db');

console.log('Starting static build for Vercel...');

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Connect to database
let db;
try {
  db = new Database(dbPath, { readonly: true });
  console.log('Database connected');
} catch (err) {
  console.error('Database not found. Run "npm run init-db && npm run migrate" first');
  process.exit(1);
}

// Helper to render EJS template
function renderTemplate(templatePath, data) {
  const template = fs.readFileSync(templatePath, 'utf8');
  return ejs.render(template, data, {
    filename: templatePath,
    root: viewsDir
  });
}

// Get all pages from database
function getAllPages() {
  return db.prepare(`
    SELECT p.*, t.content_html, t.status, t.transcriptor_notes
    FROM pages p
    LEFT JOIN transcriptions t ON p.id = t.page_id
    ORDER BY p.image_number ASC
  `).all();
}

// Get statistics
function getStats() {
  return db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM pages) as totalPages,
      (SELECT COUNT(*) FROM transcriptions WHERE status = 'verified') as verifiedPages,
      (SELECT COUNT(*) FROM entities) as entities,
      (SELECT COUNT(*) FROM themes) as themes
  `).get();
}

// Get entities
function getEntities() {
  return db.prepare(`
    SELECT e.*, COUNT(pe.page_id) as mention_count
    FROM entities e
    LEFT JOIN page_entities pe ON e.id = pe.entity_id
    GROUP BY e.id
    ORDER BY mention_count DESC
  `).all();
}

// Get themes
function getThemes() {
  return db.prepare(`
    SELECT t.*, COUNT(pt.page_id) as page_count
    FROM themes t
    LEFT JOIN page_themes pt ON t.id = pt.theme_id
    GROUP BY t.id
    ORDER BY page_count DESC
  `).all();
}

// Copy static assets
function copyAssets() {
  const copyRecursive = (src, dest) => {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    const items = fs.readdirSync(src);
    items.forEach(item => {
      const srcPath = path.join(src, item);
      const destPath = path.join(dest, item);

      if (fs.statSync(srcPath).isDirectory()) {
        copyRecursive(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    });
  };

  // Copy CSS and JS
  copyRecursive(publicDir, distDir);

  // Copy images
  const jpgWebSrc = path.join(__dirname, '..', 'jpg_web');
  const jpgWebDest = path.join(distDir, 'jpg_web');
  if (fs.existsSync(jpgWebSrc)) {
    copyRecursive(jpgWebSrc, jpgWebDest);
    console.log('Images copied');
  }
}

// Build pages
function buildPages() {
  const pages = getAllPages();
  const stats = getStats();
  const entities = getEntities();
  const themes = getThemes();

  // 1. Build index (portal)
  console.log('Building index.html...');
  const indexHtml = renderTemplate(path.join(viewsDir, 'index.ejs'), {
    title: 'Journal de Guerre - Ramet Ernest',
    stats,
    additionalCss: ['portal'],
    additionalJs: ['portal'],
    activePage: 'home'
  });
  fs.writeFileSync(path.join(distDir, 'index.html'), indexHtml);

  // 2. Build journal pages
  console.log('Building journal pages...');
  const journalDir = path.join(distDir, 'journal');
  if (!fs.existsSync(journalDir)) {
    fs.mkdirSync(journalDir, { recursive: true });
  }

  // Journal index
  const journalIndexHtml = renderTemplate(path.join(viewsDir, 'journal', 'index.ejs'), {
    title: 'Journal - Lecture',
    pages,
    currentPage: 0,
    additionalCss: ['journal'],
    additionalJs: ['journal'],
    activePage: 'journal'
  });
  fs.writeFileSync(path.join(journalDir, 'index.html'), journalIndexHtml);

  // Individual pages
  const pageDir = path.join(journalDir, 'page');
  if (!fs.existsSync(pageDir)) {
    fs.mkdirSync(pageDir, { recursive: true });
  }

  pages.forEach((page, index) => {
    const pageNum = index + 1;
    const pageHtml = renderTemplate(path.join(viewsDir, 'journal', 'page.ejs'), {
      title: `Page ${pageNum} - Journal`,
      page,
      pageNum,
      totalPages: pages.length,
      prevPage: pageNum > 1 ? pageNum - 1 : null,
      nextPage: pageNum < pages.length ? pageNum + 1 : null,
      additionalCss: ['journal'],
      additionalJs: ['journal'],
      activePage: 'journal'
    });

    const pageFileName = path.join(pageDir, `${pageNum}.html`);
    fs.writeFileSync(pageFileName, pageHtml);
  });
  console.log(`Built ${pages.length} journal pages`);

  // 3. Build archives pages
  console.log('Building archives pages...');
  const archivesDir = path.join(distDir, 'archives');
  if (!fs.existsSync(archivesDir)) {
    fs.mkdirSync(archivesDir, { recursive: true });
  }

  const archivesStats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN t.status = 'draft' THEN 1 ELSE 0 END) as drafts,
      SUM(CASE WHEN t.status = 'verified' THEN 1 ELSE 0 END) as verified,
      SUM(CASE WHEN t.status = 'validated' THEN 1 ELSE 0 END) as validated
    FROM pages p
    LEFT JOIN transcriptions t ON p.id = t.page_id
  `).get();

  const archivesIndexHtml = renderTemplate(path.join(viewsDir, 'archives', 'index.ejs'), {
    title: 'Archives - Préservation',
    pages,
    stats: archivesStats,
    additionalCss: ['archives'],
    additionalJs: ['archives'],
    activePage: 'archives'
  });
  fs.writeFileSync(path.join(archivesDir, 'index.html'), archivesIndexHtml);

  // Note: Edit pages won't work in static mode (need backend)
  // We'll create a static notice instead
  const editDir = path.join(archivesDir, 'edit');
  if (!fs.existsSync(editDir)) {
    fs.mkdirSync(editDir, { recursive: true });
  }

  const staticNotice = `
<!DOCTYPE html>
<html>
<head>
  <title>Mode édition non disponible</title>
  <meta http-equiv="refresh" content="3;url=/archives/">
</head>
<body>
  <h1>Mode édition non disponible en version statique</h1>
  <p>L'édition nécessite le serveur local. Redirection vers les archives...</p>
</body>
</html>`;
  fs.writeFileSync(path.join(editDir, 'index.html'), staticNotice);

  // 4. Build étude pages
  console.log('Building étude pages...');
  const etudeDir = path.join(distDir, 'etude');
  if (!fs.existsSync(etudeDir)) {
    fs.mkdirSync(etudeDir, { recursive: true });
  }

  const etudeIndexHtml = renderTemplate(path.join(viewsDir, 'etude', 'index.ejs'), {
    title: 'Étude - Analyse',
    entities,
    themes,
    timeline: [],
    context: {
      author: 'Ramet Ernest',
      period: '1918',
      location: 'Munster, Westphalie (Allemagne)',
      context: 'Prisonnier de guerre français'
    },
    additionalCss: ['etude'],
    additionalJs: ['etude'],
    activePage: 'etude'
  });
  fs.writeFileSync(path.join(etudeDir, 'index.html'), etudeIndexHtml);

  // Search page (static version - no results)
  const searchHtml = renderTemplate(path.join(viewsDir, 'etude', 'search.ejs'), {
    title: 'Recherche - Étude',
    query: '',
    results: [],
    additionalCss: ['etude'],
    additionalJs: [],
    activePage: 'etude'
  });
  fs.writeFileSync(path.join(etudeDir, 'search.html'), searchHtml);

  // 5. Build 404 page
  const notFoundHtml = renderTemplate(path.join(viewsDir, '404.ejs'), {
    title: 'Page non trouvée',
    additionalCss: [],
    additionalJs: [],
    activePage: ''
  });
  fs.writeFileSync(path.join(distDir, '404.html'), notFoundHtml);

  // 6. Create API export (static JSON)
  console.log('Creating static API data...');
  const apiDir = path.join(distDir, 'api');
  if (!fs.existsSync(apiDir)) {
    fs.mkdirSync(apiDir, { recursive: true });
  }

  const exportData = {
    version: '2.0.0',
    exportedAt: new Date().toISOString(),
    pages,
    entities,
    themes,
    stats
  };
  fs.writeFileSync(path.join(apiDir, 'export.json'), JSON.stringify(exportData, null, 2));
}

// Main build process
try {
  console.log('Copying static assets...');
  copyAssets();

  console.log('Building HTML pages...');
  buildPages();

  console.log('\n✅ Build completed successfully!');
  console.log(`Output directory: ${distDir}`);
  console.log('\nTo deploy to Vercel:');
  console.log('1. Push to GitHub');
  console.log('2. Connect repository to Vercel');
  console.log('3. Set build command: npm run build');
  console.log('4. Set output directory: dist');

} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
} finally {
  if (db) db.close();
}
