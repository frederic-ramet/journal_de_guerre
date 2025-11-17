const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'data', 'journal.db');
const db = new Database(dbPath);

// Read the existing script.js to extract transcription data
const scriptPath = path.join(__dirname, '..', 'script.js');
const scriptContent = fs.readFileSync(scriptPath, 'utf8');

// Extract the transcriptionDB object from script.js
// This is a bit hacky but necessary to migrate existing data
function extractTranscriptionDB(content) {
  const transcriptions = {};

  // Find all transcription entries using regex
  const pattern = /(\d{3}):\s*`([^`]+)`/gs;
  let match;

  while ((match = pattern.exec(content)) !== null) {
    const imageNum = parseInt(match[1]);
    const htmlContent = match[2].trim();
    transcriptions[imageNum] = htmlContent;
  }

  return transcriptions;
}

// Extract page info from the existing pageInfo object
function extractPageInfo(content) {
  const pageInfo = {};

  // Match pattern like: 410: { title: '...', desc: '...' }
  const pattern = /(\d{3}):\s*\{\s*title:\s*'([^']+)',\s*desc:\s*'([^']+)'\s*\}/g;
  let match;

  while ((match = pattern.exec(content)) !== null) {
    const imageNum = parseInt(match[1]);
    pageInfo[imageNum] = {
      title: match[2],
      description: match[3]
    };
  }

  return pageInfo;
}

// Determine period from image number or content
function determinePeriod(imageNum, content) {
  // Based on analysis of the journal structure
  if (imageNum <= 419) return '1918-juin';
  if (imageNum <= 429) return '1918-juin-juillet';
  if (imageNum <= 449) return '1918-juillet-aout';
  if (imageNum <= 469) return '1918-septembre';
  if (imageNum <= 489) return '1918-octobre';
  if (imageNum <= 509) return '1918-notes';
  return '1918-annexes';
}

// Extract date from title or content
function extractDate(title, content) {
  // Try to extract date from title first
  const titleMatch = title.match(/(\d{1,2})\s*(juin|juillet|aout|septembre|octobre|novembre|décembre|janvier|février|mars|avril|mai)\s*(\d{4}|\d{2})/i);
  if (titleMatch) {
    return `${titleMatch[1]} ${titleMatch[2]} ${titleMatch[3]}`;
  }

  // Try to find date patterns like "14-6-18" or "Le 15-6-18"
  const contentMatch = content.match(/(\d{1,2})-(\d{1,2})-(\d{2,4})/);
  if (contentMatch) {
    const day = contentMatch[1];
    const month = contentMatch[2];
    const year = contentMatch[3].length === 2 ? `19${contentMatch[3]}` : contentMatch[3];
    return `${day}-${month}-${year}`;
  }

  return null;
}

console.log('Starting data migration...');

const transcriptionDB = extractTranscriptionDB(scriptContent);
const pageInfoDB = extractPageInfo(scriptContent);

console.log(`Found ${Object.keys(transcriptionDB).length} transcriptions`);
console.log(`Found ${Object.keys(pageInfoDB).length} page info entries`);

// Prepare statements
const insertPage = db.prepare(`
  INSERT OR REPLACE INTO pages (image_number, image_path, title, description, page_number, date_written, period)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const insertTranscription = db.prepare(`
  INSERT OR REPLACE INTO transcriptions (page_id, content, content_html, status)
  VALUES (?, ?, ?, ?)
`);

const getPageId = db.prepare('SELECT id FROM pages WHERE image_number = ?');

// Migrate data
const migrateAll = db.transaction(() => {
  for (let i = 410; i <= 512; i++) {
    const imagePath = `jpg_web/IMG_0${i}.jpeg`;
    const pageNum = i - 409; // Page 1 = IMG_0410

    // Get title and description
    let title = `Page ${pageNum}`;
    let description = '';

    if (pageInfoDB[i]) {
      title = pageInfoDB[i].title;
      description = pageInfoDB[i].description;
    }

    // Get transcription content
    const htmlContent = transcriptionDB[i] || '<p>Transcription non disponible</p>';

    // Extract plain text from HTML for searchability
    const plainText = htmlContent
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Determine period and date
    const period = determinePeriod(i, htmlContent);
    const dateWritten = extractDate(title, htmlContent);

    // Insert page
    insertPage.run(i, imagePath, title, description, pageNum, dateWritten, period);

    // Get the page ID
    const pageRow = getPageId.get(i);
    if (pageRow) {
      // Determine status based on content quality
      let status = 'draft';
      if (!htmlContent.includes('illisible') && !htmlContent.includes('Texte dense')) {
        status = 'verified';
      }

      // Insert transcription
      insertTranscription.run(pageRow.id, plainText, htmlContent, status);
    }

    if (i % 20 === 0) {
      console.log(`Migrated ${i - 409} pages...`);
    }
  }
});

migrateAll();

// Add some page-entity relationships
const addEntityRelation = db.prepare(`
  INSERT OR IGNORE INTO page_entities (page_id, entity_id, mention_count)
  SELECT p.id, e.id, 1
  FROM pages p, entities e
  WHERE p.image_number = ? AND e.name = ?
`);

// Link Ramet Ernest to first page
addEntityRelation.run(410, 'Ramet Ernest');
addEntityRelation.run(410, 'Munster Westphalie');
addEntityRelation.run(410, 'Legar larre');

// Link spiritism concepts to early pages
for (let i = 410; i <= 415; i++) {
  addEntityRelation.run(i, 'Incarnation');
  addEntityRelation.run(i, 'Désincarnation');
  addEntityRelation.run(i, 'Réincarnation');
}

// Link military places to page 509
addEntityRelation.run(509, 'Guémicourt');
addEntityRelation.run(509, 'Dunkerque');

console.log('Migration completed successfully!');

// Show statistics
const stats = db.prepare(`
  SELECT
    (SELECT COUNT(*) FROM pages) as total_pages,
    (SELECT COUNT(*) FROM transcriptions) as total_transcriptions,
    (SELECT COUNT(*) FROM transcriptions WHERE status = 'verified') as verified,
    (SELECT COUNT(*) FROM transcriptions WHERE status = 'draft') as drafts,
    (SELECT COUNT(*) FROM entities) as entities,
    (SELECT COUNT(*) FROM themes) as themes
`).get();

console.log('\nDatabase Statistics:');
console.log(`- Total pages: ${stats.total_pages}`);
console.log(`- Total transcriptions: ${stats.total_transcriptions}`);
console.log(`- Verified: ${stats.verified}`);
console.log(`- Drafts: ${stats.drafts}`);
console.log(`- Entities: ${stats.entities}`);
console.log(`- Themes: ${stats.themes}`);

db.close();
