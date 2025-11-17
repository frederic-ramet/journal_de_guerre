const express = require('express');
const router = express.Router();

// Journal reading interface
router.get('/', (req, res) => {
  const db = req.db;
  let pages = [];

  if (db) {
    try {
      pages = db.prepare(`
        SELECT p.*, t.content_html, t.status
        FROM pages p
        LEFT JOIN transcriptions t ON p.id = t.page_id
        ORDER BY p.image_number ASC
      `).all();
    } catch (err) {
      console.error('Error fetching pages:', err);
    }
  }

  res.render('journal/index', {
    title: 'Journal - Lecture',
    pages,
    currentPage: 0
  });
});

// Specific page
router.get('/page/:num', (req, res) => {
  const db = req.db;
  const pageNum = parseInt(req.params.num) || 1;
  const imageNum = 409 + pageNum;

  let page = null;
  let totalPages = 103;

  if (db) {
    try {
      page = db.prepare(`
        SELECT p.*, t.content_html, t.status, t.transcriptor_notes
        FROM pages p
        LEFT JOIN transcriptions t ON p.id = t.page_id
        WHERE p.image_number = ?
      `).get(imageNum);

      totalPages = db.prepare('SELECT COUNT(*) as count FROM pages').get().count;
    } catch (err) {
      console.error('Error fetching page:', err);
    }
  }

  if (!page) {
    return res.status(404).render('404', { title: 'Page non trouvée' });
  }

  res.render('journal/page', {
    title: `Page ${pageNum} - Journal`,
    page,
    pageNum,
    totalPages,
    prevPage: pageNum > 1 ? pageNum - 1 : null,
    nextPage: pageNum < totalPages ? pageNum + 1 : null
  });
});

module.exports = router;
