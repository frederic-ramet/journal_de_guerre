const express = require('express');
const router = express.Router();

// Get all pages
router.get('/pages', (req, res) => {
  const db = req.db;

  try {
    const pages = db.prepare(`
      SELECT p.*, t.status, t.content_html
      FROM pages p
      LEFT JOIN transcriptions t ON p.id = t.page_id
      ORDER BY p.image_number ASC
    `).all();

    res.json({ success: true, data: pages });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get single page
router.get('/pages/:id', (req, res) => {
  const db = req.db;
  const imageNum = parseInt(req.params.id);

  try {
    const page = db.prepare(`
      SELECT p.*, t.content_html, t.status, t.transcriptor_notes, t.version
      FROM pages p
      LEFT JOIN transcriptions t ON p.id = t.page_id
      WHERE p.image_number = ?
    `).get(imageNum);

    if (!page) {
      return res.status(404).json({ success: false, error: 'Page not found' });
    }

    res.json({ success: true, data: page });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update transcription
router.put('/transcriptions/:pageId', (req, res) => {
  const db = req.db;
  const pageId = parseInt(req.params.pageId);
  const { content_html, transcriptor_notes, status } = req.body;

  try {
    const result = db.prepare(`
      UPDATE transcriptions
      SET content_html = ?,
          transcriptor_notes = ?,
          status = ?,
          version = version + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE page_id = ?
    `).run(content_html, transcriptor_notes, status, pageId);

    // Also update plain text content
    const plainText = content_html
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    db.prepare(`
      UPDATE transcriptions SET content = ? WHERE page_id = ?
    `).run(plainText, pageId);

    res.json({ success: true, changes: result.changes });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Save image adjustments
router.put('/adjustments/:pageId', (req, res) => {
  const db = req.db;
  const pageId = parseInt(req.params.pageId);
  const { rotation, crop_x, crop_y, crop_width, crop_height, brightness, contrast } = req.body;

  try {
    db.prepare(`
      INSERT INTO image_adjustments (page_id, rotation, crop_x, crop_y, crop_width, crop_height, brightness, contrast)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(page_id) DO UPDATE SET
        rotation = excluded.rotation,
        crop_x = excluded.crop_x,
        crop_y = excluded.crop_y,
        crop_width = excluded.crop_width,
        crop_height = excluded.crop_height,
        brightness = excluded.brightness,
        contrast = excluded.contrast,
        updated_at = CURRENT_TIMESTAMP
    `).run(pageId, rotation, crop_x, crop_y, crop_width, crop_height, brightness, contrast);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Add annotation
router.post('/annotations', (req, res) => {
  const db = req.db;
  const { page_id, type, x, y, width, height, color, text } = req.body;

  try {
    const result = db.prepare(`
      INSERT INTO annotations (page_id, type, x, y, width, height, color, text)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(page_id, type, x, y, width, height, color, text);

    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete annotation
router.delete('/annotations/:id', (req, res) => {
  const db = req.db;
  const id = parseInt(req.params.id);

  try {
    db.prepare('DELETE FROM annotations WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Export all data
router.get('/export', (req, res) => {
  const db = req.db;

  try {
    const pages = db.prepare(`
      SELECT p.*, t.content_html, t.status, t.transcriptor_notes
      FROM pages p
      LEFT JOIN transcriptions t ON p.id = t.page_id
      ORDER BY p.image_number ASC
    `).all();

    const annotations = db.prepare('SELECT * FROM annotations').all();
    const adjustments = db.prepare('SELECT * FROM image_adjustments').all();
    const entities = db.prepare('SELECT * FROM entities').all();
    const themes = db.prepare('SELECT * FROM themes').all();

    const exportData = {
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      pages,
      annotations,
      adjustments,
      entities,
      themes
    };

    res.json(exportData);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Statistics
router.get('/stats', (req, res) => {
  const db = req.db;

  try {
    const stats = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM pages) as totalPages,
        (SELECT COUNT(*) FROM transcriptions WHERE status = 'draft') as drafts,
        (SELECT COUNT(*) FROM transcriptions WHERE status = 'verified') as verified,
        (SELECT COUNT(*) FROM transcriptions WHERE status = 'validated') as validated,
        (SELECT COUNT(*) FROM annotations) as totalAnnotations,
        (SELECT COUNT(*) FROM entities) as totalEntities,
        (SELECT COUNT(*) FROM themes) as totalThemes
    `).get();

    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
