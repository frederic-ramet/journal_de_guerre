const express = require('express');
const router = express.Router();

// Home page - Portal
router.get('/', (req, res) => {
  const db = req.db;

  // Get statistics
  let stats = {
    totalPages: 103,
    verifiedPages: 0,
    entities: 0,
    themes: 0
  };

  if (db) {
    try {
      const dbStats = db.prepare(`
        SELECT
          (SELECT COUNT(*) FROM pages) as totalPages,
          (SELECT COUNT(*) FROM transcriptions WHERE status = 'verified') as verifiedPages,
          (SELECT COUNT(*) FROM entities) as entities,
          (SELECT COUNT(*) FROM themes) as themes
      `).get();
      stats = dbStats;
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }

  res.render('index', {
    title: 'Journal de Guerre - Ramet Ernest',
    stats
  });
});

module.exports = router;
