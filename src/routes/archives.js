const express = require('express');
const router = express.Router();

// Archives main interface
router.get('/', (req, res) => {
  const db = req.db;
  let pages = [];
  let stats = {};

  if (db) {
    try {
      pages = db.prepare(`
        SELECT p.*, t.status,
               (SELECT COUNT(*) FROM annotations WHERE page_id = p.id) as annotation_count
        FROM pages p
        LEFT JOIN transcriptions t ON p.id = t.page_id
        ORDER BY p.image_number ASC
      `).all();

      stats = db.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN t.status = 'draft' THEN 1 ELSE 0 END) as drafts,
          SUM(CASE WHEN t.status = 'verified' THEN 1 ELSE 0 END) as verified,
          SUM(CASE WHEN t.status = 'validated' THEN 1 ELSE 0 END) as validated
        FROM pages p
        LEFT JOIN transcriptions t ON p.id = t.page_id
      `).get();
    } catch (err) {
      console.error('Error fetching archives data:', err);
    }
  }

  res.render('archives/index', {
    title: 'Archives - Préservation',
    pages,
    stats
  });
});

// Edit specific page
router.get('/edit/:num', (req, res) => {
  const db = req.db;
  const imageNum = parseInt(req.params.num) || 410;

  let page = null;
  let annotations = [];
  let adjustments = null;

  if (db) {
    try {
      page = db.prepare(`
        SELECT p.*, t.id as transcription_id, t.content_html, t.status, t.transcriptor_notes, t.version
        FROM pages p
        LEFT JOIN transcriptions t ON p.id = t.page_id
        WHERE p.image_number = ?
      `).get(imageNum);

      if (page) {
        annotations = db.prepare(`
          SELECT * FROM annotations WHERE page_id = ? ORDER BY created_at DESC
        `).all(page.id);

        adjustments = db.prepare(`
          SELECT * FROM image_adjustments WHERE page_id = ?
        `).get(page.id);
      }
    } catch (err) {
      console.error('Error fetching page for edit:', err);
    }
  }

  if (!page) {
    return res.status(404).render('404', { title: 'Page non trouvée' });
  }

  res.render('archives/edit', {
    title: `Édition - Page ${page.page_number}`,
    page,
    annotations,
    adjustments: adjustments || {
      rotation: 0,
      crop_x: 0,
      crop_y: 0,
      crop_width: 100,
      crop_height: 100,
      brightness: 100,
      contrast: 100
    }
  });
});

module.exports = router;
