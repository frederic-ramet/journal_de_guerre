const express = require('express');
const router = express.Router();

// Study/Analysis main interface
router.get('/', (req, res) => {
  const db = req.db;
  let entities = [];
  let themes = [];
  let timeline = [];

  if (db) {
    try {
      entities = db.prepare(`
        SELECT e.*, COUNT(pe.page_id) as mention_count
        FROM entities e
        LEFT JOIN page_entities pe ON e.id = pe.entity_id
        GROUP BY e.id
        ORDER BY mention_count DESC
      `).all();

      themes = db.prepare(`
        SELECT t.*, COUNT(pt.page_id) as page_count
        FROM themes t
        LEFT JOIN page_themes pt ON t.id = pt.theme_id
        GROUP BY t.id
        ORDER BY page_count DESC
      `).all();

      // Build timeline from pages with dates
      timeline = db.prepare(`
        SELECT p.page_number, p.date_written, p.title, p.description
        FROM pages p
        WHERE p.date_written IS NOT NULL
        ORDER BY p.image_number ASC
        LIMIT 20
      `).all();

    } catch (err) {
      console.error('Error fetching study data:', err);
    }
  }

  res.render('etude/index', {
    title: 'Étude - Analyse',
    entities,
    themes,
    timeline,
    context: {
      author: 'Ramet Ernest',
      period: '1918',
      location: 'Munster, Westphalie (Allemagne)',
      context: 'Prisonnier de guerre français'
    }
  });
});

// Search in transcriptions
router.get('/search', (req, res) => {
  const db = req.db;
  const query = req.query.q || '';
  let results = [];

  if (db && query.length > 2) {
    try {
      results = db.prepare(`
        SELECT p.*, t.content, t.content_html,
               SUBSTR(t.content, MAX(1, INSTR(LOWER(t.content), LOWER(?)) - 50), 150) as excerpt
        FROM pages p
        JOIN transcriptions t ON p.id = t.page_id
        WHERE t.content LIKE ?
        ORDER BY p.image_number ASC
        LIMIT 50
      `).all(query, `%${query}%`);
    } catch (err) {
      console.error('Error searching:', err);
    }
  }

  res.render('etude/search', {
    title: 'Recherche - Étude',
    query,
    results
  });
});

// Knowledge graph data
router.get('/graph', (req, res) => {
  const db = req.db;
  let nodes = [];
  let edges = [];

  if (db) {
    try {
      // Get entities as nodes
      const entities = db.prepare(`
        SELECT id, type, name, description
        FROM entities
      `).all();

      nodes = entities.map(e => ({
        id: `entity_${e.id}`,
        label: e.name,
        type: e.type,
        description: e.description
      }));

      // Get relationships (pages that share entities)
      const relations = db.prepare(`
        SELECT pe1.entity_id as source, pe2.entity_id as target, COUNT(*) as weight
        FROM page_entities pe1
        JOIN page_entities pe2 ON pe1.page_id = pe2.page_id AND pe1.entity_id < pe2.entity_id
        GROUP BY pe1.entity_id, pe2.entity_id
        HAVING weight > 0
      `).all();

      edges = relations.map(r => ({
        source: `entity_${r.source}`,
        target: `entity_${r.target}`,
        weight: r.weight
      }));

    } catch (err) {
      console.error('Error building graph:', err);
    }
  }

  res.json({ nodes, edges });
});

module.exports = router;
