const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'journal.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  -- Pages table: each image/page of the journal
  CREATE TABLE IF NOT EXISTS pages (
    id INTEGER PRIMARY KEY,
    image_number INTEGER UNIQUE NOT NULL,
    image_path TEXT NOT NULL,
    title TEXT,
    description TEXT,
    page_number INTEGER,
    date_written TEXT,
    period TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Transcriptions table: text content of each page
  CREATE TABLE IF NOT EXISTS transcriptions (
    id INTEGER PRIMARY KEY,
    page_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    content_html TEXT,
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'verified', 'validated')),
    transcriptor_notes TEXT,
    version INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE
  );

  -- Annotations table: visual annotations on images
  CREATE TABLE IF NOT EXISTS annotations (
    id INTEGER PRIMARY KEY,
    page_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('rectangle', 'circle', 'arrow', 'text', 'highlight')),
    x REAL NOT NULL,
    y REAL NOT NULL,
    width REAL,
    height REAL,
    color TEXT DEFAULT '#FF0000',
    text TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE
  );

  -- Image adjustments table: crop, rotation, brightness, etc.
  CREATE TABLE IF NOT EXISTS image_adjustments (
    id INTEGER PRIMARY KEY,
    page_id INTEGER UNIQUE NOT NULL,
    rotation INTEGER DEFAULT 0,
    crop_x REAL DEFAULT 0,
    crop_y REAL DEFAULT 0,
    crop_width REAL DEFAULT 100,
    crop_height REAL DEFAULT 100,
    brightness REAL DEFAULT 100,
    contrast REAL DEFAULT 100,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE
  );

  -- Metadata table: additional info about pages
  CREATE TABLE IF NOT EXISTS metadata (
    id INTEGER PRIMARY KEY,
    page_id INTEGER NOT NULL,
    key TEXT NOT NULL,
    value TEXT,
    FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE,
    UNIQUE(page_id, key)
  );

  -- Themes/Tags table
  CREATE TABLE IF NOT EXISTS themes (
    id INTEGER PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#8B4513'
  );

  -- Page-Theme junction table
  CREATE TABLE IF NOT EXISTS page_themes (
    page_id INTEGER NOT NULL,
    theme_id INTEGER NOT NULL,
    PRIMARY KEY (page_id, theme_id),
    FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE,
    FOREIGN KEY (theme_id) REFERENCES themes(id) ON DELETE CASCADE
  );

  -- Entities (persons, places, concepts)
  CREATE TABLE IF NOT EXISTS entities (
    id INTEGER PRIMARY KEY,
    type TEXT NOT NULL CHECK(type IN ('person', 'place', 'concept', 'date')),
    name TEXT NOT NULL,
    description TEXT,
    UNIQUE(type, name)
  );

  -- Page-Entity mentions
  CREATE TABLE IF NOT EXISTS page_entities (
    page_id INTEGER NOT NULL,
    entity_id INTEGER NOT NULL,
    mention_count INTEGER DEFAULT 1,
    PRIMARY KEY (page_id, entity_id),
    FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE,
    FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE
  );

  -- Create indexes for performance
  CREATE INDEX IF NOT EXISTS idx_pages_image_number ON pages(image_number);
  CREATE INDEX IF NOT EXISTS idx_pages_period ON pages(period);
  CREATE INDEX IF NOT EXISTS idx_transcriptions_page ON transcriptions(page_id);
  CREATE INDEX IF NOT EXISTS idx_transcriptions_status ON transcriptions(status);
  CREATE INDEX IF NOT EXISTS idx_annotations_page ON annotations(page_id);
`);

// Insert default themes
const themes = [
  { name: 'Spiritisme', description: 'Enseignements et pratiques spirites', color: '#9B59B6' },
  { name: 'Foi chrétienne', description: 'Prières et réflexions religieuses', color: '#3498DB' },
  { name: 'Vie quotidienne', description: 'Actions et événements du quotidien', color: '#27AE60' },
  { name: 'Captivité', description: 'Expériences au camp de Munster', color: '#E74C3C' },
  { name: 'Famille', description: 'Références à la famille et aux proches', color: '#F39C12' },
  { name: 'Morale', description: 'Réflexions morales et vertus', color: '#1ABC9C' }
];

const insertTheme = db.prepare('INSERT OR IGNORE INTO themes (name, description, color) VALUES (?, ?, ?)');
themes.forEach(theme => insertTheme.run(theme.name, theme.description, theme.color));

// Insert default entities
const entities = [
  { type: 'person', name: 'Ramet Ernest', description: 'Auteur du journal, prisonnier de guerre français' },
  { type: 'person', name: 'Legar larre', description: 'Mentor/enseignant au camp de Munster' },
  { type: 'place', name: 'Munster Westphalie', description: 'Camp de prisonniers de guerre en Allemagne' },
  { type: 'place', name: 'Dunkerque', description: 'Ville française mentionnée dans le parcours militaire' },
  { type: 'place', name: 'Guémicourt', description: 'Centre médical/camp militaire' },
  { type: 'concept', name: 'Incarnation', description: 'Esprit qui habite le corps' },
  { type: 'concept', name: 'Désincarnation', description: 'Esprit qui quitte le corps' },
  { type: 'concept', name: 'Réincarnation', description: 'Esprit qui réhabite le corps' },
  { type: 'concept', name: 'Bonne action', description: 'Acte vertueux quotidien' },
  { type: 'concept', name: 'Mauvaise action', description: 'Acte à éviter' }
];

const insertEntity = db.prepare('INSERT OR IGNORE INTO entities (type, name, description) VALUES (?, ?, ?)');
entities.forEach(entity => insertEntity.run(entity.type, entity.name, entity.description));

console.log('Database initialized successfully at:', dbPath);
db.close();
